// Heard's readback eval: does the model follow rules/brief.md? It sends four requests through
// `claude -p` with Heard's note in front, the way Heard hands it over beside a typed message, and
// checks the replies for what the mod and the person rely on: the "Heard" heading, the
// "(remembered: ...)" note when a saved lesson applies, a Questions line the Fire button can see,
// and "Heard, take 2" after a correction.
//
// Run: node --experimental-strip-types heard/evals/readback.mjs [model]   (default: opus)
// Each run makes 4 model calls on the account `claude` is signed in to. Exit code 0 when every check holds.
// HEARD_CLAUDE names the claude to run when the one on the PATH is not it. It must be 2.1.286 or newer,
// as the mod itself: an older claude saves the shared switch that runs mods as off, so sessions that
// start before the switch is fetched again run without any mod.
import { execFile } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { hasQuestions, readbackContext } from '../hooks/brief.ts'

const run = promisify(execFile)
const claude = process.env.HEARD_CLAUDE ?? 'claude'
const version = (await run(claude, ['--version'])).stdout.match(/(\d+)\.(\d+)\.(\d+)/)?.slice(1).map(Number) ?? [0, 0, 0]
const [major, minor, patch] = version
if (major < 2 || (major === 2 && (minor < 1 || (minor === 1 && patch < 286)))) {
  console.error(`${claude} is ${version.join('.')}; the eval needs 2.1.286 or newer, or it switches mods off on this machine. Set HEARD_CLAUDE to a newer claude.`)
  process.exit(2)
}
const rules = readFileSync(join(import.meta.dirname, '..', 'rules', 'brief.md'), 'utf8')
const model = process.argv[2] ?? 'opus'
// An empty folder, so no project's files or instructions shape the reply; tools are off.
const cwd = mkdtempSync(join(tmpdir(), 'heard-eval-'))

const LESSON = '- 2026-10-07: when they say "cramped", they mean too close to the edge of the page'

// A headless run has no typed message for Heard to sit beside, so the note goes in front of the request.
const ask = async (request, { lessons = '', resume } = {}) => {
  const note = readbackContext(rules, join(cwd, 'lessons.md'), lessons)
  const prompt = `<system-reminder>\n${note}\n</system-reminder>\n\n${request}`
  const args = ['-p', prompt, '--model', model, '--output-format', 'json', '--tools', '']
  if (resume) args.push('--resume', resume)
  const { stdout } = await run(claude, args, { cwd, maxBuffer: 10_000_000, timeout: 300_000 })
  const out = JSON.parse(stdout)
  return { text: String(out.result ?? ''), session: out.session_id }
}

const heads = text => /^\s*\*\*Heard[*:]/.test(text)

const [small, remembered, launch] = await Promise.all([
  ask('Write a one-sentence tagline for a neighborhood lemonade stand.'),
  ask('The title on our bake-sale flyer looks cramped. Tell me what to change, in two sentences.', { lessons: LESSON }),
  ask('Plan the launch of our new product.'),
])
const corrected = await ask('No, I meant only a LinkedIn announcement post, not a whole launch.', { resume: launch.session })

const checks = [
  ['a small ask opens with "Heard:"', heads(small.text), small.text],
  ['a saved lesson that applies is named "(remembered: ...)"', heads(remembered.text) && /\(remembered:/i.test(remembered.text), remembered.text],
  ['a vague ask gets the full readback with a Questions line Fire can see', heads(launch.text) && hasQuestions(launch.text), launch.text],
  ['a correction gets "Heard, take 2"', /\*\*Heard,? take 2/i.test(corrected.text), corrected.text],
]

for (const [name, passed, text] of checks) {
  console.log(`${passed ? 'pass' : 'FAIL'}  ${name}`)
  if (!passed || process.env.HEARD_EVAL_SHOW) console.log(`${text.split('\n').slice(0, 12).map(line => `      ${line}`).join('\n')}\n`)
}
process.exit(checks.every(([, passed]) => passed) ? 0 : 1)
