const CONSTANTS = {
  PI: Math.PI,
  E: Math.E,
};

const FUNCTIONS = {
  abs: (x) => Math.abs(x),
  ceil: (x) => Math.ceil(x),
  floor: (x) => Math.floor(x),
  round: (x) => Math.round(x),
  trunc: (x) => Math.trunc(x),
  sqrt: (x) => Math.sqrt(x),
  exp: (x) => Math.exp(x),
  ln: (x) => Math.log(x),
  log10: (x) => Math.log10(x),
  sin: (x) => Math.sin(x),
  cos: (x) => Math.cos(x),
  tan: (x) => Math.tan(x),
  pow: (a, b) => Math.pow(a, b),
  min: (...args) => Math.min(...args),
  max: (...args) => Math.max(...args),
};

function tokenize(input) {
  const expr = String(input || "").trim();
  const tokens = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[()+\-*/^,]/.test(ch)) {
      tokens.push({ type: "op", value: ch });
      i += 1;
      continue;
    }
    if (/\d|\./.test(ch)) {
      let num = ch;
      i += 1;
      while (i < expr.length && /[\d.]/.test(expr[i])) {
        num += expr[i];
        i += 1;
      }
      if (!/^\d*\.?\d+$/.test(num)) throw new Error("Número inválido.");
      tokens.push({ type: "number", value: Number(num) });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let id = ch;
      i += 1;
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        id += expr[i];
        i += 1;
      }
      tokens.push({ type: "identifier", value: id });
      continue;
    }
    throw new Error(`Caractere inválido: ${ch}`);
  }

  return tokens;
}

function createParser(tokens) {
  let index = 0;

  function current() {
    return tokens[index];
  }

  function consume(type, value) {
    const token = current();
    if (!token || (type && token.type !== type) || (value && token.value !== value)) {
      throw new Error("Expressão inválida.");
    }
    index += 1;
    return token;
  }

  function parseExpression() {
    let left = parseTerm();
    while (current() && current().type === "op" && ["+", "-"].includes(current().value)) {
      const op = consume("op").value;
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm() {
    let left = parsePower();
    while (current() && current().type === "op" && ["*", "/"].includes(current().value)) {
      const op = consume("op").value;
      const right = parsePower();
      left = op === "*" ? left * right : left / right;
    }
    return left;
  }

  function parsePower() {
    let left = parseUnary();
    while (current() && current().type === "op" && current().value === "^") {
      consume("op", "^");
      const right = parseUnary();
      left = Math.pow(left, right);
    }
    return left;
  }

  function parseUnary() {
    if (current() && current().type === "op" && ["+", "-"].includes(current().value)) {
      const op = consume("op").value;
      const val = parseUnary();
      return op === "-" ? -val : val;
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const token = current();
    if (!token) throw new Error("Expressão incompleta.");

    if (token.type === "number") {
      consume("number");
      return token.value;
    }

    if (token.type === "identifier") {
      const id = consume("identifier").value;
      if (current() && current().type === "op" && current().value === "(") {
        consume("op", "(");
        const args = [];
        if (!(current() && current().type === "op" && current().value === ")")) {
          args.push(parseExpression());
          while (current() && current().type === "op" && current().value === ",") {
            consume("op", ",");
            args.push(parseExpression());
          }
        }
        consume("op", ")");
        const fn = FUNCTIONS[id.toLowerCase()];
        if (!fn) throw new Error(`Função desconhecida: ${id}`);
        const value = fn(...args);
        if (!Number.isFinite(value)) throw new Error("Resultado inválido.");
        return value;
      }

      if (Object.prototype.hasOwnProperty.call(CONSTANTS, id.toUpperCase())) {
        return CONSTANTS[id.toUpperCase()];
      }
      throw new Error(`Identificador desconhecido: ${id}`);
    }

    if (token.type === "op" && token.value === "(") {
      consume("op", "(");
      const value = parseExpression();
      consume("op", ")");
      return value;
    }

    throw new Error("Expressão inválida.");
  }

  function parse() {
    const value = parseExpression();
    if (index < tokens.length) throw new Error("Expressão inválida.");
    return value;
  }

  return { parse };
}

export function evaluateMathExpression(raw, { fallback = 0, min = -Infinity, max = Infinity, precision = 4 } = {}) {
  const expr = String(raw ?? "").trim();
  if (!expr) {
    const value = Math.max(min, Math.min(max, Number(fallback) || 0));
    return { value, valid: true, empty: true, expression: "" };
  }

  try {
    const tokens = tokenize(expr);
    const parsed = createParser(tokens).parse();
    if (!Number.isFinite(parsed)) throw new Error("Resultado inválido.");
    const rounded = Number(parsed.toFixed(precision));
    const value = Math.max(min, Math.min(max, rounded));
    return { value, valid: true, empty: false, expression: expr };
  } catch (error) {
    const safeFallback = Math.max(min, Math.min(max, Number(fallback) || 0));
    return { value: safeFallback, valid: false, empty: false, expression: expr, error: error.message };
  }
}
