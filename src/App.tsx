import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadBank, type Bank } from './bank';
import { clearState, emptyState, loadState, saveState } from './storage';
import type { AppState } from './types';
import { AppContext, type App as AppApi, type Route } from './ui';
import { Chat, Welcome } from './screens/Onboarding';
import { AddOffer, Analysis, Offers } from './screens/Offers';
import { Chances, Quiz } from './screens/Test';
import { Done, Learn, News, Plan } from './screens/Study';
import { Profile } from './screens/Profile';

const TAB_SCREENS = ['plan', 'news', 'offers', 'profile'];

const firstRoute = (state: AppState): Route => {
  if (!state.name) return { name: 'welcome' };
  if (!state.interview) return { name: 'chat' };
  return state.offers.some((offer) => offer.test) ? { name: 'plan' } : { name: 'offers' };
};

const Screen = ({ route }: { route: Route }) => {
  switch (route.name) {
    case 'welcome':
      return <Welcome />;
    case 'chat':
      return <Chat />;
    case 'offers':
      return <Offers />;
    case 'add-offer':
      return <AddOffer />;
    case 'analysis':
      return <Analysis offerId={route.offerId} />;
    case 'quiz':
      return <Quiz offerId={route.offerId} />;
    case 'chances':
      return <Chances offerId={route.offerId} />;
    case 'plan':
      return <Plan />;
    case 'learn':
      return <Learn mode={route.mode} />;
    case 'done':
      return <Done count={route.count} />;
    case 'news':
      return <News />;
    case 'profile':
      return <Profile />;
  }
};

export const App = () => {
  const [state, setState] = useState<AppState>(loadState);
  const [bank, setBank] = useState<Bank | null>(null);
  const [failed, setFailed] = useState(false);
  const [route, setRoute] = useState<Route>(() => firstRoute(state));

  useEffect(() => {
    loadBank().then(setBank, () => setFailed(true));
  }, []);

  useEffect(() => saveState(state), [state]);

  const update = useCallback((change: (state: AppState) => AppState) => setState(change), []);
  const reset = useCallback(() => {
    clearState();
    setState(emptyState());
    setRoute({ name: 'welcome' });
  }, []);

  const app = useMemo<AppApi | null>(() => (bank ? { state, bank, update, go: setRoute, reset } : null), [state, bank, update, reset]);

  return (
    <div className="stage">
      <main className="device">
        {app ? (
          <AppContext.Provider value={app}>
            {/* Keying by screen name restarts the entry animation and local state on every navigation. */}
            <section
              className="screen"
              id={route.name}
              key={JSON.stringify(route)}
              data-tabs={TAB_SCREENS.includes(route.name) ? route.name : undefined}
            >
              <Screen route={route} />
            </section>
          </AppContext.Provider>
        ) : (
          <section className="screen">
            <div className="screen-body">
              <div className="center-state" role="status">
                {failed ? <p>Nie udało się wczytać bazy pytań. Odśwież stronę.</p> : <i className="spinner" />}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
