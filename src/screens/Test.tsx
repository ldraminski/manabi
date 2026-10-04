import { useState } from 'react';
import { chance, isGap, LEVEL_LABEL, POINTS_PER_ANSWER, rate, scoreTest, type TechnologyScore } from '../logic';
import { QuestionStep } from '../QuestionStep';
import { today } from '../storage';
import { Bar, Icon, Ring, TopBar, useApp } from '../ui';
import { useQuestions } from '../useQuestions';
import { Offers } from './Offers';

export const Quiz = ({ offerId }: { offerId: string }) => {
  const { state, update, go } = useApp();
  const offer = state.offers.find((candidate) => candidate.id === offerId);
  const questions = useQuestions(offer?.assessment ?? []);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  if (!offer) return <Offers />;
  const ids = offer.assessment;
  const question = questions?.get(ids[index]);
  const last = index === ids.length - 1;

  const next = (correct: boolean) => {
    const all = { ...answers, [ids[index]]: correct };
    if (!last) {
      setAnswers(all);
      setIndex(index + 1);
      return;
    }
    // The test also counts as practice: every answer feeds the spaced repetition and the points.
    update((current) => {
      const progress = { ...current.progress };
      for (const [id, isCorrect] of Object.entries(all)) progress[id] = rate(progress[id], isCorrect);
      return {
        ...current,
        progress,
        activeOfferId: offerId,
        points: { ...current.points, [today()]: (current.points[today()] ?? 0) + ids.length * POINTS_PER_ANSWER },
        offers: current.offers.map((candidate) => (candidate.id === offerId ? { ...candidate, test: all } : candidate)),
      };
    });
    go({ name: 'chances', offerId });
  };

  return (
    <>
      <TopBar title="Test wstępny" back={() => go({ name: 'analysis', offerId })} backIcon="x" backLabel="Przerwij test" />
      <div className="progress-head">
        <b>
          Pytanie {index + 1} z {ids.length}
        </b>
        <Bar value={(index + 1) / ids.length} label={`Pytanie ${index + 1} z ${ids.length}`} navy />
      </div>
      {question ? (
        <QuestionStep key={question.id} question={question} allowUnknown nextLabel={last ? 'Zobacz wynik' : 'Dalej'} onNext={next} />
      ) : (
        <div className="screen-body" />
      )}
    </>
  );
};

const ScoreRow = ({ score }: { score: TechnologyScore }) =>
  score.total === 0 ? (
    <div className="tech-row is-unknown">
      <span className="name">{score.name}</span>
      <span className="val">nie sprawdzano</span>
      <div className="bar" role="img" aria-label={`${score.name}: nie sprawdzano w teście`} />
    </div>
  ) : (
    <div className="tech-row">
      <span className="name">
        {score.name}
        {isGap(score) && <span className="tag tag-gap">do odświeżenia</span>}
      </span>
      <span className="val">
        {score.correct} z {score.total}
      </span>
      <Bar value={score.correct / score.total} label={`${score.name}: ${score.correct} z ${score.total}`} />
    </div>
  );

export const Chances = ({ offerId }: { offerId: string }) => {
  const { state, bank, go } = useApp();
  const offer = state.offers.find((candidate) => candidate.id === offerId);
  if (!offer?.test) return <Offers />;

  const scores = scoreTest(bank, offer);
  const total = chance(scores);
  const right = Object.values(offer.test).filter(Boolean).length;
  const level = LEVEL_LABEL[offer.offer.level];
  const must = scores.filter((score) => score.priority === 'must');
  const nice = scores.filter((score) => score.priority === 'nice');

  return (
    <>
      <TopBar title="Twoje szanse" back={() => go({ name: 'analysis', offerId })} />
      <div className="screen-body">
        <article className="card chance-card">
          <h2>
            Szanse na stanowisko {level}
            <br />
            <span className="small muted" style={{ fontFamily: 'var(--font-text)', fontWeight: 400 }}>
              {[offer.offer.title, offer.offer.company].filter(Boolean).join(' · ')}
            </span>
          </h2>
          <Ring value={total / 100}>
            <b>{total}%</b>
            <span>{level}</span>
          </Ring>
          <p className="verdict">{total >= 75 ? 'Jesteś blisko' : total >= 45 ? 'Realne, po odświeżeniu kilku tematów' : 'Jest co nadrobić, ale wiadomo co'}</p>
          <p className="small muted" style={{ marginTop: 6 }}>
            {total >= 75 ? 'Plan pomoże utrwalić to, co już wiesz.' : 'Plan zaczyna od tematów, w których test pokazał luki.'}
          </p>
        </article>

        <h2 className="section-title">
          Rozbicie na technologie{' '}
          <small>
            test: {right} z {offer.assessment.length}
          </small>
        </h2>
        <article className="card">
          <div className="tech-rows">
            {must.length > 0 && <h3 className="group-label">Obowiązkowe</h3>}
            {must.map((score) => (
              <ScoreRow key={score.slug} score={score} />
            ))}
            {nice.length > 0 && <h3 className="group-label">Mile widziane</h3>}
            {nice.map((score) => (
              <ScoreRow key={score.slug} score={score} />
            ))}
          </div>
        </article>
        <p className="note">
          <Icon name="info" />
          <span>
            To zgrubny szacunek z {offer.assessment.length} pytań na poziomie {level}, podawany co 5%. Wymagania obowiązkowe liczą się podwójnie. To nie jest prognoza decyzji rekrutera.
          </span>
        </p>
      </div>
      <div className="screen-foot">
        <button className="btn btn-primary" onClick={() => go({ name: 'plan' })}>
          Zobacz plan nauki
        </button>
      </div>
    </>
  );
};
