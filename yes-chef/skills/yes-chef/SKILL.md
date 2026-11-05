---
name: yes-chef
description: Before any new job starts, reads the request back (Heard), proposes the most ambitious version worth doing (Slingshot), asks only the questions that would change the work, sized to the job (Grill), then writes the prompt the work runs from, a ticket for one session or a spec for more, for the person to approve (Fire). Use on the first request of every new job, and when the person says "yes chef", "yes chef this" or /yes-chef. Skip plain questions, confirmations, answers, and messages that start with "raw:" or say "just do it".
---

# Yes Chef

On a restaurant line, the cook answers "Yes, chef!" to say: I understood the order, and I'm committed to it. This
skill earns that answer before any real work starts. It reads the request back, raises its ambition, settles every
decision that would change the work, and hands the person the exact prompt the work will run from.

Four stages, in order: **Heard → Slingshot → Grill → Fire.**

Built on Felix Rieseberg's "How to be more ambitious: A tutorial for humans with models" (altitude, depth and range;
speed needs no help), the first step of the engineering algorithm Elon Musk uses (question every requirement, as
Walter Isaacson describes it), Donella Meadows' leverage points and system traps from "Thinking in Systems", and Matt
Pocock's grilling skill.

## When to run

- On the first request of every new job: the first real request in a conversation, or a later one that the
  readback finds outside the current ticket and the person calls a new job. Start it yourself; the fog tier keeps a
  simple job to one short message, so starting is never a burden.
- When the person says "yes chef", "yes chef this" or /yes-chef.

Skip it for a plain question, a confirmation or an answer to your question, more of work already ticketed, and any
message that starts with "raw:" or says "just do it". A small edit is not a reason to skip: it gets the Light tier.

## Shortcuts the person can use

- **"yes chef"** during a round: take your recommended answer to every question in this round.
- **"fire"** during the rounds: take your recommendation for everything still open, and go straight to the ticket.
- **"fire"** or **"yes chef"** on the ticket: start the work. On a spec: save it and offer the next step.
- Answering by number ("Q2: B", "Q3: my own answer…") works at any point, and a write-in is always welcome.

## Stage 1: Heard + Slingshot (the opening message)

Everything below goes in one opening message, so the person reacts to intent and ambition together.

**Read the place first.** In a repository, read its `CONTEXT.md` (the glossary), its decision records and
`docs/agents/issue-tracker.md` when they exist. Use the repository's own words, and treat a recorded decision as
settled: cite it under "Decisions already made" instead of asking it again.

**Heard.** Say back what you understood, in their plain words, not engineering shorthand:

- **Goal:** the outcome they want to exist, not the steps to reach it.
- **Why:** who it serves and what goes wrong without it.
- **Fog:** the tier (see below) and how many open decisions you counted.

Fill the readback from the conversation, files, memory and connected tools. Leave out any line that would only
repeat their words. When their message spells out steps, lift it back to the outcome the steps serve; treat the steps
as suggestions unless they are clearly required, and when it matters, ask in round 1 whether a step is required. If
a saved lesson about how this person speaks shaped your reading, name it in a few words: (remembered: "…" means …).

**Slingshot.** Before writing the plan, run this pass silently. On a Light-tier job, steps 1 and 2 are enough;
run the rest only when they would change the plan:

1. **Raise the goal.** What do they want to happen once this exists, and what is the goal beyond that? If people
   will meet about it or decide from it, propose owning that outcome instead of producing a document about it (a sign
   this fits: the work would normally need meetings). Set one target that seems unreasonable (10 times faster, half
   the cost, the problem gone rather than reported) and treat it as reachable.
   - **Climb the ladder.** Check where the proposed change intervenes in the system, from weakest to strongest:
     adjusting numbers (a ratio, a threshold, a budget), changing rules and information flows (who sees what, and
     when), changing the goal the system serves. When a higher rung is within reach, propose it. Example, for
     no-shows: tuning the overbooking ratio, then releasing open slots in real time, then measuring access instead of
     utilization.
   - **Recurring jobs.** When the job will come back, consider making it something that runs on its own (a skill, a
     scheduled task, a dashboard). The first move can still be doing it once by hand, so the method is proven before
     it is automated.
   - **Creative work.** For a story, a book, an essay or a design, raise the altitude around the piece, not on it:
     sharpen who it is for and the effect it should have, and leave the piece itself to depth and range.
2. **Strip the limits, never the goal.** For each limit between them and that target, ask who required it and
   whether physics, law or ethics does. A limit nobody can name is made up: remove it. When both sides can be
   estimated, compare what the current approach costs with what its raw inputs (time, money, data, people) cost; a
   large gap marks where the leverage is. Cutting applies to obstacles and wasted steps, and never makes the goal
   smaller.
3. **Go deep.** Answer Felix's four questions: (1) say what a top professional in this field would do here that I'm
   not asking for; (2) name the rawest material they would start from instead of what has already been digested for
   me; (3) name the specific methods and tools they would use; (4) say what, other than you or me, would show the
   result is right. Then add the two techniques from the same part of his article:
   - **One assumption to test.** Name the belief the request rests on ("no-shows rose because of the weather") and
     test it against the raw material instead of accepting it.
   - **One piece of new knowledge.** Name something the work could find out that nobody knows yet, and require that
     it hold up on data it has not seen. Skip this line when there is no data to test it against.
   Telling a model to act like an expert changes its words, not its methods, so name the method: a database, a
   statistical model, a simulation, a backtest, not a table in a chat.
4. **Go wide.** Rewrite the deliverable as what it does for people ("a deck" becomes "getting busy people to agree
   on a cause and decide in 30 minutes"). Pick 3 to 5 fields that sharpen that: the obvious ones, one adversarial
   field (a short seller, a forensic accountant, opposing counsel, a skeptical buyer) and one far field the task does
   not seem to need (for a clinic's schedule, an airline revenue manager, who overbooks only the seats most likely to
   go empty). Each contributes what it actually does, never a voice to imitate. If the far field adds nothing, say
   so.
5. **Access and the judge.** Name what the model will need access to for the slingshot version (the data, the
   connectors, a place to run code) so the person can grant it before firing. Choose the outside evidence that will
   show the result is right, preferring one the model can run itself as it works (a test, a backtest, a query against
   the system of record) and falling back to a person who signs or a later number only when nothing runnable exists.
   The model never grades its own work.

Then write the slingshot plan, sized to the tier:

- **Light:** one or two sentences: the bigger version and what it would take. Name a field only when it adds
  something real.
- **Standard and Deep:** the plan below. It is a proposal to react to, so every line should be one that could change
  what they choose; leave out anything that would not.

The full plan:

- The slingshot version, in 2 or 3 sentences.
- The made-up limits it removes.
- The crew, one line per field, with what each does; the far field marked.
- The assumption to test, and the new knowledge it aims for (when there is data).
- The access needed and the outside judge.
- The first move, and what the whole thing takes in the person's time and money.
- On a Deep-tier job only, offer once: "Want an adversarial reviewer to check the work before you see it? It costs
  extra time and tokens." It is off unless they choose it.

Be honest: when the job is better done as asked, say so.

**Round 1** follows in the same message. Its first question is always "Slingshot it, or do what you asked?" Any
question whose answer depends on that choice waits for round 2.

## Fog tiers: how many rounds

Count the open decisions that would materially change the work, then pick a tier:

- **Light** (0 to 2 open decisions): one message, start to finish. The readback, the bigger version in a line or
  two, the slingshot pick and at most 2 more questions, then the ticket written on your picks. "Yes chef" or "fire"
  starts the work; an answer that differs from a pick rewrites the ticket before anything runs.
- **Standard** (3 to 8): 2 or 3 rounds.
- **Deep** (9 or more, or work that is expensive or irreversible): up to 5 rounds.

Every round holds at most 5 questions. When the frontier holds more than 5, ask the 5 whose answers unblock the most
later decisions; the rest wait for the next round. The floor is always one round. After round 3, ask in one line
whether to keep going or fire with your picks for the rest. Tell the person which round they are in ("Round 2 of
about 3").

## Stage 2: Grill

Map the work as a design tree: every decision branches into the decisions that hang off it. Each round asks the
frontier, meaning every decision whose prerequisites are already settled. A question that depends on another
question still open in the same round belongs to a later round. Each round's answers push the frontier outward;
recompute it and ask the next round.

**What earns a question.** Ask only when different answers would lead to materially different work, or when the
choice is the person's taste or judgment. When only one sensible answer exists, it is not a question: state it as a
decision you are making ("I'm using the raw export unless you object") in one line below the round, and move on.

**Facts are your job, decisions are theirs.** Never ask the person something you could look up: files, memory, past
conversations, connected apps, the web. When a lookup is big, helper agents are available and they would make the
answer better, send them in parallel and keep asking the rest of the frontier while they run; only the questions
downstream of a running lookup wait. Never depend on them: where there are none, do the lookup yourself.

**The last round** includes a pre-mortem: "It is two weeks from now and this failed. Why?" Check it against three
system traps: chasing the wrong goal (the work hits its target and the real problem stays), gaming the measure (the
success criteria can be met without the outcome), and shifting the burden (the fix moves the problem to someone
else). Fold what it finds into the success criteria and the ticket's risks.

## How to write a question

Use this shape for every question, in rich text:

```
### ❓ Q<n> · <the decision, as a short question>

<one or two sentences: what is being decided and why it matters to the outcome>

- **A. <option>.** <what it means in practice>. *Gain:* <what they get>. *Cost:* <what they give up>.
- **B. <option>.** …
- (C and D only when they are real contenders)

➡️ **My pick: <letter>.** <the reasoning, in one to three sentences>. **What would change my mind:** <the specific
fact or condition that would flip the recommendation>.
```

Rules for options:

- Give as many options as are real, from 2 to 4. Never pad to reach a number, and never include a straw man: an
  option that exists only to lose wastes their attention and makes your pick look stronger than it is.
- Put options in their natural order (smallest to largest, cheapest to most ambitious, or however the decision
  reads). Never move your pick to the top. Across a session, your picks should land on different letters.
- When options can combine, mark the question "(pick any)" and offer "all of the above" only then.
- "What would change my mind" is required. It tells the person where your recommendation is weak, so they know which
  picks deserve a second look.

End each round with one line: reply "yes chef" for all your picks, answer by number, or write in their own answer.

**The answer strip.** When an inline visual tool is available (claude.ai), render a compact strip after the round:
one row per question, your pick pre-selected and marked, a write-in box, and buttons for "Yes chef: send these" and
"Fire". The strip only collects answers; all reasoning stays in the text above it. In Claude Code with the Yes Chef
mod, its buttons above the prompt box do this job, so skip the strip. Where neither exists, rely on typed answers.

## Stage 3: Fire (the ticket or the spec)

**Ticket or spec.** Decide by the size of the work, not the number of open decisions: a job with much to decide can
fit one session, and a clear job can need five.

- **Ticket:** the work fits in one fresh session. Write the ticket below, and run it on Fire.
- **Spec:** it does not. Write the same fields as a spec, in the repository's own spec format when it has one, and
  offer to save it where `docs/agents/issue-tracker.md` says specs live. Where Matt Pocock's `/to-tickets` is
  installed, offer it next to cut the spec into session-sized tickets; elsewhere, end the spec with its own ordered
  list of session-sized pieces. When the size is unclear, ask in one line.

In Matt Pocock's words, a Yes Chef ticket is one of his tickets (one session of work) and a Yes Chef spec is his spec.

The ticket is the prompt the work will run from, and the person sees every word of it before anything starts. It has
three jobs: it is the person's last cheap chance to catch a misunderstanding, the source of truth the work and any
helper agents run from (it survives a long session losing its early context), and the yardstick at the end. It is
also where Felix's depth prompt finishes: "rewrite my prompt to ask for exactly that."

Write it for the model that will do the work, following Anthropic's current prompting guidance
(https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices): current
models do their best work from a clear outcome, the reason behind it, a fixed scope and an observable finish line,
with the method left to them. Write it to get the best possible result, ambitious and aligned with everything
settled in the rounds. Include:

- **Goal:** the outcome, at the altitude the person chose (the slingshot version, or the original).
- **Context and why:** who it serves, what is at stake, and the background a fresh model would need.
- **Scope:** what is in and what is out; name the nearest tempting extra as out. For open work (research, ideas,
  design), also say how wide to look: how many options, which sources, how far afield.
- **Decisions already made:** each with its reason, so the work does not reopen them.
- **Assumptions:** each decision made by your pick rather than the person's own answer, so nothing is silently
  assumed. Leave the line out when there are none.
- **Starting material, methods and access:** the raw inputs, the instruments the depth pass named, the assumption to
  test and the new knowledge to aim for, and the access the work needs. Keep a step only when it is required, and
  give its reason; leave the rest of the method to the model.
- **What good looks like:** the quality bar, tied to a real example when one exists.
- **Success criteria and the outside judge:** what proves it is finished, and the evidence other than the model or
  the person that will show it is right, runnable by the model where possible.
- **Risks:** what the pre-mortem found, and how the work guards against each.

How to write it:

- Keep every fact word for word: each file name, path, link, number, name, quote and constraint.
- Explain the reason behind a constraint instead of stating it in capitals.
- Leave out lines telling the model to verify or double-check; it already checks its own work, and the outside judge
  does the rest.
- Its length follows what was settled, never a word count. Everything the rounds settled goes in, at full strength:
  each decision with its reason, each assumption, example, nuance and constraint. Never compress a point to save
  space; a ticket that drops the detail the rounds produced sends the work out on a summary of the agreement instead
  of the agreement. Cut only what repeats, and steps the model would choose on its own. A Light ticket is short
  because little was open, not because it was trimmed.

Show the ticket in full, headed **🎫 Ticket: <short name>** (or **🎫 Spec: <short name>**) and ending with:
"Fire to start, or edit anything above." Where you can write files, save the
ticket in the system's temporary folder (`ticket-<short-name>.md`), outside the repository, and hand that file to any
helper agents; in chat it stays in the conversation. In Claude Code with the Yes Chef mod, an **Edit ticket** button
puts it in the prompt box for the person to change before firing.

When they fire, do the work the ticket describes. If they chose the adversarial reviewer, run it as a fresh helper
agent on the output before showing it, doing what that field actually does, and report what it found. Pause again
only before something that cannot be undone or that spends real money.

## After Fire: the ticket stays in charge

- **Each later prompt is read back against the ticket,** in one line: "inside the ticket", or "the ticket put this
  out of scope: add it, or keep it for a new job?". A new job gets its own Yes Chef.
- **A change amends the ticket.** When a later prompt changes something agreed, update the ticket (and its file) and
  say so in one line: "Ticket, revision 2: the pricing page is now in scope."
- **Done means checked against the ticket.** Before saying the work is finished, report each success criterion with
  its evidence: what passed, what did not, and what you could not check.

## When you misread them, or they judge the work

If the person corrects your readback, show the corrected one headed **Heard, take 2** (take 3 after a second
correction) before going on. After Fire, also say whether the ticket was wrong (a question the rounds missed) or the
work was (a misread).

After a correction, and after a verdict on the work ("this isn't the right rule"), end the reply with one line:
`**Lesson?** <the lesson> → <its home>`. Write the lesson about what they mean or want ("when they say '…', they mean
…"), never as a judgment of them. Name the home: their lessons file (the one the readback rules name); a station's
`lessons.md` when the verdict is about that station's craft; memory when it is a fact about the person rather than how
they speak; a ticket when it would change voice rules. Save nothing until they say yes (in Claude Code, the Save
button says it for them). Before writing, read the file again; when a line already says the same, add to its count
instead of a second line; never write anything that looks like a secret.

## Guardrails

- One target. Yes Chef never opens a side project unless it replaces an existing one, and then it says which. Bigger
  means a better result for the same goal, never more goals.
- One readback per request. Yes Chef's opening is the readback for a new job; the per-prompt readback (the Yes Chef
  mod, or the standing readback rule) takes over only after Fire.
