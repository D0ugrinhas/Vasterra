# Vasterra JSX Runner

Este projeto transforma seu código JSX em algo fácil de testar localmente **ou direto a partir do GitHub**.

## Opção 1 — Rodar localmente (mais estável)

```bash
npm install
npm run dev
```

Depois abra a URL mostrada no terminal (normalmente `http://localhost:5173`).

## Opção 2 — Rodar direto do GitHub (sem instalar na máquina)

### A) GitHub Codespaces (recomendado)
1. Suba este repositório para o GitHub.
2. Clique em **Code > Codespaces > Create codespace on main**.
3. No terminal do Codespace:
   ```bash
   npm install
   npm run dev -- --host 0.0.0.0 --port 5173
   ```
4. Abra a porta 5173 no próprio Codespaces.

### B) StackBlitz (1 clique)
Depois de subir para GitHub, abra:

```txt
https://stackblitz.com/github/SEU_USUARIO/SEU_REPO
```

O StackBlitz instala e executa automaticamente.

## Como plugar seu código JSX

1. Crie `src/VasterraApp.jsx` com seu componente completo.
2. Em `src/App.jsx`, troque para:

```jsx
import VasterraApp from "./VasterraApp.jsx";

export default function App() {
  return <VasterraApp />;
}
```

## Observação importante sobre `window.storage`

Seu código original usa `window.storage` (provavelmente de outro ambiente). Em React web comum, use um fallback com `localStorage`:

```js
window.storage = window.storage || {
  async get(key) {
    const value = localStorage.getItem(key);
    return value == null ? null : { value };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
  },
};
```

Você pode colocar isso no topo de `src/main.jsx` antes de renderizar o app.
