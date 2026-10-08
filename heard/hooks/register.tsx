import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import {
  checkHelper,
  checkRequest,
  cleanReply,
  helperRequest,
  isFromSharpen,
  isPerson,
  keepsFacts,
  readbackContext,
  sharpenPrefix,
  sharpenRequest,
  wantsReadback,
  withNote,
} from './brief'

const isOff = atom({ plugin: 'heard', key: 'isOff' } as const, false)
const isBusy = atom({ plugin: 'heard', key: 'isBusy' } as const, false)
const isCheckDue = atom({ plugin: 'heard', key: 'isCheckDue' } as const, false)

const WEEK = 7 * 24 * 60 * 60 * 1000
const DEFAULT_LESSONS = '~/.claude/heard/lessons.md'

// The draft Sharpen last put in the prompt box: the message sent from it gets no second readback.
let sharpened: string | null = null

const readText = async ($: EngineInterface, path: string) => {
  try {
    return String(await $.fs.read(path))
  } catch {
    return ''
  }
}

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10)

// The lessons file the person chose at install; set when the module loads.
let lessonsSetting = DEFAULT_LESSONS

const lessonsFile = async ($: EngineInterface) => {
  const path = lessonsSetting.trim() || DEFAULT_LESSONS
  return path.startsWith('~/') ? `${(await $.env.get('HOME')) ?? ''}${path.slice(1)}` : path
}

const rules = async ($: EngineInterface, name: 'brief' | 'sharpen') =>
  readText($, `${$.plugin.root}/rules/${name}.md`)

const sharpen = async ($: EngineInterface, draft: string) => {
  if (draft.trim() === '') {
    $.ui.toast('Type a draft first, then Sharpen it.')
    return
  }
  await update($, isBusy, () => true)
  try {
    const request = sharpenRequest(await rules($, 'sharpen'), draft, await readText($, await lessonsFile($)))
    // The model you are talking to, reading the whole conversation from the prompt cache; before
    // the first reply there is nothing to fork, so the same model reads the draft alone.
    let reply = await $.model.fork({ prompt: request })
    if (!reply.isAnswered && reply.reason === 'nothing-to-fork') {
      reply = await $.model.complete({ model: await $.session.model(), prompt: request, maxTokens: 8000 })
    }
    if (!reply.isAnswered) {
      await $.prompt.fill({ text: draft })
      $.ui.toast(`Heard could not sharpen this draft (${reply.reason}). Your draft is back in the box, unchanged.`)
      return
    }
    sharpened = cleanReply(reply.text)
    await $.prompt.fill({ text: sharpened })
    $.ui.toast('Sharpened. Edit it if anything is off, then press Enter to send.')
  } finally {
    await update($, isBusy, () => false)
  }
}

const runCheck = async ($: EngineInterface) => {
  const last = Number((await $.store.get('lastCheck')) ?? 0)
  await $.store.set('lastCheck', await $.clock.now())
  await update($, isCheckDue, () => false)
  void $.prompt.submit({ text: checkRequest($.plugin.root, last === 0 ? 'never' : day(last)) })
}

const setOff = async ($: EngineInterface, off: boolean) => {
  await $.store.set('isOff', off)
  await update($, isOff, () => off)
}

export const register: Register = (on, options) => {
  lessonsSetting = String(options.lessonsFile ?? DEFAULT_LESSONS)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'heard',
      description: 'Heard: "off", "on", "check" (the weekly rules check now), or nothing for its status',
      argumentHint: '[off|on|check]',
    })
    const storedOff = (await $.store.get('isOff')) === true
    await update($, isOff, () => storedOff)
    if (e.isInteractive) {
      const now = await $.clock.now()
      const last = Number((await $.store.get('lastCheck')) ?? 0)
      // The first session after install starts the clock rather than asking at once.
      if (last === 0) await $.store.set('lastCheck', now)
      else if (now - last > WEEK) await update($, isCheckDue, () => true)
    }
    return next(e)
  })

  // The readback, and the "s:" prefix. A failing hook lets the message through untouched.
  on('prompt.submit', async ($, e, next) => {
    const draft = sharpenPrefix(e.text)
    if (draft !== null && isPerson(e.origin)) {
      $.clock.after(0, () => void sharpen($, draft))
      return { drop: 'Heard is sharpening your draft. It will appear in the prompt box in a few seconds.' }
    }

    const fromSharpen = sharpened !== null && isFromSharpen(e.text, sharpened)
    if (isPerson(e.origin)) sharpened = null
    if (fromSharpen || (await read($, isOff)) || !wantsReadback(e.text, e.origin)) return next(e)

    const path = await lessonsFile($)
    const context = readbackContext(await rules($, 'brief'), path, await readText($, path))
    return next({ ...e, context: [...(e.context ?? []), context] })
  }).catch(($, e, next) => next(e))

  // Helper prompts: a prompt that names no outcome, or is a recipe of steps, is rewritten before
  // the helper starts. A rewrite that drops a path, link or code span is not used; the helper
  // gets the original with a short note in front instead.
  on('agent.spawn', async ($, e, next) => {
    if (e.workflow !== undefined || (await read($, isOff)) || checkHelper(e.prompt).passes) return next(e)

    const reply = await $.model.complete({
      model: 'sonnet',
      effort: 'low',
      maxTokens: 8000,
      timeoutMs: 60_000,
      prompt: helperRequest(await rules($, 'sharpen'), e.prompt),
    })
    const rewrite = reply.isAnswered ? cleanReply(reply.text) : ''
    const isRewritten = rewrite !== '' && keepsFacts(e.prompt, rewrite)
    $.ui.log(
      isRewritten
        ? `Heard sharpened the prompt for the helper "${e.description}".`
        : `Heard added a note to the prompt for the helper "${e.description}".`,
    )
    return next({ ...e, prompt: isRewritten ? rewrite : withNote(e.prompt) })
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'heard' }, async ($, e) => {
    const word = e.args.trim().toLowerCase()
    if (word === 'off') {
      await setOff($, true)
      return { text: 'Heard is off on this machine: no readbacks and no helper checks. Sharpen still works. /heard on turns it back on.' }
    }
    if (word === 'on') {
      await setOff($, false)
      return { text: 'Heard is on: Claude reads each request back, headed "Heard", before it starts.' }
    }
    if (word === 'check') {
      await runCheck($)
      return { text: "Heard asked Claude to check Anthropic's prompting guides against its rules." }
    }
    const last = Number((await $.store.get('lastCheck')) ?? 0)
    return {
      text: [
        (await read($, isOff)) ? 'Heard is off. /heard on turns it back on.' : 'Heard is on.',
        `Lessons are saved to ${await lessonsFile($)}.`,
        `Rules last checked: ${last === 0 ? 'never' : day(last)}.`,
        'Sharpen a draft with the button above the prompt box, or start a message with "s:". Start a message with "raw:" to send it without a readback.',
      ].join(' '),
    }
  })

  // One row in the strip above the prompt box, under whatever another mod draws there.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    if (e.props.hasSurvey || e.props.view.agentId !== undefined) return below

    const { Box, Button, Text } = $.ui.resolve(e)
    const [off, busy, due] = [await read($, isOff), await read($, isBusy), await read($, isCheckDue)]
    const mine = (
      <Box columnGap={1} flexWrap="wrap">
        <Text dimColor>{busy ? 'Heard is sharpening your draft…' : off ? 'Heard is off' : 'Heard'}</Text>
        {!busy && (
          <Button
            key="sharpen"
            label="Sharpen"
            onPress={async () => void sharpen($, (await $.prompt.read()).text)}
          />
        )}
        {off && <Button key="on" label="Turn on" dimColor onPress={() => setOff($, false)} />}
        {due && !off && <Text dimColor>· rules check due</Text>}
        {due && !off && <Button key="check" label="Check now" dimColor onPress={() => runCheck($)} />}
      </Box>
    )
    return below ? (
      <Box flexDirection="column">
        {below}
        {mine}
      </Box>
    ) : (
      mine
    )
  })
}
