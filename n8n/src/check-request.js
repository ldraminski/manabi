// Guard clauses for POST manabi/offers: reject bad input before anything is fetched or sent to the model.
const DAILY_MODEL_RUNS = 60;
const MAX_TEXT = 12000;

const reject = (status, error) => [{ json: { ok: false, status, result: { error } } }];

const body = $input.first().json.body ?? {};
const url = typeof body.url === 'string' ? body.url.trim() : '';
const text = typeof body.text === 'string' ? body.text.trim() : '';

if (!url && !text) return reject(400, 'Provide "url" or "text".');
if (text.length > MAX_TEXT) return reject(422, `Offer text is longer than ${MAX_TEXT} characters.`);

let slug = '';
if (url) {
  const match = url.match(/^https:\/\/(?:www\.)?nofluffjobs\.com\/(?:[a-z]{2}\/)?job\/([a-z0-9-]+)/i);
  if (!match) return reject(422, 'Only nofluffjobs.com links are supported for now. Paste the offer text instead.');
  slug = match[1];
}

const rawProfile = body.profile && typeof body.profile === 'object' ? body.profile : {};
const profile = {
  seniority: LEVELS.includes(rawProfile.seniority) ? rawProfile.seniority : null,
  yearsExperience: Number.isFinite(rawProfile.yearsExperience) ? rawProfile.yearsExperience : null,
  summary: typeof rawProfile.summary === 'string' ? rawProfile.summary.slice(0, 1000) : '',
};

// The endpoint is public, so model calls share one daily budget. Past it the deterministic path still answers.
const store = $getWorkflowStaticData('global');
const today = $now.toFormat('yyyy-MM-dd');
if (store.day !== today) {
  store.day = today;
  store.runs = 0;
}
const useModel = store.runs < DAILY_MODEL_RUNS;
if (useModel) store.runs += 1;

return [{ json: { ok: true, slug, url, text, profile, useModel } }];
