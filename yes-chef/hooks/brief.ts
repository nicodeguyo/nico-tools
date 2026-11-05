// Yes Chef's decisions that need no engine: which messages get a readback, when Yes Chef is planning, what a reply
// asks of the person (a Heard question, a round, a ticket, a lesson), the lessons, the helper-prompt check, and the
// texts handed to the model. The readback rule itself lives in ../rules/heard.md and the planning skill in
// ../skills/yes-chef/SKILL.md, read at run time; nothing here restates them.

// Bare confirmations and answers to a question: more of work already read back. The kitchen's own replies count too:
// a cook answers the chef "Heard!" or "Yes, chef", and "Fire" starts the dish.
const CONFIRMATION =
  /^(y|yes|yep|yeah|yup|no|nope|ok|okay|k|sure|go|go ahead|do it|ship it|sounds good|looks good|lgtm|thanks|thank you|thx|ty|continue|proceed|approved|agreed|perfect|great|nice|cool|done|correct|save|save it|heard|(?:yes|heard|oui),? chef|fire|fire it|fire away|[0-9]+|[a-d]|option [0-9a-d])$/

// An answer by number to Yes Chef's or Heard's questions: "Q2: B", "q3 - my own answer", "Q1) A, Q2) C".
const ANSWER = /^q\d+\s*[:.)=-]/

// Only a person typing gets a readback: Enter at the prompt, or the Remote Control bridge. Scripts, scheduled runs,
// other sessions and plugins are read as sent.
const PEOPLE = new Set(['composer', 'bridge'])

export const isPerson = (origin: { kind: string }) => PEOPLE.has(origin.kind)

export const normalize = (text: string) =>
  text.replace(/\s+/g, ' ').trim().toLowerCase().replace(/[\s.!?]+$/, '')

export const isConfirmation = (text: string) => CONFIRMATION.test(normalize(text))

export const wantsReadback = (text: string, origin: { kind: string }) => {
  if (!isPerson(origin)) return false
  const norm = normalize(text)
  if (norm === '' || norm.startsWith('raw:') || norm.startsWith('/')) return false
  return !CONFIRMATION.test(norm) && !ANSWER.test(norm)
}

// The person asking for Yes Chef in words: "yes chef this", "then yes chef it", "Yes chef: …" at the start of a request,
// or the /yes-chef command. A bare "yes chef" is a go-ahead, not a request.
export const asksForYesChef = (text: string) =>
  /\byes[\s,]*chef\s+(this|it)\b|^\s*yes[\s,]*chef\s*:\s*\S|^\s*\/yes-chef\b/i.test(text)

// Claude loading the planning skill, by any of its names (`yes-chef`, `yes-chef:yes-chef`).
export const loadsYesChef = (call: { tool: string; skill?: unknown }) =>
  call.tool === 'Skill' && /(^|:)yes-chef$/i.test(String(call.skill ?? ''))

// A Heard readback that waits on the person carries the Questions line its rules define ("- **Questions:** ..."), as a
// list item or a line of its own.
const QUESTIONS = /^[ \t]*(?:[-*][ \t]+)?\*\*Questions:?\*\*/m

export const hasQuestions = (answer: string) => QUESTIONS.test(answer)

// A Yes Chef round: its questions are headed "### ❓ Q1 · ...", as the skill's format sets.
export const hasRound = (answer: string) => /^#{1,4}[ \t]*❓[ \t]*Q\d+/m.test(answer)

const TICKET_END = 'Fire to start, or edit anything above.'

// The ticket (or spec) a reply shows, from its "🎫 Ticket" or "🎫 Spec" heading to the line that asks for Fire; null
// when the reply shows none.
export const ticketOf = (answer: string): string | null => {
  const end = answer.lastIndexOf(TICKET_END)
  if (end === -1) return null
  const head = answer.slice(0, end).search(/^.*🎫[ \t]*\**[ \t]*(Ticket|Spec)\b.*$/m)
  return answer.slice(head === -1 ? 0 : head, end).trim()
}

// The lesson a reply proposes, on its own line: "**Lesson?** <the lesson> → <its home>"; null when there is none.
export const lessonOf = (answer: string): string | null =>
  answer.match(/^[ \t]*\*\*Lesson\?\*\*[ \t]*(.+)$/m)?.[1]?.trim() ?? null

const words = (text: string) => new Set(normalize(text).split(' ').filter(word => word.length > 2))

// A message sent from the ticket the Edit button put in the box, edited or not: most of its words are still there.
export const isFromTicket = (sent: string, ticket: string) => {
  const drafted = words(ticket)
  if (drafted.size === 0) return false
  const kept = words(sent)
  let shared = 0
  for (const word of drafted) if (kept.has(word)) shared++
  return shared / drafted.size >= 0.6
}

// What the buttons send, as the person's own words.
export const FIRE = 'Fire: go with your recommended answer to each question, and start.'
export const PICKS = 'Yes chef: go with your pick for every question in this round.'
export const SKIP = 'Fire: take your picks for everything still open, and write the ticket.'
export const GO = 'Fire.'
export const SAVE = 'Yes, save that lesson.'

const OUTCOME =
  /\b(goal|outcome|success criteria|done when|acceptance|definition of done|report back|return (?:a|an|the|only|one)|deliver|expected output|so that|in order to|the aim)\b/i
const STEP = /^\s*(?:\d+[.)]\s|step \d+\b)/i

// A helper prompt passes when it names an outcome and is not a recipe of five or more numbered steps. A failing one
// gets a note in front (or, with the helperRewrite setting on, a rewrite); a passing one is left exactly as written.
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
  'Before you start (a note from Yes Chef): take the outcome this prompt asks for as your goal and choose your own way to reach it. Treat numbered steps as suggestions unless they are marked as required. If no success criteria are stated, decide what would prove the work is finished and say it in the first line of your report.'

export const withNote = (prompt: string) => `${HELPER_NOTE}\n\n${prompt}`

const HELPER_REWRITE = [
  'Rewrite this prompt for a helper agent so a capable model gets it right on the first try: the outcome, the reason behind it, what is in and out of scope, and what proves it is finished, with the method left to the model.',
  'Keep every fact word for word: each file name, path, link, number, name, quote and constraint. Keep a numbered step only when it is clearly required, and say why. Leave out instructions to verify or double-check.',
  'Nobody reads this prompt before it runs, so where you would guess, choose. Reply with the rewritten prompt only.',
].join(' ')

export const helperRequest = (prompt: string) => `${HELPER_REWRITE}\n\n<prompt>\n${prompt}\n</prompt>`

// A model sometimes wraps its answer in a fence or tags despite being told not to.
export const cleanReply = (text: string) =>
  text
    .trim()
    .replace(/^```[a-z]*\n([\s\S]*?)\n```$/, '$1')
    .replace(/^<prompt>\n?([\s\S]*?)\n?<\/prompt>$/, '$1')
    .trim()

// Only the lesson lines ("- ..."), newest last; a heading or note in the file stays out of the model's way.
export const lessons = (text: string) => text.split('\n').filter(line => line.trimStart().startsWith('- '))

export const lessonLines = (text: string) => lessons(text).join('\n')

// A saved lesson as the person reads it in a toast: no bullet, date or count, and spoken to them
// ("- 2026-10-07: when they say ..." becomes "when you say ...").
export const learned = (line: string) =>
  line
    .trim()
    .replace(/^-\s+/, '')
    .replace(/^\d{4}-\d{2}-\d{2}:\s*/, '')
    .replace(/\s*\(×\d+\)$/, '')
    .replace(/\bthey (say|mean|ask|want)\b/gi, 'you $1')

// Whether a tool call writes to the lessons file: its last two path segments appear in the call, so a relative path
// or a shell append counts as well as an absolute one.
export const touchesLessons = (call: { tool: string }, lessonsFile: string) => {
  if (!['Edit', 'Write', 'Bash'].includes(call.tool)) return false
  const tail = lessonsFile.split('/').filter(Boolean).slice(-2).join('/')
  return tail !== '' && JSON.stringify(call).includes(tail)
}

export const fillRules = (rules: string, lessonsFile: string, otherHomes: string) =>
  rules.replaceAll('{{LESSONS_FILE}}', lessonsFile).replaceAll('{{OTHER_HOMES}}', otherHomes)

// The full rules, sent once per session (and again after the conversation is compacted), with the saved lessons and,
// on a session's first request, a note saying so; after a compaction, the fired ticket.
export const fullContext = (
  rules: string,
  savedLessons: string,
  { isFirst, ticket }: { isFirst: boolean; ticket: string | null },
) =>
  [
    rules,
    lessonLines(savedLessons) === '' ? null : `What this person meant before (their saved lessons, newest last):\n${lessonLines(savedLessons)}`,
    isFirst ? 'This is the first request of this session.' : null,
    ticket === null ? null : `The fired ticket this work runs from, word for word:\n\n${ticket}`,
  ]
    .filter(part => part !== null)
    .join('\n\n')

// Every later request: one line, since the full rules are already in the conversation.
export const reminder = (isTicketFired: boolean) =>
  isTicketFired
    ? 'Yes Chef is on: read this request back as its rules say, placed against the fired ticket.'
    : 'Yes Chef is on: read this request back as its rules say.'

export const compactNote = (ticket: string | null) =>
  ticket === null
    ? 'Keep any Yes Chef ticket or spec and its decisions word for word.'
    : `Keep this fired Yes Chef ticket word for word, with any revisions since:\n\n${ticket}`

export const checkRequest = (root: string, lastChecked: string) =>
  [
    "Yes Chef's rules check. Its rules are two files:",
    `\`${root}/rules/heard.md\` (how you read each request back and save lessons) and \`${root}/skills/yes-chef/SKILL.md\` (how a new job is planned).`,
    "Read them, then read Anthropic's current prompting guidance: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices",
    'and the model-specific page it links for each current model.',
    `The last check was ${lastChecked}. If nothing in the guidance should change the rules, say so in one line.`,
    'Otherwise show each proposed change as a small diff with the sentence from the guidance that motivates it, and edit the files only after I say yes.',
  ].join(' ')
