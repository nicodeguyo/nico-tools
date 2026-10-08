// Heard's decisions that need no engine: which messages get a readback, the "s:" prefix, whether a
// sent message is the one Sharpen wrote, whether a reply waits on the person's answers, the lessons,
// the helper-prompt check, and the texts handed to the model.
// The rules themselves live in ../rules/, read at run time; nothing here restates them.

// Bare confirmations and answers to a question: more of work already read back. The kitchen's own
// replies count too: a cook answers the chef "Heard!" or "Yes, chef", and "Fire" starts the dish.
const CONFIRMATION =
  /^(y|yes|yep|yeah|yup|no|nope|ok|okay|k|sure|go|go ahead|do it|ship it|sounds good|looks good|lgtm|thanks|thank you|thx|ty|continue|proceed|approved|agreed|perfect|great|nice|cool|done|correct|heard|(?:yes|heard|oui),? chef|fire|fire it|fire away|[0-9]+|[a-d]|option [0-9a-d])$/

// Only a person typing gets a readback: Enter at the prompt, or the Remote Control bridge. Scripts,
// scheduled runs, other sessions and plugins are read as sent.
const PEOPLE = new Set(['composer', 'bridge'])

export const isPerson = (origin: { kind: string }) => PEOPLE.has(origin.kind)

export const normalize = (text: string) =>
  text.replace(/\s+/g, ' ').trim().toLowerCase().replace(/[\s.!?]+$/, '')

export const wantsReadback = (text: string, origin: { kind: string }) => {
  if (!isPerson(origin)) return false
  const norm = normalize(text)
  if (norm === '' || norm.startsWith('raw:') || norm.startsWith('/')) return false
  return !CONFIRMATION.test(norm)
}

const PREFIX = /^\s*s:\s*/i

// "s: tidy the cover" asks Heard to sharpen "tidy the cover" instead of sending it.
export const sharpenPrefix = (text: string): string | null =>
  PREFIX.test(text) ? text.replace(PREFIX, '') : null

const words = (text: string) => new Set(normalize(text).split(' ').filter(word => word.length > 2))

// A message sent from Sharpen's draft, edited or not, already carries a readback's lines. Most of
// the draft's words still there means it is that draft.
export const isFromSharpen = (sent: string, sharpened: string) => {
  const drafted = words(sharpened)
  if (drafted.size === 0) return false
  const kept = words(sent)
  let shared = 0
  for (const word of drafted) if (kept.has(word)) shared++
  return shared / drafted.size >= 0.6
}

// A reply waits on the person when its readback carries the Questions line the readback rules define
// ("- **Questions:** ..."), as a list item or a line of its own.
const QUESTIONS = /^[ \t]*(?:[-*][ \t]+)?\*\*Questions:?\*\*/m

export const hasQuestions = (answer: string) => QUESTIONS.test(answer)

// What the Fire button sends, as the person's own words: on a kitchen line "Fire!" starts the dish.
export const FIRE = 'Fire: go with your recommended answer to each question, and start.'

const OUTCOME =
  /\b(goal|outcome|success criteria|done when|acceptance|definition of done|report back|return (?:a|an|the|only|one)|deliver|expected output|so that|in order to|the aim)\b/i
const STEP = /^\s*(?:\d+[.)]\s|step \d+\b)/i

// A helper prompt passes when it names an outcome and is not a recipe of five or more numbered
// steps. A failing one is rewritten; a passing one is left exactly as Claude wrote it.
export const checkHelper = (prompt: string) => {
  const steps = prompt.split('\n').filter(line => STEP.test(line)).length
  const hasOutcome = OUTCOME.test(prompt)
  return { hasOutcome, steps, passes: hasOutcome && steps < 5 }
}

// The facts a rewrite may not lose: code spans, links and paths, word for word.
export const facts = (text: string) => {
  const found = new Set<string>()
  for (const match of text.matchAll(/`([^`\n]+)`/g)) if (match[1] !== undefined) found.add(match[1])
  for (const match of text.matchAll(/https?:\/\/[^\s)>\]"'`]+/g)) found.add(match[0])
  for (const match of text.matchAll(/(?:~|\.{1,2})?\/?[\w.@-]+(?:\/[\w.@-]+)+/g)) {
    if (!match[0].startsWith('http')) found.add(match[0])
  }
  return [...found]
}

export const keepsFacts = (original: string, rewrite: string) =>
  facts(original).every(fact => rewrite.includes(fact))

export const HELPER_NOTE =
  'Before you start (a note from Heard): take the outcome this prompt asks for as your goal and choose your own way to reach it. Treat numbered steps as suggestions unless they are marked as required. If no success criteria are stated, decide what would prove the work is finished and say it in the first line of your report.'

export const withNote = (prompt: string) => `${HELPER_NOTE}\n\n${prompt}`

// Only the lesson lines ("- ..."), newest last; a heading or note in the file stays out of the model's way.
export const lessons = (text: string) => text.split('\n').filter(line => line.trimStart().startsWith('- '))

export const lessonLines = (text: string) => lessons(text).join('\n')

// A saved lesson as the person reads it in a toast: no bullet or date, and spoken to them
// ("- 2026-10-07: when they say ..." becomes "when you say ...").
export const learned = (line: string) =>
  line
    .trim()
    .replace(/^-\s+/, '')
    .replace(/^\d{4}-\d{2}-\d{2}:\s*/, '')
    .replace(/\bthey (say|mean|ask|want)\b/gi, 'you $1')

// Whether a tool call writes to the lessons file: its last two path segments appear in the call, so a
// relative path or a shell append counts as well as an absolute one.
export const touchesLessons = (call: { tool: string }, lessonsFile: string) => {
  if (!['Edit', 'Write', 'Bash'].includes(call.tool)) return false
  const tail = lessonsFile.split('/').filter(Boolean).slice(-2).join('/')
  return tail !== '' && JSON.stringify(call).includes(tail)
}

export const readbackContext = (rules: string, lessonsFile: string, lessons: string) => {
  const filled = rules.replaceAll('{{LESSONS_FILE}}', lessonsFile)
  const saved = lessonLines(lessons)
  return saved === ''
    ? filled
    : `${filled}\n\nWhat this person meant before (their saved lessons, newest last):\n${saved}`
}

export const sharpenRequest = (rules: string, draft: string, lessons: string) => {
  const saved = lessonLines(lessons)
  return [
    rules,
    saved === '' ? null : `What this person meant before (their saved lessons):\n${saved}`,
    'Use the conversation so far to resolve what the draft refers to. The draft the person is about to send:',
    `<draft>\n${draft}\n</draft>`,
  ]
    .filter(part => part !== null)
    .join('\n\n')
}

export const helperRequest = (rules: string, prompt: string) =>
  [
    rules,
    'This prompt is for a helper agent and nobody reads it before it runs, so where you would guess, choose and do not mark it.',
    `<prompt>\n${prompt}\n</prompt>`,
  ].join('\n\n')

// A model sometimes wraps its answer in a fence or quotes despite being told not to.
export const cleanReply = (text: string) =>
  text
    .trim()
    .replace(/^```[a-z]*\n([\s\S]*?)\n```$/, '$1')
    .replace(/^<(draft|prompt)>\n?([\s\S]*?)\n?<\/\1>$/, '$2')
    .trim()

export const checkRequest = (root: string, lastChecked: string) =>
  [
    "Heard's weekly rules check. Heard's rules are the two files",
    `\`${root}/rules/brief.md\` (how you read a request back) and \`${root}/rules/sharpen.md\` (how a draft is rewritten).`,
    'Read them, then read Anthropic\'s current prompting guidance: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices',
    'and the model-specific page it links for each current model.',
    `The last check was ${lastChecked}. If nothing in the guidance should change the rules, say so in one line.`,
    'Otherwise show each proposed change as a small diff with the sentence from the guidance that motivates it, and edit the files only after I say yes.',
    'The rules arrive with every message, so a change should keep them as short as they are now or shorter.',
  ].join(' ')
