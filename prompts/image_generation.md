# Image Generation Prompt — 高吸引力引流版

Generate a platform-ready cover image for Xiaohongshu post. The cover is the
#1 factor in click-through rate. It must stop the scroll instantly.

## Core Design Philosophy

The cover is NOT a decorative illustration. It is a VISUAL HEADLINE that
competes for attention in a fast-scroll feed. It must:

1. Convey the core hook in under 1 second
2. Trigger emotion (anxiety, curiosity, relief, FOMO)
3. Look like a real person's post, not a brand advertisement
4. Be readable on a phone screen at thumbnail size

## Cover Formula (High-CTR Xiaohongshu)

### Typography First

- Oversized Chinese headline text, 2-4 stacked lines
- Font: bold, rounded, or handwriting-style (not formal serif)
- Color: black or very dark on light background, OR white on dark/photo
- One keyword highlighted: circled, underlined, or in accent color (red/orange)
- Text must fill 40-60% of the canvas area
- Every character fully inside canvas with 8% safe margin

### Emotional Hooks (choose one per cover)

- **Warning signal**: red circle/slash icon, "避坑" tag, danger color cues
- **Pain-point mirror**: a relatable scene (phone showing 0 replies, rejected email)
- **Counter-intuitive arrow**: "X→Y" visual showing wrong vs right approach
- **Checklist card**: 3-5 items with checkmarks/crosses, scannable in 2 seconds
- **Before/after split**: left side = mistake, right side = correct approach
- **Number shock**: oversized number ("90%", "0回复", "8个坑") as visual anchor

### Layout Routes (rotate, never repeat)

The `visual_direction` field provides the specific layout style. Map it to
the closest creative execution below:

1. **minimal-type-poster**: Solid color background (cream/navy/sage), oversized headline, one small icon. Clean, magazine-like.
2. **phone-proof-collage**: Realistic phone screen showing email/chat/note app with the hook as content. Feels authentic.
3. **soft-cute-notebook**: Casual handwriting on grid/lined paper, arrows, circles, margin notes. Feels personal and relatable.
4. **route-matrix-board**: Clean data visualization (route map, decision tree, timeline) with minimal text labels.
5. **editorial-magazine**: Magazine cover style with bold typography, clean layout, professional feel.
6. **workflow-board**: Process flow / checklist board with numbered steps and visual hierarchy.
7. **blackboard-annotation**: Chalk-style handwriting on dark green/black board. Academic but approachable.
8. **dark-academic-blueprint**: Dark blueprint style with technical drawing aesthetic, white lines on dark blue.
9. **library-research-mood**: Warm library/study scene with books, notes, and ambient lighting.

If `style_notes` specifies "warning label", "comparison split", or other
concepts not in the list above, map them to the closest layout route and
adapt the execution accordingly.

### Color Psychology

- Pain/避坑 topics: warm reds, orange accents, warning yellow
- Pain-point topics: muted blues, soft purples (empathy, calm)
- Route/planning topics: fresh greens, teals (clarity, direction)
- Case/success topics: warm gold, soft pink (achievement, warmth)
- Use 2-3 colors max per cover. Avoid rainbow palettes.

### What Kills CTR (Avoid)

- Generic gradient backgrounds with no emotional hook
- Tiny text that can't be read at thumbnail size
- Too many elements competing for attention
- Corporate/brand look (feels like an ad, users scroll past)
- Stock photo style images without text overlay
- Cluttered infographics with 10+ data points
- Fake university seals, logos, or admission letters
- Same layout repeated across posts (users develop banner blindness)

## Topic-Specific Cover Direction

Match the cover style to the topic type for maximum resonance:

| Topic Type | Cover Style | Emotional Trigger |
|-----------|-------------|-------------------|
| 避坑 (pitfall) | Warning label / comparison split / red X marks | Fear of making mistakes |
| 痛点 (pain point) | Phone screenshot / hand-drawn note / empathy scene | "That's me!" recognition |
| 案例 (case study) | Timeline / before-after / sticky note collage | Hope + credibility |
| 路线 (route) | Decision tree / route map / infographic card | Clarity + direction |

## Technical Rules

- For Xiaohongshu 3:4 ratio: 1024px wide x ~1366px tall
- Primary cover headline = content title, verbatim
- Text overlays short enough for mobile scanning
- Never imply official admission, guaranteed results, school endorsement
- Never use fake university seals, logos, or official marks
- Use only source-verified school names, prices, rankings from `source_context`
- If source data missing, use generic labels/categories instead of fabricating
- Vary scene, palette, layout across generations — never repeat the same style

## Visual Direction & Style Notes

The payload includes two direction fields:

1. `visual_direction` — auto-rotated art direction (e.g. "minimal-type-poster",
   "phone-proof-collage"). Use this as the base layout style.

2. `style_notes` — topic-specific cover guidance from the selected topic preset
   (e.g. "使用邮件诊断清单或红黄绿避坑卡，突出常见套磁错误和正确做法对比").
   This describes the visual concept, emotional trigger, and content focus for
   this specific post. **Merge it with the visual_direction**: use the
   style_notes concept as the creative brief, and the visual_direction as the
   execution style.

If `style_notes` contains topic-specific cover direction, prioritize it over
the generic visual_direction rotation. The style_notes may reference specific
elements like "warning label", "comparison split", "phone screenshot" — map
these to the closest layout route above.

If neither field is provided, auto-rotate through the 8 layout routes.

### Platform Style Reference

If `style_reference` is provided, it contains platform-specific persona and
style guidance (e.g. Xiaohongshu cover conventions, tone, and visual
preferences). Use it to align the cover's typography, color palette, and
emotional hooks with the platform's native aesthetic. Merge it with the
`visual_direction` and `style_notes` — style_reference sets the platform
baseline, while visual_direction and style_notes define the specific layout
and concept for this post.

## Writer Profile Style

If `profile_style` is provided in the payload, it contains a distilled writer
profile with `profile_name`, `role_type`, `style_dna`, and `description`.

**When this field is present, it OVERRIDES the default cover style rules above.**
Use the style_dna as the primary visual direction for the cover image:
- Match the writer's aesthetic preferences, color palette tendencies, and visual personality
- Adapt the typography, layout, and emotional hooks to align with the writer's voice
- The style_dna may contain specific visual cues, composition preferences, and mood descriptors
- Still follow the core technical rules (aspect ratio, text readability, no fake logos)
- Merge the writer's style with the topic-specific cover direction for a unique result

## Output

Return an image prompt directly usable by the image provider (yunwu.ai
gpt-image-2). The prompt should be a detailed visual description in English,
specifying composition, typography, color palette, mood, and layout.
