import React from "react";
import { G, btnStyle } from "../../ui/theme";

export function ToastViewport({ items, onClose }) {
  return (
    <div style={{ position: "fixed", right: 14, bottom: 14, zIndex: 1200, display: "grid", gap: 8 }}>
      {items.map((toast) => (
        <div key={toast.id} style={{ minWidth: 220, maxWidth: 360, borderRadius: 8, background: "#090909", border: `1px solid ${toast.type === "error" ? "#e74c3c55" : toast.type === "success" ? "#2ecc7155" : "#c8a96e44"}`, color: G.text, padding: "8px 10px", fontFamily: "monospace", fontSize: 11, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: toast.type === "error" ? "#e74c3c" : toast.type === "success" ? "#2ecc71" : G.gold }}>●</span>
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button style={{ background: "transparent", color: G.muted, border: "none", cursor: "pointer" }} onClick={() => onClose(toast.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}

export function ConfirmWindow({ data, onCancel, onConfirm }) {
  if (!data) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 420, maxWidth: "92vw", borderRadius: 10, border: `1px solid ${G.border2}`, background: G.bg2, padding: 16 }}>
        <div style={{ fontFamily: "'Cinzel',serif", color: G.gold, letterSpacing: 2, fontSize: 13, marginBottom: 10 }}>{data.title}</div>
        <div style={{ fontFamily: "monospace", color: "#999", fontSize: 12, marginBottom: 14 }}>{data.message}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={btnStyle({ background: "transparent", border: `1px solid ${G.border2}`, color: G.muted })} onClick={onCancel}>Cancelar</button>
          <button style={btnStyle({ borderColor: "#e74c3c55", color: "#e74c3c" })} onClick={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}
