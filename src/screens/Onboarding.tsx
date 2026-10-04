import { useEffect, useRef, useState, type FormEvent } from 'react';
import welcomeArt from '../art/welcome.svg?raw';
import { Art, Icon, TopBar, useApp } from '../ui';

export const Welcome = () => {
  const { state, update, go } = useApp();
  const [name, setName] = useState(state.name);
  const ready = name.trim().length > 0;

  const start = (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    update((current) => ({ ...current, name: name.trim() }));
    go({ name: 'chat' });
  };

  return (
    <form onSubmit={start} style={{ display: 'contents' }}>
      <div className="screen-body">
        <Art svg={welcomeArt} />
        <p className="kanji-note">
          <span lang="ja">学び</span> · manabi · po japońsku „uczenie się”
        </p>
        <h1 className="display">Przygotuj się do rozmowy w tej konkretnej firmie</h1>
        <p className="lead">Wklejasz ogłoszenie. Manabi czyta wymagania, sprawdza, co już umiesz, i dobiera pytania, które warto odświeżyć.</p>
        <div className="field name-field">
          <label htmlFor="user-name">Jak masz na imię?</label>
          <div className="field-box">
            <input id="user-name" type="text" autoComplete="given-name" maxLength={24} placeholder="Imię" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <p className="field-hint local-note">
            <Icon name="lock" />
            Bez konta i logowania. Twoje dane zostają na tym telefonie.
          </p>
        </div>
      </div>
      <div className="screen-foot">
        <button className="btn btn-primary" disabled={!ready}>
          Zaczynamy
        </button>
      </div>
    </form>
  );
};

// Five fixed questions. The answers are kept as written; no model takes part in this conversation.
const QUESTIONS = [
  { key: 'Doświadczenie', lines: ['Mam do Ciebie pięć pytań. Odpowiadaj własnymi słowami, krótko albo długo. Robimy to tylko raz.', 'Ile masz doświadczenia w programowaniu?'] },
  { key: 'Projekty', lines: ['Jakie projekty masz za sobą i jaka była w nich Twoja rola?'] },
  { key: 'Specjalizacja', lines: ['W czym się specjalizujesz?'] },
  { key: 'Technologie', lines: ['Jakich technologii używasz na co dzień?'] },
  { key: 'Cel', lines: ['Ostatnie: jakiej pracy teraz szukasz?'] },
];

interface Message {
  who: 'app' | 'user';
  text: string;
}

export const Chat = () => {
  const { state, update, go } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState(true);
  const [draft, setDraft] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const finished = step >= QUESTIONS.length;

  // The app "types" each line of the current question, then waits for an answer.
  useEffect(() => {
    const lines = finished
      ? ['Gotowe. Tak to zapisałem, w każdej chwili możesz to zmienić w profilu.']
      : step === 0
        ? [`Cześć, ${state.name}!`, ...QUESTIONS[0].lines]
        : QUESTIONS[step].lines;
    setTyping(true);
    const timers = lines.map((text, index) =>
      setTimeout(() => {
        setMessages((current) => [...current, { who: 'app', text }]);
        if (index === lines.length - 1) setTyping(false);
      }, 520 * (index + 1)),
    );
    return () => timers.forEach(clearTimeout);
  }, [step, finished, state.name]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, typing]);

  const answer = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || typing || finished) return;
    const next = { ...answers, [QUESTIONS[step].key]: text };
    setMessages((current) => [...current, { who: 'user', text }]);
    setAnswers(next);
    setDraft('');
    if (step === QUESTIONS.length - 1) update((current) => ({ ...current, interview: next }));
    setStep(step + 1);
  };

  return (
    <>
      <TopBar
        title="Pięć pytań na start"
        back={() => go(state.interview ? { name: 'profile' } : { name: 'welcome' })}
        action={
          <span className="tiny muted" style={{ textAlign: 'center' }}>
            {Math.min(step + 1, QUESTIONS.length)}/{QUESTIONS.length}
          </span>
        }
      />
      <div className="screen-body" ref={scroller}>
        <div className="chat-log" aria-live="polite">
          {messages.map((message, index) => (
            <div key={index} className={`msg msg-${message.who}`}>
              {message.text}
            </div>
          ))}
          {typing && (
            <div className="msg msg-app msg-typing">
              <i />
              <i />
              <i />
            </div>
          )}
          {finished && !typing && (
            <div className="card chat-summary">
              <b style={{ fontFamily: 'var(--font-display)' }}>Twój profil</b>
              <dl>
                {Object.entries(answers).map(([key, value]) => (
                  <div key={key} style={{ display: 'contents' }}>
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
      {finished ? (
        <div className="screen-foot">
          <button className="btn btn-primary" disabled={typing} onClick={() => go(state.offers.length > 0 ? { name: 'profile' } : { name: 'add-offer' })}>
            {state.offers.length > 0 ? 'Wróć do profilu' : 'Dodaj pierwszą ofertę'}
          </button>
        </div>
      ) : (
        <div className="chat-dock">
          <form className="chat-form" onSubmit={answer}>
            <label className="sr-only" htmlFor="chat-input">
              Twoja odpowiedź
            </label>
            <input id="chat-input" type="text" placeholder="Napisz własnymi słowami…" autoComplete="off" value={draft} onChange={(event) => setDraft(event.target.value)} />
            <button className="send-btn" type="submit" aria-label="Wyślij odpowiedź">
              <Icon name="send" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
