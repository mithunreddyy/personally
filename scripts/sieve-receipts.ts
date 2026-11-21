// Builds src/data/sieve-receipts.json for the sieve case study's model: real tool outputs from sieve's own
// test fixtures, folded by sieve's own code, exactly as its hook would. Run with Bun against a checkout of
// the sieve repo: `bun scripts/sieve-receipts.ts ../sieve`. The site build only reads the JSON it writes.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? '../sieve');
const core = await import(join(root, 'packages/core/src/index.ts'));
const { archiveId, countLines, countTokens, decideFold, TOKENIZER } = core;

// The README's 320-line run in no known format, as its test builds it (packages/core/test/extract.test.ts)
const testRun = Array.from({ length: 320 }, (_, i) =>
  i === 171
    ? 'FAIL src/auth/token.test.ts > rejects an expired token: expected status 401, received 200'
    : `PASS src/module${i % 37}/case${i}.test.ts > handles input variant ${i} (${(i * 7) % 90} ms)`,
).join('\n');

const fixture = (path: string) => readFileSync(join(root, 'packages/core/fixtures', path), 'utf8');

const samples = [
  { id: 'go', name: 'go test', command: 'go test -v ./...', source: 'go1.27.3', text: fixture('go-test/verbose-one-failure.txt') },
  { id: 'pytest', name: 'pytest', command: 'pytest -v', source: 'pytest 8.3.5', text: fixture('pytest/verbose-two-failures.txt') },
  { id: 'vitest', name: 'vitest', command: 'npx vitest run --reporter=verbose', source: 'vitest 3.2.7', text: fixture('vitest/verbose-two-failures.txt') },
  { id: 'ruff', name: 'ruff', command: 'ruff check app', source: 'ruff 0.15.12', text: fixture('ruff/many-duplicates.txt') },
  // No command: the README gives none, and a command would steer which extractor is tried
  { id: 'repeats', name: 'A test run in no known format', command: '', source: "the README's example", text: testRun },
];

const out = samples.map(({ text, ...sample }) => {
  const item = {
    id: archiveId(text),
    bytes: Buffer.byteLength(text),
    tokens: countTokens(text),
    tokenizer: TOKENIZER,
    lines: countLines(text),
    isNew: true,
  };
  // Every sample is under Claude Code's 30,000-byte cut, so the model would see it whole without Sieve
  if (item.bytes > 30_000) throw new Error(`${sample.id} is over 30 KB; the model would see a preview`);
  const decision = decideFold({ text, isError: false, ...(sample.command ? { command: sample.command } : {}) }, item);
  if (decision.kind !== 'replace') throw new Error(`${sample.id} passed through unfolded`);
  return {
    ...sample,
    extractor: decision.extractor,
    lines: item.lines,
    bytes: item.bytes,
    tokensIn: item.tokens,
    tokensOut: countTokens(decision.text),
    input: text,
    receipt: decision.text,
  };
});

writeFileSync(new URL('../src/data/sieve-receipts.json', import.meta.url), `${JSON.stringify(out, null, 2)}\n`);
for (const s of out) console.log(`${s.id}: ${s.extractor}, ${s.tokensIn} -> ${s.tokensOut} tokens`);
