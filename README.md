# Vasterra (modular)

Agora o projeto está em estrutura modular para facilitar manutenção e evolução.

## Estrutura

- `src/vasterra/data/gameData.js` → dados estáticos (raças, classes, status, ranks etc.).
- `src/vasterra/core/factories.js` → fábricas (`novaFicha`, `novoItem`) e `uid`.
- `src/vasterra/core/storage.js` → persistência com fallback para `localStorage`.
- `src/vasterra/ui/theme.js` → tema e estilos base.
- `src/vasterra/components/` → componentes reutilizáveis.
- `src/vasterra/VasterraApp.jsx` → orquestração principal (fichas/arsenal).

## Rodando

```bash
npm install
npm run dev
```

## Rodar direto do GitHub

### 1) Codespaces
1. Suba no GitHub.
2. Abra **Code > Codespaces > Create codespace**.
3. Rode:
   ```bash
   npm install
   npm run dev -- --host 0.0.0.0 --port 5173
   ```

### 2) StackBlitz
Abra:

```txt
https://stackblitz.com/github/SEU_USUARIO/SEU_REPO
```


## Troubleshooting

Se `npm install` retornar `403 Forbidden` no ambiente atual, isso normalmente indica bloqueio de registry/rede da própria infraestrutura, não erro do projeto.

- Tente novamente em outra rede/ambiente (GitHub Codespaces, máquina local, CI com acesso ao npm).
- Depois execute:

```bash
npm install
npm run build
```

## Próximos passos de modularização

A base já está separada por responsabilidade. Para continuar evoluindo:
1. Extrair cada aba de ficha para `src/vasterra/features/fichas/tabs/*`.
2. Extrair arsenal para `src/vasterra/features/arsenal/*`.
3. Criar camada de regras (`core/rules`) para rolagens e validações.
