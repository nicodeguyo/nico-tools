# Yes Chef

Before a big or fuzzy job starts, Claude reads it back, shows you the most ambitious version worth doing, asks you every question that would change the work, and hands you the exact prompt the work will run from.

On a restaurant line, the cook answers "Yes, chef!" to say: I understood the order, and I'm committed to it. Yes Chef earns that answer before any real work starts, so a misread costs one line instead of an afternoon, and an unambitious plan gets raised before it is built.

## What it does

It runs four stages, in order: **Heard → Slingshot → Grill → Fire.**

- **Heard.** Claude says back the goal and why it matters in your plain words, and sizes the job by how many open decisions it found (light, standard or deep).
- **Slingshot.** In the same message, it proposes the most ambitious version worth doing: a higher goal, the made-up limits gone, the rawest material and the methods a top professional would use, a crew of fields including one adversarial and one far outside the task, and the outside evidence that will show the result is right. Its first question is always "slingshot it, or do what you asked?", and it says so honestly when the original is better.
- **Grill.** It asks you, in rounds of up to 5, every decision that would materially change the work, each with the options, what you gain and give up, its recommended answer, and what would change its mind. Facts it can look up, it looks up. Questions with only one sensible answer become stated decisions you can object to. The last round includes a pre-mortem.
- **Fire.** It writes the ticket: the prompt the work will run from, written to Anthropic's prompting guidance, with the goal, scope, decisions, assumptions, methods, success criteria, outside judge and risks. You see every word, edit anything, and say "fire" to start.

## Using it

- Say "yes chef this", "yes chef" or `/yes-chef` with your request. Claude may also offer it in one line when it spots a big, fuzzy ask; it never starts uninvited.
- In a round, "yes chef" takes Claude's recommended answer to every question. Answer by number ("Q2: B") or write your own answer any time.
- "fire" during the rounds takes Claude's picks for everything still open and jumps to the ticket. "fire" on the ticket starts the work.
- In claude.ai, each round ends with a small answer strip: Claude's picks pre-selected, a write-in box and a send button. All the reasoning stays in the text above it.
- Rounds scale with the fog: one round for a light job, 2 or 3 for a standard one, up to 5 for a deep one, with a check-in after round 3.

## Install

**Claude Code.** In a terminal session, type:

```
/plugin install yes-chef --marketplace nicodeguyo/nico-tools
```

Answer `y` to add the marketplace, then pick the user scope so it works in every project.

**Claude app (claude.ai, desktop, mobile, Duet).** Download this folder, zip `skills/yes-chef`, and upload it as a skill in Settings. Duet uses the skills on your Claude account, so it picks Yes Chef up from there.

**With nothing installed,** paste this before a big request in any AI chat:

> Before you start, yes chef this. First, say back my goal and why it matters. Then propose the most ambitious version worth doing: the outcome I want once it exists, which limits are only habit, what a top professional would do that I'm not asking for, the rawest material they'd start from, the methods they'd use, a crew of fields (one adversarial, one far outside this task) and what each would do, and what other than you or me would show the result is right. Then ask me, a few at a time, every decision that would change the work, each with options, tradeoffs, your recommendation and what would change your mind. When nothing is left, write the final prompt you will work from and wait for me to say fire.

## How it works with Heard

Yes Chef is Heard's deep mode. When the Heard mod is also on, Yes Chef owns the planning turn and Heard stays quiet until the ticket is fired; after that, Heard reads back each prompt as usual.

## Verdict

In use from November 4, 2026. The number I watch is how often I correct Claude after the ticket is locked, on the first jobs I run through it. It goes here, good or bad.

## Next

Two companion skills are on the list: one for first-principles problem solving (for stuck problems, where the open question is how to solve it rather than what to aim for) and one for systems mapping in the spirit of Donella Meadows (stocks, flows, feedback loops), which Yes Chef can name as the method when a problem is systemic.

## Credit

Built from my two earlier tools, [Heard](../heard/) and [Slingshot](../slingshot/), on Felix Rieseberg's "[How to be more ambitious: A tutorial for humans with models](https://felixrieseberg.com/how-to-be-more-ambitious-a-tutorial-for-humans-with-models/)" (its depth prompt is used word for word), on the first step of the engineering algorithm Elon Musk uses (question every requirement), as Walter Isaacson describes it in "Elon Musk" (2023), on the leverage points and system traps in Donella Meadows' "Thinking in Systems" (2008), and on Matt Pocock's grilling skill, whose design-tree rounds the Grill stage follows.

## Get the next one

New tools go out first in my weekly email, Value Prompt, the short version of what's new in AI and healthcare. [Get it here](https://valueprompt.pages.dev/?utm_source=github&utm_medium=tool&utm_campaign=yes-chef).

## License

Yes Chef is free to use, change and share under the MIT license, in `LICENSE` at the root of this repository.
