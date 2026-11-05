import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import {
  asksForYesChef,
  checkHelper,
  checkRequest,
  cleanReply,
  compactNote,
  FIRE,
  fillRules,
  fullContext,
  GO,
  hasQuestions,
  hasRound,
  helperRequest,
  isConfirmation,
  isFromTicket,
  isPerson,
  keepsFacts,
  learned,
  lessonOf,
  lessons,
  loadsYesChef,
  PICKS,
  reminder,
  SAVE,
  SKIP,
  ticketOf,
  touchesLessons,
  wantsReadback,
  withNote,
} from './brief'

const isOff = atom({ plugin: 'yes-chef', key: 'isOff' } as const, false)
const isCheckDue = atom({ plugin: 'yes-chef', key: 'isCheckDue' } as const, false)
// The last reply's Heard readback asked questions and Claude is waiting on the answers: the Fire button shows.
const isWaiting = atom({ plugin: 'yes-chef', key: 'isWaiting' } as const, false)
// What the last reply asks of the person: a Yes Chef round to answer, or a ticket to fire.
const stage = atom({ plugin: 'yes-chef', key: 'stage' } as const, 'none' as 'none' | 'round' | 'ticket')
// The last reply proposed a lesson ("**Lesson?** ..."): the Save button shows.
const hasLesson = atom({ plugin: 'yes-chef', key: 'hasLesson' } as const, false)
// How many lessons the lessons file holds, as this session last read it.
const lessonCount = atom({ plugin: 'yes-chef', key: 'lessonCount' } as const, 0)

const WEEK = 7 * 24 * 60 * 60 * 1000
const DEFAULT_LESSONS = '~/.claude/yes-chef/lessons.md'
const DEFAULT_HOMES = 'memory, for a fact about them rather than how they speak'

// This session's place in the work. A session is one process, so these live as long as it does.
let rulesSent = false // the full rules are in the conversation (until it is compacted)
let firstDone = false // the session's first real request has gone out
let planning = false // Yes Chef is running its rounds: no readback until the ticket is fired
let ticket: string | null = null // the last ticket or spec a reply showed
let ticketFired = false // that ticket was fired: later requests are read back against it
let wroteLessons = false // a tool call in the running turn wrote to the lessons file

// The settings the person chose at install; set when the module loads.
let settings = { lessonsFile: DEFAULT_LESSONS, otherHomes: DEFAULT_HOMES, helperRewrite: false }

const readText = async ($: EngineInterface, path: string) => {
  try {
    return String(await $.fs.read(path))
  } catch {
    return ''
  }
}

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10)

const lessonsFile = async ($: EngineInterface) => {
  const path = settings.lessonsFile.trim() || DEFAULT_LESSONS
  return path.startsWith('~/') ? `${(await $.env.get('HOME')) ?? ''}${path.slice(1)}` : path
}

const rules = async ($: EngineInterface) =>
  fillRules(await readText($, `${$.plugin.root}/rules/heard.md`), await lessonsFile($), settings.otherHomes.trim() || DEFAULT_HOMES)

const fire = () => {
  ticketFired = true
  planning = false
}

// The buttons: each sends the person's own words, from the plugin, so none gets a readback.
const send = async ($: EngineInterface, text: string) => {
  await update($, isWaiting, () => false)
  await update($, stage, () => 'none')
  await update($, hasLesson, () => false)
  void $.prompt.submit({ text, asUser: true })
}

const editTicket = async ($: EngineInterface) => {
  if (ticket !== null) await $.prompt.fill({ text: ticket })
}

const runCheck = async ($: EngineInterface) => {
  const last = Number((await $.store.get('lastCheck')) ?? 0)
  await $.store.set('lastCheck', await $.clock.now())
  await update($, isCheckDue, () => false)
  void $.prompt.submit({ text: checkRequest($.plugin.root, last === 0 ? 'never' : day(last)) })
}

// Reads the lessons file into the row's count; after a turn that wrote to it, a toast shows the newest lesson. Another
// session's lesson only updates the count, so each lesson is announced once, where it was saved.
const refreshLessons = async ($: EngineInterface, announce: boolean) => {
  const saved = lessons(await readText($, await lessonsFile($)))
  const before = await read($, lessonCount)
  await update($, lessonCount, () => saved.length)
  const newest = saved.at(-1)
  if (!announce || newest === undefined) return
  if (saved.length > before) {
    const more = saved.length - before - 1
    $.ui.toast(`Yes Chef learned: ${learned(newest)}${more > 0 ? ` (and ${more} more)` : ''}`)
  } else {
    $.ui.toast('Yes Chef learned it again: a lesson you already had now counts one more time.')
  }
}

const setOff = async ($: EngineInterface, off: boolean) => {
  await $.store.set('isOff', off)
  await update($, isOff, () => off)
}

export const register: Register = (on, options) => {
  rulesSent = false
  firstDone = false
  planning = false
  ticket = null
  ticketFired = false
  wroteLessons = false
  settings = {
    lessonsFile: String(options.lessonsFile ?? DEFAULT_LESSONS),
    otherHomes: String(options.otherHomes ?? DEFAULT_HOMES),
    helperRewrite: options.helperRewrite === true,
  }

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'heard',
      description: 'Yes Chef\'s readback: "off", "on", "check" (the rules check now), or nothing for its status',
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
    await refreshLessons($, false)
    return next(e)
  })

  // The readback. A failing hook lets the message through untouched.
  on('prompt.submit', async ($, e, next) => {
    if (isPerson(e.origin)) {
      // The person answered in their own words, so no button has anything left to answer.
      const shown = await read($, stage)
      await update($, isWaiting, () => false)
      await update($, stage, () => 'none')
      await update($, hasLesson, () => false)
      // "fire" or "yes chef" on a shown ticket fires it; so does sending the ticket from the box, edited or not.
      if (shown === 'ticket' && (isConfirmation(e.text) || (ticket !== null && isFromTicket(e.text, ticket)))) {
        fire()
        return next(e)
      }
      // Planning lasts while its replies ask something (a round or a ticket); a reply that asked nothing means the
      // person moved on, so the readback comes back rather than staying quiet for the rest of the session.
      if (planning && shown === 'none' && firstDone) planning = false
    }
    if (await read($, isOff)) return next(e)
    if (isPerson(e.origin) && asksForYesChef(e.text)) {
      planning = true
      ticketFired = false
    }
    if (!wantsReadback(e.text, e.origin)) return next(e)
    const isFirst = !firstDone
    firstDone = true

    // The rules go in once; while Yes Chef plans, its rounds are the readback and nothing more is added.
    if (rulesSent && planning) return next(e)
    const context = rulesSent
      ? reminder(ticketFired)
      : fullContext(await rules($), await readText($, await lessonsFile($)), { isFirst, ticket: ticketFired ? ticket : null })
    rulesSent = true
    return next({ ...e, context: [...(e.context ?? []), context] })
  }).catch(($, e, next) => next(e))

  // A compacted conversation may have lost the rules and the ticket: the summary is told to keep the ticket, and the
  // next request carries the full rules (with the ticket) again.
  on('session.compact', async ($, e, next) => {
    if (e.agentId !== undefined || (await read($, isOff))) return next(e)
    rulesSent = false
    const note = compactNote(ticketFired ? ticket : null)
    return next({ ...e, instructions: e.instructions ? `${e.instructions}\n\n${note}` : note })
  }).catch(($, e, next) => next(e))

  // Helper prompts: a prompt that names no outcome, or is a recipe of steps, gets a short note in front. Only with the
  // helperRewrite setting on is it rewritten, by a small model; a rewrite that drops a path, link or code span is not
  // used.
  on('agent.spawn', async ($, e, next) => {
    if (e.workflow !== undefined || (await read($, isOff)) || checkHelper(e.prompt).passes) return next(e)
    if (!settings.helperRewrite) {
      $.ui.log(`Yes Chef added a note to the prompt for the helper "${e.description}".`)
      return next({ ...e, prompt: withNote(e.prompt) })
    }
    const reply = await $.model.complete({ model: 'sonnet', effort: 'low', maxTokens: 8000, timeoutMs: 60_000, prompt: helperRequest(e.prompt) })
    const rewrite = reply.isAnswered ? cleanReply(reply.text) : ''
    const isRewritten = rewrite !== '' && keepsFacts(e.prompt, rewrite)
    $.ui.log(
      isRewritten
        ? `Yes Chef sharpened the prompt for the helper "${e.description}".`
        : `Yes Chef added a note to the prompt for the helper "${e.description}".`,
    )
    return next({ ...e, prompt: isRewritten ? rewrite : withNote(e.prompt) })
  }).catch(($, e, next) => next(e))

  // Notes, without changing anything, when Claude loads the Yes Chef skill and when a tool call writes to the lessons
  // file.
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError === true) return ran
    if (e.agentId === undefined && loadsYesChef(e as never)) {
      planning = true
      ticketFired = false
    }
    if (touchesLessons(e, await lessonsFile($))) wroteLessons = true
    return ran
  }).catch(($, e, next) => next(e))

  // The end of each reply on the main loop: the lessons count (and a toast for a new lesson), and what the reply asks
  // of the person. The reply itself is passed on unchanged.
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId !== undefined) return result
    const wrote = wroteLessons
    wroteLessons = false
    await refreshLessons($, wrote)
    const answered = e.reason === 'answer' && !(await read($, isOff))
    const shown = answered ? ticketOf(e.answer) : null
    if (shown !== null) ticket = shown
    await update($, stage, () => (shown !== null ? 'ticket' : answered && hasRound(e.answer) ? 'round' : 'none'))
    await update($, isWaiting, () => answered && shown === null && hasQuestions(e.answer))
    await update($, hasLesson, () => answered && lessonOf(e.answer) !== null)
    return result
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'heard' }, async ($, e) => {
    const word = e.args.trim().toLowerCase()
    if (word === 'off') {
      await setOff($, true)
      return { text: 'Yes Chef\'s readback is off on this machine: no readbacks, no helper notes and no buttons. /heard on turns it back on. The Yes Chef skill still plans a new job.' }
    }
    if (word === 'on') {
      await setOff($, false)
      return { text: 'Yes Chef\'s readback is on: a new job is planned with Yes Chef, and every other request is read back, headed "Heard", before Claude starts.' }
    }
    if (word === 'check') {
      await runCheck($)
      return { text: "Yes Chef asked Claude to check Anthropic's prompting guides against its rules." }
    }
    const last = Number((await $.store.get('lastCheck')) ?? 0)
    const count = await read($, lessonCount)
    return {
      text: [
        (await read($, isOff)) ? 'Yes Chef\'s readback is off. /heard on turns it back on.' : 'Yes Chef\'s readback is on.',
        `${count} ${count === 1 ? 'lesson' : 'lessons'} saved in ${await lessonsFile($)}.`,
        `Rules last checked: ${last === 0 ? 'never' : day(last)}.`,
        ticketFired ? 'A ticket is fired in this session: requests are read back against it.' : '',
        'Start a message with "raw:" to send it without a readback.',
      ]
        .filter(line => line !== '')
        .join(' '),
    }
  })

  // One row in the strip above the prompt box, under whatever another mod draws there.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    if (e.props.hasSurvey || e.props.view.agentId !== undefined) return below

    const { Box, Button, Text } = $.ui.resolve(e)
    const [off, due, count] = [await read($, isOff), await read($, isCheckDue), await read($, lessonCount)]
    const [waiting, shown, lesson] = [await read($, isWaiting), await read($, stage), await read($, hasLesson)]
    const live = !off
    const status = shown === 'round' ? 'your call' : shown === 'ticket' ? 'ticket ready' : waiting ? 'waiting on your call' : ticketFired ? 'ticket fired' : ''
    const label = off
      ? 'Yes Chef is off'
      : ['Yes Chef', count > 0 ? `${count} ${count === 1 ? 'lesson' : 'lessons'}` : '', status].filter(part => part !== '').join(' · ')
    const mine = (
      <Box columnGap={1} flexWrap="wrap">
        <Text dimColor>{label}</Text>
        {live && shown === 'round' && <Button key="picks" label="Yes chef: take your picks" onPress={() => send($, PICKS)} />}
        {live && shown === 'round' && <Button key="skip" label="Fire: skip to the ticket" onPress={() => send($, SKIP)} />}
        {live && shown === 'ticket' && <Button key="go" label="Fire" onPress={async () => { fire(); await send($, GO) }} />}
        {live && shown === 'ticket' && <Button key="edit" label="Edit ticket" onPress={() => editTicket($)} />}
        {live && waiting && <Button key="fire" label="Fire: use your picks" onPress={() => send($, FIRE)} />}
        {live && lesson && <Button key="save" label="Save lesson" onPress={() => send($, SAVE)} />}
        {off && <Button key="on" label="Turn on" dimColor onPress={() => setOff($, false)} />}
        {due && live && <Text dimColor>· rules check due</Text>}
        {due && live && <Button key="check" label="Check now" dimColor onPress={() => runCheck($)} />}
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
