# Heard

Claude says back what you asked for before it starts.

On a restaurant line, the chef calls an order and the cook answers "Heard!" before cooking, so a wrong order gets caught while it is still words. Heard gives Claude Code the same habit.

## What it does

- **Every request gets read back first.** Claude opens its reply with **Heard** and a short readback: the goal, why it matters, what is in and out, what good looks like, and the success criteria that prove it is done. A small ask gets one line. When the answer would change the work, Claude asks 1 to 3 questions, each with its own recommended answer, and waits for those before starting. If Claude misread you, say so, and the corrected readback comes back as **Heard, take 2**.
- **Fire takes Claude's picks.** While a readback waits on its questions, a **Fire: use your picks** button sits above the prompt box. One press tells Claude to go with the answer it recommended for each question and start. On a kitchen line, "Fire!" is the call to start cooking a dish.
- **Sharpen turns a rough draft into a clear prompt.** Click **Sharpen** above the prompt box, or start a message with `s:` and press Enter. The model you are talking to rewrites your draft in the box, using the whole conversation, and marks anything it had to guess with "(guess)". Edit it and send.
- **Helper prompts get the same treatment.** When Claude hands work to a helper agent with a step-by-step recipe or no clear outcome, Heard rewrites that prompt around the outcome first. If a rewrite would lose a file name, a link or a piece of code, the helper gets the original with a short note in front instead.
- **It learns what you mean.** When you correct a readback, Claude asks whether to save what it misheard. On a yes, one line goes into your lessons file, a **Heard learned** pop-up shows it, and the row above the prompt box counts your lessons. Every message after that carries them, and when one shapes how Claude reads you, the readback says so, for example (remembered: "cramped" means too close to the edge).
- **It stays current.** Once a week a **Check now** button asks Claude to compare Heard's rules with Anthropic's prompting guides and propose changes. Nothing changes until you say yes.

## Why

Anthropic's own guides say the newest models do their best work from a clear outcome, the reason behind it, a fixed scope and a finish line, with the method left to the model ([Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)). Most of us type the way we talk ("make the guide better"). Heard closes that gap and shows you its reading before any work starts, so a misread costs one line instead of an afternoon.

## Install

Heard is a mod, so it needs Claude Code 2.1.286 or newer. In a terminal session, type:

```
/plugin install heard --marketplace nicodeguyo/nico-tools
```

Answer `y` to add the marketplace, then pick the user scope so it runs in every project. It works in the desktop app's Code tab too once installed.

Your lessons go to `~/.claude/heard/lessons.md` by default. To keep them in git, point **Lessons file** at a file in a private repository (`/config`, then Heard).

## Using it

- Type the way you always do.
- Answer "yes chef", "heard" or "fire" the way you would answer "yes", and Claude carries on with no second readback.
- Start a message with `raw:` to send it without a readback.
- `/heard off` and `/heard on` switch it on that machine. `/heard check` runs the rules check now. `/heard` on its own shows its status.
- Messages from scripts, scheduled runs and other sessions never get a readback, so automation behaves as it did.

## Changing how it reads you

The rules are 2 short files: `rules/brief.md` (how Claude reads a request back) and `rules/sharpen.md` (how a draft gets rewritten). They arrive with every message you send, so keep them short. After a change, `node --experimental-strip-types heard/evals/readback.mjs` sends 4 requests through Claude and checks the replies still open with **Heard**, name a remembered lesson, ask questions the Fire button can see, and say **Heard, take 2** after a correction. It needs a `claude` of 2.1.286 or newer, as the mod does.

## Verdict

In use on my machine since October 7, 2026. The number I watch is how often I correct Claude after it misread me, per 100 prompts I type. Before Heard it was 1.0. The first read is on October 21, 2026, and it goes here, good or bad.

## Credit

I first built this as Sharpen, a simpler hook, for my co-founder Melissa at Wallace Stories, to get more out of the newest models without learning prompt structure. Heard is the general version, rebuilt as a mod. The rules follow Anthropic's prompting guides for its current models.

## Get the next one

New tools go out first in my weekly email, Value Prompt, the short version of what's new in AI and healthcare. [Get it here](https://valueprompt.pages.dev/?utm_source=github&utm_medium=tool&utm_campaign=heard).

## License

Heard is free to use, change and share under the MIT license, in `LICENSE` at the root of this repository.
