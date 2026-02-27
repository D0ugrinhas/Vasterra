import React, { useState } from "react";
import { btnStyle } from "../../ui/theme";

export function HoverButton({ style, children, ...props }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      {...props}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...btnStyle(),
        ...(style || {}),
        transition: "all .16s ease",
        transform: hover ? "translateY(-1px)" : "translateY(0)",
        filter: hover ? "brightness(1.1)" : "none",
      }}
    >
      {children}
    </button>
  );
}

export function WindowSection({ title, right, children, style }) {
  return (
    <section style={{ border: "1px solid #1e1e1e", borderRadius: 10, background: "#0a0a0a", padding: 14, ...(style || {}) }}>
      {(title || right) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontFamily: "'Cinzel',serif", fontSize: 12, letterSpacing: 2, color: "#c8a96e" }}>{title}</span>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}
