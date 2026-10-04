# Daily question run

Instructions for the scheduled agent that grows the question bank once a day. The agent works in this repository and commits to `main`.

## Goal

Add up to 20 new questions per run. Never edit the app or the tooling in this run — only files under `questions/`.

## What to write

1. Read `questions/technologies.json`, `questions/topics.json` and `questions/index.json`. Count questions per technology and level.
2. Pick what to write, in this order:
   - technologies from the list that have no questions yet (start with `nextjs`, `testing`, `nodejs`, `vue`, `angular`, `aws`), at `junior` level first;
   - technologies with fewer than 12 questions at a level;
   - `mid` level for technologies that already have 12 or more `junior` questions; `senior` only once `mid` has 12;
   - questions about recent changes: check release notes and changelogs of the technologies on the list (React, TypeScript, Next.js, Vue, Node.js, browsers via MDN) and write questions about what changed in the last weeks.
3. Open issues labelled `question`: fix or remove the question each one reports, and mention the issue number in the commit message.

## Rules for every question

- Written in Polish, same tone as the existing ones: short, concrete, no trick wording.
- `kind` is `single_choice` (exactly one correct option, 3–4 options, plausible distractors) or `flashcard` (model answer in `answer`).
- Checkable without a model. No open questions that need grading.
- The level is the file it goes into (`questions/<technology>/<level>.json`). Junior: fundamentals asked of someone with up to a year of experience. Mid: trade-offs, debugging, how things work underneath. Senior: architecture, performance, team-scale decisions. A junior file must never contain a mid or senior question.
- `source_url`: an official source (MDN, official docs, release notes, the Git book) that supports the answer. Open it and confirm it says what the question claims. Never cite a page you have not opened.
- `id`: `<technology>-<level>-<next free number, three digits>`. Never renumber or reuse ids — users' progress is keyed by them.
- `added_on`: today's date.
- `topic`: a slug from `questions/topics.json`. Add a new topic there (Polish `title` and `description`, an `icon` already used in the file) when a technology has none; keep topics coarse, about 4–8 questions each.
- Code goes in the optional `code` field, not in `prompt`.

## Before committing

1. Second pass: reread every new question as a reviewer. Is exactly one option correct? Is the explanation true for the current version of the technology? Would the answer survive a senior engineer's objection? Drop anything doubtful.
2. `npm run questions:build` must pass; it also regenerates `questions/index.json`.
3. Commit as `Questions: <summary> (<n> new, <total> total)` and push to `main`.

If nothing passes the second pass, commit nothing and say so in the run summary.
