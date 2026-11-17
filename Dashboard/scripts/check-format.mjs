import { readdir, readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const roots = ['src', 'tests', 'scripts', 'e2e']
const extensions = new Set(['.css', '.js', '.json', '.mjs', '.py', '.ts', '.tsx'])
const failures = []

async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await inspect(path)
    else if (extensions.has(extname(entry.name))) {
      const source = await readFile(path, 'utf8')
      const lines = source.split(/\r?\n/)
      for (let index = 0; index < lines.length; index++) {
        if (/[\t ]+$/.test(lines[index])) failures.push(`${path}:${index + 1}: trailing whitespace`)
      }
      if (!source.endsWith('\n')) failures.push(`${path}: missing final newline`)
    }
  }
}

for (const root of roots) await inspect(root)
if (failures.length) {
  process.stderr.write(`${failures.join('\n')}\n`)
  process.exitCode = 1
} else {
  process.stdout.write(`Checked whitespace and final newlines in ${roots.join(', ')}.\n`)
}
