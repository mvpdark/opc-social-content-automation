"""
本地去AIGC化规则引擎
基于 shuorenhua (https://github.com/MrGeDiao/shuorenhua) 和 avoid-ai-writing 的词表
纯Python实现，不依赖AI模型API
"""

import hashlib
import re
import random
import math

# AI高频词替换表
AI_PHRASE_REPLACEMENTS: list[tuple[str, list[str]]] = [
    ("首先", ["一开始", "先说", "从头说"]),
    ("其次", ["然后", "接下来", "再说"]),
    ("最后", ["最终", "说到底", "总的来看"]),
    ("综上所述", ["所以", "说到底", "总结一下"]),
    ("总而言之", ["所以", "说白了", "总之"]),
    ("值得注意的是", ["有个点要注意", "提醒一下", "注意"]),
    ("需要指出的是", ["得说清楚", "强调一下", "要说的是"]),
    ("众所周知", ["大家都清楚", "都知道", "说实话"]),
    ("毋庸置疑", ["肯定的", "没跑", "确实"]),
    ("不可否认", ["确实", "得承认", "说实话"]),
    ("赋能", ["助力", "帮到", "支持"]),
    ("闭环", ["走通", "跑通", "搞定"]),
    ("抓手", ["切入点", "关键", "突破口"]),
    ("颗粒度", ["细节程度", "精细度", "具体程度"]),
    ("对齐", ["同步", "确认", "拉平"]),
    ("沉淀", ["积累", "留下", "攒下"]),
    ("打法", ["策略", "方法", "路子"]),
    ("矩阵", ["体系", "布局", "组合"]),
    ("链路", ["流程", "路径", "环节"]),
    ("赛道", ["方向", "领域"]),
    ("心智", ["认知", "印象", "想法"]),
    ("触达", ["覆盖", "到达", "触到"]),
    ("留存", ["留下", "保住", "留量"]),
    ("转化", ["转变", "变现"]),
    ("迭代", ["更新", "改进"]),
    ("复盘", ["回顾", "总结", "反思"]),
    ("深层次", ["更深的", "根本上的", "真正"]),
    ("多维度", ["多个方面", "不同角度", "方方面面"]),
    ("全方位", ["全面", "各个角度", "立体"]),
    ("核心", ["关键", "重点", "要害"]),
    ("痛点", ["难受的地方", "头疼的事", "卡点"]),
    ("痒点", ["想解决的问题", "心动点", "渴望"]),
    ("爽点", ["爽的地方", "满足感", "快感"]),
    ("生态", ["体系", "环境", "圈子"]),
    ("场景", ["情况", "时候", "情境"]),
    ("维度", ["角度", "方面", "层面"]),
    ("体系", ["系统", "框架", "整体"]),
    ("框架", ["骨架", "结构", "思路"]),
    ("逻辑", ["道理", "思路", "原理"]),
    ("聚焦", ["专注", "集中", "盯着"]),
    ("深耕", ["深入做", "专注", "扎进去"]),
    ("布局", ["安排", "规划", "铺开"]),
    ("探索", ["尝试", "摸索", "试试"]),
    ("构建", ["搭建", "建立", "搭"]),
    ("打造", ["做出来", "弄出来", "建"]),
    ("助力", ["帮", "推动", "促进"]),
    ("推动", ["带动", "促进", "推"]),
    ("促进", ["推动", "帮助", "加速"]),
    ("优化", ["改进", "调优", "改善"]),
    ("提升", ["提高", "拉上去", "改善"]),
    ("实现", ["做到", "完成", "达成"]),
    ("提供", ["给到", "带来"]),
        ("进行", ["做", "开始"]),
    ("开展", ["做", "搞", "展开"]),
    ("旨在", ["目的是", "为了", "想"]),
    ("致力于", ["专心做", "专注", "努力"]),
    ("进一步", ["更进一步", "深入", "继续"]),
    ("有效的", ["有用的", "管用的", "实在的"]),
    ("高效", ["快又好", "效率高", "省事"]),
    ("便捷", ["方便", "省事", "顺手"]),
    ("灵活", ["自由", "机动"]),
            ("专业", ["靠谱", "内行", "懂行"]),
    ("优质", ["好", "不错", "高质量"]),
    ("精准", ["准确", "精确", "对准"]),
    ("全面", ["全", "面面俱到", "整套"]),
    ("及时", ["趁早", "赶紧", "快"]),
    ("实时", ["即时", "马上", "立刻"]),
    ("正如我们所看到的", ["可以看到", "如你所见", "看到了"]),
    ("在这个过程中", ["这中间", "期间", "过程中"]),
    ("从某种意义上说", ["某种程度", "可以说", "算得上"]),
    ("与此同时", ["同时", "这边呢"]),
    ("换句话说", ["也就是", "说白了", "讲白了"]),
    ("在很大程度上", ["很大程度上", "多半", "基本"]),
    ("据研究表明", ["研究显示", "有研究发现", "数据表明"]),
    ("专家表示", ["有专家说", "业内人士", "行家说"]),
    ("数据显示", ["数据看", "从数据看", "看数据"]),
    ("根据统计", ["统计看", "数据显示", "看数字"]),
    ("让我们", ["我们", "咱们"]),
    ("我们可以", ["咱们能", "能"]),
    ("我们应该", ["咱们得", "要", "得"]),
    ("我们需要", ["咱们需要", "需要", "得"]),
    ("这意味着", ["这说明", "意思就是", "也就是说"]),
    ("这不仅仅是", ["不只是", "不光是"]),
]

AI_SENTENCE_PATTERNS = [
    r"在(?:当今|目前|当下|现在)的.{0,10}时代[，,。]?",
    r"随着.{0,15}的(?:不断|持续|快速)?发展[，,]?",
    r"在.{0,10}的(?:大背景|趋势|浪潮)下[，,]?",
    r"^(?:总之|综上|综上所述)[，,]?(?:我们|大家)?(?:可以|应该)?看到.*$",
    r"^(?:让我们|咱们)?(?:一起)?(?:期待|拭目以待).*$",
    r"^(?:未来|今后|接下来).*(?:可期|可待|值得期待).*$",
]

TONE_PARTICLES = ["哦", "呀", "呢", "嘛", "哈", "啦", "哟", "哇", "啊"]
COLLOQUIAL_CONNECTORS = ["说白了", "讲真", "说实话", "说真的", "老实说", "你想想", "你品品", "你细品"]


def _idx_to_letters(idx: int) -> str:
    """Convert index to lowercase letters: 0->a, 1->b, ..., 25->z, 26->aa"""
    result = ""
    idx += 1
    while idx > 0:
        idx, rem = divmod(idx - 1, 26)
        result = chr(97 + rem) + result
    return result


def _protect_fragments(text: str) -> tuple[str, list[tuple[int, str]]]:
    patterns = [
        r'https?://[^\s<>"\']+',
        r'\d+\.?\d*%?',
        r'#[^\s#]+#',
        r'\$\d+',
        r'[A-Z]{2,}',
        r'[\w.+-]+@[\w-]+\.[\w.-]+',
    ]
    placeholders = []

    def _repl(match):
        idx = len(placeholders)
        placeholders.append(match.group())
        return f"\x00frag{_idx_to_letters(idx)}\x00"

    protected_text = text
    for pattern in patterns:
        protected_text = re.sub(pattern, _repl, protected_text)
    return protected_text, list(enumerate(placeholders))


def _restore_fragments(text: str, fragments: list[tuple[int, str]]) -> str:
    for idx, fragment in fragments:
        placeholder = f"\x00frag{_idx_to_letters(idx)}\x00"
        text = text.replace(placeholder, fragment)
    # Safety: remove any leftover NULL bytes
    text = text.replace("\x00", "")
    return text


def _replace_ai_phrases(text: str, rng: random.Random) -> str:
    for phrase, alternatives in AI_PHRASE_REPLACEMENTS:
        if phrase in text:
            replacement = rng.choice(alternatives)
            text = text.replace(phrase, replacement)
    return text


def _remove_template_patterns(text: str) -> str:
    for pattern in AI_SENTENCE_PATTERNS:
        text = re.sub(pattern, '', text, flags=re.MULTILINE)
    return text


def _vary_sentence_endings(text: str, rng: random.Random) -> str:
    sentences = re.split(r'([。！？\n])', text)
    result = []
    sentence_count = 0
    for part in sentences:
        if part in ('。', '！', '？', '\n'):
            if part == '。' and sentence_count > 0 and rng.random() < 0.3:
                tone = rng.choice(TONE_PARTICLES)
                result.append(tone + '\n')
            elif part == '。' and rng.random() < 0.2:
                result.append('！')
            else:
                result.append(part)
            sentence_count += 1
        else:
            result.append(part)
    return ''.join(result)


def _add_colloquial_connectors(text: str, rng: random.Random) -> str:
    paragraphs = text.split('\n')
    if len(paragraphs) <= 2:
        return text
    result = [paragraphs[0]]
    for i in range(1, len(paragraphs)):
        para = paragraphs[i].strip()
        if not para:
            result.append(paragraphs[i])
            continue
        if rng.random() < 0.25 and len(para) > 10:
            connector = rng.choice(COLLOQUIAL_CONNECTORS)
            para = f"{connector}，{para}"
        result.append(para)
    return '\n'.join(result)


def _check_sentence_length_variance(text: str) -> float:
    sentences = [s.strip() for s in re.split(r'[。！？\n]', text) if s.strip()]
    if len(sentences) < 3:
        return 1.0
    lengths = [len(s) for s in sentences]
    mean_len = sum(lengths) / len(lengths)
    if mean_len == 0:
        return 1.0
    variance = sum((length - mean_len) ** 2 for length in lengths) / len(lengths)
    std_dev = math.sqrt(variance)
    cv = std_dev / mean_len
    return cv


def _break_uniform_sentences(text: str, rng: random.Random) -> str:
    cv = _check_sentence_length_variance(text)
    if cv > 0.4:
        return text
    sentences = re.split(r'([。！？])', text)
    result = []
    i = 0
    while i < len(sentences):
        part = sentences[i]
        if i + 1 < len(sentences) and sentences[i + 1] in ('。', '！', '？'):
            sentence = part + sentences[i + 1]
            if len(part) > 30 and rng.random() < 0.3:
                comma_pos = part.rfind('，')
                if comma_pos > 10:
                    result.append(part[:comma_pos + 1])
                    result.append(part[comma_pos + 1:] + sentences[i + 1])
                else:
                    result.append(sentence)
            else:
                result.append(sentence)
            i += 2
        else:
            result.append(part)
            i += 1
    return ''.join(result)



def _strip_markdown(text: str) -> str:
    """Remove Markdown formatting that Xiaohongshu doesn't render."""
    # Remove bold markers **text** or __text__
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'__(.+?)__', r'\1', text)
    # Remove italic markers *text* or _text_ (but not mid-word underscores)
    text = re.sub(r'(?<!\w)\*(.+?)\*(?!\w)', r'\1', text)
    # Remove strikethrough ~~text~~
    text = re.sub(r'~~(.+?)~~', r'\1', text)
    # Remove inline code `text`
    text = re.sub(r'`([^`]+)`', r'\1', text)
    # Remove heading markers # ## ### etc
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    # Remove bullet list markers - * + at line start
    text = re.sub(r'^\s*[-*+]\s+', '', text, flags=re.MULTILINE)
    # Remove numbered list markers 1. 2. etc
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)
    # Remove blockquote markers >
    text = re.sub(r'^\s*>\s*', '', text, flags=re.MULTILINE)
    # Remove horizontal rules ---
    text = re.sub(r'^---+\s*$', '', text, flags=re.MULTILINE)
    # Remove image syntax ![alt](url) FIRST (before link regex eats it)
    text = re.sub(r'!\[[^]]*\]\([^)]+\)', '', text)
    # Remove link syntax [text](url) -> just text
    text = re.sub(r'\[([^]]+)\]\([^)]+\)', r'\1', text)
    # Clean up extra spaces left behind
    text = re.sub(r'  +', ' ', text)
    # Clean up lines that are just whitespace
    text = re.sub(r'\n \n', '\n\n', text)
    return text


def humanize_text(text: str, intensity: str = "medium") -> str:
    if not text or not text.strip():
        return text
    _seed = int(hashlib.sha256(text[:50].encode("utf-8")).hexdigest()[:8], 16)
    rng = random.Random(_seed)
    # Strip Markdown formatting first (before protecting fragments)
    text = _strip_markdown(text)
    protected_text, fragments = _protect_fragments(text)
    protected_text = _replace_ai_phrases(protected_text, rng)
    if intensity in ("medium", "strong"):
        protected_text = _remove_template_patterns(protected_text)
    if intensity in ("medium", "strong"):
        protected_text = _break_uniform_sentences(protected_text, rng)
    if intensity in ("medium", "strong"):
        protected_text = _vary_sentence_endings(protected_text, rng)
    if intensity == "strong":
        protected_text = _add_colloquial_connectors(protected_text, rng)
    result = _restore_fragments(protected_text, fragments)
    result = re.sub(r'\n{3,}', '\n\n', result).strip()
    # Safety: ensure no NULL bytes leak
    if "\x00" in result:
        result = result.replace("\x00", "")
    return result


def humanize_score(text: str) -> dict[str, object]:
    ai_phrases_found = []
    for phrase, _ in AI_PHRASE_REPLACEMENTS:
        if phrase in text:
            ai_phrases_found.append(phrase)
    cv = _check_sentence_length_variance(text)
    template_count = 0
    for pattern in AI_SENTENCE_PATTERNS:
        template_count += len(re.findall(pattern, text, re.MULTILINE))
    score = 0
    score += min(len(ai_phrases_found) * 5, 40)
    score += max(0, int((0.5 - cv) * 40))
    score += min(template_count * 10, 20)
    return {
        "score": min(score, 100),
        "ai_phrases_found": ai_phrases_found,
        "sentence_cv": round(cv, 3),
        "template_patterns": template_count,
    }
