export const G = {
  bg: "#050505",
  bg2: "#0a0a0a",
  bg3: "#0d0d0d",
  border: "#1e1e1e",
  border2: "#2a2a2a",
  gold: "#c8a96e",
  gold2: "#e8d5b0",
  text: "#e8d5b0",
  muted: "#555",
};

export const inpStyle = (extra) => ({
  background: "#050505",
  border: "1px solid #2a2a2a",
  color: G.text,
  borderRadius: 6,
  padding: "6px 10px",
  fontFamily: "monospace",
  fontSize: 13,
  outline: "none",
  width: "100%",
  ...(extra || {}),
});

export const btnStyle = (extra) => ({
  background: "linear-gradient(135deg,#1a1208,#2a1e08)",
  border: "1px solid rgba(200,169,110,0.27)",
  color: G.gold,
  borderRadius: 6,
  padding: "6px 14px",
  fontFamily: "'Cinzel',serif",
  fontSize: 11,
  letterSpacing: 1,
  cursor: "pointer",
  ...(extra || {}),
});
