# Slingshot

Before a big job starts, Claude shows you the most ambitious version worth doing, and you choose.

A slingshot borrows a bigger body's pull to reach a speed your own engine can't. Slingshot does that with the model: before a job that feeds a decision or a meeting, it hands back a short plan for the version you would not have thought to ask for, then asks whether to slingshot it or do what you asked.

## What it does

- **Raises the goal.** It asks what you want to happen once the work exists, and proposes owning that outcome instead of producing a document about it.
- **Strips the limits, never the goal.** It asks who required each limit. A limit nobody can name is made up, and it goes.
- **Goes deep.** It starts from the raw material (the export, the reports, the full dataset) and names the method the best practitioners use, because telling a model to act like an expert changes its words, not its methods.
- **Goes wide, every time.** It brings in other fields, always one adversarial and one from far outside the task, each doing what that field actually does.
- **Names the outside evidence** that will show the result is right: a number from a system of record, a person who signs, a test that runs. The model never grades itself.
- **Asks once.** One plan, under 250 words, with what it takes in your time and money and an honest recommendation, including "do what you asked" when that is better. Then it does what you pick.

It starts on its own when a job feeds a decision, a meeting or work other people will use, or when it's a job you'll do again. Type "slingshot" to start it any time. Quick questions and small edits are left alone.

## An example

A test request: "Make me 5 slides on our no-show rate for Monday's ops meeting." Slingshot's plan, in one sentence: find why no-shows rose from 11% to 14% in 2 quarters of appointment data, bring one fix the doctors can approve on Monday, then compare the pilot weeks with the same weeks last year. Its far field was an airline revenue manager, who would overbook only the Monday new-patient slots most likely to go empty.

## Install

In Claude Code, in a terminal session, type:

```
/plugin install slingshot --marketplace nicodeguyo/nico-tools
```

Answer `y` to add the marketplace, then pick the user scope so it runs in every project. In the Claude app, download this folder and upload `skills/slingshot` as a skill in Settings.

With nothing installed, paste this after a big request in any AI chat:

> Slingshot this before you start: show me the most ambitious version worth doing as a short plan, not the work. Include what I want to happen once it's done, which limits are only habit and can go, how the best expert in this field would work (their raw material and tools, not their vocabulary), 3 fields that would sharpen it (one of them far outside this task) and what each would do, and what outside evidence (a number, a person, a test) would show it worked. Say what it would take in my time and money, then ask whether to slingshot it or do what I asked. Skip all this for a quick question or a small edit.

It works alongside [Heard](../heard/): when both are on, Heard asks Slingshot's question as one of its own, so you answer once.

## Verdict

Tested on October 16, 2026: the paste-in version on 3 Claude models (Haiku, Sonnet, Opus), and the skill on 3 healthcare test requests. On a request for 5 slides, every model handed back a plan built on the raw appointment export with a number to beat, and every model simply fixed a one-line grammar request. A middle-sized job, such as a 30-minute meeting agenda, can go either way.

## Credit

Built on Felix Rieseberg's "[How to be more ambitious: A tutorial for humans with models](https://felixrieseberg.com/how-to-be-more-ambitious-a-tutorial-for-humans-with-models/)", which sorts ambition into speed, altitude, depth and range (his own prompt for going deeper is in it), and on the first step of the "algorithm" Elon Musk uses at SpaceX and Tesla (question every requirement), as Walter Isaacson describes it in his biography "Elon Musk" (2023).

## Get the next one

New tools go out first in my weekly email, Value Prompt, the short version of what's new in AI and healthcare. [Get it here](https://valueprompt.pages.dev/?utm_source=github&utm_medium=tool&utm_campaign=slingshot).

## License

Slingshot is free to use, change and share under the MIT license, in `LICENSE` at the root of this repository.
