import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import {
  asksForYesChef,
  checkHelper,
  cleanReply,
  FIRE,
  fullContext,
  GO,
  hasQuestions,
  hasRound,
  isFromTicket,
  keepsFacts,
  learned,
  lessonOf,
  loadsYesChef,
  PICKS,
  SAVE,
  SKIP,
  ticketOf,
  touchesLessons,
  wantsReadback,
} from '../hooks/brief'

const PERSON = { kind: 'composer' } as const
const SCRIPT = { kind: 'sdk' } as const
const USAGE = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
const RULES = 'RULES lessons go to {{LESSONS_FILE}}; otherwise {{OTHER_HOMES}}.'
const LESSONS_FILE = '/home/me/.claude/yes-chef/lessons.md'
const CRAMPED = '- 2026-10-07: when they say "cramped", they mean too close to the edge'
const LOUD = '- 2026-10-08: when they say "loud", they mean too many colors'

// What the engine would answer beneath the plugin at session start.
const engine = (on: On) => {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: undefined }) as never)
  // Another mod's row in the strip, which Yes Chef must keep.
  on('ui.render', ($, e) => $.ui.resolve(e).Text({ children: 'ship strip' }))
  mock.store(on)
  mock.env(on, { HOME: '/home/me' })
  mock.clock(on, { now: Date.UTC(2026, 10, 5) })
}

// A session whose prompts come back with the context the plugin added, and whose files are the rules and the lessons.
const session = async ($: never, on: On, lessonsText = `${CRAMPED}\n`) => {
  engine(on)
  const sent: { text: string; origin: unknown; context: readonly string[] | undefined }[] = []
  on('fs.read', ($, e) => ({ value: e.path === LESSONS_FILE ? lessonsText : RULES }) as never)
  on('prompt.submit', ($, e) => {
    sent.push({ text: e.text, origin: e.origin, context: e.context })
    return { text: e.text, context: e.context }
  })
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('tool.call', () => ({ result: 'ok' }) as never)
  await ($ as any).session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  return sent
}

const BAND = {
  plugin: 'yes-chef',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 120, scroll: { offset: 0, bodyRows: 5 }, view: {} },
} as const

const turn = (answer: string, extra: object = {}) =>
  ({ answer, durationMs: 1, isAborted: false, turnId: 't', reason: 'answer', ...extra }) as never
const rowText = async (ui: { findAll: (q: { type: string }) => Promise<{ text: string }[]> }) =>
  (await ui.findAll({ type: 'Text' })).map(found => found.text).join(' ')
const buttons = async (ui: { findAll: (q: { type: string }) => Promise<{ key: string | undefined }[]> }) =>
  (await ui.findAll({ type: 'Button' })).map(found => found.key)

// Replies shaped as the rules and the skill shape them.
const ASKS = ['**Heard**', '- **Goal:** a launch plan for the new tote.', '- **Questions:** LinkedIn only, or every channel? I recommend LinkedIn only.'].join('\n')
const CARRIES_ON = '**Heard:** the cover title gets 5 mm more space, done when it clears the edge.\n\nDone: the title now clears the edge.'
const ROUND = ['**Heard**', '- **Goal:** a buyer guide parents trust.', '', '### ❓ Q1 · Slingshot it, or do what you asked?', '', '➡️ **My pick: B.**'].join('\n')
const TICKET_BODY = '**🎫 Ticket: buyer guide**\n\n- **Goal:** a buyer guide that answers the three questions parents ask most.\n- **Scope:** the guide page only; pricing is out.'
const TICKET = `Here is the ticket.\n\n${TICKET_BODY}\n\nFire to start, or edit anything above.`
const LESSON = 'Done.\n\n**Lesson?** when they say "the rule", they mean the y-axis label rule → lessons file'

test('a readback for real requests a person typed; nothing for confirmations, answers by number, raw: or scripts', () => {
  expect(wantsReadback('the cover title looks cramped, I do not like it', PERSON)).toBe(true)
  for (const text of ['Yes!', 'go ahead', '2', 'save', 'Q2: B', 'q3) c for first prompts only', 'Q1 - A, Q2 - C', 'raw: just run the tests']) {
    expect(wantsReadback(text, PERSON)).toBe(false)
  }
  expect(wantsReadback('the cover title looks cramped', SCRIPT)).toBe(false)
  expect(wantsReadback('fix it', { kind: 'peer' })).toBe(false)
})

test('the kitchen replies count as a go-ahead; a real request that starts with one does not', () => {
  for (const reply of ['Heard!', 'yes chef', 'Yes, chef.', 'heard, chef', 'oui chef', 'fire', 'Fire it!', 'fire away']) {
    expect(wantsReadback(reply, PERSON)).toBe(false)
  }
  expect(wantsReadback('fire the old cover and draw a new one', PERSON)).toBe(true)
  expect(wantsReadback('heard anything from the printer?', PERSON)).toBe(true)
})

test('asking for Yes Chef in words, and Claude loading the skill', () => {
  for (const text of ['Then yes chef this: the redesign', 'yes chef it please', 'Yes chef: plan the launch', '/yes-chef plan the launch']) {
    expect(asksForYesChef(text)).toBe(true)
  }
  for (const text of ['yes chef', 'Yes, chef.', 'the yes chef skill has a typo']) expect(asksForYesChef(text)).toBe(false)
  expect(loadsYesChef({ tool: 'Skill', skill: 'yes-chef:yes-chef' })).toBe(true)
  expect(loadsYesChef({ tool: 'Skill', skill: 'yes-chef' })).toBe(true)
  expect(loadsYesChef({ tool: 'Skill', skill: 'grilling' })).toBe(false)
  expect(loadsYesChef({ tool: 'Read', skill: 'yes-chef' })).toBe(false)
})

test('what a reply asks of the person: Heard questions, a round, a ticket, a lesson', () => {
  expect(hasQuestions(ASKS)).toBe(true)
  expect(hasQuestions('**Heard**\n\n**Questions**\n\n1. Which product?')).toBe(true)
  expect(hasQuestions(CARRIES_ON)).toBe(false)
  expect(hasRound(ROUND)).toBe(true)
  expect(hasRound('We could ask ❓ later.')).toBe(false)
  expect(ticketOf(TICKET)).toBe(TICKET_BODY)
  expect(ticketOf(CARRIES_ON)).toBe(null)
  expect(lessonOf(LESSON)).toBe('when they say "the rule", they mean the y-axis label rule → lessons file')
  expect(lessonOf(CARRIES_ON)).toBe(null)
  expect(isFromTicket(`${TICKET_BODY}\n- **Also:** keep the tone warm.`, TICKET_BODY)).toBe(true)
  expect(isFromTicket('something else entirely about invoices', TICKET_BODY)).toBe(false)
})

test('a helper prompt with an outcome passes; a recipe fails; a rewrite that loses a path is refused', () => {
  expect(checkHelper('Find where the cover is drawn and report back the file and line.').passes).toBe(true)
  expect(checkHelper('Look at the cover code.').passes).toBe(false)
  const recipe = ['Goal: fix the cover.', '1. open a', '2. edit b', '3. run c', '4. check d', '5. commit'].join('\n')
  expect(checkHelper(recipe)).toEqual({ hasOutcome: true, steps: 5, passes: false })
  const original = 'Read `src/cover.ts` and docs/brief.md, then compare with https://example.com/spec.'
  expect(keepsFacts(original, 'Goal: compare `src/cover.ts` and docs/brief.md with https://example.com/spec.')).toBe(true)
  expect(keepsFacts(original, 'Goal: compare the cover code with the spec.')).toBe(false)
  expect(cleanReply('```\nGoal: x\n```')).toBe('Goal: x')
})

test('the full rules carry the lessons, the first-request note and, after compaction, the fired ticket', () => {
  expect(fullContext('R', '# Heading\nA note.', { isFirst: false, ticket: null })).toBe('R')
  const all = fullContext('R', `# Heading\n${CRAMPED}`, { isFirst: true, ticket: TICKET_BODY })
  expect(all).toContain('their saved lessons, newest last):\n' + CRAMPED)
  expect(all).toContain('This is the first request of this session.')
  expect(all).toContain(TICKET_BODY)
})

test('a saved lesson reads as spoken to the person, and only writes to the lessons file count', () => {
  expect(learned(CRAMPED)).toBe('when you say "cramped", you mean too close to the edge')
  expect(learned(`${CRAMPED} (×3)`)).toBe('when you say "cramped", you mean too close to the edge')
  expect(touchesLessons({ tool: 'Bash', command: `echo '${CRAMPED}' >> ~/.claude/yes-chef/lessons.md` } as never, LESSONS_FILE)).toBe(true)
  expect(touchesLessons({ tool: 'Edit', file_path: LESSONS_FILE } as never, LESSONS_FILE)).toBe(true)
  expect(touchesLessons({ tool: 'Read', file_path: LESSONS_FILE } as never, LESSONS_FILE)).toBe(false)
  expect(touchesLessons({ tool: 'Write', file_path: '/repo/notes/lessons.md' } as never, LESSONS_FILE)).toBe(false)
})

test('the rules go in once per session, filled in; every later request gets one line', async ($, on) => {
  const sent = await session($ as never, on)
  const first = await $.prompt.submit({ text: 'the cover title looks cramped', wait: false, origin: PERSON })
  expect(first.text).toBe('the cover title looks cramped')
  expect(first.context?.[0]).toContain(`RULES lessons go to ${LESSONS_FILE}; otherwise memory, for a fact about them rather than how they speak.`)
  expect(first.context?.[0]).toContain('they mean too close to the edge')
  expect(first.context?.[0]).toContain('This is the first request of this session.')

  const second = await $.prompt.submit({ text: 'now make the subtitle smaller', wait: false, origin: PERSON })
  expect(second.context).toEqual(['Yes Chef is on: read this request back as its rules say.'])
  expect((await $.prompt.submit({ text: 'yes', wait: false, origin: PERSON })).context).toBe(undefined)
  expect((await $.prompt.submit({ text: 'make the cover better', wait: false, origin: SCRIPT })).context).toBe(undefined)
  expect(sent).toHaveLength(4)
})

test('the homes for a lesson come from the settings', { options: { otherHomes: "a station's lessons.md for its craft, or a ticket for a voice rule" } }, async ($, on) => {
  await session($ as never, on)
  const first = await $.prompt.submit({ text: 'the cover title looks cramped', wait: false, origin: PERSON })
  expect(first.context?.[0]).toContain("otherwise a station's lessons.md for its craft, or a ticket for a voice rule.")
})

test('/heard off stops the readback and /heard on brings it back', async ($, on) => {
  await session($ as never, on)
  await $.command.run({ command: 'heard', args: 'off', origin: PERSON } as never)
  expect((await $.prompt.submit({ text: 'make the guide better', wait: false, origin: PERSON })).context).toBe(undefined)
  await $.command.run({ command: 'heard', args: 'on', origin: PERSON } as never)
  expect((await $.prompt.submit({ text: 'make the guide better', wait: false, origin: PERSON })).context?.[0]).toContain('RULES')
})

test('while Yes Chef plans there is one readback: its own; the ticket fires from the box, then requests are placed against it', async ($, on) => {
  const filled: string[] = []
  on('prompt.fill', ($, e) => {
    filled.push(e.text)
    return { isFilled: true, text: e.text, cursor: e.text.length } as never
  })
  await session($ as never, on)

  // The request that starts it gets the rules (they tell Claude to plan with Yes Chef); Claude loads the skill.
  const opening = await $.prompt.submit({ text: 'yes chef this: the buyer guide', wait: false, origin: PERSON })
  expect(opening.context?.[0]).toContain('RULES')
  await $.tool.call({ tool: 'Skill', skill: 'yes-chef:yes-chef' } as never)
  await $.turn.complete(turn(ROUND))

  // Answers during the rounds, in words or by number, get nothing added.
  expect((await $.prompt.submit({ text: 'parents of toddlers, mostly', wait: false, origin: PERSON })).context).toBe(undefined)
  await $.turn.complete(turn(ROUND))
  expect((await $.prompt.submit({ text: 'Q1: B', wait: false, origin: PERSON })).context).toBe(undefined)

  // The ticket: Fire and Edit ticket show; Edit puts it in the box; sending it from there fires it, with no readback.
  await $.turn.complete(turn(TICKET))
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
  expect(await buttons(ui)).toEqual(expect.arrayContaining(['go', 'edit']))
  expect(await rowText(ui)).toContain('ticket ready')
  await ui.press({ key: 'edit' })
  await ui.unmount()
  expect(filled).toEqual([TICKET_BODY])
  const edited = await $.prompt.submit({ text: `${TICKET_BODY}\n- **Also:** keep the tone warm.`, wait: false, origin: PERSON })
  expect(edited.context).toBe(undefined)

  // After Fire, each request is read back against the ticket.
  await $.turn.complete(turn(CARRIES_ON))
  expect((await $.prompt.submit({ text: 'add a pricing page too', wait: false, origin: PERSON })).context).toEqual([
    'Yes Chef is on: read this request back as its rules say, placed against the fired ticket.',
  ])
})

test('typing "fire" on a ticket fires it; the Fire button does the same, as the person', async ($, on) => {
  const sent = await session($ as never, on)
  await $.prompt.submit({ text: 'plan the launch', wait: false, origin: PERSON })
  await $.tool.call({ tool: 'Skill', skill: 'yes-chef' } as never)
  await $.turn.complete(turn(TICKET))
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' } as never)
  await ui.press({ key: 'go' })
  expect(await buttons(ui)).not.toContain('go')
  await ui.unmount()
  const go = sent.find(entry => entry.text === GO)
  expect(go?.origin).toEqual({ kind: 'plugin', name: 'yes-chef', asUser: true })
  expect(go?.context).toBe(undefined)
  await $.turn.complete(turn(CARRIES_ON))
  expect((await $.prompt.submit({ text: 'and the email too', wait: false, origin: PERSON })).context?.[0]).toContain('fired ticket')
})

test("a round shows Yes chef and Fire: skip to the ticket; each sends the person's words", async ($, on) => {
  const sent = await session($ as never, on)
  await $.prompt.submit({ text: 'plan the launch', wait: false, origin: PERSON })
  for (const [key, text] of [['picks', PICKS], ['skip', SKIP]] as const) {
    await $.turn.complete(turn(ROUND))
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
    expect(await buttons(ui)).toEqual(expect.arrayContaining(['picks', 'skip']))
    expect(await rowText(ui)).toContain('your call')
    await ui.press({ key })
    expect(await buttons(ui)).not.toContain(key)
    await ui.unmount()
    expect(sent.at(-1)?.text).toBe(text)
    expect(sent.at(-1)?.context).toBe(undefined)
  }
})

test('planning ends when a reply asks nothing, so the readback comes back', async ($, on) => {
  await session($ as never, on)
  await $.prompt.submit({ text: 'yes chef this: the buyer guide', wait: false, origin: PERSON })
  await $.turn.complete(turn(ROUND))
  expect((await $.prompt.submit({ text: 'actually, park that', wait: false, origin: PERSON })).context).toBe(undefined)
  await $.turn.complete(turn('Parked.'))
  expect((await $.prompt.submit({ text: 'fix the cover title instead', wait: false, origin: PERSON })).context).toEqual([
    'Yes Chef is on: read this request back as its rules say.',
  ])
})

test('Fire shows while a Heard readback waits on questions, and one press sends the picks as the person', async ($, on) => {
  const sent = await session($ as never, on)
  for (const surface of ['terminal', 'desktop'] as const) {
    // A helper's turn never raises the button; the main reply with questions does, and is passed on unchanged.
    await $.turn.complete(turn(ASKS, { agentId: 'helper-1' }))
    let ui = await $.ui.mount({ ...BAND, surface } as never)
    expect(await buttons(ui)).not.toContain('fire')
    await ui.unmount()
    expect((await $.turn.complete(turn(ASKS))).text).toBe(ASKS)
    ui = await $.ui.mount({ ...BAND, surface } as never)
    expect(await rowText(ui)).toContain('waiting on your call')
    await ui.press({ key: 'fire' })
    expect(await buttons(ui)).not.toContain('fire')
    await ui.unmount()
  }
  const fired = sent.filter(entry => entry.text === FIRE)
  expect(fired).toHaveLength(2)
  expect(fired[0]?.origin).toEqual({ kind: 'plugin', name: 'yes-chef', asUser: true })
  expect(fired[0]?.context).toBe(undefined)
})

test('a proposed lesson shows Save; nothing is sent before the press; the press sends the yes', async ($, on) => {
  const sent = await session($ as never, on)
  await $.turn.complete(turn(CARRIES_ON))
  let ui = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
  expect(await buttons(ui)).not.toContain('save')
  await ui.unmount()

  await $.turn.complete(turn(LESSON))
  expect(sent).toHaveLength(0)
  ui = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
  await ui.press({ key: 'save' })
  expect(await buttons(ui)).not.toContain('save')
  await ui.unmount()
  expect(sent.map(entry => entry.text)).toEqual([SAVE])
  expect(sent[0]?.origin).toEqual({ kind: 'plugin', name: 'yes-chef', asUser: true })

  // Typing an answer instead takes the button away.
  await $.turn.complete(turn(LESSON))
  await $.prompt.submit({ text: 'no, not that one', wait: false, origin: PERSON })
  ui = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
  expect(await buttons(ui)).not.toContain('save')
  await ui.unmount()
})

test('a compaction keeps the fired ticket, and the next request carries the full rules and the ticket again', async ($, on) => {
  let told = ''
  on('session.compact', ($, e) => {
    told = e.instructions ?? ''
    return { messages: e.messages } as never
  })
  await session($ as never, on)
  await $.prompt.submit({ text: 'plan the launch', wait: false, origin: PERSON })
  await $.turn.complete(turn(TICKET))
  await $.prompt.submit({ text: 'fire', wait: false, origin: PERSON })
  await $.session.compact({ trigger: 'auto', messages: [{ role: 'user', text: 'plan the launch', toolUses: [] }] } as never)
  expect(told).toContain('Keep this fired Yes Chef ticket word for word')
  expect(told).toContain(TICKET_BODY)
  const after = await $.prompt.submit({ text: 'now the email', wait: false, origin: PERSON })
  expect(after.context?.[0]).toContain('RULES')
  expect(after.context?.[0]).toContain(TICKET_BODY)
  expect(after.context?.[0]).not.toContain('first request')
})

test('a recipe-style helper prompt gets a note and no model call by default', async ($, on) => {
  engine(on)
  let calls = 0
  const started: string[] = []
  on('fs.read', () => ({ value: RULES }) as never)
  on('model.complete', () => {
    calls++
    return { value: { isAnswered: true, text: 'Goal: x', usage: USAGE } } as never
  })
  on('agent.spawn', ($, e) => {
    started.push(e.prompt)
    return { model: 'sonnet' }
  })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const recipe = ['Fix the cover in `src/cover.ts`.', '1. open it', '2. find the title', '3. change the padding', '4. run the tests', '5. commit'].join('\n')
  await $.agent.spawn({ tool_use_id: 't1', prompt: recipe, description: 'fix cover', subagent_type: 'general-purpose' } as never)
  expect(calls).toBe(0)
  expect(started[0]).toContain('a note from Yes Chef')
  expect(started[0]).toContain(recipe)
  await $.agent.spawn({ tool_use_id: 't2', prompt: 'Find the cover file and report back its path.', description: 'find', subagent_type: 'Explore' } as never)
  expect(started[1]).toBe('Find the cover file and report back its path.')
})

test('with the helperRewrite setting on, a recipe is rewritten; a rewrite that drops a path falls back to the note', { options: { helperRewrite: true } }, async ($, on) => {
  engine(on)
  let reply = 'Goal: fix the cover title spacing in `src/cover.ts`. Success criteria: the title clears the edge by 5 mm.'
  const started: string[] = []
  on('fs.read', () => ({ value: RULES }) as never)
  on('model.complete', () => ({ value: { isAnswered: true, text: reply, usage: USAGE } }) as never)
  on('agent.spawn', ($, e) => {
    started.push(e.prompt)
    return { model: 'sonnet' }
  })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const recipe = ['Fix the cover in `src/cover.ts`.', '1. open it', '2. find the title', '3. change the padding', '4. run the tests', '5. commit'].join('\n')
  const spawn = { tool_use_id: 't1', prompt: recipe, description: 'fix cover', subagent_type: 'general-purpose' } as never
  await $.agent.spawn(spawn)
  expect(started[0]).toBe(reply)
  reply = 'Goal: fix the cover title spacing.'
  await $.agent.spawn(spawn)
  expect(started[1]).toContain('a note from Yes Chef')
})

test('a lesson saved in this session pops up as "Yes Chef learned", and the row counts the lessons', async ($, on) => {
  engine(on)
  let lessonsText = `# My lessons\n${CRAMPED}\n`
  const toasts: string[] = []
  on('fs.read', ($, e) => ({ value: e.path === LESSONS_FILE ? lessonsText : RULES }) as never)
  on('tool.call', () => ({ result: 'ok' }) as never)
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined } as never
  })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

  let ui = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
  expect(await rowText(ui)).toContain('Yes Chef · 1 lesson')
  expect(await rowText(ui)).toContain('ship strip')
  await ui.unmount()

  // Another session saved a lesson: the count follows, with no pop-up here.
  lessonsText += `${LOUD}\n`
  await $.turn.complete(turn(CARRIES_ON))
  expect(toasts).toEqual([])

  // This session saves one: the end of its turn announces it.
  await $.tool.call({ tool: 'Bash', command: `echo '- 2026-10-08: when they say "tight", they mean under 30 words' >> ${LESSONS_FILE}` } as never)
  lessonsText += '- 2026-10-08: when they say "tight", they mean under 30 words\n'
  await $.turn.complete(turn('Saved.'))
  expect(toasts).toEqual(['Yes Chef learned: when you say "tight", you mean under 30 words'])

  // A repeat lesson adds to a count instead of a line: the toast says so.
  await $.tool.call({ tool: 'Edit', file_path: LESSONS_FILE } as never)
  lessonsText = lessonsText.replace(LOUD, `${LOUD} (×2)`)
  await $.turn.complete(turn('Saved.'))
  expect(toasts[1]).toContain('now counts one more time')

  ui = await $.ui.mount({ ...BAND, surface: 'desktop' } as never)
  expect(await rowText(ui)).toContain('Yes Chef · 3 lessons')
  await ui.unmount()
})
