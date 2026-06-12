const xhsStickerPreviewByCode = new Map<string, { face: string; name: string }>(
  [
    ["[笑哭R]", { face: "😂", name: "笑哭" }],
    ["[哭惹R]", { face: "🥺", name: "哭惹" }],
    ["[哇R]", { face: "😮", name: "哇" }],
    ["[赞R]", { face: "👍", name: "赞" }],
    ["[doge]", { face: "😏", name: "doge" }],
    ["[蹲后续H]", { face: "🪑", name: "蹲后续" }],
    ["[蹲后续R]", { face: "🪑", name: "蹲后续" }]
  ] as const
);

function xhsStickerFallback(code: string) {
  const match = code.match(/^\[([^\[\]]+?)(?:[RH])?\]$/);
  if (!match) {
    return null;
  }
  return {
    face: "💬",
    name: match[1]
  };
}

export function renderXhsExpressionText(text: string) {
  return text.split(/(\[[^\[\]]+\])/g).map((part, index) => {
    const sticker = xhsStickerPreviewByCode.get(part) ?? xhsStickerFallback(part);
    if (!sticker) {
      return part;
    }
    return (
      <span
        aria-label={`${sticker.name}表情`}
        className="mx-0.5 inline-flex h-6 min-w-6 translate-y-[3px] items-center justify-center rounded-full border border-[#ffd4dc] bg-[#fff3f6] px-1.5 text-base leading-none shadow-sm"
        key={`${part}-${index}`}
        title={`${part}：${sticker.name}，预览显示为近似表情，复制时仍保留原字符码`}
      >
        {sticker.face}
      </span>
    );
  });
}
