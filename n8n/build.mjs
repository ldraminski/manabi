// Assembles n8n workflow JSON from the Code node sources in src/.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = (name) => readFileSync(join(here, 'src', name), 'utf8');
const lib = source('lib.js');

const RAW = 'https://raw.githubusercontent.com/ldraminski/manabi/main/questions';
const OPENROUTER = { openRouterApi: { id: 'kv8oGsmY1JN14X0m', name: 'OpenRouter account' } };

let column = 0;
const at = (row = 0) => [column++ * 240, row * 200];

const code = (name, file, position) => ({
  name,
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position,
  parameters: { jsCode: `${lib}\n${source(file)}` },
});

const isTrue = (name, expression, position) => ({
  name,
  type: 'n8n-nodes-base.if',
  typeVersion: 2.2,
  position,
  parameters: {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
      conditions: [{ id: name, leftValue: `={{ ${expression} }}`, rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }],
      combinator: 'and',
    },
    options: {},
  },
});

const fetchText = (name, url, position) => ({
  name,
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position,
  retryOnFail: true,
  maxTries: 3,
  waitBetweenTries: 2000,
  parameters: {
    url,
    options: { timeout: 15000, response: { response: { responseFormat: 'text', outputPropertyName: 'data' } } },
  },
});

const model = (name, position) => ({
  name,
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position,
  credentials: OPENROUTER,
  // A failed call must not fail the request: the next Code node falls back to the deterministic path.
  onError: 'continueRegularOutput',
  parameters: {
    method: 'POST',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'openRouterApi',
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: 'HTTP-Referer', value: 'https://github.com/ldraminski/manabi' },
        { name: 'X-Title', value: 'Manabi' },
      ],
    },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: '={{ $json.payload }}',
    options: { timeout: 40000 },
  },
});

const note = `## Manabi: Analyze offer

Turns a job offer into a short test and a study plan built from the question bank in the repo.

**Flow:** POST manabi/offers → guard clauses → fetch technologies, question index and the offer → model maps requirements to technology slugs → level ceiling and candidates in code → model picks question ids → validate → respond.

**Why this way:**
- The model never writes questions. It gets ids and topics only and must return ids from that list; anything else is discarded.
- The level ceiling (junior / mid / senior) is applied in code before the model sees candidates, so it cannot pick a question above the offer's level.
- Both model calls continue on error. Mapping falls back to alias matching, selection to a weighted draw (must 2 : nice 1), so the endpoint answers even with an exhausted key.
- The endpoint is public (the app has no accounts), so model calls share a daily budget kept in workflow static data.
- Offer text and profile go into the user message inside tags: they are untrusted input.

**Pitfalls:**
- Static data is not saved in manual test runs; the daily budget only counts production executions.
- raw.githubusercontent.com serves JSON as text/plain, hence responseFormat text + JSON.parse in code.
- nofluffjobs returns the offer as JSON under /api/posting/<slug>; the HTML page is 760 kB, do not parse it.`;

const nodes = [
  { name: 'About', type: 'n8n-nodes-base.stickyNote', typeVersion: 1, position: [-80, -620], parameters: { content: note, width: 620, height: 560, color: 4 } },
  {
    name: 'POST offers',
    type: 'n8n-nodes-base.webhook',
    typeVersion: 2,
    position: at(),
    webhookId: 'manabi-offers',
    parameters: { httpMethod: 'POST', path: 'manabi/offers', responseMode: 'responseNode', options: { allowedOrigins: 'https://manabi.draminski.dev,https://manabi-e31.pages.dev,http://localhost:5173' } },
  },
  code('Check request', 'check-request.js', at()),
  isTrue('Request ok?', '$json.ok === true', at()),
  fetchText('Fetch technologies', `${RAW}/technologies.json`, at()),
  fetchText('Fetch question index', `${RAW}/index.json`, at()),
  isTrue('Has link?', "$('Check request').first().json.slug !== ''", at()),
  {
    name: 'Fetch offer',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: at(-1),
    onError: 'continueRegularOutput',
    parameters: {
      url: "=https://nofluffjobs.com/api/posting/{{ $('Check request').first().json.slug }}",
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'User-Agent', value: 'Mozilla/5.0 (compatible; Manabi)' }] },
      options: { timeout: 20000 },
    },
  },
  code('Prepare mapping', 'prepare-mapping.js', at()),
  isTrue('Map with model?', '$json.callModel === true && !$json.done', at()),
  model('Map technologies', at(-1)),
  code('Prepare selection', 'prepare-selection.js', at()),
  isTrue('Select with model?', '$json.callModel === true && !$json.done', at()),
  model('Select questions', at(-1)),
  code('Finalize', 'finalize.js', at()),
  {
    name: 'Respond',
    type: 'n8n-nodes-base.respondToWebhook',
    typeVersion: 1.1,
    position: at(),
    parameters: { respondWith: 'json', responseBody: '={{ $json.result }}', options: { responseCode: '={{ $json.status }}' } },
  },
];

const link = (node, index = 0) => ({ node, type: 'main', index });
const connections = {
  'POST offers': { main: [[link('Check request')]] },
  'Check request': { main: [[link('Request ok?')]] },
  'Request ok?': { main: [[link('Fetch technologies')], [link('Respond')]] },
  'Fetch technologies': { main: [[link('Fetch question index')]] },
  'Fetch question index': { main: [[link('Has link?')]] },
  'Has link?': { main: [[link('Fetch offer')], [link('Prepare mapping')]] },
  'Fetch offer': { main: [[link('Prepare mapping')]] },
  'Prepare mapping': { main: [[link('Map with model?')]] },
  'Map with model?': { main: [[link('Map technologies')], [link('Prepare selection')]] },
  'Map technologies': { main: [[link('Prepare selection')]] },
  'Prepare selection': { main: [[link('Select with model?')]] },
  'Select with model?': { main: [[link('Select questions')], [link('Finalize')]] },
  'Select questions': { main: [[link('Finalize')]] },
  Finalize: { main: [[link('Respond')]] },
};

const workflow = { name: 'Manabi: Analyze offer', nodes, connections, settings: { executionOrder: 'v1', timezone: 'Europe/Warsaw' } };
writeFileSync(join(here, 'workflows', 'analyze-offer.json'), `${JSON.stringify(workflow, null, 2)}\n`);
console.log(`analyze-offer.json: ${nodes.length} nodes`);
