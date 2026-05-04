const roadmap = [
  '01. App shell and navigation baseline',
  '02. Minimal canvas battlefield',
  '03. Card choice and summon loop',
  '04. Waves, heroes, and first boss',
  '05. Result screen and soul upgrades',
];

export function App() {
  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">MVP rebuild baseline</p>
        <h1>Maowang Defense</h1>
        <p className="lead">
          A clean React/Vite starting point for rebuilding the demon-lord card defense MVP.
        </p>
        <div className="actions">
          <button type="button">Start MVP Branch</button>
          <a href="https://github.com/hechul/maowang-defense" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </section>

      <section className="roadmap-panel" aria-labelledby="roadmap-title">
        <h2 id="roadmap-title">Branch roadmap</h2>
        <ol>
          {roadmap.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}
