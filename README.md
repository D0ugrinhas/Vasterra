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

## Regras de efeitos mecânicos (resumo)

Os efeitos mecânicos aceitam múltiplos formatos e impactam a ficha em tempo real nas abas de Ficha/Combate:

- **Atributos**: `+2FOR`, `-3VIG`, `+1INT`
- **Perícias**: `+2Laminas Grandes`, `-1Pontaria`
- **Status**:
  - atual: `+2VIT`, `-5MAN`, `+3DET`
  - máximo: `+2VITMAX`, `-1SANMAX`
- **Recursos de combate**:
  - atual: `+1ACO`, `-1REA`, `+2MOV`
  - máximo: `+1ACOMAX`, `+3REAMAX`

> Efeitos ativos na aba **Combate** afetam diretamente a aba **Atributos & Perícias** enquanto estiverem ativos.
> Exemplo: `+3FOR` aplica buff em FOR e `-5Atletismo` aplica debuff em Atletismo.

### Efeitos narrativos por rodada (toast/log)

Quando o texto do efeito **não** é um modificador mecânico parseável, ele é tratado como narrativo e pode disparar mensagem por rodada:

- Texto puro: `"sangramento"`
- Expressão + texto: `(2d4) "de dano"`

Nesse caso, a expressão entre parênteses é rolada/calculada e exibida junto do texto.

### Fórmulas em barras de status (Combate > Configurações)

- Campos de **ATUAL** e **MAX** aceitam número, expressão aritmética e dados (ex.: `2d4+3`, `for*2`, `vit+10`).
- Fórmulas também consideram modificadores ativos de atributos/perícias/status ao montar o contexto de variáveis.
- No Combate, status/recursos têm cálculo dinâmico de **ATUAL e MAX** com modificadores ativos (incluindo variações temporárias por efeito), e o reset de rodada usa o MAX efetivo atual.

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
