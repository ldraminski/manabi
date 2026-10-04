import type { Bank } from './bank';
import { today } from './storage';
import type { Analysis, AppState, Level, Offer, OfferTechnology, PlanItem, Progress } from './types';

export const LEVELS: Level[] = ['junior', 'mid', 'senior'];
export const LEVEL_LABEL: Record<Level, string> = { junior: 'Junior', mid: 'Mid', senior: 'Senior' };
export const POINTS_PER_ANSWER = 10;

// Leitner boxes: a correct answer moves the question one box further, a miss sends it back to the first one.
const INTERVAL_DAYS = [0, 1, 3, 7, 14];

const addDays = (date: string, days: number): string => {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
};

export const rate = (previous: Progress | undefined, correct: boolean): Progress => {
  const box = correct ? Math.min((previous?.box ?? 0) + 1, INTERVAL_DAYS.length - 1) : 0;
  return {
    box,
    due: addDays(today(), INTERVAL_DAYS[box]),
    seen: (previous?.seen ?? 0) + 1,
    correct: (previous?.correct ?? 0) + (correct ? 1 : 0),
  };
};

export const isMastered = (progress: Progress | undefined): boolean => (progress?.box ?? 0) >= 1;

const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// Unseen and due questions come first; the rest follows so a session never runs out.
export const buildQueue = (ids: string[], progress: Record<string, Progress>): string[] => {
  const now = today();
  const due = ids.filter((id) => !progress[id] || progress[id].due <= now);
  const later = ids.filter((id) => progress[id] && progress[id].due > now);
  return [...shuffle(due), ...shuffle(later)];
};

export interface TechnologyScore {
  slug: string;
  name: string;
  priority: OfferTechnology['priority'];
  correct: number;
  total: number;
}

export const scoreTest = (bank: Bank, offer: Offer): TechnologyScore[] =>
  offer.technologies.map((technology) => {
    const ids = offer.assessment.filter((id) => bank.index.find((entry) => entry.id === id)?.technology === technology.slug);
    return {
      slug: technology.slug,
      name: technology.name,
      priority: technology.priority,
      correct: ids.filter((id) => offer.test?.[id]).length,
      total: ids.length,
    };
  });

// A rough estimate on purpose: must-have skills count double and the result is rounded to 5%.
export const chance = (scores: TechnologyScore[]): number => {
  let sum = 0;
  let weight = 0;
  for (const score of scores) {
    if (score.total === 0) continue;
    const w = score.priority === 'must' ? 2 : 1;
    sum += (score.correct / score.total) * w;
    weight += w;
  }
  return weight === 0 ? 0 : Math.round((sum / weight) * 20) * 5;
};

export const isGap = (score: TechnologyScore | undefined): boolean => !!score && score.total > 0 && score.correct / score.total < 0.6;

// Topics of technologies where the test showed a gap move to the top; the order from the analysis is kept otherwise.
export const orderPlan = (plan: PlanItem[], scores: TechnologyScore[]): PlanItem[] => {
  const gap = (item: PlanItem) => (isGap(scores.find((score) => score.slug === item.technology)) ? 0 : 1);
  return [...plan].sort((a, b) => gap(a) - gap(b));
};

export const planIds = (offer: Offer): string[] => offer.plan.flatMap((item) => item.questionIds);

export const totalPoints = (state: AppState): number => Object.values(state.points).reduce((sum, value) => sum + value, 0);

export const pointsThisWeek = (state: AppState): number => {
  const from = addDays(today(), -6);
  return Object.entries(state.points).reduce((sum, [date, value]) => (date >= from ? sum + value : sum), 0);
};

export const newQuestionIds = (bank: Bank, state: AppState): string[] => {
  const technologies = new Set(state.offers.flatMap((offer) => offer.technologies.map((technology) => technology.slug)));
  const levels = new Set(state.offers.flatMap((offer) => LEVELS.slice(0, LEVELS.indexOf(offer.offer.level) + 1)));
  return bank.index
    .filter((entry) => entry.added_on > state.startedOn && technologies.has(entry.technology) && levels.has(entry.level))
    .map((entry) => entry.id);
};

// The same analysis the workflow does, without a model: alias matching and a weighted draw.
// Used when the server cannot be reached and the user pasted the offer text.
export const analyzeLocally = (bank: Bank, text: string): Analysis => {
  const haystack = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}.#+]+/gu, ' ')} `;
  const mentions = (name: string) => name.length > 1 && haystack.includes(` ${name.toLowerCase()} `);
  const level: Level = /\bsenior\b/i.test(text) ? 'senior' : /\b(mid|regular)\b/i.test(text) ? 'mid' : 'junior';
  const allowed = LEVELS.slice(0, LEVELS.indexOf(level) + 1);

  const technologies = bank.technologies
    .filter((technology) => [technology.name, ...technology.aliases].some(mentions))
    .map((technology) => ({
      slug: technology.slug,
      name: technology.name,
      priority: 'must' as const,
      questions: bank.index.filter((entry) => entry.technology === technology.slug && allowed.includes(entry.level)).length,
    }));

  const slugs = new Set(technologies.map((technology) => technology.slug));
  const pool = bank.index.filter((entry) => slugs.has(entry.technology) && allowed.includes(entry.level));
  const keys = [...new Set(pool.map((entry) => `${entry.technology}/${entry.topic}`))];

  return {
    offer: { url: '', title: 'Oferta z wklejonego tekstu', company: '', level },
    technologies,
    unmapped: [],
    assessment: shuffle(pool).slice(0, 10).map((entry) => entry.id),
    plan: keys.map((key) => {
      const [technology, topic] = key.split('/');
      return { technology, topic, questionIds: pool.filter((entry) => `${entry.technology}/${entry.topic}` === key).map((entry) => entry.id) };
    }),
  };
};
