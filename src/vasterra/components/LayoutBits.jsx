import React from "react";
import { G, inpStyle } from "../ui/theme";

export function Card({ title, children, right }) {
  return (
    <section style={{ background: G.bg2, border: `1px solid ${G.border}`, borderRadius: 10, padding: 14 }}>
      {(title || right) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontFamily: "'Cinzel',serif", color: G.gold, letterSpacing: 2, fontSize: 12 }}>{title}</span>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 8 }}>
      <span style={{ display: "block", marginBottom: 4, color: G.muted, fontFamily: "monospace", fontSize: 11 }}>{label}</span>
      {children}
    </label>
  );
}

export function NumberInput(props) {
  return <input type="number" {...props} style={inpStyle(props.style)} />;
}
