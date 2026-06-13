export async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (_error) {
      // Fall back to the selection-based copy path below.
    }
  }

  const previouslyFocusedElement =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "50%";
  textarea.style.top = "50%";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.border = "0";
  textarea.style.padding = "0";
  textarea.style.opacity = "0.01";
  textarea.style.color = "transparent";
  textarea.style.background = "transparent";
  textarea.style.transform = "translate(-50%, -50%)";
  textarea.style.fontSize = "16px";
  document.body.appendChild(textarea);
  textarea.focus({ preventScroll: true });
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  const copied = document.execCommand("copy");
  textarea.remove();
  previouslyFocusedElement?.focus({ preventScroll: true });
  if (!copied) {
    throw new Error("剪贴板复制失败，请手动选择文案复制。");
  }
}

export async function tryCopyText(text: string) {
  try {
    await copyText(text);
    return true;
  } catch (_error) {
    return false;
  }
}
