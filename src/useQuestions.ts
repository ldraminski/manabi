import { useEffect, useState } from 'react';
import { loadQuestions } from './bank';
import type { Question } from './types';
import { useApp } from './ui';

// Loads the full text of the given questions; null while the files are on their way.
export const useQuestions = (ids: string[]): Map<string, Question> | null => {
  const { bank } = useApp();
  const [questions, setQuestions] = useState<Map<string, Question> | null>(null);
  const key = ids.join(',');

  useEffect(() => {
    let current = true;
    loadQuestions(bank, key ? key.split(',') : []).then((loaded) => {
      if (current) setQuestions(loaded);
    });
    return () => {
      current = false;
    };
  }, [bank, key]);

  return questions;
};
