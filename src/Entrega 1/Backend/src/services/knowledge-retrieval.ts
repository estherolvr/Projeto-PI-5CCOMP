const STOPWORDS = new Set([
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'por', 'pelo', 'pela', 'pelos', 'pelas', 'para', 'pra',
  'com', 'sem', 'sob', 'sobre', 'que', 'qual', 'quais', 'como', 'quando', 'onde', 'quem',
  'porque', 'pq', 'qualquer', 'e', 'ou', 'mas', 'se', 'ja', 'nao', 'ate',
  'mais', 'menos', 'muito', 'pouco', 'ola', 'oi', 'bom', 'dia', 'boa', 'tarde', 'noite',
  'favor', 'pfv', 'chat', 'ia', 'alvaro', 'gostaria', 'saber', 'quero',
  'preciso', 'esta', 'estao', 'sao', 'foi', 'ser', 'tem', 'ter', 'fazer', 'faco',
  'eu', 'me', 'voce', 'este', 'esse', 'essa', 'isso', 'sera',
])

export const KNOWLEDGE_EXCERPT_MAX_CHARS = 6000
const PASSAGE_SEPARATOR = '\n\n[...]\n\n'

export function normalizeText(text: string): string {
  return (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

export function textTokens(text: string): string[] {
  return normalizeText(text).match(/[a-z0-9]+/g) || []
}

export function stem(word: string): string {
  const w = normalizeText(word)
  if (w.length <= 4) return w
  return w.replace(/(coes|cao|sao|mente|ando|endo|indo|ado|ido|eza|ivo|iva|vel|ais|eis|ores|ura|ario|aria|os|as|es|o|a|e)$/, '')
}

export function getKeywords(text: string): string[] {
  return [...new Set(textTokens(text).filter(t => t.length >= 2 && !STOPWORDS.has(t)))]
}

interface Span { start: number; end: number }

function mergeSpans(spans: Span[]): Span[] {
  const merged: Span[] = []
  for (const span of [...spans].sort((a, b) => a.start - b.start)) {
    const last = merged.at(-1)
    if (last && span.start <= last.end) last.end = Math.max(last.end, span.end)
    else merged.push({ ...span })
  }
  return merged
}

/** Search the entire text, including PDFs with no paragraph or page delimiters.
 * Rank bounded, overlapping windows first; apply the context budget to selected
 * passages, never to the beginning of an oversized winning paragraph.
 */
export function extractRelevantExcerpt(content: string, query: string, maxChars = KNOWLEDGE_EXCERPT_MAX_CHARS) {
  const text = (content || '').replace(/\r\n/g, '\n').trim()
  const budget = Math.min(KNOWLEDGE_EXCERPT_MAX_CHARS, Math.floor(maxChars))
  const keywords = getKeywords(query)
  if (!text || !keywords.length || !(budget > 0)) return { excerpt: '', score: 0 }

  const padding = Math.min(200, Math.floor(budget / 10))
  const windowSize = Math.min(1200, budget - 2 * padding)
  const overlap = Math.floor(windowSize / 4)
  const windows: Array<Span & { words: Set<string>; stems: Set<string>; normalized: string }> = []
  for (let start = 0; start < text.length;) {
    let end = Math.min(text.length, start + windowSize)
    // Prefer whole words while guaranteeing progress even for unbroken strings.
    if (end < text.length) {
      const lowerBound = start + Math.floor(windowSize * 0.8)
      while (end > lowerBound && /\S/.test(text[end])) end--
    }
    const tokens = textTokens(text.slice(start, end))
    windows.push({ start, end, words: new Set(tokens), stems: new Set(tokens.map(stem)), normalized: ` ${tokens.join(' ')} ` })
    if (end === text.length) break
    let next = Math.max(start + 1, end - overlap)
    while (next < end && /\S/.test(text[next - 1])) next++
    start = next
  }

  const terms = keywords.map(word => ({ word, root: stem(word) }))
  const matches = (window: typeof windows[number], term: typeof terms[number]) =>
    window.words.has(term.word) || (term.root.length >= 3 && window.stems.has(term.root))
  const weights = terms.map(term => 1 + Math.log(1 + windows.length / (1 + windows.filter(w => matches(w, term)).length)))
  const normalizedQuery = ` ${textTokens(query).join(' ')} `
  const asksDeadline = /\b(prazos?|cronograma|datas?|quando|calendario|vencimento|limite)\b/.test(normalizeText(query))
  const calendarTerms = ['prazo', 'prazos', 'data', 'datas', 'cronograma', 'calendario', 'vencimento', 'limite']

  const ranked = windows.map(window => {
    let score = 0
    let hits = 0
    terms.forEach((term, index) => {
      if (matches(window, term)) {
        score += (window.words.has(term.word) ? 16 : 10) * weights[index]
        hits++
      }
    })
    if (window.normalized.includes(normalizedQuery)) score += 60
    for (let i = 0; i < keywords.length - 1; i++) {
      if (window.normalized.includes(` ${keywords[i]} ${keywords[i + 1]} `)) score += 20
    }
    if (hits > 1) score += hits * 10
    // Calendar synonyms help deadline questions without requiring identical wording.
    // A date alone does not make an unrelated passage a match.
    if (asksDeadline) {
      const calendarHits = calendarTerms.filter(term => window.words.has(term)).length
      score += Math.min(calendarHits, 3) * 8
      if (hits || calendarHits) {
        const raw = normalizeText(text.slice(window.start, window.end))
        if (/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b|\b\d{1,2}\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/.test(raw)) score += 32
        if (/\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(raw)) score += 12
      }
    }
    return { start: window.start, end: window.end, score }
  }).filter(window => window.score > 0).sort((a, b) => b.score - a.score || a.start - b.start)

  if (!ranked.length) return { excerpt: '', score: 0 }
  let selected: Span[] = []
  let count = 0
  for (const window of ranked) {
    if (window.score < ranked[0].score * 0.35 || count >= 6) break
    const span = { start: Math.max(0, window.start - padding), end: Math.min(text.length, window.end + padding) }
    // Padding retains neighbouring table cells, labels and dates. Trim only at words.
    while (span.start < window.start && span.start > 0 && /\S/.test(text[span.start - 1])) span.start++
    while (span.end > window.end && span.end < text.length && /\S/.test(text[span.end])) span.end--
    if (selected.some(s => s.start <= span.start && s.end >= span.end)) continue
    const candidate = mergeSpans([...selected, span])
    const size = candidate.reduce((sum, s) => sum + s.end - s.start, 0) + (candidate.length - 1) * PASSAGE_SEPARATOR.length
    if (size > budget) continue
    selected = candidate
    count++
  }
  return {
    excerpt: selected.map(span => text.slice(span.start, span.end).trim()).join(PASSAGE_SEPARATOR),
    score: selected.length ? ranked[0].score : 0,
  }
}
