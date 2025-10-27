import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

// Simple helper to normalize strings for comparison
function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/[^a-z\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function App() {
  const [countries, setCountries] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(null);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null); // selected option string
  const [locked, setLocked] = useState(false); // lock after selection until next
  const inputRef = useRef(null);

  // Fetch countries on mount
  useEffect(() => {
    async function fetchCountries() {
      try {
        setStatus('loading');
        const res = await fetch('https://restcountries.com/v3.1/all?fields=name,flags');
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        const cleaned = data
          .filter((c) => c?.name?.common && (c?.flags?.svg || c?.flags?.png))
          .map((c) => ({
            name: c.name.common,
            altNames: [
              c.name.common,
              c.name?.official,
              ...(c.name?.nativeName ? Object.values(c.name.nativeName).map((n) => n.common).filter(Boolean) : []),
            ].filter(Boolean),
            flag: c.flags.svg || c.flags.png,
          }));
        // shuffles array in random order
        for (let i = cleaned.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [cleaned[i], cleaned[j]] = [cleaned[j], cleaned[i]];
        }
        setCountries(cleaned);
        setCurrentIdx(0);
        setStatus('ready');
      } catch (e) {
        console.error(e);
        setStatus('error');
      }
    }
    fetchCountries();
  }, []);

  const current = useMemo(() => {
    if (currentIdx == null) return null;
    return countries[currentIdx] || null;
  }, [countries, currentIdx]);

  // Build 4 options whenever current changes
  useEffect(() => {
    if (!current || countries.length < 4) return;
    const namesPool = countries.map((c) => c.name);
    const correct = current.name;
    // pick 3 distinct distractors
    const distractors = [];
    while (distractors.length < 3) {
      const n = namesPool[Math.floor(Math.random() * namesPool.length)];
      if (n !== correct && !distractors.includes(n)) distractors.push(n);
    }
    const opts = [correct, ...distractors];
    // shuffle options
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    setOptions(opts);
    setSelected(null);
    setLocked(false);
  }, [current, countries]);

  function selectOption(opt) {
    if (!current || locked) return;
    setSelected(opt);
    setLocked(true);
    const isCorrect = opt === current.name;
    if (isCorrect) {
      setFeedback(`Correct! It is ${current.name}.`);
      setScore((s) => s + 1);
    } else {
      setFeedback(`Not quite. It is ${current.name}.`);
    }
    setAttempts((a) => a + 1);
    setTimeout(() => {
      setFeedback('');
      setGuess('');
      setCurrentIdx((idx) => ((idx + 1) % countries.length));
    }, isCorrect ? 900 : 1200);
  }

  function nextFlag() {
    setFeedback('');
    setGuess('');
    setAttempts((a) => a + 1); // count skip as an attempt
    setCurrentIdx((idx) => ((idx == null ? 0 : (idx + 1) % countries.length)));
    inputRef.current?.focus();
  }

  if (status === 'loading') {
    return <div className="App"><div className="container"><p>Loading flags…</p></div></div>;
  }
  if (status === 'error') {
    return (
      <div className="App">
        <div className="container">
          <p>Failed to load flags. Check your internet connection and try again.</p>
        </div>
      </div>
    );
  }
  if (!current) {
    return <div className="App"><div className="container"><p>No data.</p></div></div>;
  }

  // add timer, progressively gets harder (decided not too)

  return (
    <div className="App">
      <div className="container">
        <div className="header-row">
          <h1>Guess the Flag</h1>
          <div className="scorebox" aria-live="polite">
            <div className="score-main">Score: {score}</div>
            <div className="score-sub">Attempts: {attempts}</div>
          </div>
        </div>
        <div className="flag-wrap">
          <img src={current.flag} alt={`Flag of ${current.name}`} className="flag" />
        </div>
        <div className="options-grid" role="group" aria-label="Choose the country name">
          {options.map((opt) => {
            const isCorrect = opt === current.name;
            const isSelected = selected === opt;
            let cls = 'option-btn';
            if (locked && isSelected && isCorrect) cls += ' option-correct';
            else if (locked && isSelected && !isCorrect) cls += ' option-wrong';
            return (
              <button
                key={opt}
                className={cls}
                onClick={() => selectOption(opt)}
                disabled={locked}
              >
                {opt}
              </button>
            );
          })}
        </div>
        <div className="controls">
          <button onClick={nextFlag} title="Skip to next flag">Skip</button>
        </div>
        {feedback && <div className="feedback">{feedback}</div>}
      </div>
    </div>
  );
}

export default App;
