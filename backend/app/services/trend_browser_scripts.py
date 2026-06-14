from __future__ import annotations


def raw_visible_items_script() -> str:
    return """
() => {
  const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
  const firstText = (root, selectors, maxLength = 80) => {
    for (const selector of selectors) {
      for (const element of Array.from(root.querySelectorAll(selector)).slice(0, 8)) {
        const text = normalize(element.innerText || element.textContent || element.getAttribute('aria-label') || element.getAttribute('title') || '');
        if (text && text.length <= maxLength) return text;
      }
    }
    return '';
  };
  const metricText = (root, selectors) => {
    const values = [];
    for (const selector of selectors) {
      for (const element of Array.from(root.querySelectorAll(selector)).slice(0, 8)) {
        const text = normalize([
          element.getAttribute('aria-label') || '',
          element.getAttribute('title') || '',
          element.innerText || element.textContent || ''
        ].join(' '));
        if (text) values.push(text);
      }
    }
    return values.join(' ');
  };
  const urlFromSrcset = (srcset) => {
    const candidates = String(srcset || '')
      .split(',')
      .map((part) => part.trim().split(/\\s+/)[0])
      .filter(Boolean);
    return candidates[candidates.length - 1] || '';
  };
  const cssImageUrl = (value) => {
    const match = String(value || '').match(/url\\((['"]?)(.*?)\\1\\)/);
    return match ? match[2] : '';
  };
  const imageUrl = (image) => (
    image.currentSrc ||
    image.src ||
    image.getAttribute('data-src') ||
    image.getAttribute('data-original') ||
    image.getAttribute('data-original-src') ||
    image.getAttribute('data-lazy') ||
    image.getAttribute('data-lazy-src') ||
    image.getAttribute('data-url') ||
    urlFromSrcset(image.getAttribute('srcset')) ||
    urlFromSrcset(image.getAttribute('data-srcset')) ||
    ''
  );
  const candidateRoots = (root, linkNode) => {
    const roots = [];
    const push = (node) => {
      if (node && !roots.includes(node)) roots.push(node);
    };
    push(root);
    push(linkNode);
    push(linkNode?.closest('article, section, [class*="note"], [class*="card"], [class*="feed"], [class*="item"]'));
    push(root.closest?.('article, section, [class*="note"], [class*="card"], [class*="feed"], [class*="item"]'));
    push(root.parentElement);
    return roots;
  };
  const coverUrl = (root, linkNode) => {
    const images = [];
    for (const candidateRoot of candidateRoots(root, linkNode)) {
      const rootRect = candidateRoot.getBoundingClientRect();
      const backgroundUrl = cssImageUrl(getComputedStyle(candidateRoot).backgroundImage);
      if (backgroundUrl) {
        images.push({
          url: backgroundUrl,
          area: rootRect.width * rootRect.height,
          marker: String(candidateRoot.className || '').toLowerCase()
        });
      }
      for (const image of Array.from(candidateRoot.querySelectorAll('img, picture source')).slice(0, 12)) {
        const owner = image.tagName === 'SOURCE' ? image.closest('picture') || image : image;
        const rect = owner.getBoundingClientRect();
        const url = image.tagName === 'SOURCE' ? urlFromSrcset(image.getAttribute('srcset')) : imageUrl(image);
        const marker = `${image.className || ''} ${image.alt || ''}`.toLowerCase();
        images.push({ url, area: rect.width * rect.height, marker });
      }
    }
    return images.filter((item) => {
      if (!item.url || item.url.startsWith('data:') || item.url.startsWith('blob:')) return false;
      if (item.area < 1600) return false;
      return !/avatar|user|icon|logo|sprite|emoji/.test(item.marker);
    }).sort((left, right) => right.area - left.area)[0]?.url || '';
  };
  const selectors = [
    'a[href*="/explore/"]',
    'a[href*="/discovery/item/"]',
    'article',
    'section',
    '[class*="note"]',
    '[class*="card"]',
    'a',
    'div'
  ];
  const nodes = [];
  const seen = new Set();
  for (const selector of selectors) {
    for (const node of Array.from(document.querySelectorAll(selector)).slice(0, 900)) {
      if (seen.has(node)) continue;
      seen.add(node);
      nodes.push(node);
      if (nodes.length >= 1200) break;
    }
    if (nodes.length >= 1200) break;
  }
  const items = [];
  for (const node of nodes) {
    const linkNode = node.tagName === 'A' ? node : node.querySelector('a[href]');
    const text = [
      node.innerText || node.textContent || '',
      node.getAttribute('aria-label') || '',
      node.getAttribute('title') || '',
      linkNode?.getAttribute('aria-label') || '',
      linkNode?.getAttribute('title') || ''
    ].join(' ').trim();
    if (!text || text.length < 20) continue;
    const url = linkNode ? linkNode.href : location.href;
    items.push({
      text,
      url,
      className: String(node.className || ''),
      author: firstText(node, [
        '[class*="author"] [class*="name"]',
        '[class*="author"]',
        'a[href*="/user/profile/"]',
        '[class*="user"] [class*="name"]',
        '[class*="nickname"]'
      ]),
      likesText: metricText(node, ['[class*="like"]', '[aria-label*="赞"]', '[title*="赞"]']),
      favoritesText: metricText(node, [
        '[class*="collect"]',
        '[class*="favorite"]',
        '[aria-label*="藏"]',
        '[aria-label*="收藏"]',
        '[title*="藏"]',
        '[title*="收藏"]'
      ]),
      commentsText: metricText(node, ['[class*="comment"]', '[aria-label*="评"]', '[title*="评"]']),
      sharesText: metricText(node, [
        '[class*="share"]',
        '[aria-label*="转"]',
        '[aria-label*="分享"]',
        '[title*="转"]',
        '[title*="分享"]'
      ]),
      coverUrl: coverUrl(node, linkNode)
    });
    if (items.length >= 240) break;
  }
  return items;
}
""".strip()


def detail_visible_item_script() -> str:
    return """
() => {
  const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
  const meta = (selector) => normalize(document.querySelector(selector)?.getAttribute('content') || '');
  const firstText = (selectors, maxLength = 160) => {
    for (const selector of selectors) {
      for (const element of Array.from(document.querySelectorAll(selector)).slice(0, 12)) {
        const text = normalize(element.innerText || element.textContent || element.getAttribute('aria-label') || element.getAttribute('title') || '');
        if (text && text.length <= maxLength) return text;
      }
    }
    return '';
  };
  const longestText = (selectors) => {
    const values = [];
    for (const selector of selectors) {
      for (const element of Array.from(document.querySelectorAll(selector)).slice(0, 24)) {
        const text = normalize(element.innerText || element.textContent || '');
        if (text && text.length >= 10) values.push(text);
      }
    }
    values.sort((left, right) => right.length - left.length);
    return values[0] || '';
  };
  const metricText = (selectors) => {
    const values = [];
    for (const selector of selectors) {
      for (const element of Array.from(document.querySelectorAll(selector)).slice(0, 12)) {
        const text = normalize([
          element.getAttribute('aria-label') || '',
          element.getAttribute('title') || '',
          element.innerText || element.textContent || ''
        ].join(' '));
        if (text) values.push(text);
      }
    }
    return values.join(' ');
  };
  const usefulContent = (value, title = '') => {
    const text = normalize(value);
    const normalizedTitle = normalize(title);
    if (!text || text.length < 12) return '';
    if (normalizedTitle && text === normalizedTitle) return '';
    if (/小红书.*生活方式平台|标记我的生活|当前笔记暂时无法浏览|安全限制|登录后查看/.test(text)) return '';
    return text;
  };
  const countText = (label, value) => {
    const text = normalize(value);
    return text ? `${label} ${text}` : '';
  };
  const firstValue = (...values) => values.map(normalize).find(Boolean) || '';
  const imageFromState = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      for (const item of value) {
        const url = imageFromState(item);
        if (url) return url;
      }
      return '';
    }
    if (typeof value !== 'object') return '';
    return firstValue(
      value.urlDefault,
      value.urlPre,
      value.url,
      value.src,
      value.original,
      value.masterUrl
    );
  };
  const noteFromStateObject = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const user = value.user || value.userInfo || value.author || {};
    const interact = value.interactInfo || value.interact || value.interaction || {};
    const title = firstValue(value.title, value.displayTitle, value.noteTitle);
    const content = usefulContent(
      firstValue(value.desc, value.content, value.noteContent, value.description, value.summary),
      title
    );
    const coverUrl = imageFromState(
      value.imageList || value.images || value.cover || value.coverUrl || value.mediaList
    );
    const author = firstValue(user.nickname, user.name, user.userName, value.nickname, value.authorName);
    const likesText = countText('赞', firstValue(interact.likedCount, interact.likeCount, value.likedCount, value.likes));
    const favoritesText = countText(
      '收藏',
      firstValue(interact.collectedCount, interact.collectCount, value.collectedCount, value.favorites)
    );
    const commentsText = countText('评论', firstValue(interact.commentCount, value.commentCount, value.comments));
    const sharesText = countText('分享', firstValue(interact.shareCount, value.shareCount, value.shares));
    if (!title && !content && !coverUrl && !author) return null;
    return { title, content, author, likesText, favoritesText, commentsText, sharesText, coverUrl };
  };
  const collectStateNotes = (value, notes, depth = 0, seen = new Set()) => {
    if (!value || depth > 8 || seen.has(value)) return;
    if (typeof value !== 'object') return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value.slice(0, 120)) collectStateNotes(item, notes, depth + 1, seen);
      return;
    }
    const note = noteFromStateObject(value);
    if (note) notes.push(note);
    for (const key of Object.keys(value).slice(0, 160)) {
      if (/html|style|svg/i.test(key)) continue;
      collectStateNotes(value[key], notes, depth + 1, seen);
    }
  };
  const parsedStateNotes = () => {
    const notes = [];
    for (const script of Array.from(document.scripts).slice(0, 80)) {
      const text = script.textContent || '';
      if (!/(noteDetailMap|interactInfo|likedCount|collectedCount|\"desc\"|\\bdesc\\b)/.test(text)) continue;
      const jsonTexts = [];
      if ((script.type || '').includes('json')) {
        jsonTexts.push(text);
      } else {
        const markerIndex = text.indexOf('__INITIAL_STATE__');
        if (markerIndex >= 0) {
          const firstStateBrace = text.indexOf('{', markerIndex);
          const lastStateBrace = text.lastIndexOf('}');
          if (firstStateBrace >= 0 && lastStateBrace > firstStateBrace) {
            jsonTexts.push(text.slice(firstStateBrace, lastStateBrace + 1));
          }
        }
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) jsonTexts.push(text.slice(firstBrace, lastBrace + 1));
      }
      for (const jsonText of jsonTexts) {
        try {
          collectStateNotes(JSON.parse(jsonText), notes);
        } catch (_error) {}
      }
    }
    return notes
      .filter((note) => note.content || note.title || note.coverUrl)
      .sort((left, right) => {
        const leftScore = (left.content?.length || 0) * 3 + (left.coverUrl ? 80 : 0) + (left.likesText ? 30 : 0);
        const rightScore = (right.content?.length || 0) * 3 + (right.coverUrl ? 80 : 0) + (right.likesText ? 30 : 0);
        return rightScore - leftScore;
      })[0] || null;
  };
  const urlFromSrcset = (srcset) => {
    const candidates = String(srcset || '')
      .split(',')
      .map((part) => part.trim().split(/\\s+/)[0])
      .filter(Boolean);
    return candidates[candidates.length - 1] || '';
  };
  const cssImageUrl = (value) => {
    const match = String(value || '').match(/url\\((['"]?)(.*?)\\1\\)/);
    return match ? match[2] : '';
  };
  const imageUrl = (image) => (
    image.currentSrc ||
    image.src ||
    image.getAttribute('data-src') ||
    image.getAttribute('data-original') ||
    image.getAttribute('data-original-src') ||
    image.getAttribute('data-lazy') ||
    image.getAttribute('data-lazy-src') ||
    image.getAttribute('data-url') ||
    urlFromSrcset(image.getAttribute('srcset')) ||
    urlFromSrcset(image.getAttribute('data-srcset')) ||
    ''
  );
  const coverUrl = () => {
    const metaImage = meta('meta[property="og:image"]') || meta('meta[name="og:image"]');
    if (metaImage) return metaImage;
    const images = [];
    for (const element of Array.from(document.querySelectorAll('main, article, section, [class*="note"], [class*="content"], [class*="media"]')).slice(0, 40)) {
      const rect = element.getBoundingClientRect();
      const backgroundUrl = cssImageUrl(getComputedStyle(element).backgroundImage);
      if (backgroundUrl) {
        images.push({
          url: backgroundUrl,
          area: rect.width * rect.height,
          marker: String(element.className || '').toLowerCase()
        });
      }
    }
    for (const image of Array.from(document.querySelectorAll('img, picture source')).slice(0, 80)) {
      const owner = image.tagName === 'SOURCE' ? image.closest('picture') || image : image;
      const rect = owner.getBoundingClientRect();
      const url = image.tagName === 'SOURCE' ? urlFromSrcset(image.getAttribute('srcset')) : imageUrl(image);
      const marker = `${image.className || ''} ${image.alt || ''}`.toLowerCase();
      images.push({ url, area: rect.width * rect.height, marker });
    }
    return images.filter((item) => {
      if (!item.url || item.url.startsWith('data:') || item.url.startsWith('blob:')) return false;
      if (item.area < 1600) return false;
      return !/avatar|user|icon|logo|sprite|emoji/.test(item.marker);
    }).sort((left, right) => right.area - left.area)[0]?.url || '';
  };
  const stateNote = parsedStateNotes();
  const visibleTitle = meta('meta[property="og:title"]') || firstText(['h1', '[class*="title"]']) || document.title;
  const visibleContent = longestText([
      '[class*="desc"]',
      '[class*="content"]',
      '[class*="note"]',
      'main'
    ]);
  return {
    title: stateNote?.title || visibleTitle,
    content: stateNote?.content || usefulContent(visibleContent, visibleTitle) || usefulContent(meta('meta[name="description"]'), visibleTitle) || usefulContent(meta('meta[property="og:description"]'), visibleTitle),
    author: stateNote?.author || firstText([
      '[class*="author"] [class*="name"]',
      '[class*="author"]',
      'a[href*="/user/profile/"]',
      '[class*="user"] [class*="name"]',
      '[class*="nickname"]'
    ], 80),
    likesText: stateNote?.likesText || metricText(['[class*="like"]', '[aria-label*="赞"]', '[title*="赞"]']),
    favoritesText: stateNote?.favoritesText || metricText([
      '[class*="collect"]',
      '[class*="favorite"]',
      '[aria-label*="藏"]',
      '[aria-label*="收藏"]',
      '[title*="藏"]',
      '[title*="收藏"]'
    ]),
    commentsText: stateNote?.commentsText || metricText(['[class*="comment"]', '[aria-label*="评"]', '[title*="评"]']),
    sharesText: stateNote?.sharesText || metricText([
      '[class*="share"]',
      '[aria-label*="转"]',
      '[aria-label*="分享"]',
      '[title*="转"]',
      '[title*="分享"]'
    ]),
    coverUrl: stateNote?.coverUrl || coverUrl()
  };
}
""".strip()
