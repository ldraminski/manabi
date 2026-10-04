import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Bank } from './bank';
import { LEVEL_LABEL } from './logic';
import type { AppState, Level } from './types';

export type LearnMode = { kind: 'all' } | { kind: 'news' } | { kind: 'topic'; technology: string; topic: string };

export type Route =
  | { name: 'welcome' | 'chat' | 'offers' | 'add-offer' | 'plan' | 'news' | 'profile' }
  | { name: 'analysis' | 'quiz' | 'chances'; offerId: string }
  | { name: 'learn'; mode: LearnMode }
  | { name: 'done'; count: number };

export interface App {
  state: AppState;
  bank: Bank;
  update: (change: (state: AppState) => AppState) => void;
  go: (route: Route) => void;
  reset: () => void;
}

export const AppContext = createContext<App | null>(null);

export const useApp = (): App => {
  const app = useContext(AppContext);
  if (!app) throw new Error('AppContext is missing');
  return app;
};

export const Icon = ({ name }: { name: string }) => (
  <svg className="icon" aria-hidden="true">
    <use href={`#i-${name}`} />
  </svg>
);

export const Art = ({ svg }: { svg: string }) => <div className="art-wrap" dangerouslySetInnerHTML={{ __html: svg }} />;

export const LevelBadge = ({ level }: { level: Level }) => <span className="level">{LEVEL_LABEL[level]}</span>;

const CIRCUMFERENCE = 314.16;

export const Ring = ({ value, mini = false, children }: { value: number; mini?: boolean; children: ReactNode }) => {
  // Start empty and fill on the next frame so the arc animates in.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span className={mini ? 'ring mini' : 'ring'} style={{ display: 'block' }}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="ring-track" cx="60" cy="60" r="50" />
        <circle
          className="ring-value"
          cx="60"
          cy="60"
          r="50"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - Math.min(Math.max(shown, 0), 1))}
        />
      </svg>
      <span className="ring-label">{children}</span>
    </span>
  );
};

export const Bar = ({ value, label, navy = false }: { value: number; label: string; navy?: boolean }) => (
  <span className={navy ? 'bar navy' : 'bar'} role="img" aria-label={label}>
    <i style={{ width: `${Math.round(value * 100)}%` }} />
  </span>
);

interface TopBarProps {
  title: string;
  back?: () => void;
  backIcon?: 'back' | 'x';
  backLabel?: string;
  action?: ReactNode;
}

export const TopBar = ({ title, back, backIcon = 'back', backLabel = 'Wstecz', action }: TopBarProps) => (
  <header className="topbar">
    {back ? (
      <button className="icon-btn" onClick={back} aria-label={backLabel}>
        <Icon name={backIcon} />
      </button>
    ) : (
      <span />
    )}
    <h1>{title}</h1>
    {action ?? <span />}
  </header>
);

const TABS = [
  { name: 'plan', label: 'Plan', icon: 'list' },
  { name: 'news', label: 'Nowości', icon: 'spark' },
  { name: 'offers', label: 'Oferty', icon: 'bag' },
  { name: 'profile', label: 'Profil', icon: 'user' },
] as const;

export const TabBar = ({ current, hasNews }: { current: (typeof TABS)[number]['name']; hasNews: boolean }) => {
  const { go } = useApp();
  return (
    <nav className="tabbar" aria-label="Główna nawigacja">
      {TABS.map((tab) => (
        <button key={tab.name} onClick={() => go({ name: tab.name })} aria-current={tab.name === current ? 'page' : undefined}>
          <Icon name={tab.icon} />
          {tab.label}
          {tab.name === 'news' && hasNews && (
            <>
              <i className="dot" aria-hidden="true" />
              <span className="sr-only">, są nowe pytania</span>
            </>
          )}
        </button>
      ))}
    </nav>
  );
};

export const plural = (count: number, one: string, few: string, many: string): string => {
  if (count === 1) return one;
  const tens = count % 100;
  const units = count % 10;
  return units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? few : many;
};

export const questionsLabel = (count: number): string => `${count} ${plural(count, 'pytanie', 'pytania', 'pytań')}`;
