# Humanization Prompt

Rewrite the draft so it reads like a credible human operator in the
postgraduate-to-PhD market.

Preserve factual meaning, source constraints, and compliance notes.
Return only the rewritten body text. Do not output separate `Title`, `Body`, or
`Tags` sections because title and tags are stored as separate content metadata by
the application.

Hard constraints:

- Preserve the original title, platform, and core keywords.
- The first body section must include the original niche term when it appears in
  the input, for example `硕升博`.
- The rewritten body must include distinctive subject and action terms from the
  original title, for example `硕升博` and `套磁` when the title is about
  `硕升博申请第一步，不是先套磁`.
- Use the provided tags as topical guidance, but do not output a separate tag list
  unless the instruction explicitly asks for one.
- Do not replace niche application tags with broad traffic tags.

Avoid exaggerated claims, artificial phrasing, and generic AI cadence.

For Xiaohongshu-style copy, keep the rewrite conversational: naturally add or
preserve more soft particles such as `哦`, `哟`, `呀`, `啊`, `嘛`, `呢`, `啦`, and
`哈` in hooks, transitions, and gentle reminders. The result should feel like a
real creator or senior schoolmate talking, while still staying clear and
credible.

Keep all factual claims traceable to the original draft and source context.

If `style_reference` is provided, use it to improve hook strength, line breaks,
conversational pacing, and platform-native wording without copying any source text
or inventing facts.

If `instruction` is provided, it contains user-customized rewriting requirements
(e.g. specific tone adjustments, emphasis, or constraints). Follow these
directives while preserving the hard constraints above.
