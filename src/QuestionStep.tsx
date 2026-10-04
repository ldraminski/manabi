import { useState } from 'react';
import { reportUrl } from './api';
import { technologyName } from './bank';
import type { Question } from './types';
import { Icon, LevelBadge, useApp } from './ui';

interface Props {
  question: Question;
  isNew?: boolean;
  // The entry test offers "I don't know" so a guess does not inflate the score.
  allowUnknown?: boolean;
  nextLabel: string;
  onNext: (correct: boolean) => void;
}

// One question, checked without a model: single choice is compared with the key, a flashcard is self-rated.
export const QuestionStep = ({ question, isNew = false, allowUnknown = false, nextLabel, onNext }: Props) => {
  const { bank } = useApp();
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const isChoice = question.kind === 'single_choice';
  const answered = picked !== null;
  const correct = isChoice && picked === question.correct;

  const optionClass = (index: number) => {
    if (!answered || !isChoice) return 'option';
    if (index === question.correct) return 'option is-correct';
    return index === picked ? 'option is-wrong' : 'option';
  };

  const lead = correct ? 'Dobrze' : picked === -1 ? 'W porządku, po to jest ten test' : 'Nie tym razem';

  return (
    <>
      <div className="screen-body">
        <article className="card flash">
          <div className="flash-top">
            <span className="chip">{technologyName(bank, question.technology)}</span>
            <LevelBadge level={question.level} />
            {isNew && <span className="badge-new">nowe</span>}
          </div>
          <h2 className="question">{question.prompt}</h2>
          {question.code && (
            <pre className="code">
              <code>{question.code}</code>
            </pre>
          )}

          {isChoice && (
            <div className="options flat">
              {question.options.map((option, index) => (
                <button key={option} className={optionClass(index)} disabled={answered} onClick={() => setPicked(index)}>
                  <span className="key">
                    {answered && index === question.correct ? <Icon name="check" /> : answered && index === picked ? <Icon name="x" /> : 'ABCDEF'[index]}
                  </span>
                  <span>{option}</span>
                </button>
              ))}
              {allowUnknown && (
                <button className={picked === -1 ? 'option unknown is-wrong' : 'option unknown'} disabled={answered} onClick={() => setPicked(-1)}>
                  Nie wiem
                </button>
              )}
            </div>
          )}

          <div aria-live="polite">
            {isChoice && answered && (
              <div className="answer">
                <h3>{lead}</h3>
                <p>{question.explanation}</p>
              </div>
            )}
            {!isChoice && revealed && (
              <div className="answer">
                <h3>Odpowiedź</h3>
                <p>{question.answer}</p>
                <p className="small muted" style={{ marginTop: 10 }}>
                  {question.explanation}
                </p>
              </div>
            )}
          </div>
        </article>

        <p className="learn-hint">
          {answered || revealed
            ? 'Nie musisz znać wszystkiego. To, czego nie wiesz, wróci później.'
            : isChoice
              ? 'Wybierz jedną odpowiedź.'
              : 'Odpowiedz sobie w głowie albo na głos, potem sprawdź.'}
        </p>
        <a className="report" href={reportUrl(question.id)} target="_blank" rel="noreferrer">
          <Icon name="flag" />
          Zgłoś błąd w pytaniu
        </a>
      </div>

      <div className="screen-foot">
        {isChoice ? (
          <button className="btn btn-primary" disabled={!answered} onClick={() => onNext(correct)}>
            {nextLabel}
          </button>
        ) : revealed ? (
          <div className="btn-row">
            <button className="btn btn-outline" onClick={() => onNext(false)}>
              Nie znam
            </button>
            <button className="btn btn-primary" onClick={() => onNext(true)}>
              Znam
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={() => setRevealed(true)}>
            Pokaż odpowiedź
          </button>
        )}
      </div>
    </>
  );
};
