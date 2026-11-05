# Yes Chef

Before any new job, Claude reads it back, shows you the most ambitious version worth doing, asks only what would change the work, and hands you the prompt it will run from. After that, it reads back each request against what you agreed, and learns what you mean.

On a restaurant line, the chef calls an order, the cook answers "Heard!", and "Yes, chef!" means: I understood, and I'm committed to it. Yes Chef gives Claude the same habits, so a misread costs one line instead of an afternoon, and an unambitious plan gets raised before it is built.

## What it does

**A new job is planned first.** The first request of a session, and any later request that starts a new job, runs four stages: **Heard → Slingshot → Grill → Fire.**

- **Heard.** Claude says back the goal and why it matters in your plain words, and counts the open decisions that would change the work.
- **Slingshot.** It proposes the most ambitious version worth doing: a higher goal, the made-up limits gone, the rawest material and the methods a top professional would use, and the outside evidence that will show the result is right. Its first question is always "Slingshot it, or do what you asked?", and it says so honestly when the original is better.
- **Grill.** It asks, in rounds of up to 5, the decisions that are yours, each with the options, what you gain and give up, its pick, and what would change its mind. Facts it can look up, it looks up. The last round includes a pre-mortem.
- **Fire.** It writes the prompt the work will run from. You see every word, edit anything, and say "fire" to start.

**It sizes itself.** A simple job takes one message: the readback, the bigger version in a line or two, at most a couple of questions, and a short ticket written on Claude's picks, so "yes chef" starts the work. A job with more to decide gets 2 or 3 rounds; a deep or expensive one, up to 5. Nothing you agree on is squeezed out of the ticket to save words.

**Ticket or spec.** Work that fits one session ends in a **ticket**, which runs. Bigger work ends in a **spec**, saved where your repository keeps its plans and cut into session-sized tickets. In Matt Pocock's skills the words mean the same thing: a ticket is one session of work, a spec is what gets cut into tickets, and Yes Chef hands a spec to his `/to-tickets` when it is installed.

**After Fire, the ticket stays in charge.** Every later request gets a short readback, headed **Heard**, that says whether it sits inside the ticket or outside it ("the ticket put this out of scope: add it, or keep it for a new job?"). A change amends the ticket. "Done" means a report on each success criterion, with its evidence.

**It learns what you mean.** After you correct a readback, or give a verdict on the work, Claude ends its reply with a proposed lesson and where it would go. Nothing is saved until you say yes. Every session after that starts with your lessons, and a readback says when one shaped how it read you: (remembered: "cramped" means too close to the edge).

**In Claude Code, the mod adds buttons** above the prompt box: **Yes chef: take your picks** and **Fire: skip to the ticket** during a round, **Fire** and **Edit ticket** when the ticket is shown (Edit puts it in the prompt box), and **Save lesson** when Claude proposes one. It also keeps the planning and the readback from ever doubling up, sends its rules once per session instead of with every message, and keeps a fired ticket through a long conversation's compaction. It adds no model calls of its own.

## Using it

- Type the way you always do. Answer "yes chef", "heard" or "fire" the way you would answer "yes".
- Answer a round by number ("Q2: B") or in your own words. "fire" during the rounds takes Claude's picks for everything still open and goes to the ticket.
- Start a message with `raw:`, or say "just do it", to skip the planning and the readback for that message.
- `/heard off` and `/heard on` switch the readback on that machine; `/heard check` asks Claude to compare the rules with Anthropic's current prompting guides and propose changes; `/heard` alone shows the status.
- Messages from scripts, scheduled runs and other sessions are never read back.

## Install

**Claude Code** (2.1.286 or newer, for the mod). In a terminal session, type:

```
/plugin install yes-chef --marketplace nicodeguyo/nico-tools
```

Answer `y` to add the marketplace, then pick the user scope so it works in every project. Your lessons go to `~/.claude/yes-chef/lessons.md`; to keep them in git, point **Lessons file** at a file in a private repository (`/config`, then Yes Chef).

Everywhere else, one script makes the copies from this folder, so none is edited by hand. Download this repository, then run it from the repository's folder (it needs Node):

**Claude app (claude.ai, desktop, mobile).** `node yes-chef/scripts/publish.mjs chat ~/Downloads/yes-chef` makes `yes-chef-skill.zip`, to upload under **Customize → Skills → + → Create skill → Upload a skill** (skills need **Code execution and file creation** on, under **Settings → Capabilities**), and `yes-chef-preferences.md`, to paste into **Settings → Your Claude → Instructions** so every chat gets the readback. Add `--lessons <your lessons file>` to copy your saved lessons in. Your phone uses the same account, so it picks both up.

**Codex.** `node yes-chef/scripts/publish.mjs codex --lessons <your lessons file>` puts the skill in `~/.codex/skills/yes-chef` and the readback rule in `~/.codex/AGENTS.md`, leaving the rest of that file alone.

**One repository, for everyone who works in it.** `node yes-chef/scripts/publish.mjs repo <path to the repository>` puts the skill in its `.claude/skills/yes-chef` and the rule in its `CLAUDE.md`. Cloud sessions and teammates get it with the code.

**A work computer.** Use any of the above. Yes Chef is plain text and makes no network calls, so nothing personal needs to be on that machine: give it a lessons file of its own.

**Keeping copies current.** After you update this folder, run the same command again. `node yes-chef/scripts/publish.mjs check codex` (or `check repo <path>`) names any file that differs from the source, and on a Mac with the Claude desktop app, `check chat` says whether the Yes Chef on your claude.ai account is current and whether an old Slingshot or Heard is still uploaded.

**One copy per app, never two.** Claude Code gets Yes Chef from the plugin, Codex from `~/.codex`, and claude.ai from your account. Don't also copy it into a repository you open with the plugin installed, or Claude sees two skills of the same name. In the Claude desktop app's Code tab, the skills on your claude.ai account load beside the plugin's; keep both current and they are the same version.

**With nothing installed,** paste this before a big request in any AI chat:

> Before you start, yes chef this. First, say back my goal and why it matters. Then propose the most ambitious version worth doing: the outcome I want once it exists, which limits are only habit, what a top professional would do that I'm not asking for, the rawest material they'd start from, the methods they'd use, and what other than you or me would show the result is right. Then ask me, a few at a time, only the decisions that would change the work, each with options, tradeoffs, your recommendation and what would change your mind. When nothing is left, write the final prompt you will work from, keeping everything we agreed, and wait for me to say fire.

## Coming from Heard or Slingshot

Yes Chef replaces both. Heard's readback, its Fire button and its lessons are inside it; Slingshot is its second stage. Uninstall `heard` and `slingshot`, install `yes-chef`, and point **Lessons file** at your old Heard lessons file to keep them. Sharpen is gone: the planning step now sharpens every new job.

## Verdict

Heard was judged on how often I correct Claude after it has already changed something, per 100 prompts I type. Before Heard it was 1.0; the target was 0.5 or fewer. At its first reading Heard missed: 1.6. Yes Chef is its one rework, read on November 18, 2026, against the same target. The result goes here, good or bad.

## Credit

Built from my earlier tools Heard and Slingshot (their last versions are in this repository's history), on Felix Rieseberg's "[How to be more ambitious: A tutorial for humans with models](https://felixrieseberg.com/how-to-be-more-ambitious-a-tutorial-for-humans-with-models/)" (its depth prompt is used word for word), on the first step of the engineering algorithm Elon Musk uses (question every requirement), as Walter Isaacson describes it in "Elon Musk" (2023), on the leverage points and system traps in Donella Meadows' "Thinking in Systems" (2008), and on Matt Pocock's skills, whose grilling rounds the Grill stage follows and whose ticket and spec it shares. The rules follow Anthropic's prompting guides for its current models.

## Get the next one

New tools go out first in my weekly email, Value Prompt, the short version of what's new in AI and healthcare. [Get it here](https://valueprompt.pages.dev/?utm_source=github&utm_medium=tool&utm_campaign=yes-chef).

## License

Yes Chef is free to use, change and share under the MIT license, in `LICENSE` at the root of this repository.
