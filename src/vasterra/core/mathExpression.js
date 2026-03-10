const OPS = {
  "+": { precedence: 1, apply: (a, b) => a + b },
  "-": { precedence: 1, apply: (a, b) => a - b },
  "*": { precedence: 2, apply: (a, b) => a * b },
  "/": { precedence: 2, apply: (a, b) => a / b },
};

function tokenize(expr) {
  const tokens = String(expr || "").replace(/\s+/g, "").match(/\d*\.?\d+|[()+\-*/]/g);
  return tokens || [];
}

function toRpn(tokens) {
  const output = [];
  const stack = [];
  let prevType = "start";

  tokens.forEach((token) => {
    if (/^\d*\.?\d+$/.test(token)) {
      output.push(Number(token));
      prevType = "number";
      return;
    }

    if (token === "(") {
      stack.push(token);
      prevType = "open";
      return;
    }

    if (token === ")") {
      while (stack.length && stack[stack.length - 1] !== "(") output.push(stack.pop());
      if (!stack.length) throw new Error("Parênteses inválidos.");
      stack.pop();
      prevType = "close";
      return;
    }

    if (!OPS[token]) throw new Error("Operador inválido.");

    if (token === "-" && (prevType === "start" || prevType === "open" || prevType === "operator")) {
      output.push(0);
    }

    while (stack.length && OPS[stack[stack.length - 1]] && OPS[stack[stack.length - 1]].precedence >= OPS[token].precedence) {
      output.push(stack.pop());
    }
    stack.push(token);
    prevType = "operator";
  });

  while (stack.length) {
    const op = stack.pop();
    if (op === "(") throw new Error("Parênteses inválidos.");
    output.push(op);
  }

  return output;
}

function evalRpn(rpn) {
  const stack = [];
  rpn.forEach((token) => {
    if (typeof token === "number") {
      stack.push(token);
      return;
    }
    const b = stack.pop();
    const a = stack.pop();
    if (typeof a !== "number" || typeof b !== "number") throw new Error("Expressão incompleta.");
    const result = OPS[token].apply(a, b);
    if (!Number.isFinite(result)) throw new Error("Resultado inválido.");
    stack.push(result);
  });
  if (stack.length !== 1) throw new Error("Expressão inválida.");
  return stack[0];
}

export function evaluateMathExpression(raw, { fallback = 0, min = -Infinity, max = Infinity, precision = 2 } = {}) {
  const expr = String(raw ?? "").trim();
  if (!expr) {
    const value = Math.max(min, Math.min(max, Number(fallback) || 0));
    return { value, valid: true, empty: true, expression: "" };
  }

  try {
    const tokens = tokenize(expr);
    if (!tokens.length || tokens.join("") !== expr.replace(/\s+/g, "")) throw new Error("Caracteres inválidos.");
    const parsed = evalRpn(toRpn(tokens));
    const rounded = Number(parsed.toFixed(precision));
    const value = Math.max(min, Math.min(max, rounded));
    return { value, valid: true, empty: false, expression: expr };
  } catch (error) {
    const safeFallback = Math.max(min, Math.min(max, Number(fallback) || 0));
    return { value: safeFallback, valid: false, empty: false, expression: expr, error: error.message };
  }
}
