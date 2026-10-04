// Validates the question bank and builds questions/index.json.
//   --write  regenerate the index
//   --check  fail when the committed index is stale (used in CI)
import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'questions');
const LEVELS = ['junior', 'mid', 'senior'];
const KINDS = ['single_choice', 'flashcard'];
const errors = [];
const fail = (where, message) => errors.push(`${where}: ${message}`);
const isText = (value) => typeof value === 'string' && value.trim().length > 0;

const technologies = JSON.parse(readFileSync(join(root, 'technologies.json'), 'utf8'));
const slugs = new Set(technologies.map((technology) => technology.slug));
if (slugs.size !== technologies.length) fail('technologies.json', 'duplicate slug');

const seen = new Set();
const index = [];

for (const entry of readdirSync(root).sort()) {
  const dir = join(root, entry);
  if (!statSync(dir).isDirectory()) continue;
  if (!slugs.has(entry)) fail(entry, 'directory is not listed in technologies.json');

  for (const file of readdirSync(dir).sort()) {
    const level = file.replace(/\.json$/, '');
    const where = `${entry}/${file}`;
    if (!LEVELS.includes(level)) {
      fail(where, `file name must be one of ${LEVELS.join(', ')}`);
      continue;
    }

    let questions;
    try {
      questions = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    } catch (error) {
      fail(where, `invalid JSON (${error.message})`);
      continue;
    }
    if (!Array.isArray(questions)) {
      fail(where, 'file must contain an array');
      continue;
    }

    for (const question of questions) {
      const at = `${where} ${question.id ?? '(no id)'}`;
      if (!isText(question.id) || !question.id.startsWith(`${entry}-${level}-`)) {
        fail(at, `id must start with "${entry}-${level}-"`);
      }
      if (seen.has(question.id)) fail(at, 'duplicate id');
      seen.add(question.id);

      for (const field of ['topic', 'prompt', 'explanation']) {
        if (!isText(question[field])) fail(at, `missing ${field}`);
      }
      if (!KINDS.includes(question.kind)) fail(at, `kind must be one of ${KINDS.join(', ')}`);
      if (!/^https:\/\//.test(question.source_url ?? '')) fail(at, 'source_url must be an https link');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(question.added_on ?? '')) fail(at, 'added_on must be YYYY-MM-DD');

      if (question.kind === 'single_choice') {
        const options = question.options;
        if (!Array.isArray(options) || options.length < 2 || !options.every(isText)) {
          fail(at, 'single_choice needs at least two text options');
        } else if (new Set(options).size !== options.length) {
          fail(at, 'options must be unique');
        } else if (!Number.isInteger(question.correct) || question.correct < 0 || question.correct >= options.length) {
          fail(at, 'correct must be an index into options');
        }
      }
      if (question.kind === 'flashcard' && !isText(question.answer)) fail(at, 'flashcard needs an answer');

      index.push({
        id: question.id,
        technology: entry,
        level,
        topic: question.topic,
        kind: question.kind,
        added_on: question.added_on,
      });
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} problem(s) found`);
  process.exit(1);
}

const indexPath = join(root, 'index.json');
const output = `${JSON.stringify(index, null, 2)}\n`;

if (process.argv.includes('--write')) {
  writeFileSync(indexPath, output);
} else if (process.argv.includes('--check')) {
  if (!existsSync(indexPath) || readFileSync(indexPath, 'utf8') !== output) {
    console.error('questions/index.json is stale, run: npm run questions:build');
    process.exit(1);
  }
}

console.log(`${index.length} questions OK`);
