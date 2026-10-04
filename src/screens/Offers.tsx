import { useEffect, useState } from 'react';
import { analyzeOffer, ApiError } from '../api';
import emptyArt from '../art/empty.svg?raw';
import scanArt from '../art/scan.svg?raw';
import { analyzeLocally, chance, isMastered, LEVEL_LABEL, planIds, scoreTest } from '../logic';
import type { Analysis as AnalysisResult, Offer } from '../types';
import { Art, Icon, LevelBadge, questionsLabel, Ring, TabBar, TopBar, useApp } from '../ui';

const SAMPLE_URL = 'https://nofluffjobs.com/pl/job/junior-frontend-developer-masterborn-remote-1';

export const Offers = () => {
  const { state, bank, update, go } = useApp();

  if (state.offers.length === 0) {
    return (
      <>
        <TopBar title="Twoje oferty" />
        <div className="screen-body">
          <div className="center-state">
            <Art svg={emptyArt} />
            <h2>Nie masz jeszcze żadnej oferty</h2>
            <p>Dodaj ogłoszenie, o które się starasz. Od niego zaczyna się cały plan.</p>
          </div>
        </div>
        <div className="screen-foot">
          <button className="btn btn-primary" onClick={() => go({ name: 'add-offer' })}>
            <Icon name="plus" />
            Dodaj ofertę
          </button>
        </div>
      </>
    );
  }

  const open = (offer: Offer) => {
    if (!offer.test) return go({ name: 'analysis', offerId: offer.id });
    update((current) => ({ ...current, activeOfferId: offer.id }));
    go({ name: 'plan' });
  };

  return (
    <>
      <TopBar
        title="Twoje oferty"
        action={
          <button className="icon-btn" onClick={() => go({ name: 'add-offer' })} aria-label="Dodaj ofertę">
            <Icon name="plus" />
          </button>
        }
      />
      <div className="screen-body">
        {state.offers.map((offer) => {
          const ids = planIds(offer);
          const mastered = ids.filter((id) => isMastered(state.progress[id])).length;
          const percent = chance(scoreTest(bank, offer));
          return (
            <button key={offer.id} className="card offer-row" onClick={() => open(offer)}>
              {offer.test ? (
                <Ring value={percent / 100} mini>
                  <b>{percent}%</b>
                </Ring>
              ) : (
                <span className="blob soft">
                  <Icon name="bag" />
                </span>
              )}
              <span className="txt">
                <b>{offer.offer.title || 'Oferta bez tytułu'}</b>
                <span className="small muted">
                  {[offer.offer.company, LEVEL_LABEL[offer.offer.level], offer.test ? `${mastered} z ${ids.length} pytań` : ''].filter(Boolean).join(' · ')}
                </span>
                {!offer.test && <span className="state">test do zrobienia</span>}
              </span>
            </button>
          );
        })}
        <button className="add-row" onClick={() => go({ name: 'add-offer' })}>
          <Icon name="plus" />
          Dodaj kolejną ofertę
        </button>
        <p className="learn-hint">Każda oferta ma własny test, wynik i plan. Postęp w pytaniach liczy się we wszystkich naraz.</p>
      </div>
      <TabBar current="offers" hasNews={false} />
    </>
  );
};

const STEPS = ['Pobieram treść ogłoszenia', 'Wyciągam wymagania techniczne', 'Dobieram pytania z bazy'];

const Analyzing = ({ onCancel }: { onCancel: () => void }) => {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timers = [1200, 3000].map((delay, index) => setTimeout(() => setActive(index + 1), delay));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <>
      <div className="screen-body">
        <div className="center-state" role="status">
          <Art svg={scanArt} />
          <h1>Czytam ogłoszenie</h1>
          <p>To zwykle kilka sekund.</p>
          <ol className="steps">
            {STEPS.map((label, index) => (
              <li key={label} className={index < active ? 'is-done' : index === active ? 'is-active' : undefined}>
                <span className="mark">
                  <Icon name="check" />
                </span>
                {label}
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="screen-foot">
        <button className="btn btn-quiet" onClick={onCancel}>
          Anuluj
        </button>
      </div>
    </>
  );
};

export const AddOffer = () => {
  const { state, bank, update, go } = useApp();
  const [mode, setMode] = useState<'url' | 'text'>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const validUrl = /^https?:\/\/\S+\.\S+/.test(url.trim());
  const ready = mode === 'url' ? validUrl : text.trim().length > 40;

  const save = (analysis: AnalysisResult) => {
    const offer: Offer = { ...analysis, id: crypto.randomUUID(), createdAt: new Date().toISOString(), test: null };
    update((current) => ({ ...current, offers: [offer, ...current.offers] }));
    go({ name: 'analysis', offerId: offer.id });
  };

  const analyze = async () => {
    setBusy(true);
    setError('');
    const summary = Object.entries(state.interview ?? {})
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    try {
      save(await analyzeOffer(mode === 'url' ? { url: url.trim(), summary } : { text: text.trim(), summary }));
    } catch (failure) {
      const reason = failure instanceof ApiError ? failure.message : 'failed';
      if (mode === 'text') {
        // The pasted text is enough to match technologies on the device, so the app still answers offline.
        save(analyzeLocally(bank, text));
        return;
      }
      setBusy(false);
      setMode(reason === 'unsupported' ? 'text' : mode);
      setError(
        reason === 'unsupported'
          ? 'Na razie czytam linki tylko z nofluffjobs.com. Wklej treść ogłoszenia, a zrobię resztę.'
          : 'Nie udało się pobrać ogłoszenia. Spróbuj ponownie albo wklej jego treść.',
      );
    }
  };

  if (busy) return <Analyzing onCancel={() => go({ name: 'offers' })} />;

  return (
    <>
      <TopBar title="Nowa oferta" back={() => go({ name: 'offers' })} />
      <div className="screen-body">
        <h2 className="display" style={{ fontSize: 'var(--fs-22)', margin: '8px 4px 20px' }}>
          {mode === 'url' ? 'Wklej link do ogłoszenia' : 'Wklej treść ogłoszenia'}
        </h2>
        <div className="field">
          {mode === 'url' ? (
            <>
              <label htmlFor="offer-url">Adres ogłoszenia</label>
              <div className="field-box">
                <Icon name="link" />
                <input id="offer-url" type="url" inputMode="url" placeholder="https://…" autoComplete="off" value={url} onChange={(event) => setUrl(event.target.value)} />
              </div>
              <p className="field-hint">
                {url && !validUrl ? 'To nie wygląda na pełny adres. Skopiuj link z paska przeglądarki, razem z https://.' : 'Działa z ogłoszeniami z nofluffjobs.com.'}
              </p>
              <button className="btn-quiet" type="button" onClick={() => setUrl(SAMPLE_URL)}>
                Wklej przykład: Junior Frontend Developer, MasterBorn
              </button>
            </>
          ) : (
            <>
              <label htmlFor="offer-text">Treść ogłoszenia</label>
              <div className="field-box area">
                <textarea id="offer-text" placeholder="Wymagania, technologie, poziom stanowiska…" maxLength={12000} value={text} onChange={(event) => setText(event.target.value)} />
              </div>
              <p className="field-hint">Wystarczy część z wymaganiami.</p>
            </>
          )}
          <button className="btn-quiet" type="button" onClick={() => setMode(mode === 'url' ? 'text' : 'url')}>
            {mode === 'url' ? 'Ogłoszenie z innego portalu? Wklej jego treść' : 'Mam link z nofluffjobs.com'}
          </button>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
        <ol className="how card">
          <li>
            <span className="blob soft">
              <Icon name="list" />
            </span>
            <div>
              <b>Czytam wymagania</b>
              <span>Wyciągam z ogłoszenia technologie, o które zapytają.</span>
            </div>
          </li>
          <li>
            <span className="blob soft alt">
              <Icon name="check" />
            </span>
            <div>
              <b>Krótki test</b>
              <span>Kilka pytań, żeby zobaczyć, co już siedzi w głowie.</span>
            </div>
          </li>
          <li>
            <span className="blob soft">
              <Icon name="play" />
            </span>
            <div>
              <b>Plan nauki</b>
              <span>Pytania z bazy dobrane pod tę ofertę i Twoje luki.</span>
            </div>
          </li>
        </ol>
      </div>
      <div className="screen-foot">
        <button className="btn btn-primary" disabled={!ready} onClick={analyze}>
          Analizuj ofertę
        </button>
      </div>
    </>
  );
};

export const Analysis = ({ offerId }: { offerId: string }) => {
  const { state, go } = useApp();
  const offer = state.offers.find((candidate) => candidate.id === offerId);
  if (!offer) return <Offers />;

  const must = offer.technologies.filter((technology) => technology.priority === 'must');
  const nice = offer.technologies.filter((technology) => technology.priority === 'nice');
  const covered = offer.technologies.filter((technology) => technology.questions > 0).map((technology) => technology.name);
  const level = LEVEL_LABEL[offer.offer.level];

  return (
    <>
      <TopBar title="Co jest w ofercie" back={() => go({ name: 'offers' })} />
      <div className="screen-body">
        <article className="card">
          <div className="offer-head">
            <span className="blob navy">
              <Icon name="bag" />
            </span>
            <div>
              <h2>{offer.offer.title || 'Oferta bez tytułu'}</h2>
              <p className="small muted">{[offer.offer.company, offer.offer.url ? new URL(offer.offer.url).hostname.replace('www.', '') : ''].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          <p className="small" style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <LevelBadge level={offer.offer.level} />
            <span className="muted">Poziom z ogłoszenia. Dostaniesz tylko pytania do poziomu {level}.</span>
          </p>
        </article>

        <article className="card">
          {must.length > 0 && (
            <div className="req-group">
              <h3>Obowiązkowe</h3>
              <div className="chips">
                {must.map((technology) => (
                  <span key={technology.slug} className="chip chip-must">
                    {technology.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {nice.length > 0 && (
            <div className="req-group">
              <h3>Mile widziane</h3>
              <div className="chips">
                {nice.map((technology) => (
                  <span key={technology.slug} className="chip chip-nice">
                    {technology.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {offer.unmapped.length > 0 && (
            <div className="req-group">
              <h3>
                Poza bazą Manabi <small>jeszcze bez pytań</small>
              </h3>
              <div className="chips">
                {offer.unmapped.map((term) => (
                  <span key={term} className="chip chip-open">
                    {term}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>
        <p className="note">
          <Icon name="info" />
          <span>
            {covered.length > 0
              ? `Test obejmie: ${covered.join(', ')}. Do pozostałych technologii pytania dopiero powstają.`
              : 'Do technologii z tej oferty nie mam jeszcze pytań. Baza rośnie codziennie, zajrzyj wkrótce.'}
          </span>
        </p>
      </div>
      <div className="screen-foot">
        <button className="btn btn-primary" disabled={offer.assessment.length === 0} onClick={() => go({ name: 'quiz', offerId })}>
          {offer.test ? 'Powtórz test' : 'Zrób test wstępny'} · {questionsLabel(offer.assessment.length)}
        </button>
      </div>
    </>
  );
};
