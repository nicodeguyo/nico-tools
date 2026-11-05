// Yes Chef's eval: does the model follow rules/heard.md and skills/yes-chef/SKILL.md? It sends real requests through
// `claude -p` with the plugin loaded (`--plugin-dir`, so the skill is there to run) and the mod's note in front of each
// request, the way the mod hands it over beside a typed message, and checks the replies for what the mod and the
// person rely on.
//
// Run: node --experimental-strip-types yes-chef/evals/yes-chef.mjs [model]   (default: opus)
// About 13 model calls on the account `claude` is signed in to, only when run. Exit code 0 when every check holds.
// YES_CHEF_CLAUDE names the claude to run when the one on the PATH is not it; it must be 2.1.286 or newer, as the mod
// itself: an older claude saves the shared switch that runs mods as off. Run it with no other copy of the yes-chef
// plugin installed, or Claude has two skills of the same name to choose from.
import { execFile } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { fillRules, fullContext, hasRound, lessonOf, reminder, ticketOf } from '../hooks/brief.ts'

const run = promisify(execFile)
const claude = process.env.YES_CHEF_CLAUDE ?? 'claude'
const version = (await run(claude, ['--version'])).stdout.match(/(\d+)\.(\d+)\.(\d+)/)?.slice(1).map(Number) ?? [0, 0, 0]
const [major, minor, patch] = version
if (major < 2 || (major === 2 && (minor < 1 || (minor === 1 && patch < 286)))) {
  console.error(`${claude} is ${version.join('.')}; the eval needs 2.1.286 or newer, or it switches mods off on this machine. Set YES_CHEF_CLAUDE to a newer claude.`)
  process.exit(2)
}
const root = join(import.meta.dirname, '..')
const model = process.argv[2] ?? 'opus'
// An empty folder, so no project's files or instructions shape the reply; a temporary folder is also never counted as
// the person's typing (ADR 0095). The only tool is Skill, so Claude can run Yes Chef and nothing else.
const cwd = mkdtempSync(join(tmpdir(), 'yes-chef-eval-'))
const rules = fillRules(readFileSync(join(root, 'rules', 'heard.md'), 'utf8'), join(cwd, 'lessons.md'), 'memory, for a fact about them rather than how they speak')

const LESSON = '- 2026-10-07: when they say "cramped", they mean too close to the edge of the page'

// A headless run has no typed message for the mod to sit beside, so its note goes in front of the request.
const ask = async (request, { note, resume, fork } = {}) => {
  const prompt = note ? `<system-reminder>\n${note}\n</system-reminder>\n\n${request}` : request
  const args = ['-p', prompt, '--model', model, '--output-format', 'json', '--plugin-dir', root, '--tools', 'Skill', '--allowedTools', 'Skill']
  if (resume) args.push('--resume', resume)
  if (fork) args.push('--fork-session')
  const { stdout } = await run(claude, args, { cwd, maxBuffer: 10_000_000, timeout: 600_000 })
  const out = JSON.parse(stdout)
  return { text: String(out.result ?? ''), session: out.session_id }
}
const first = lessons => fullContext(rules, lessons, { isFirst: true, ticket: null })
const heads = text => /\*\*Heard[*:,]/.test(text.slice(0, 400))

// A new job: a simple one is planned in one message, ending in a ticket; a vague one opens round 1.
const [light, remembered, vague] = await Promise.all([
  ask('Write a one-sentence tagline for a neighborhood lemonade stand.', { note: first('') }),
  ask('The title on our bake-sale flyer looks cramped. Tell me what to change, in two sentences.', { note: first(LESSON) }),
  ask('Plan the launch of our new product.', { note: first('') }),
])
// A correction during the rounds, then "fire", then a request outside what the ticket covers.
// "fire" is tried on round 1 itself (a fork of the session), since the correction can shrink the job to one that already
// ends in a ticket, where "fire" rightly starts the work.
const [corrected, fired] = await Promise.all([
  ask('No, I meant only a LinkedIn announcement post, not a whole launch.', { resume: vague.session }),
  ask('fire', { resume: vague.session, fork: true }),
])
const outside = await ask('Also design a new logo for the product.', { note: reminder(true), resume: fired.session })

// Later requests in a long session still get a readback from the one-line reminder alone; a verdict proposes a lesson.
let chain = await ask('Write a two-line welcome note for our newsletter.', { note: first('') })
chain = await ask('fire', { resume: chain.session })
for (const request of ['Make it warmer.', 'Add our store hours: 9 to 5.', 'Shorten it to one line.', 'Now write a matching subject line.']) {
  chain = await ask(request, { note: reminder(true), resume: chain.session })
}
const late = chain
const verdict = await ask("That subject line isn't right, it's too salesy.", { note: reminder(true), resume: late.session })

const checks = [
  ['a simple new job is planned in one message that ends in a ticket', ticketOf(light.text) !== null, light.text],
  ['a saved lesson that applies is named "(remembered: ...)"', /\(remembered:/i.test(remembered.text), remembered.text],
  ['a vague new job opens round 1 with "Slingshot it, or do what you asked?"', hasRound(vague.text) && /Slingshot it, or do what you asked\?/i.test(vague.text), vague.text],
  ['a correction gets "Heard, take 2" and proposes a lesson', /\*\*Heard,? take 2/i.test(corrected.text) && lessonOf(corrected.text) !== null, corrected.text],
  ['"fire" on round 1 takes the picks and writes the ticket', ticketOf(fired.text) !== null, fired.text],
  ['a request outside the ticket is flagged against it', /out of scope|outside (the|this) ticket|not in (the|this) ticket|ticket (put|leaves|left)/i.test(outside.text), outside.text],
  ['the sixth request of a session still opens with a readback', heads(late.text), late.text],
  ['a verdict on the work proposes a lesson', lessonOf(verdict.text) !== null, verdict.text],
]

for (const [name, passed, text] of checks) {
  console.log(`${passed ? 'pass' : 'FAIL'}  ${name}`)
  if (!passed || process.env.YES_CHEF_EVAL_SHOW) console.log(`${text.split('\n').slice(0, 14).map(line => `      ${line}`).join('\n')}\n`)
}
process.exit(checks.every(([, passed]) => passed) ? 0 : 1)
