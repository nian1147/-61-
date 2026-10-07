import { getPref, setPref } from "../../utils/prefs";
import {
  MEDICAL_ABBREVIATIONS,
  MEDICAL_VOCABULARY,
} from "./medical-glossary-data";

// ============ 排序后的词汇表 ============

const SORTED_ABBREVIATIONS = Array.from(MEDICAL_ABBREVIATIONS.entries()).sort(
  ([a], [b]) => a.toUpperCase().localeCompare(b.toUpperCase()),
);

const SORTED_VOCABULARY = Array.from(MEDICAL_VOCABULARY.entries()).sort(
  ([a], [b]) => a.localeCompare(b),
);

// ============ 缩写分批正则编译 ============

const BATCH_PATTERNS: RegExp[] = [];
for (let i = 0; i < SORTED_ABBREVIATIONS.length; i += 500) {
  const batch = SORTED_ABBREVIATIONS.slice(i, i + 500);
  BATCH_PATTERNS.push(
    new RegExp(
      batch
        .map(([a]) => `\\b${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`)
        .join("|"),
      "gi",
    ),
  );
}

// ============ 快速缩写扫描 ============

export function fastScanAbbreviations(searchPool: string): Set<string> {
  const found = new Set<string>();
  for (const pattern of BATCH_PATTERNS) {
    let m: RegExpExecArray | null;
    pattern.lastIndex = 0;
    while ((m = pattern.exec(searchPool)) !== null) {
      found.add(m[0].toUpperCase());
    }
  }
  return found;
}

// ============ 上下文感知匹配 ============

export function findMatchingAbbreviations(
  sourceText: string,
  paperContext: string,
): Array<[string, [string, string]]> {
  const searchPool = paperContext
    ? sourceText.toUpperCase() + " " + paperContext.toUpperCase()
    : sourceText.toUpperCase();
  const foundAbbrs = fastScanAbbreviations(searchPool);
  const matches: Array<[string, [string, string]]> = [];
  for (const [abbr, entry] of SORTED_ABBREVIATIONS) {
    if (foundAbbrs.has(abbr)) {
      matches.push([abbr, entry]);
    }
    if (matches.length >= 200) break;
  }
  return matches;
}

function buildWordIndex(text: string): Set<string> {
  const words = new Set<string>();
  let start = 0;
  for (let i = 0; i <= text.length; i++) {
    if (i === text.length || /\s/.test(text[i])) {
      if (i > start) words.add(text.slice(start, i));
      start = i + 1;
    }
  }
  return words;
}

export function findMatchingVocabulary(
  sourceText: string,
  paperContext: string,
): Array<[string, string]> {
  const searchPool = paperContext
    ? sourceText.toLowerCase() + " " + paperContext.toLowerCase()
    : sourceText.toLowerCase();
  const wordSet = buildWordIndex(searchPool);
  const matches: Array<[string, string]> = [];
  for (const [en, cn] of SORTED_VOCABULARY) {
    if (!(en.includes(" ") || en.length > 4)) continue;
    if (en.includes(" ") && !wordSet.has(en.split(" ")[0])) continue;
    if (searchPool.includes(en)) {
      matches.push([en, cn]);
    }
    if (matches.length >= 100) break;
  }
  return matches;
}

// ============ 自定义词汇表加载 ============

export function loadCustomGlossary(): Map<string, string> {
  try {
    const raw = (getPref("customGlossary") as string) || "";
    if (!raw.trim()) return new Map();
    const map = new Map<string, string>();
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//"))
        continue;
      const parts = trimmed.split(/\s*[:：=→>,-]\s*/);
      if (parts.length >= 2) {
        const en = parts[0].trim();
        const cn = parts.slice(1).join(":").trim();
        if (en && cn) {
          map.set(en, cn);
          map.set(en.toLowerCase(), cn);
        }
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

// ============ 论文上下文获取 ============

export function getPaperContext(itemId: number | undefined): string {
  if (!itemId) return "";
  try {
    const item = Zotero.Items.get(itemId);
    if (!item) return "";
    const topItem = Zotero.Items.getTopLevel([item])[0];
    if (!topItem) return "";
    const parts: string[] = [];
    const title = topItem.getField("title");
    if (title) parts.push(`Title: ${title}`);
    const abstract = topItem.getField("abstractNote");
    if (abstract) parts.push(`Abstract: ${abstract}`);
    const attachments = topItem.getAttachments();
    if (attachments) {
      let count = 0;
      for (const attId of attachments) {
        if (count >= 5) break;
        try {
          const att = Zotero.Items.get(attId);
          if (att && att.isNote()) {
            const noteText = att.getNote();
            if (noteText) {
              const cleanText = noteText
                .replace(/<[^>]*>/g, " ")
                .replace(/\s+/g, " ")
                .trim();
              if (cleanText && cleanText.length > 50) {
                parts.push(cleanText);
                count++;
              }
            }
          }
        } catch {
          // skip unreachable items
        }
      }
    }
    return parts.join("\n\n").slice(0, 30000);
  } catch {
    return "";
  }
}

// ============ System Prompt 构建 ============

export function buildSystemPrompt(
  sourceText: string,
  paperContext: string,
  customGlossary: Map<string, string>,
): string {
  const matchedAbbrs = findMatchingAbbreviations(sourceText, paperContext);
  const matchedVocab = findMatchingVocabulary(sourceText, paperContext);

  let termRef = matchedAbbrs
    .map(([abbr, [fullEn, fullCn]]) => `${abbr}: ${fullEn} -> ${fullCn}`)
    .join("\n");
  const vocabRef = matchedVocab.map(([en, cn]) => `${en} -> ${cn}`).join("\n");

  if (customGlossary.size > 0) {
    const customRef = Array.from(customGlossary.entries())
      .filter(([k]) => k === k.toUpperCase() || k.includes(" "))
      .slice(0, 100)
      .map(([en, cn]) => `${en} -> ${cn}`)
      .join("\n");
    if (customRef) {
      termRef = `【用户自定义术语（最高优先级）】
${customRef}

【系统词库】
${termRef}`;
    }
  }

  const contextIntro = paperContext
    ? `

以下为当前文献的全文上下文，用于理解术语含义（非原文，仅用于术语辅助匹配）：
${paperContext.slice(0, 1000)}`
    : "";

  return `你是一位资深医学翻译专家，专门为医学院校学生、临床规培医师和科研初学者服务。

你的核心任务：将英文医学文献翻译为中文，严格遵循以下规则：

1. **术语标准化**：优先使用《医学主题词表》(MeSH/CMeSH)中的标准译名。

以下是文中涉及的医学缩写对照参考（已自动匹配原文及全文中出现的术语）：
${termRef}

以下是文中涉及的通用医学术语对照参考：
${vocabRef}
${contextIntro}

2. **缩写处理**：翻译中遇到的医学缩写，使用格式【缩写：英文全称，中文全称】标注。

3. **学术严谨性**：
   - 不添加原文没有的信息
   - 不删减原文内容
   - 不曲解原文含义
   - 保持段落的逻辑结构

4. **首次出现术语**：对专业术语首次出现时，在括号中附简要中文解释。

5. **罕见术语**：对于新的或罕见的术语，给出参考译名并标注「译名供参考」。

6. 输出格式：逐段翻译，段落之间用空行分隔。先给出翻译结果，再在末尾列出「关键术语注释」部分。`;
}

// ============ 翻译后处理 ============

export function postProcessAbbreviationConsistency(
  resultText: string,
  matchedAbbrs: Array<[string, [string, string]]>,
  customGlossary: Map<string, string>,
): string {
  let corrected = resultText;

  // 1. 自定义词汇表覆盖（最高优先级）
  if (customGlossary.size > 0) {
    for (const [en, customCn] of customGlossary) {
      if (en === en.toUpperCase() && en.length <= 10) {
        const escaped = en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const bracketPattern = new RegExp(`【${escaped}[：:][^】]*】`, "gi");
        corrected = corrected.replace(bracketPattern, `【${en}：${customCn}】`);
        const barePattern = new RegExp(
          `(?<![A-Za-z])${escaped}[：:]\\s*[\\u4e00-\\u9fff]{2,20}`,
          "gi",
        );
        corrected = corrected.replace(barePattern, `${en}：${customCn}`);
      }
      if (en.includes(" ") || en.length > 4) {
        const defaultCn = MEDICAL_VOCABULARY.get(en.toLowerCase());
        if (defaultCn && defaultCn !== customCn) {
          const escaped = defaultCn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          corrected = corrected.replace(new RegExp(escaped, "g"), customCn);
        }
      }
    }
  }

  // 2. 缩写一致性检查
  const corrections: string[] = [];
  for (const [abbr, [fullEn, standardCn]] of matchedAbbrs) {
    if (customGlossary.has(abbr) || customGlossary.has(abbr.toLowerCase()))
      continue;
    const abbrEscaped = abbr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `${abbrEscaped}([\\s\\S]{0,80}?)([\\u4e00-\\u9fff]{2,20})`,
      "gi",
    );
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(corrected)) !== null) {
      const foundChinese = match[2];
      if (foundChinese !== standardCn && !foundChinese.includes(standardCn)) {
        const isReasonable =
          standardCn.includes(foundChinese) ||
          foundChinese.includes(standardCn);
        if (!isReasonable) {
          corrections.push(
            `${abbr}：AI 译为「${foundChinese}」，词库标准译名为「${standardCn}」`,
          );
        }
      }
    }
  }

  if (corrections.length > 0) {
    const uniqueCorrections = [...new Set(corrections)];
    corrected +=
      "\n\n---\n📋 **术语一致性检查**（以下术语的 AI 翻译与词库标准译名存在差异，请人工判断）：\n" +
      uniqueCorrections.map((c) => `- ${c}`).join("\n");
  }

  return corrected;
}

// ============ 翻译缓存 ============

const CACHE_PREF_KEY = "translationCache";
const MAX_CACHE_ENTRIES = 200;

export const translationCache: Map<
  string,
  { result: string; timestamp: number }
> = loadCache();

function loadCache(): Map<string, { result: string; timestamp: number }> {
  try {
    const raw = getPref(CACHE_PREF_KEY);
    if (!raw) return new Map();
    const map = new Map<string, { result: string; timestamp: number }>();
    const parsed = JSON.parse(raw as string) as Record<
      string,
      { result: string; timestamp: number }
    >;
    for (const [k, v] of Object.entries(parsed)) {
      map.set(k, v);
    }
    return map;
  } catch {
    return new Map();
  }
}

export function saveCache(
  cache: Map<string, { result: string; timestamp: number }>,
) {
  try {
    if (cache.size > MAX_CACHE_ENTRIES) {
      const sorted = [...cache.entries()].sort(
        ([, a], [, b]) => a.timestamp - b.timestamp,
      );
      for (const [k] of sorted.slice(0, cache.size - MAX_CACHE_ENTRIES)) {
        cache.delete(k);
      }
    }
    const obj: Record<string, { result: string; timestamp: number }> = {};
    for (const [k, v] of cache) obj[k] = v;
    setPref(CACHE_PREF_KEY, JSON.stringify(obj));
  } catch {
    // ignore save errors
  }
}
