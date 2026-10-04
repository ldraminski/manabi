import { useState } from 'react';
import topoArt from '../art/topo.svg?raw';
import { technologyName } from '../bank';
import { chance, isMastered, newQuestionIds, planIds, pointsThisWeek, scoreTest, totalPoints } from '../logic';
import { today } from '../storage';
import { Art, Bar, Icon, Ring, TabBar, useApp } from '../ui';

export const Profile = () => {
  const { state, bank, go, reset } = useApp();
  const [armed, setArmed] = useState(false);

  const ids = [...new Set(state.offers.flatMap(planIds))];
  const mastered = ids.filter((id) => isMastered(state.progress[id])).length;
  const week = pointsThisWeek(state);

  // Accuracy over every answer given so far, grouped by technology.
  const byTechnology = new Map<string, { seen: number; correct: number }>();
  for (const [id, progress] of Object.entries(state.progress)) {
    const technology = bank.index.find((entry) => entry.id === id)?.technology;
    if (!technology) continue;
    const sum = byTechnology.get(technology) ?? { seen: 0, correct: 0 };
    byTechnology.set(technology, { seen: sum.seen + progress.seen, correct: sum.correct + progress.correct });
  }
  const accuracy = [...byTechnology.entries()]
    .map(([slug, sum]) => ({ name: technologyName(bank, slug), value: sum.correct / sum.seen }))
    .sort((a, b) => b.value - a.value);

  const tested = state.offers.filter((offer) => offer.test);
  const best = tested.map((offer) => ({ offer, percent: chance(scoreTest(bank, offer)) })).sort((a, b) => b.percent - a.percent)[0];
  const hasNews = newQuestionIds(bank, state).length > 0 && state.newsSeenOn < today();

  return (
    <>
      <div className="profile-scroll">
        <div className="profile-hero on-navy">
          <Art svg={topoArt} />
          <div className="topbar">
            <span />
            <h1>Profil</h1>
            <button className="icon-btn" onClick={() => go({ name: 'news' })} aria-label="Nowości">
              <Icon name="bell" />
            </button>
          </div>
          <div className="avatar" aria-hidden="true">
            {state.name.trim()[0]?.toUpperCase()}
          </div>
          <h2>{state.name}</h2>
          <p>{state.interview?.['Specjalizacja'] ?? ''}</p>
        </div>
        <div className="screen-body">
          <article className="card points-card">
            <h3>Twoje punkty</h3>
            <p className="small muted">{week > 0 ? `+${week} w ostatnich 7 dniach` : 'W tym tygodniu jeszcze bez punktów'}</p>
            <Ring value={ids.length > 0 ? mastered / ids.length : 0}>
              <b>{totalPoints(state).toLocaleString('pl-PL')}</b>
              <span>punktów</span>
            </Ring>
            <p className="small muted" style={{ marginTop: 12 }}>
              {ids.length > 0 ? `Opanowane ${mastered} z ${ids.length} pytań w Twoich planach` : 'Punkty zdobywasz za każde pytanie'}
            </p>
          </article>

          <h2 className="section-title">
            Wynik według technologii <small>ze wszystkich odpowiedzi</small>
          </h2>
          <article className="card">
            {accuracy.length === 0 ? (
              <p className="small muted">Pojawi się po pierwszych odpowiedziach.</p>
            ) : (
              <div className="tech-rows">
                {accuracy.map((row) => (
                  <div key={row.name} className="tech-row">
                    <span className="name">{row.name}</span>
                    <span className="val">{Math.round(row.value * 100)}%</span>
                    <Bar value={row.value} label={`${row.name}: ${Math.round(row.value * 100)}%`} />
                  </div>
                ))}
              </div>
            )}
          </article>

          <h2 className="section-title">
            Zapisane oferty <small>{state.offers.length}</small>
          </h2>
          <article className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontFamily: 'var(--font-display)' }}>{state.offers.length === 0 ? 'Brak ofert' : state.offers[0].offer.company || state.offers[0].offer.title}</b>
              <p className="small muted">{best ? `Najbliżej: ${best.offer.offer.title}, ok. ${best.percent}%` : 'Dodaj ofertę, żeby dostać plan'}</p>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: 'auto', minHeight: 44, padding: '0 18px', fontSize: 'var(--fs-14)', boxShadow: 'none' }}
              onClick={() => go({ name: 'offers' })}
            >
              Wszystkie
            </button>
          </article>

          <h2 className="section-title">Twoje dane</h2>
          <article className="card">
            <p className="small local-note">
              <Icon name="lock" />
              <span>Profil, oferty i postęp są zapisane tylko na tym telefonie. Nie ma konta, więc nie ma też kopii na serwerze.</span>
            </p>
            <button className="btn-quiet" style={{ display: 'block', marginTop: 8 }} onClick={() => go({ name: 'chat' })}>
              Odpowiedz jeszcze raz na pytania startowe
            </button>
            <button className="btn-quiet danger" style={{ display: 'block' }} onClick={() => (armed ? reset() : setArmed(true))}>
              {armed ? 'Potwierdź: usuń wszystko z tego telefonu' : 'Wyczyść dane'}
            </button>
            <p className="small muted" aria-live="polite">
              {armed ? 'Znikną profil, oferty i postęp. Tego nie da się cofnąć.' : ''}
            </p>
          </article>
        </div>
      </div>
      <TabBar current="profile" hasNews={hasNews} />
    </>
  );
};
