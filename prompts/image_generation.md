# Image Generation Prompt

Generate a platform-ready cover image for OPC content. The output is an image
generation prompt, not a publishing approval.

Core rules:

- Use the content title, body, platform, selected cover template, aspect ratio,
  tags, style notes, `visual_direction`, and `style_reference`.
- For Xiaohongshu covers using `3:4`, target a 1K-wide mobile canvas:
  1024px wide by about 1360px tall, with the same vertical cover feel used in
  Xiaohongshu notes.
- The primary cover headline must copy the content title verbatim unless the
  payload provides a shorter approved cover headline.
- Keep text overlays short enough for mobile scanning.
- Never imply official admission, guaranteed results, school endorsement,
  certificates, official seals, fake university logos, or fake offer letters.
- Draft and rewritten content may produce cover previews, but the image must be
  treated as `needs_review` until a human approves it. Publishing still requires
  manual confirmation.

High-attraction Xiaohongshu cover formula:

- Build the cover around one clear anxiety, mistake, route map, or
  counter-intuitive hook.
- Use the selected `visual_direction` as the dominant art direction. It
  overrides generic platform guidance.
- Do not repeat the same default "study desk + sticky notes + coral/mint
  checklist" look unless the selected visual direction explicitly asks for it.
- Use oversized Chinese headline typography with 2-4 stacked lines, black or
  very dark text, strong contrast, and one emphasized word, badge, or underline.
- Keep every headline character fully inside the canvas. Leave at least 8% safe
  margin on all sides; no Chinese text, label, badge, underline, or checklist
  chip may touch or bleed past the image edge.
- If the title is long, reduce the font size and wrap it into complete lines
  instead of cropping, hiding, or letting any character run off-canvas.
- Add one small risk/warning tag when useful, such as `先别急`, `避坑`, `顺序别反`.
- Add 2-3 short checklist chips only when the selected direction supports chips,
  e.g. `研究方向`, `导师匹配`, `邮件时机`.
- For route/list topics, prefer a `路线/榜单型封面`: 4-5 route buckets, one clear
  headline, verified school/project names only when supplied, and one short cue
  per item. If verified school data is not supplied, use route labels and
  decision criteria instead of inventing names.
- Keep the cover readable on a phone. Prefer one strong composition over many
  small labels.
- Avoid generic gradient posters, empty abstract backgrounds, tiny unreadable
  text, cluttered infographic grids, fake platform UI, and official brand logos.
- Avoid copying a previous generated cover style for the same project. Vary the
  scene, palette, layout, props, and graphic language across generations.
- Before writing the final image prompt, choose one distinct cover route and
  name it inside the prompt. Rotate across these routes when no route is
  provided: route matrix, decision map, minimal bold text, phone-feed collage,
  academic blueprint, magazine editorial, workflow board, blackboard/classroom,
  library research mood, and soft cute notebook.
- If a recent or previous cover used a desk, sticky notes, coral/mint checklist,
  paper-cutout headline, or red underline, pick a route that avoids at least
  three of those repeated elements.
- For keyword-led doctoral content, match the visual route to the title angle:
  `水博` should feel like route sorting, risk clarification, or myth-busting;
  `硕升博` should feel like route planning and sequence correction; `土博`
  should feel like reality-check positioning; `升博` should feel like a
  practical starting map.
- The operator-viewed `水博榜` sample is a structural reference: matrix cover,
  route buckets, school/project pool, and one decision cue per item. Do not copy
  its layout one-to-one or reuse unverified claims.

Return an image prompt that is directly usable by the image provider.
