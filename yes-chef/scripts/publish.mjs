// Yes Chef is written once, here, and copied everywhere else by this script, so no copy is ever edited by hand. Each
// copy is the planning skill (skills/yes-chef) and the readback rule (rules/heard.md) with its two blanks filled: where
// lessons are saved, and where else a lesson may go.
//
//   node yes-chef/scripts/publish.mjs codex [--lessons <file>] [--homes "<text>"]
//       ~/.codex/skills/yes-chef, and the rule inside ~/.codex/AGENTS.md
//   node yes-chef/scripts/publish.mjs repo <repository> [--lessons <file>] [--homes "<text>"]
//       <repository>/.claude/skills/yes-chef, and the rule inside <repository>/CLAUDE.md
//   node yes-chef/scripts/publish.mjs chat <folder> [--lessons <file>]
//       <folder>/yes-chef-skill.zip to upload in claude.ai Settings, and <folder>/yes-chef-preferences.md to paste into
//       Settings > Your Claude > Instructions (lessons are saved to memory there; the lines in --lessons are copied in)
//   node yes-chef/scripts/publish.mjs check codex | repo <repository>
//       exits 1, naming each file, when a copy differs from this source
//   node yes-chef/scripts/publish.mjs check chat
//       on a Mac with the Claude desktop app: compares the copy of your claude.ai account's skills that the app keeps
//       with this source, and names an old Slingshot still uploaded
//
// The rule sits between two marker lines in AGENTS.md or CLAUDE.md, so the rest of that file is never touched. The
// opening marker records the blanks it was filled with, so `check` can rebuild exactly what should be there.
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, relative } from 'node:path'

const root = join(import.meta.dirname, '..')
const skill = join(root, 'skills', 'yes-chef')
const DEFAULT_LESSONS = '~/.claude/yes-chef/lessons.md'
const DEFAULT_HOMES = 'memory, for a fact about them rather than how they speak'
const END = '<!-- yes-chef:end -->'

const [command, ...rest] = process.argv.slice(2)
const flag = name => {
  const at = rest.indexOf(`--${name}`)
  return at === -1 ? undefined : rest[at + 1]
}
const positional = rest.filter((arg, i) => !arg.startsWith('--') && !rest[i - 1]?.startsWith('--'))
const home = path => (path.startsWith('~/') ? join(homedir(), path.slice(2)) : path)

const rule = (lessons, homes) =>
  readFileSync(join(root, 'rules', 'heard.md'), 'utf8').replaceAll('{{LESSONS_FILE}}', lessons).replaceAll('{{OTHER_HOMES}}', homes).trim()
const block = (lessons, homes) =>
  `<!-- yes-chef:start ${JSON.stringify({ lessons, homes })} -->\n${rule(lessons, homes)}\n${END}`

const files = dir =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })

// Writes the rule block into a file, replacing an earlier block and leaving everything else as it was.
const placeRule = (file, lessons, homes) => {
  const before = existsSync(file) ? readFileSync(file, 'utf8') : ''
  const start = before.indexOf('<!-- yes-chef:start')
  const end = before.indexOf(END)
  const next = start !== -1 && end > start
    ? `${before.slice(0, start)}${block(lessons, homes)}${before.slice(end + END.length)}`
    : `${before.trimEnd()}${before.trim() === '' ? '' : '\n\n'}${block(lessons, homes)}\n`
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, next)
}

const placeSkill = target => {
  rmSync(target, { recursive: true, force: true })
  mkdirSync(dirname(target), { recursive: true })
  cpSync(skill, target, { recursive: true })
}

const targets = (kind, repo) =>
  kind === 'codex'
    ? { skillDir: home('~/.codex/skills/yes-chef'), ruleFile: home('~/.codex/AGENTS.md') }
    : { skillDir: join(repo, '.claude', 'skills', 'yes-chef'), ruleFile: join(repo, 'CLAUDE.md') }

// Every way a copy can differ from this source, named by file.
const drift = ({ skillDir, ruleFile }) => {
  const found = []
  const want = files(skill).map(path => relative(skill, path))
  const have = existsSync(skillDir) ? files(skillDir).map(path => relative(skillDir, path)) : []
  for (const name of want) {
    if (!have.includes(name)) found.push(`${join(skillDir, name)} is missing`)
    else if (!readFileSync(join(skillDir, name)).equals(readFileSync(join(skill, name)))) found.push(`${join(skillDir, name)} differs`)
  }
  for (const name of have) if (!want.includes(name)) found.push(`${join(skillDir, name)} is not in the source`)
  const text = existsSync(ruleFile) ? readFileSync(ruleFile, 'utf8') : ''
  const opening = text.match(/<!-- yes-chef:start (\{.*?\}) -->/)
  if (opening?.[1] === undefined) found.push(`${ruleFile} has no Yes Chef rule`)
  else {
    const { lessons, homes } = JSON.parse(opening[1])
    const start = text.indexOf(opening[0])
    const placed = text.slice(start, text.indexOf(END, start) + END.length)
    if (placed !== block(lessons, homes)) found.push(`${ruleFile}: the Yes Chef rule differs`)
  }
  return found
}

// The Claude desktop app keeps a copy of the skills uploaded to your claude.ai account. Its frontmatter is rewritten
// with quotes on upload, so the name and description are compared as values and the rest word for word.
const parse = text => {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  const field = name => (match?.[1].match(new RegExp(`^${name}:\\s*(.*)$`, 'm'))?.[1] ?? '').trim().replace(/^"(.*)"$/, '$1').replaceAll('\\"', '"')
  return { name: field('name'), description: field('description'), body: (match?.[2] ?? text).trim() }
}
const chatDrift = () => {
  const base = join(homedir(), 'Library', 'Application Support', 'Claude', 'local-agent-mode-sessions', 'skills-plugin')
  if (!existsSync(base)) return ['No claude.ai skills found on this Mac (the Claude desktop app keeps them here once you have used it).']
  const found = []
  const source = parse(readFileSync(join(skill, 'SKILL.md'), 'utf8'))
  let seen = 0
  for (const account of readdirSync(base)) {
    for (const org of existsSync(join(base, account)) && statSync(join(base, account)).isDirectory() ? readdirSync(join(base, account)) : []) {
      const skills = join(base, account, org, 'skills')
      if (!existsSync(skills)) continue
      for (const old of ['slingshot', 'heard']) {
        if (existsSync(join(skills, old))) found.push(`An old "${old}" skill is still uploaded to claude.ai: remove it in Settings.`)
      }
      const copy = join(skills, 'yes-chef', 'SKILL.md')
      if (!existsSync(copy)) continue
      seen++
      const uploaded = parse(readFileSync(copy, 'utf8'))
      if (uploaded.description !== source.description || uploaded.body !== source.body) {
        found.push('Your claude.ai Yes Chef is an older version: upload the new yes-chef-skill.zip in Settings (publish.mjs chat makes it).')
      }
    }
  }
  if (seen === 0) found.push('Yes Chef is not uploaded to claude.ai yet (or the desktop app has not synced it).')
  return [...new Set(found)]
}

if (command === 'codex' || command === 'repo') {
  const repo = positional[0]
  if (command === 'repo' && repo === undefined) throw new Error('Name the repository: publish.mjs repo <path>')
  const where = targets(command, repo)
  placeSkill(where.skillDir)
  placeRule(where.ruleFile, flag('lessons') ?? DEFAULT_LESSONS, flag('homes') ?? DEFAULT_HOMES)
  console.log(`Yes Chef copied to ${where.skillDir}, and its readback rule placed in ${where.ruleFile}.`)
} else if (command === 'chat') {
  const out = positional[0]
  if (out === undefined) throw new Error('Name the folder: publish.mjs chat <folder>')
  mkdirSync(out, { recursive: true })
  const zip = join(out, 'yes-chef-skill.zip')
  rmSync(zip, { force: true })
  execFileSync('zip', ['-r', '-q', '-X', zip, 'yes-chef'], { cwd: join(root, 'skills') })
  const lessonsFile = flag('lessons')
  const lines = lessonsFile && existsSync(home(lessonsFile))
    ? readFileSync(home(lessonsFile), 'utf8').split('\n').filter(line => line.trimStart().startsWith('- '))
    : []
  const text = [
    rule('memory', 'memory'),
    lines.length === 0 ? null : `What I meant before (my saved lessons, newest last):\n${lines.join('\n')}`,
  ].filter(part => part !== null).join('\n\n')
  writeFileSync(join(out, 'yes-chef-preferences.md'), `${text}\n`)
  console.log(`In claude.ai, upload ${zip} under Customize > Skills > + > Create skill > Upload a skill (delete any older Yes Chef, Slingshot or Heard first), and paste ${join(out, 'yes-chef-preferences.md')} into Settings > Your Claude > Instructions.`)
} else if (command === 'check' && positional[0] === 'chat') {
  const found = chatDrift()
  for (const line of found) console.log(line)
  console.log(found.length === 0 ? 'Your claude.ai copy matches the source.' : `${found.length} problem${found.length === 1 ? '' : 's'} with your claude.ai skills.`)
  process.exit(found.length === 0 ? 0 : 1)
} else if (command === 'check') {
  const found = drift(targets(positional[0], positional[1]))
  for (const line of found) console.log(line)
  console.log(found.length === 0 ? 'Every copy matches the source.' : `${found.length} difference${found.length === 1 ? '' : 's'} from the source.`)
  process.exit(found.length === 0 ? 0 : 1)
} else {
  console.error('Usage: publish.mjs codex | repo <path> | chat <folder> | check codex | check repo <path>   [--lessons <file>] [--homes "<text>"]')
  process.exit(2)
}
