import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import {
  checkHelper,
  cleanReply,
  FIRE,
  hasQuestions,
  isFromSharpen,
  keepsFacts,
  learned,
  readbackContext,
  sharpenPrefix,
  touchesLessons,
  wantsReadback,
} from '../hooks/brief'

const PERSON = { kind: 'composer' } as const
const SCRIPT = { kind: 'sdk' } as const
const USAGE = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
const RULES = 'RULES lessons go to {{LESSONS_FILE}}'

// What the engine would answer beneath the plugin at session start.
const engine = (on: On) => {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: undefined }) as never)
  // Another mod's row in the strip, which Heard must keep.
  on('ui.render', ($, e) => $.ui.resolve(e).Text({ children: 'ship strip' }))
  mock.store(on)
  mock.env(on, { HOME: '/home/me' })
  mock.clock(on, { now: Date.UTC(2026, 9, 7) })
}

const BAND = {
  plugin: 'heard',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 120, scroll: { offset: 0, bodyRows: 5 }, view: {} },
} as const

test('a readback for real requests a person typed, nothing for confirmations, raw: or scripts', () => {
  expect(wantsReadback('the cover title looks cramped, I do not like it', PERSON)).toBe(true)
  expect(wantsReadback('Yes!', PERSON)).toBe(false)
  expect(wantsReadback('go ahead', PERSON)).toBe(false)
  expect(wantsReadback('2', PERSON)).toBe(false)
  expect(wantsReadback('raw: just run the tests', PERSON)).toBe(false)
  expect(wantsReadback('the cover title looks cramped', SCRIPT)).toBe(false)
  expect(wantsReadback('fix it', { kind: 'peer' })).toBe(false)
})

test('the s: prefix, and knowing a message came from Sharpen', () => {
  expect(sharpenPrefix('s: make the guide better')).toBe('make the guide better')
  expect(sharpenPrefix('S:  make it better')).toBe('make it better')
  expect(sharpenPrefix('make it better')).toBe(null)
  const drafted = 'Goal: the printing guide answers the three questions customers ask most. Success criteria: each answer is under 50 words.'
  expect(isFromSharpen(`${drafted} Also keep the tone warm.`, drafted)).toBe(true)
  expect(isFromSharpen('something else entirely about invoices', drafted)).toBe(false)
})

test('a helper prompt with an outcome passes; a recipe or a prompt with no outcome fails', () => {
  expect(checkHelper('Find where the cover is drawn and report back the file and line.').passes).toBe(true)
  expect(checkHelper('Look at the cover code.').passes).toBe(false)
  const recipe = ['Goal: fix the cover.', '1. open a', '2. edit b', '3. run c', '4. check d', '5. commit'].join('\n')
  expect(checkHelper(recipe)).toEqual({ hasOutcome: true, steps: 5, passes: false })
})

test('a rewrite that loses a path, link or code span is refused', () => {
  const original = 'Read `src/cover.ts` and docs/brief.md, then compare with https://example.com/spec.'
  expect(keepsFacts(original, 'Goal: compare `src/cover.ts` and docs/brief.md with https://example.com/spec.')).toBe(true)
  expect(keepsFacts(original, 'Goal: compare the cover code with the spec.')).toBe(false)
  expect(cleanReply('```\nGoal: x\n```')).toBe('Goal: x')
  expect(readbackContext(RULES, '/l.md', '# Heading\nA note.')).toBe('RULES lessons go to /l.md')
  expect(readbackContext(RULES, '/l.md', '# Heading\n- a lesson')).toBe('RULES lessons go to /l.md\n\nWhat this person meant before (their saved lessons, newest last):\n- a lesson')
})

test('Enter hands Claude the rules and saved lessons beside the words, which stay untouched', async ($, on) => {
  engine(on)
  on('fs.read', ($, e) => ({ value: e.path.endsWith('brief.md') ? RULES : '- 2026-10-07: when they say "cramped", they mean too close to the edge' }) as never)
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

  const typed = await $.prompt.submit({ text: 'the cover title looks cramped', wait: false, origin: PERSON })
  expect(typed.text).toBe('the cover title looks cramped')
  expect(typed.context?.[0]).toContain('RULES lessons go to')
  expect(typed.context?.[0]).toContain('they mean too close to the edge')

  const confirmed = await $.prompt.submit({ text: 'yes', wait: false, origin: PERSON })
  expect(confirmed.context).toBe(undefined)
  const scripted = await $.prompt.submit({ text: 'the cover title looks cramped', wait: false, origin: SCRIPT })
  expect(scripted.context).toBe(undefined)
})

test('/heard off stops the readback and /heard on brings it back', async ($, on) => {
  engine(on)
  on('fs.read', () => ({ value: RULES }) as never)
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

  await $.command.run({ command: 'heard', args: 'off', origin: PERSON } as never)
  expect((await $.prompt.submit({ text: 'make the guide better', wait: false, origin: PERSON })).context).toBe(undefined)
  await $.command.run({ command: 'heard', args: 'on', origin: PERSON } as never)
  expect((await $.prompt.submit({ text: 'make the guide better', wait: false, origin: PERSON })).context?.[0]).toContain('RULES')
})

test('Sharpen rewrites the draft in the box, and the message sent from it gets no second readback', async ($, on) => {
  engine(on)
  const sharpened = 'Goal: the printing guide answers the three questions customers ask most. Success criteria: each answer is under 50 words.'
  const filled: string[] = []
  on('fs.read', () => ({ value: RULES }) as never)
  on('prompt.read', () => ({ value: { text: 'make the guide better', cursor: 0 } }) as never)
  on('model.fork', () => ({ value: { isAnswered: true, text: sharpened, usage: USAGE } }) as never)
  on('prompt.fill', ($, e) => {
    filled.push(e.text)
    return { isFilled: true, text: e.text, cursor: e.text.length } as never
  })
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface } as never)
    const texts = (await ui.findAll({ type: 'Text' })).map(found => found.text).join(' ')
    expect(texts).toContain('ship strip')
    expect(texts).toContain('Heard')
    await ui.press({ key: 'sharpen' })
    await ui.unmount()
  }
  expect(filled[0]).toBe(sharpened)
  expect((await $.prompt.submit({ text: sharpened, wait: false, origin: PERSON })).context).toBe(undefined)
})

test('"s:" holds the message back and puts the sharpened draft in the box', async ($, on) => {
  const filled: string[] = []
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: undefined }) as never)
  on('fs.read', () => ({ value: RULES }) as never)
  on('model.fork', () => ({ value: { isAnswered: true, text: 'Goal: a clearer guide.', usage: USAGE } }) as never)
  on('prompt.fill', ($, e) => {
    filled.push(e.text)
    return { isFilled: true, text: e.text, cursor: e.text.length } as never
  })
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))
  mock.store(on)
  mock.env(on, { HOME: '/home/me' })
  const clock = mock.clock(on, { now: Date.UTC(2026, 9, 7) })
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

  const held = await $.prompt.submit({ text: 's: make the guide better', wait: false, origin: PERSON })
  expect(held.drop).toContain('sharpening your draft')
  await clock.advance(1)
  expect(filled).toEqual(['Goal: a clearer guide.'])
})

test('a recipe-style helper prompt is rewritten; a rewrite that drops a path falls back to a note', async ($, on) => {
  engine(on)
  let reply = 'Goal: fix the cover title spacing in `src/cover.ts`. Success criteria: the title clears the edge by 5 mm.'
  const started: string[] = []
  on('fs.read', () => ({ value: 'SHARPEN RULES' }) as never)
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
  expect(started[1]).toContain('a note from Heard')
  expect(started[1]).toContain(recipe)

  await $.agent.spawn({ ...(spawn as object), prompt: 'Find the cover file and report back its path.' } as never)
  expect(started[2]).toBe('Find the cover file and report back its path.')
})

// A readback that waits on the person, as the rules shape it, and one that carries on.
const ASKS = ['**Heard**', '- **Goal:** a launch plan for the new tote.', '- **Questions:** LinkedIn only, or every channel? I recommend LinkedIn only.'].join('\n')
const CARRIES_ON = '**Heard:** the cover title gets 5 mm more space, done when it clears the edge.\n\nDone: the title now clears the edge.'
const LESSONS_FILE = '/home/me/.claude/heard/lessons.md'
const CRAMPED = '- 2026-10-07: when they say "cramped", they mean too close to the edge'
const LOUD = '- 2026-10-08: when they say "loud", they mean too many colors'
const turn = (answer: string, extra: object = {}) =>
  ({ answer, durationMs: 1, isAborted: false, turnId: 't', reason: 'answer', ...extra }) as never
const rowText = async (ui: { findAll: (q: { type: string }) => Promise<{ text: string }[]> }) =>
  (await ui.findAll({ type: 'Text' })).map(found => found.text).join(' ')
const buttons = async (ui: { findAll: (q: { type: string }) => Promise<{ key: string | undefined }[]> }) =>
  (await ui.findAll({ type: 'Button' })).map(found => found.key)

test('the kitchen replies count as a go-ahead; a real request that starts with one does not', () => {
  for (const reply of ['Heard!', 'yes chef', 'Yes, chef.', 'heard, chef', 'oui chef', 'fire', 'Fire it!', 'fire away']) {
    expect(wantsReadback(reply, PERSON)).toBe(false)
  }
  expect(wantsReadback('fire the old cover and draw a new one', PERSON)).toBe(true)
  expect(wantsReadback('heard anything from the printer?', PERSON)).toBe(true)
})

test('a reply waits on the person only when its readback has a Questions line', () => {
  expect(hasQuestions(ASKS)).toBe(true)
  expect(hasQuestions('**Heard**\n**Questions:** which channel?')).toBe(true)
  // The form a live reply used (evals/readback.mjs, 2026-10-08): a heading over numbered questions.
  expect(hasQuestions('**Heard**\n\n**Questions**\n\n1. Which product?')).toBe(true)
  expect(hasQuestions(CARRIES_ON)).toBe(false)
  expect(hasQuestions('Questions about the cover are in the notes.')).toBe(false)
})

test('a saved lesson reads as spoken to the person, and only writes to the lessons file count', () => {
  expect(learned(CRAMPED)).toBe('when you say "cramped", you mean too close to the edge')
  expect(touchesLessons({ tool: 'Bash', command: `echo '${CRAMPED}' >> ~/.claude/heard/lessons.md` } as never, LESSONS_FILE)).toBe(true)
  expect(touchesLessons({ tool: 'Edit', file_path: LESSONS_FILE } as never, LESSONS_FILE)).toBe(true)
  expect(touchesLessons({ tool: 'Read', file_path: LESSONS_FILE } as never, LESSONS_FILE)).toBe(false)
  expect(touchesLessons({ tool: 'Write', file_path: '/repo/notes/lessons.md' } as never, LESSONS_FILE)).toBe(false)
})

test('Fire shows while a readback waits on questions, and one press sends the picks as the person', async ($, on) => {
  engine(on)
  const sent: { text: string; origin: unknown; context: unknown }[] = []
  on('fs.read', () => ({ value: RULES }) as never)
  on('prompt.submit', ($, e) => {
    sent.push({ text: e.text, origin: e.origin, context: e.context })
    return { text: e.text, context: e.context }
  })
  on('turn.complete', ($, e) => ({ text: e.answer }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    let ui = await $.ui.mount({ ...BAND, surface } as never)
    expect(await buttons(ui)).not.toContain('fire')
    await ui.unmount()

    // A helper's turn never raises the button; the main reply with questions does, and is passed on unchanged.
    await $.turn.complete(turn(ASKS, { agentId: 'helper-1' }))
    ui = await $.ui.mount({ ...BAND, surface } as never)
    expect(await buttons(ui)).not.toContain('fire')
    await ui.unmount()
    expect((await $.turn.complete(turn(ASKS))).text).toBe(ASKS)

    ui = await $.ui.mount({ ...BAND, surface } as never)
    expect(await rowText(ui)).toContain('waiting on your call')
    expect(await buttons(ui)).toContain('fire')
    await ui.press({ key: 'fire' })
    expect(await buttons(ui)).not.toContain('fire')
    await ui.unmount()
  }

  const fired = sent.filter(entry => entry.text === FIRE)
  expect(fired).toHaveLength(2)
  // Sent as the person's words, from the plugin, so it gets no second readback.
  expect(fired[0]?.origin).toEqual({ kind: 'plugin', name: 'heard', asUser: true })
  expect(fired[0]?.context).toBe(undefined)
})

test('the person answering in their own words, or a reply that carries on, takes Fire away', async ($, on) => {
  engine(on)
  on('fs.read', () => ({ value: RULES }) as never)
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))
  on('turn.complete', ($, e) => ({ text: e.answer }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

  await $.turn.complete(turn(ASKS))
  await $.prompt.submit({ text: 'every channel, please', wait: false, origin: PERSON })
  let ui = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
  expect(await buttons(ui)).not.toContain('fire')
  await ui.unmount()

  await $.turn.complete(turn(ASKS))
  await $.turn.complete(turn(CARRIES_ON))
  ui = await $.ui.mount({ ...BAND, surface: 'desktop' } as never)
  expect(await buttons(ui)).not.toContain('fire')
  await ui.unmount()
})

test('a lesson saved in this session pops up as "Heard learned", and the row counts the lessons', async ($, on) => {
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
  expect(await rowText(ui)).toContain('Heard · 1 lesson')
  await ui.unmount()

  // Another session saved a lesson: the count follows, with no pop-up here.
  lessonsText += `${LOUD}\n`
  await $.turn.complete(turn(CARRIES_ON))
  expect(toasts).toEqual([])

  // This session saves one: the end of its turn announces it.
  await $.tool.call({ tool: 'Bash', command: `echo '- 2026-10-08: when they say "tight", they mean under 30 words' >> ${LESSONS_FILE}` } as never)
  lessonsText += '- 2026-10-08: when they say "tight", they mean under 30 words\n'
  await $.turn.complete(turn('Saved.'))
  expect(toasts).toEqual(['Heard learned: when you say "tight", you mean under 30 words'])

  ui = await $.ui.mount({ ...BAND, surface: 'desktop' } as never)
  expect(await rowText(ui)).toContain('Heard · 3 lessons')
  await ui.unmount()

  // The next turn has nothing new to announce.
  await $.turn.complete(turn(CARRIES_ON))
  expect(toasts).toHaveLength(1)
})
