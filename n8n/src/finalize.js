// Validates the model's picks against the candidates and assembles the response. Falls back to a weighted draw.
const previous = $('Prepare selection').first().json;
if (previous.done) return [{ json: { status: previous.status, result: previous.result } }];

const technologies = readJson('Fetch technologies');
const index = readJson('Fetch question index');
const { offer, mapped, unmapped, allowedLevels, candidates, size, mappingFallback } = previous.context;

const priorityOf = Object.fromEntries(mapped.map((item) => [item.slug, item.priority]));
const candidateIds = new Set(candidates.map((question) => question.id));
const keyOf = (question) => `${question.technology}/${question.topic}`;
const keys = [...new Set(candidates.map(keyOf))];

const drawAssessment = () => {
  const pool = candidates.map((question) => ({ question, weight: priorityOf[question.technology] === 'must' ? 2 : 1 }));
  const picked = [];
  const usedKeys = new Set();
  while (picked.length < size && pool.length > 0) {
    // Prefer topics not used yet, so ten questions do not land on one subject.
    const fresh = pool.filter((entry) => !usedKeys.has(keyOf(entry.question)));
    const source = fresh.length > 0 ? fresh : pool;
    let roll = Math.random() * source.reduce((sum, entry) => sum + entry.weight, 0);
    const chosen = source.find((entry) => (roll -= entry.weight) <= 0) ?? source[source.length - 1];
    picked.push(chosen.question.id);
    usedKeys.add(keyOf(chosen.question));
    pool.splice(pool.indexOf(chosen), 1);
  }
  return picked;
};

let assessment = null;
let planOrder = null;
let selectionFallback = !previous.callModel;
if (previous.callModel) {
  try {
    const answer = parseModelJson($('Select questions').first().json);
    const ids = [...new Set(Array.isArray(answer.assessment) ? answer.assessment : [])];
    if (ids.length !== size || !ids.every((id) => candidateIds.has(id))) throw new Error('Model picked ids outside the candidates');
    assessment = ids;
    planOrder = [...new Set(Array.isArray(answer.plan) ? answer.plan : [])].filter((key) => keys.includes(key));
  } catch (error) {
    selectionFallback = true;
  }
}
if (!assessment) assessment = drawAssessment();

const defaultOrder = [...keys].sort((a, b) => (priorityOf[a.split('/')[0]] === 'must' ? 0 : 1) - (priorityOf[b.split('/')[0]] === 'must' ? 0 : 1));
const order = [...(planOrder ?? []), ...defaultOrder.filter((key) => !(planOrder ?? []).includes(key))];

// The plan lists every question of a topic within the level ceiling, not only the candidates shown to the model.
const pool = index.filter((question) => priorityOf[question.technology] && allowedLevels.includes(question.level));
const plan = order.map((key) => {
  const [technology, topic] = key.split('/');
  return { technology, topic, questionIds: pool.filter((question) => keyOf(question) === key).map((question) => question.id) };
});

const result = {
  offer,
  technologies: mapped.map((item) => ({
    slug: item.slug,
    name: technologies.find((technology) => technology.slug === item.slug)?.name ?? item.slug,
    priority: item.priority,
    questions: pool.filter((question) => question.technology === item.slug).length,
  })),
  unmapped,
  assessment,
  plan,
  fallback: { mapping: mappingFallback, selection: selectionFallback },
};

return [{ json: { status: 200, result } }];
