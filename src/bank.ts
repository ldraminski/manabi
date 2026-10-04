import type { IndexEntry, Level, Question, Technology, Topic } from './types';

export interface Bank {
  technologies: Technology[];
  topics: Topic[];
  index: IndexEntry[];
}

const getJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json() as Promise<T>;
};

export const loadBank = async (): Promise<Bank> => {
  const [technologies, topics, index] = await Promise.all([
    getJson<Technology[]>('/questions/technologies.json'),
    getJson<Topic[]>('/questions/topics.json'),
    getJson<IndexEntry[]>('/questions/index.json'),
  ]);
  return { technologies, topics, index };
};

const files = new Map<string, Promise<Question[]>>();

const loadFile = (technology: string, level: Level): Promise<Question[]> => {
  const key = `${technology}/${level}`;
  if (!files.has(key)) {
    files.set(
      key,
      getJson<Omit<Question, 'technology' | 'level'>[]>(`/questions/${key}.json`).then((questions) =>
        questions.map((question) => ({ ...question, technology, level }) as Question),
      ),
    );
  }
  return files.get(key)!;
};

// Question files are split by technology and level, so only the ones an offer needs are downloaded.
export const loadQuestions = async (bank: Bank, ids: string[]): Promise<Map<string, Question>> => {
  const wanted = new Set(ids);
  const keys = new Map<string, IndexEntry>();
  for (const entry of bank.index) {
    if (wanted.has(entry.id)) keys.set(`${entry.technology}/${entry.level}`, entry);
  }
  const loaded = await Promise.all([...keys.values()].map((entry) => loadFile(entry.technology, entry.level)));
  const result = new Map<string, Question>();
  for (const question of loaded.flat()) {
    if (wanted.has(question.id)) result.set(question.id, question);
  }
  return result;
};

export const topicOf = (bank: Bank, technology: string, slug: string): Topic =>
  bank.topics.find((topic) => topic.technology === technology && topic.slug === slug) ?? {
    technology,
    slug,
    title: slug,
    description: '',
    icon: 'list',
  };

export const technologyName = (bank: Bank, slug: string): string =>
  bank.technologies.find((technology) => technology.slug === slug)?.name ?? slug;
