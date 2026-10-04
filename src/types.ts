export type Level = 'junior' | 'mid' | 'senior';
export type Priority = 'must' | 'nice';

export interface Technology {
  slug: string;
  name: string;
  aliases: string[];
}

export interface Topic {
  technology: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
}

export interface IndexEntry {
  id: string;
  technology: string;
  level: Level;
  topic: string;
  kind: 'single_choice' | 'flashcard';
  added_on: string;
}

interface QuestionBase {
  id: string;
  topic: string;
  prompt: string;
  code?: string;
  explanation: string;
  source_url: string;
  added_on: string;
}

export interface ChoiceQuestion extends QuestionBase {
  kind: 'single_choice';
  options: string[];
  correct: number;
}

export interface FlashcardQuestion extends QuestionBase {
  kind: 'flashcard';
  answer: string;
}

export type Question = (ChoiceQuestion | FlashcardQuestion) & { technology: string; level: Level };

export interface OfferTechnology {
  slug: string;
  name: string;
  priority: Priority;
  questions: number;
}

export interface PlanItem {
  technology: string;
  topic: string;
  questionIds: string[];
}

export interface Analysis {
  offer: { url: string; title: string; company: string; level: Level };
  technologies: OfferTechnology[];
  unmapped: string[];
  assessment: string[];
  plan: PlanItem[];
}

export interface Offer extends Analysis {
  id: string;
  createdAt: string;
  // Answers of the entry test, keyed by question id. null until the test is finished.
  test: Record<string, boolean> | null;
}

export interface Progress {
  box: number;
  due: string;
  seen: number;
  correct: number;
}

export interface AppState {
  name: string;
  interview: Record<string, string> | null;
  offers: Offer[];
  activeOfferId: string | null;
  progress: Record<string, Progress>;
  points: Record<string, number>;
  startedOn: string;
  newsSeenOn: string;
}
