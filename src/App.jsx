import React from "react";

export default function App() {
  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1>Vasterra — ambiente de teste JSX</h1>
      <p>
        Este repositório foi preparado para você colar o componente JSX completo e testar rapidamente com React + Vite.
      </p>

      <ol>
        <li>Crie um arquivo <code>src/VasterraApp.jsx</code> e cole seu código.</li>
        <li>
          Garanta que o componente principal exporte default (ex.: <code>export default function VasterraApp()</code>).
        </li>
        <li>
          Troque este arquivo para renderizar o componente:
          <pre style={{ background: "#111", color: "#ddd", padding: 12, borderRadius: 8, overflowX: "auto" }}>
{`import VasterraApp from "./VasterraApp.jsx";

export default function App() {
  return <VasterraApp />;
}`}
          </pre>
        </li>
      </ol>

      <h2>Storage compatível com navegador</h2>
      <p>
        Seu código usa <code>window.storage</code>. Para funcionar fora do ambiente original, você pode usar este fallback:
      </p>
      <pre style={{ background: "#111", color: "#ddd", padding: 12, borderRadius: 8, overflowX: "auto" }}>
{`window.storage = window.storage || {
  async get(key) {
    const value = localStorage.getItem(key);
    return value == null ? null : { value };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
  },
};`}
      </pre>
    </main>
  );
}
