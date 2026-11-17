import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const address = 'http://127.0.0.1:4174'
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4174', '--strictPort'], { stdio: 'inherit' })

async function waitForServer() {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Vite exited with code ${server.exitCode}`)
    try {
      const response = await fetch(address)
      if (response.ok) return
    } catch {}
    await delay(250)
  }
  throw new Error(`Vite did not start at ${address}`)
}

try {
  await waitForServer()
  const tests = spawn(process.execPath, ['node_modules/playwright/cli.js', 'test', ...process.argv.slice(2)], { stdio: 'inherit' })
  const exitCode = await new Promise((resolve, reject) => {
    tests.once('error', reject)
    tests.once('exit', (code) => resolve(code ?? 1))
  })
  process.exitCode = Number(exitCode)
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
} finally {
  server.kill()
  await Promise.race([
    new Promise((resolve) => server.once('exit', resolve)),
    delay(5_000),
  ])
  if (server.exitCode === null) server.kill('SIGKILL')
}
