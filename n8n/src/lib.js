// Shared helpers, prepended to every Code node by build.mjs.
const LEVELS = ['junior', 'mid', 'senior'];

const readJson = (node) => JSON.parse($(node).first().json.data);

// Models wrap JSON in fences or add a sentence around it, and a cut-off answer still looks like JSON.
const parseModelJson = (response) => {
  const choice = response?.choices?.[0];
  if (!choice) throw new Error(`No completion: ${JSON.stringify(response?.error ?? response).slice(0, 200)}`);
  if (choice.finish_reason === 'length') throw new Error('Completion cut off by max_tokens');
  const content = String(choice.message?.content ?? '');
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object in completion');
  return JSON.parse(content.slice(start, end + 1));
};

const chatPayload = (system, user, maxTokens) => ({
  model: 'deepseek/deepseek-v4.1-flash',
  temperature: 0.1,
  max_tokens: maxTokens,
  reasoning: { enabled: false },
  response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ],
});
