import { useEffect, useMemo, useState } from 'react';
import starArt from '../art/star.svg?raw';
import { technologyName, topicOf } from '../bank';
import { buildQueue, chance, isGap, isMastered, LEVEL_LABEL, newQuestionIds, orderPlan, planIds, POINTS_PER_ANSWER, rate, scoreTest } from '../logic';
import { QuestionStep } from '../QuestionStep';
import { today } from '../storage';
import type { Offer } from '../types';
import { Art, Bar, Icon, type LearnMode, questionsLabel, plural, Ring, TabBar, TopBar, useApp } from '../ui';
import { useQuestions } from '../useQuestions';
import { Offers } from './Offers';

const useActiveOffer = (): Offer | undefined => {
  const { state } = useApp();
  const tested = state.offers.filter((offer) => offer.test);
  return tested.find((offer) => offer.id === state.activeOfferId) ?? tested[0];
};

const NewsBanner = ({ count, onClick }: { count: number; onClick?: () => void }) => {
  const content = (
    <>
      <Icon name="spark" />
      <span>
        <b>
          {plural(count, 'Doszło', 'Doszły', 'Doszło')} {count} {plural(count, 'nowe pytanie', 'nowe pytania', 'nowych pytań')}
        </b>
        <span>Bazę uzupełniamy raz dziennie</span>
      </span>
    </>
  );
  return onClick ? (
    <button className="news-banner on-navy" onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className="news-banner on-navy" style={{ marginTop: 0 }}>
      {content}
    </div>
  );
};

export const Plan = () => {
  const { state, bank, go } = useApp();
  const offer = useActiveOffer();
  if (!offer) return <Offers />;

  const scores = scoreTest(bank, offer);
  const percent = chance(scores);
  const fresh = newQuestionIds(bank, state);
  const hasUnseenNews = fresh.length > 0 && state.newsSeenOn < today();

  return (
    <>
      <TopBar
        title="Plan nauki"
        action={
          <button className="icon-btn" onClick={() => go({ name: 'news' })} aria-label="Nowości">
            <Icon name="bell" />
            {hasUnseenNews && <i className="dot" />}
          </button>
        }
      />
      <div className="screen-body">
        <button className="card offer-switch" onClick={() => go({ name: 'offers' })} aria-label={`Zmień ofertę. Aktywna: ${offer.offer.title}`}>
          <Ring value={percent / 100} mini>
            <b>{percent}%</b>
          </Ring>
          <span className="txt">
            <b>{offer.offer.title || 'Oferta bez tytułu'}</b>
            <span className="small muted">
              {[offer.offer.company, `${questionsLabel(planIds(offer).length)}, poziom ${LEVEL_LABEL[offer.offer.level]}`].filter(Boolean).join(' · ')}
            </span>
          </span>
          <Icon name="next" />
        </button>

        {fresh.length > 0 && <NewsBanner count={fresh.length} onClick={() => go({ name: 'news' })} />}

        <h2 className="section-title">
          Tematy <small>od największej luki</small>
        </h2>
        {orderPlan(offer.plan, scores).map((item, index) => {
          const topic = topicOf(bank, item.technology, item.topic);
          const score = scores.find((candidate) => candidate.slug === item.technology);
          const done = item.questionIds.filter((id) => isMastered(state.progress[id])).length;
          const share = done / item.questionIds.length;
          return (
            <button key={`${item.technology}/${item.topic}`} className="card lesson" onClick={() => go({ name: 'learn', mode: { kind: 'topic', technology: item.technology, topic: item.topic } })}>
              <span className={index % 2 ? 'blob alt' : 'blob'}>
                <Icon name={topic.icon} />
              </span>
              <span>
                <strong className="title">
                  {topic.title}
                  {isGap(score) && <span className="tag tag-gap">luka z testu</span>}
                  {score?.priority === 'nice' && <span className="tag">mile widziane</span>}
                </strong>
                <span className="desc">
                  {technologyName(bank, item.technology)} · {topic.description}
                </span>
              </span>
              <span className="lesson-progress">
                <span>
                  {done} z {item.questionIds.length}
                </span>
                <Bar value={share} label={`Postęp: ${Math.round(share * 100)} procent`} />
                <b>{Math.round(share * 100)}%</b>
              </span>
            </button>
          );
        })}

        <button className="free-run" onClick={() => go({ name: 'learn', mode: { kind: 'all' } })}>
          <span className="blob alt">
            <Icon name="shuffle" />
          </span>
          <span>
            <b>Losowe pytania z całego planu</b>
            <span>Bez limitu. Kończysz, kiedy chcesz.</span>
          </span>
        </button>
      </div>
      <TabBar current="plan" hasNews={hasUnseenNews} />
    </>
  );
};

export const Learn = ({ mode }: { mode: LearnMode }) => {
  const { state, bank, update, go } = useApp();
  const offer = useActiveOffer();
  const fresh = useMemo(() => newQuestionIds(bank, state), [bank, state]);

  const ids = useMemo(() => {
    if (mode.kind === 'news') return fresh;
    if (!offer) return [];
    if (mode.kind === 'all') return planIds(offer);
    return offer.plan.find((item) => item.technology === mode.technology && item.topic === mode.topic)?.questionIds ?? [];
    // The pool is fixed for the session; progress made on the way must not reshuffle it.
  }, []);

  const questions = useQuestions(ids);
  const [queue, setQueue] = useState(() => buildQueue(ids, state.progress));
  const [session, setSession] = useState(0);

  const title = mode.kind === 'news' ? 'Nowe pytania' : mode.kind === 'all' ? 'Losowe pytania' : topicOf(bank, mode.technology, mode.topic).title;
  const question = questions?.get(queue[0]);

  const next = (correct: boolean) => {
    const id = queue[0];
    update((current) => ({
      ...current,
      progress: { ...current.progress, [id]: rate(current.progress[id], correct) },
      points: { ...current.points, [today()]: (current.points[today()] ?? 0) + POINTS_PER_ANSWER },
    }));
    setSession(session + 1);
    // A missed question comes back at the end; when the pool runs out it simply starts over.
    const rest = correct ? queue.slice(1) : [...queue.slice(1), id];
    setQueue(rest.length > 0 ? rest : buildQueue(ids, {}));
  };

  return (
    <>
      <TopBar title={title} back={() => go({ name: 'plan' })} backLabel="Wróć do planu" />
      <div className="learn-meta">
        <span>W tej sesji: {session}</span>
        <button className="btn-quiet" style={{ minHeight: 44 }} onClick={() => go(session > 0 ? { name: 'done', count: session } : { name: 'plan' })}>
          Zakończ sesję
        </button>
      </div>
      {question ? (
        <QuestionStep key={`${question.id}-${session}`} question={question} isNew={fresh.includes(question.id)} nextLabel="Następne pytanie" onNext={next} />
      ) : (
        <div className="screen-body">{questions && <p className="empty-note">W tym temacie nie ma jeszcze pytań.</p>}</div>
      )}
    </>
  );
};

export const Done = ({ count }: { count: number }) => {
  const { go } = useApp();
  return (
    <>
      <div className="screen-body">
        <div className="center-state">
          <Art svg={starArt} />
          <h1 className="display">Dobra robota!</h1>
          <p>
            Masz za sobą {questionsLabel(count)} i {count * POINTS_PER_ANSWER} punktów więcej.
          </p>
        </div>
      </div>
      <div className="screen-foot">
        <button className="btn btn-primary" onClick={() => go({ name: 'plan' })}>
          Wróć do planu
        </button>
      </div>
    </>
  );
};

export const News = () => {
  const { state, bank, update, go } = useApp();
  const fresh = useMemo(() => newQuestionIds(bank, state), [bank, state]);
  const questions = useQuestions(fresh);

  useEffect(() => {
    update((current) => (current.newsSeenOn === today() ? current : { ...current, newsSeenOn: today() }));
  }, [update]);

  return (
    <>
      <TopBar title="Nowości" />
      <div className="screen-body">
        {fresh.length === 0 ? (
          <p className="empty-note">Nowe pytania pojawią się tutaj. Bazę uzupełniamy raz dziennie o pytania z technologii z Twoich ofert.</p>
        ) : (
          <>
            <NewsBanner count={fresh.length} />
            <h2 className="section-title">Od Twojej pierwszej wizyty</h2>
            {[...(questions?.values() ?? [])]
              .sort((a, b) => b.added_on.localeCompare(a.added_on))
              .map((question) => (
                <button key={question.id} className="card news-item" onClick={() => go({ name: 'learn', mode: { kind: 'news' } })}>
                  <strong className="title">{question.prompt}</strong>
                  <span className="badge-new">nowe</span>
                  <span className="meta">
                    <span className="chip" style={{ minHeight: 26, padding: '2px 10px', fontSize: 'var(--fs-12)' }}>
                      {technologyName(bank, question.technology)}
                    </span>
                    {question.added_on}
                  </span>
                </button>
              ))}
          </>
        )}
      </div>
      <TabBar current="news" hasNews={false} />
    </>
  );
};
