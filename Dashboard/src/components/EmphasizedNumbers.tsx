const numericParts = /(?<![\p{L}\p{N}])([+−-]?\d+(?:[.,]\d+)*(?:[–—]\d+(?:[.,]\d+)*)?(?:\s?%)?)(?![\p{L}\p{N}])/gu

const modelNames = /1Mha|\bBAU(?:\s+(?:2|3)\s+(?:vụ|seasons)|\s+bền vững|\s+sustainable)?\b|Canh tác (?:như )?thường lệ(?: \d+ vụ)?|Business as usual(?: farming)?|Thường lệ/giu

export default function EmphasizedNumbers({ text }: { text: string }) {
  const parts: { text: string; model?: 'bau' | 'one-mha' }[] = []
  let cursor = 0
  for (const match of text.matchAll(modelNames)) {
    const index = match.index ?? 0
    if (index > cursor) parts.push({ text: text.slice(cursor, index) })
    parts.push({ text: match[0], model: /^1mha$/i.test(match[0]) ? 'one-mha' : 'bau' })
    cursor = index + match[0].length
  }
  if (!parts.length) parts.push({ text })
  else if (cursor < text.length) parts.push({ text: text.slice(cursor) })

  return parts.map(({ text: part, model }, index) => model
    ? <strong key={index} className={`scenario-insight-model scenario-model-${model}`}>{part}</strong>
    : part.split(numericParts).map((segment, numberIndex) => numberIndex % 2 ? <strong key={`${index}-${numberIndex}`}>{segment}</strong> : segment))
}
