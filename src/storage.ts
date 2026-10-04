import type { AppState } from './types';

const KEY = 'manabi:v1';

export const today = (): string => new Date().toISOString().slice(0, 10);

export const emptyState = (): AppState => ({
  name: '',
  interview: null,
  offers: [],
  activeOfferId: null,
  progress: {},
  points: {},
  startedOn: today(),
  newsSeenOn: today(),
});

// Everything the app knows about the user lives here, in this browser. Nothing is sent to a server for storage.
export const loadState = (): AppState => {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? { ...emptyState(), ...JSON.parse(saved) } : emptyState();
  } catch {
    return emptyState();
  }
};

export const saveState = (state: AppState): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode or a full quota: the app keeps working for this session.
  }
};

export const clearState = (): void => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
};
