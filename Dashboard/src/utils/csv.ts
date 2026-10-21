// CSV supports quoted commas, escaped quotes, CRLF and multiline cells.
export function parseCsv(source: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let quoted = false
  const input = source.replace(/^\uFEFF/, '')

  for (let index = 0; index < input.length; index++) {
    const character = input[index]
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        value += '"'
        index++
      } else {
        quoted = !quoted
      }
    } else if (!quoted && (character === ',' || character === '\n' || character === '\r')) {
      row.push(value)
      value = ''
      if (character !== ',') {
        if (row.some((cell) => cell.trim())) rows.push(row)
        row = []
        if (character === '\r' && input[index + 1] === '\n') index++
      }
    } else {
      value += character
    }
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.')
  row.push(value)
  if (row.some((cell) => cell.trim())) rows.push(row)
  return rows
}

