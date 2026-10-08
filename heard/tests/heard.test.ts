import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import {
  briefContext,
  checkHelper,
  cleanReply,
  isFromSharpen,
  keepsFacts,
  sharpenPrefix,
  wantsBrief,
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

test('a Brief for real requests a person typed, nothing for confirmations, raw: or scripts', () => {
  expect(wantsBrief('the cover title looks cramped, I do not like it', PERSON)).toBe(true)
  expect(wantsBrief('Yes!', PERSON)).toBe(false)
  expect(wantsBrief('go ahead', PERSON)).toBe(false)
  expect(wantsBrief('2', PERSON)).toBe(false)
  expect(wantsBrief('raw: just run the tests', PERSON)).toBe(false)
  expect(wantsBrief('the cover title looks cramped', SCRIPT)).toBe(false)
  expect(wantsBrief('fix it', { kind: 'peer' })).toBe(false)
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
  expect(briefContext(RULES, '/l.md', '- a lesson')).toBe('RULES lessons go to /l.md\n\nWhat this person meant before (their saved lessons, newest last):\n- a lesson')
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

test('/heard off stops the Brief and /heard on brings it back', async ($, on) => {
  engine(on)
  on('fs.read', () => ({ value: RULES }) as never)
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

  await $.command.run({ command: 'heard', args: 'off', origin: PERSON } as never)
  expect((await $.prompt.submit({ text: 'make the guide better', wait: false, origin: PERSON })).context).toBe(undefined)
  await $.command.run({ command: 'heard', args: 'on', origin: PERSON } as never)
  expect((await $.prompt.submit({ text: 'make the guide better', wait: false, origin: PERSON })).context?.[0]).toContain('RULES')
})

test('Sharpen rewrites the draft in the box, and the message sent from it gets no second Brief', async ($, on) => {
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
