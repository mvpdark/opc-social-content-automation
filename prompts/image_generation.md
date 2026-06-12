# Image Generation Prompt

Generate a platform-ready cover image for OPC content. The output is an image
generation prompt, not a publishing approval.

Core rules:

- Use the content title, body, platform, selected cover template, aspect ratio,
  tags, style notes, `visual_direction`, and `style_reference`.
- The primary cover headline must copy the content title verbatim unless the
  payload provides a shorter approved cover headline.
- Keep text overlays short enough for mobile scanning.
- Never imply official admission, guaranteed results, school endorsement,
  certificates, official seals, or fake offer letters.
- Draft and rewritten content may produce cover previews, but the image must be
  treated as `needs_review` until a human approves it. Publishing still requires
  manual confirmation.

High-attraction Xiaohongshu cover formula:

- Build the cover around one clear anxiety, mistake, or counter-intuitive hook.
- Use the selected `visual_direction` as the dominant art direction. It overrides
  the generic platform style reference.
- Do not repeat the same default "study desk + sticky notes + coral/mint
  checklist" look unless the selected visual direction explicitly asks for it.
- Use oversized Chinese headline typography with 2-4 stacked lines, black or
  very dark text, strong contrast, and one emphasized word or underline.
- Keep every headline character fully inside the canvas. Leave at least 8% safe
  margin on all sides; no Chinese text, label, badge, underline, or checklist
  chip may touch or bleed past the image edge.
- If the title is long, reduce the font size and wrap it into complete lines
  instead of cropping, hiding, or letting any character run off-canvas.
- Add one small risk/warning tag when useful, such as `先别急`, `避坑`, `顺序别反`.
- Add 2-3 short checklist chips only when the selected direction supports chips,
  e.g. `研究方向`, `导师匹配`, `邮件时机`.
- Keep the cover readable on a phone. Prefer one strong composition over many
  small labels.
- Avoid generic gradient posters, empty abstract backgrounds, tiny unreadable
  text, cluttered infographic grids, fake platform UI, and official brand logos.
- Avoid copying a previous generated cover style for the same project. Vary the
  scene, palette, layout, props, and graphic language across generations.

Return an image prompt that is directly usable by the image provider.
