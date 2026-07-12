import hashlib
import http.client
import ipaddress
import logging
import socket
import ssl
from pathlib import Path
from urllib.parse import urlparse

from fastapi import HTTPException, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.content import Content
from app.models.generated_image import GeneratedImage
from app.models.user import User
from app.schemas.image import ImageGenerateRequest
from app.services.content_service import PromptPackage, _safe_commit, record_generation_log
from app.services.model_router import (
    FILENAME_RE,
    GENERATED_ASSET_ROOT,
    load_platform_style_reference,
    load_prompt,
    model_router,
)

logger = logging.getLogger(__name__)

IMAGE_GENERATABLE_STATUSES = {"draft", "rewritten", "review_pending", "approved"}
REMOTE_IMAGE_DOWNLOAD_TIMEOUT_SECONDS = 30.0
REMOTE_IMAGE_MAX_BYTES = 32 * 1024 * 1024
_REMOTE_IMAGE_MAGIC_BYTES = (
    b"\x89PNG\r\n\x1a\n",  # PNG
    b"\xff\xd8\xff",          # JPEG (SOI + marker)
    b"RIFF",                     # WebP/AVIF (RIFF container)
    b"GIF87a",                   # GIF87a
    b"GIF89a",                   # GIF89a
)
IMAGE_SOURCE_CONTEXT_EXCERPT_LENGTH = 360
IMAGE_MEDIA_TYPE_EXTENSIONS = {
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/svg+xml": ".svg",
    "image/webp": ".webp",
}

COVER_TEMPLATES = [
    {
        "id": "xiaohongshu-cover",
        "name": "Xiaohongshu cover",
        "platform": "xiaohongshu",
        "aspect_ratio": "3:4",
        "description": "2K vertical 3:4 title-led cover for notes and carousel posts.",
    },
    {
        "id": "douyin-cover",
        "name": "Douyin cover",
        "platform": "douyin",
        "aspect_ratio": "9:16",
        "description": "Vertical video cover with strong headline hierarchy.",
    },
    {
        "id": "knowledge-card",
        "name": "Knowledge card",
        "platform": "multi",
        "aspect_ratio": "1:1",
        "description": "Square explainer card for reusable education assets.",
    },
]

COVER_VISUAL_DIRECTIONS = [
    {
        "id": "route-matrix-board",
        "name": "路线榜单矩阵",
        "instructions": (
            "Use a route matrix board inspired by operator-reviewed Xiaohongshu "
            "list posts: one large title, 4-5 route buckets, compact verified "
            "school/project labels when provided, and one short decision cue per "
            "item such as schedule, language, mode, or cost. Keep it readable, "
            "avoid official seals/logos, and do not invent school facts."
        ),
        "avoid": "single desk scene, fake school logos, tiny unreadable table text",
    },
    {
        "id": "phone-proof-collage",
        "name": "手机信息拼贴",
        "instructions": (
            "Use a phone-native collage composition: one large tilted phone mockup, "
            "cropped chat/search/email fragments, bright white background, blue and "
            "red annotation strokes, and one bold headline block. No desk scene."
        ),
        "avoid": "sticky-note wall, laptop-on-desk scene, scrapbook checklist stack",
    },
    {
        "id": "dark-academic-blueprint",
        "name": "深色学术蓝图",
        "instructions": (
            "Use a dark navy academic blueprint look with grid lines, thin technical "
            "annotations, a highlighted research-route diagram, and cream/ice-blue "
            "headline typography. Professional and sharp, not cute."
        ),
        "avoid": "warm daylight desk, pastel sticky notes, playful stickers",
    },
    {
        "id": "editorial-magazine",
        "name": "杂志编辑封面",
        "instructions": (
            "Use an editorial magazine cover layout: strong asymmetric typography, "
            "one close-up object photo such as marked paper or a library card, generous "
            "white space, small rubric labels, and a restrained red accent."
        ),
        "avoid": "handwritten checklist chips, speech bubbles, crowded desk props",
    },
    {
        "id": "workflow-board",
        "name": "流程看板",
        "instructions": (
            "Use a clean workflow board: three vertical steps, arrows, progress bars, "
            "small check/cross decisions, and a headline that reads like a clear "
            "process warning. Use cool gray, green, and orange accents."
        ),
        "avoid": "single giant torn-paper label, decorative scrapbook style",
    },
    {
        "id": "library-research-mood",
        "name": "图书馆研究感",
        "instructions": (
            "Use a calm library research scene with bookshelves or reading table depth, "
            "one focused notebook page in the foreground, muted teal/burgundy accents, "
            "and quiet premium typography."
        ),
        "avoid": "pastel sticky-note board, cartoon stickers, oversized checklist chips",
    },
    {
        "id": "blackboard-annotation",
        "name": "黑板批注",
        "instructions": (
            "Use a chalkboard or marker-board concept: hand-drawn arrows, circled "
            "keywords, formula-like planning notes, and a high-contrast title. Make it "
            "feel like a senior advisor explaining a route."
        ),
        "avoid": "laptop email draft, notebook desk flat lay, coral/mint palette",
    },
    {
        "id": "minimal-type-poster",
        "name": "极简文字海报",
        "instructions": (
            "Use a minimal typography poster: no busy background, one strong headline, "
            "one small warning label, one abstract but concrete object silhouette such "
            "as paperclip, cursor, or folder tab. Premium Apple-like restraint."
        ),
        "avoid": "photo-realistic clutter, many props, sticker collage",
    },
    {
        "id": "soft-cute-notebook",
        "name": "软萌手账",
        "instructions": (
            "Use a soft cute notebook route with warm daylight, one notebook spread, "
            "limited stickers, rounded labels, and gentle pink/yellow accents. Keep it "
            "clean and do not reuse the same sticky-note checklist layout."
        ),
        "avoid": "overcrowded desk, giant torn-paper headline, repeated red underline formula",
    },
]


def list_cover_templates() -> list[dict[str, str]]:
    return COVER_TEMPLATES


def _static_url_prefix() -> str:
    return settings.test_static_url_prefix.rstrip("/")


def _is_generated_static_url(image_url: str) -> bool:
    prefix = _static_url_prefix()
    normalized_url = image_url.strip()
    if normalized_url.startswith(f"{prefix}/"):
        return True

    parsed = urlparse(normalized_url)
    return parsed.path.startswith(f"{prefix}/")


def _is_remote_url(image_url: str) -> bool:
    return urlparse(image_url.strip()).scheme in {"http", "https"}


def _image_extension_from_response(image_url: str, content_type: str) -> str:
    media_type = content_type.split(";", 1)[0].strip().lower()
    if media_type in IMAGE_MEDIA_TYPE_EXTENSIONS:
        return IMAGE_MEDIA_TYPE_EXTENSIONS[media_type]

    suffix = Path(urlparse(image_url).path).suffix.lower()
    if suffix in set(IMAGE_MEDIA_TYPE_EXTENSIONS.values()):
        return suffix

    return ".png"


def _image_download_timeout() -> float:
    return min(float(settings.image_timeout_seconds), REMOTE_IMAGE_DOWNLOAD_TIMEOUT_SECONDS)


def _is_unsafe_ip(ip_obj: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Check if an IP address is unsafe (private, loopback, reserved, or link-local).

    Also handles IPv4-mapped IPv6 addresses (e.g., ::ffff:127.0.0.1) by
    extracting and checking the embedded IPv4 address to prevent SSRF bypass.
    """
    if isinstance(ip_obj, ipaddress.IPv6Address) and ip_obj.ipv4_mapped is not None:
        ip_obj = ip_obj.ipv4_mapped
    return (
        ip_obj.is_private
        or ip_obj.is_loopback
        or ip_obj.is_reserved
        or ip_obj.is_link_local
    )


def _resolve_safe_remote_ip(url: str) -> str | None:
    """Resolve the URL hostname and return a safe public IP to pin.

    Prevents SSRF by rejecting URLs whose hostname resolves to private,
    loopback, reserved, or link-local addresses. Returns the first safe IP so
    the caller can pin the connection, avoiding a DNS-rebinding TOCTOU where a
    second DNS lookup inside the HTTP client could return a private address.
    Returns ``None`` if the URL is unsafe or unresolvable.
    """
    try:
        parsed = urlparse(url)
    except ValueError:
        return None
    if parsed.scheme not in {"http", "https"}:
        return None
    hostname = parsed.hostname
    if not hostname:
        return None
    # If the host is already an IP literal, validate it directly.
    try:
        ip_obj = ipaddress.ip_address(hostname)
        if _is_unsafe_ip(ip_obj):
            return None
        return hostname
    except ValueError:
        pass
    try:
        addr_info = socket.getaddrinfo(hostname, None)
    except (socket.gaierror, socket.herror, UnicodeError):
        return None
    safe_ip: str | None = None
    for family, _, _, _, sockaddr in addr_info:
        ip = sockaddr[0]
        try:
            ip_obj = ipaddress.ip_address(ip)
        except ValueError:
            continue
        if _is_unsafe_ip(ip_obj):
            return None
        if safe_ip is None:
            safe_ip = ip
    return safe_ip


def _is_safe_remote_url(url: str) -> bool:
    """Backward-compatible SSRF guard (kept for any external callers)."""
    return _resolve_safe_remote_ip(url) is not None


class _PinnedHTTPConnection(http.client.HTTPConnection):
    """HTTPConnection that connects to a pinned IP while keeping the
    original hostname in the automatically-set Host header."""

    def __init__(self, host: str, port: int, pinned_ip: str, timeout: float) -> None:
        super().__init__(host, port, timeout=timeout)
        self._pinned_ip = pinned_ip

    def connect(self) -> None:
        self.sock = socket.create_connection(
            (self._pinned_ip, self.port), timeout=self.timeout
        )


class _PinnedHTTPSConnection(http.client.HTTPSConnection):
    """HTTPSConnection that connects to a pinned IP while using the
    original hostname for SNI and certificate validation."""

    def __init__(
        self,
        host: str,
        port: int,
        pinned_ip: str,
        timeout: float,
        context: ssl.SSLContext,
    ) -> None:
        super().__init__(host, port, timeout=timeout, context=context)
        self._pinned_ip = pinned_ip

    def connect(self) -> None:
        sock = socket.create_connection(
            (self._pinned_ip, self.port), timeout=self.timeout
        )
        try:
            self.sock = self._context.wrap_socket(sock, server_hostname=self.host)
        except Exception:
            sock.close()
            raise


def _download_remote_image(image_url: str) -> tuple[bytes, str]:
    # Pin the TCP connection to a pre-validated IP to prevent DNS rebinding
    # (TOCTOU): we resolve and validate the IP once here, then connect directly
    # to that IP instead of letting the HTTP client re-resolve the hostname
    # (which could return a private address on a second lookup). http.client
    # does not follow redirects by default, matching follow_redirects=False.
    pinned_ip = _resolve_safe_remote_ip(image_url)
    if pinned_ip is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="图片URL不安全，拒绝下载。",
        )
    try:
        parsed = urlparse(image_url)
        scheme = parsed.scheme
        hostname = parsed.hostname or ""
        port = parsed.port or (443 if scheme == "https" else 80)
        path = parsed.path or "/"
        if parsed.query:
            path = f"{path}?{parsed.query}"
        timeout = _image_download_timeout()
        if scheme == "https":
            conn: http.client.HTTPConnection = _PinnedHTTPSConnection(
                hostname, port, pinned_ip, timeout, ssl.create_default_context()
            )
        else:
            conn = _PinnedHTTPConnection(hostname, port, pinned_ip, timeout)
        try:
            conn.request(
                "GET",
                path,
                headers={
                    "User-Agent": "ompc-image-localizer/1.0",
                    "Connection": "close",
                },
            )
            resp = conn.getresponse()
            if resp.status >= 300:
                raise OSError(f"remote image returned HTTP {resp.status}")
            # 在读取响应体之前检查 Content-Length，防止超大图片耗尽内存。
            declared_length = resp.getheader("content-length")
            if declared_length is not None:
                try:
                    declared_bytes = int(declared_length)
                except (ValueError, TypeError):
                    declared_bytes = 0
                if declared_bytes > REMOTE_IMAGE_MAX_BYTES:
                    raise OSError(
                        f"remote image too large: {declared_bytes} bytes"
                    )
            # 分块读取，防止无 Content-Length 的恶意大响应耗尽内存
            chunks: list[bytes] = []
            total = 0
            while True:
                chunk = resp.read(8192)
                if not chunk:
                    break
                total += len(chunk)
                if total > REMOTE_IMAGE_MAX_BYTES:
                    raise OSError(
                        f"remote image too large: {total} bytes"
                    )
                chunks.append(chunk)
            content = b"".join(chunks)
            content_type = resp.getheader("content-type", "")
        finally:
            conn.close()
    except (OSError, http.client.HTTPException) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="图片服务返回了远程封面，但保存到本地失败，请稍后重试。",
        ) from exc

    if not content:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="图片服务返回了空封面，无法保存到本地。",
        )
    if len(content) > REMOTE_IMAGE_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="图片服务返回的封面过大，无法保存到本地。",
        )

    return content, content_type


def localize_image_url(image_url: str, content_id: int, template: str) -> str:
    normalized_url = image_url.strip()
    if not normalized_url or not _is_remote_url(normalized_url):
        return normalized_url
    if _is_generated_static_url(normalized_url):
        parsed = urlparse(normalized_url)
        return parsed.path

    content, content_type = _download_remote_image(normalized_url)
    # Validate magic bytes to avoid saving non-image content (e.g. HTML error pages)
    if not content or len(content) < 12 or not any(
        content.startswith(magic) for magic in _REMOTE_IMAGE_MAGIC_BYTES
    ):
        logger.warning(
            "Skipping localization of remote image %s: content failed magic-bytes validation",
            normalized_url,
        )
        return normalized_url
    extension = _image_extension_from_response(normalized_url, content_type)
    digest = hashlib.sha256(content).hexdigest()[:12]
    template_slug = FILENAME_RE.sub("-", template.lower()).strip("-")[:24] or "cover"
    filename = f"remote-cover-{content_id}-{template_slug}-{digest}{extension}"
    try:
        GENERATED_ASSET_ROOT.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="创建图片目录失败，请稍后重试。",
        ) from exc
    target = GENERATED_ASSET_ROOT / filename
    try:
        target.write_bytes(content)
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="图片保存到本地失败，请稍后重试。",
        ) from exc
    return f"{_static_url_prefix()}/{filename}"


def _cleanup_local_image_file(image_url: str) -> None:
    """删除本地化图片时写入的孤儿文件（commit 失败时调用）。"""
    prefix = _static_url_prefix()
    normalized = image_url.strip()
    if not normalized.startswith(f"{prefix}/"):
        return
    filename = normalized[len(prefix):].lstrip("/")
    if not filename:
        return
    target = GENERATED_ASSET_ROOT / filename
    try:
        resolved_target = target.resolve()
        resolved_root = GENERATED_ASSET_ROOT.resolve()
        if not resolved_target.is_relative_to(resolved_root):
            logger.warning("Skipping cleanup of path outside asset root: %s", target)
            return
        resolved_target.unlink(missing_ok=True)
    except OSError:
        logger.warning("Failed to delete orphan image file: %s", target, exc_info=True)


def ensure_images_are_local(db: Session, images: list[GeneratedImage]) -> None:
    changed = False
    localized_urls: list[str] = []
    for image in images:
        if not image.image_url or not _is_remote_url(image.image_url):
            continue
        try:
            localized_url = localize_image_url(
                image.image_url,
                content_id=image.content_id,
                template=image.template or "cover",
            )
        except HTTPException:
            logger.warning(
                "ensure_images_are_local: failed to localize image URL %s",
                image.image_url,
                exc_info=True,
            )
            continue
        if localized_url != image.image_url:
            image.image_url = localized_url
            changed = True
            localized_urls.append(localized_url)
    if changed:
        try:
            with db.begin_nested():
                db.flush()
        except Exception:
            logger.warning("ensure_images_are_local flush failed", exc_info=True)
            for url in localized_urls:
                _cleanup_local_image_file(url)
            raise


def list_images(db: Session, content_id: int | None, limit: int, user_id: int) -> list[GeneratedImage]:
    statement = select(GeneratedImage).order_by(desc(GeneratedImage.created_at)).limit(limit)
    # Filter by content ownership via a subquery, also include orphan images
    # (content_id is None) created by the same user.
    user_content_ids = select(Content.id).where(Content.user_id == user_id)
    if content_id is not None:
        statement = statement.where(
            GeneratedImage.content_id == content_id,
            GeneratedImage.content_id.in_(user_content_ids),
        )
    else:
        statement = statement.where(
            or_(
                GeneratedImage.content_id.in_(user_content_ids),
                GeneratedImage.created_by == user_id,
            )
        )
    return list(db.scalars(statement).all())


def get_content_for_image(db: Session, content_id: int, user_id: int) -> Content:
    content = db.get(Content, content_id)
    if content is None or content.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这条内容。",
        )
    if content.status not in IMAGE_GENERATABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="只有草稿、已改写、待审核或人工批准后的内容可以生成封面图。",
        )
    return content


def _image_source_excerpt(
    value: object,
    max_length: int = IMAGE_SOURCE_CONTEXT_EXCERPT_LENGTH,
) -> str:
    text = " ".join(str(value or "").split())
    if len(text) <= max_length:
        return text
    return f"{text[:max_length].rstrip()}..."


def _image_source_context(source_context: object) -> dict[str, object] | None:
    if not isinstance(source_context, dict):
        return None

    knowledge_items = []
    for raw_item in source_context.get("knowledge_items") or []:
        if not isinstance(raw_item, dict):
            continue
        knowledge_items.append(
            {
                "title": _image_source_excerpt(raw_item.get("title"), 140),
                "category": raw_item.get("category"),
                "content": _image_source_excerpt(raw_item.get("content")),
            }
        )

    web_search = source_context.get("web_search")
    compact_web_search = None
    if isinstance(web_search, dict):
        web_results = []
        for raw_result in web_search.get("results") or []:
            if not isinstance(raw_result, dict):
                continue
            web_results.append(
                {
                    "title": _image_source_excerpt(raw_result.get("title"), 140),
                    "url": _image_source_excerpt(raw_result.get("url"), 500),
                    "content": _image_source_excerpt(raw_result.get("content")),
                }
            )
        compact_web_search = {
            "required": bool(web_search.get("required")),
            "provider": web_search.get("provider"),
            "query": _image_source_excerpt(web_search.get("query"), 240),
            "answer": _image_source_excerpt(web_search.get("answer"), 500),
            "results": web_results[:5],
        }

    compact_context = {
        "review_note": _image_source_excerpt(source_context.get("review_note"), 500),
        "knowledge_items": knowledge_items[:5],
        "web_search": compact_web_search,
    }
    return compact_context


def _next_visual_variant_index(db: Session, content_id: int) -> int:
    count = db.scalar(
        select(func.count(GeneratedImage.id)).where(
            GeneratedImage.content_id == content_id
        )
    )
    return count or 0


def select_cover_visual_direction(
    content: Content,
    template_id: str,
    variant_index: int = 0,
) -> dict[str, str]:
    source = "|".join(
        [
            str(content.id or ""),
            content.platform or "",
            content.title or "",
            content.body or "",
            template_id,
        ]
    )
    digest = hashlib.sha256(source.encode("utf-8")).hexdigest()
    start_index = int(digest[:8], 16) % len(COVER_VISUAL_DIRECTIONS)
    index = (start_index + variant_index) % len(COVER_VISUAL_DIRECTIONS)
    return COVER_VISUAL_DIRECTIONS[index]


def build_image_prompt_package(
    content: Content,
    payload: ImageGenerateRequest,
    current_user: User,
    variant_index: int = 0,
) -> PromptPackage:
    template = next(
        (item for item in COVER_TEMPLATES if item["id"] == payload.template),
        None,
    )
    if template is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="未识别的封面模板。",
        )

    return PromptPackage(
        prompt_name="image_generation",
        prompt_template=load_prompt("image_generation"),
        payload={
            "content_id": content.id,
            "platform": content.platform,
            "title": content.title,
            "body": content.body,
            "tags": content.tags or [],
            "source_context": _image_source_context(content.source_context),
            "content_status": content.status,
            "template": template,
            "aspect_ratio": payload.aspect_ratio,
            "style_notes": payload.style_notes,
            "visual_direction": select_cover_visual_direction(
                content=content,
                template_id=payload.template,
                variant_index=variant_index,
            ),
            "style_reference": load_platform_style_reference(content.platform),
            "user": {
                "id": current_user.id,
                "role": current_user.role,
            },
        },
    )


def generate_image_asset(
    db: Session,
    payload: ImageGenerateRequest,
    current_user: User,
) -> GeneratedImage:
    content = get_content_for_image(db, payload.content_id, current_user.id)
    package = build_image_prompt_package(
        content,
        payload,
        current_user,
        variant_index=_next_visual_variant_index(db, content.id),
    )
    try:
        raw_image_url = model_router.image_model(package.prompt_name, package.payload)
    except HTTPException as exc:
        try:
            record_generation_log(
                db=db,
                current_user=current_user,
                purpose="image_generation",
                model="image_model",
                package=package,
                result="",
                log_status="provider_not_configured",
                error=str(exc.detail),
            )
            _safe_commit(db)
        except Exception:
            logger.error("Failed to record generation log", exc_info=True)
        raise
    except Exception as exc:
        try:
            record_generation_log(
                db=db,
                current_user=current_user,
                purpose="image_generation",
                model="image_model",
                package=package,
                result="",
                log_status="error",
                error=str(exc),
            )
            _safe_commit(db)
        except Exception:
            logger.error("Failed to record generation log", exc_info=True)
        raise

    try:
        image_url = localize_image_url(
            raw_image_url,
            content_id=content.id,
            template=payload.template,
        )
    except HTTPException as exc:
        try:
            record_generation_log(
                db=db,
                current_user=current_user,
                purpose="image_generation",
                model="image_model",
                package=package,
                result=raw_image_url,
                log_status="localization_failed",
                error=str(exc.detail),
            )
            _safe_commit(db)
        except Exception:
            logger.error("Failed to record generation log", exc_info=True)
        raise
    except Exception as exc:
        try:
            record_generation_log(
                db=db,
                current_user=current_user,
                purpose="image_generation",
                model="image_model",
                package=package,
                result=raw_image_url,
                log_status="error",
                error=str(exc),
            )
            _safe_commit(db)
        except Exception:
            logger.error("Failed to record generation log", exc_info=True)
        raise

    # 判断 localize_image_url 是否写入了新的本地文件（commit 失败时用于清理孤儿文件）
    wrote_local_file = _is_generated_static_url(image_url) or (
        _is_remote_url(raw_image_url)
        and not _is_generated_static_url(raw_image_url)
    )

    image = GeneratedImage(
        content_id=content.id,
        created_by=current_user.id,
        image_url=image_url,
        template=payload.template,
        prompt=package.to_log_text(),
        status="generated" if content.status == "approved" else "needs_review",
    )
    db.add(image)
    try:
        db.flush()
    except Exception:
        db.rollback()
        if wrote_local_file:
            _cleanup_local_image_file(image_url)
        raise
    try:
        db.refresh(image)
    except Exception:
        db.rollback()
        if wrote_local_file:
            _cleanup_local_image_file(image_url)
        raise
    try:
        log_entry = record_generation_log(
            db=db,
            current_user=current_user,
            purpose="image_generation",
            model="image_model",
            package=package,
            result=image_url,
            log_status="success",
        )
        if log_entry is None:
            logger.warning(
                "record_generation_log returned None for image_generation "
                "(content_id=%s, user_id=%s); audit log may be missing",
                content.id,
                current_user.id,
            )
        db.commit()
    except Exception:
        db.rollback()
        if wrote_local_file:
            _cleanup_local_image_file(image_url)
        raise
    return image
