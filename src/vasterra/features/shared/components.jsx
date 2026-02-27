import React, { useState } from "react";
import { MOD_ORIGENS, STATUS_CFG } from "../../data/gameData";
import { uid } from "../../core/factories";
import { G, inpStyle, btnStyle } from "../../ui/theme";
import { HoverButton } from "../../components/primitives/Interactive";

export function Pill({ label, cor, small }) {
  return (
    <span style={{
      padding: small ? "2px 7px" : "3px 10px",
      background: cor + "22", border: "1px solid " + cor + "55",
      borderRadius: 20, color: cor, fontFamily: "'Cinzel',serif",
      fontSize: small ? 9 : 10, letterSpacing: 1,
    }}>
      {label}
    </span>
  );
}

export function Modal({ title, children, onClose, wide }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.75)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
    >
      <div style={{
        background: "#080808", border: "1px solid #2a2a2a", borderRadius: 12,
        padding: 20, width: wide ? 860 : 480, maxWidth: "95vw",
        maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontFamily: "'Cinzel',serif", color: G.gold, letterSpacing: 2, fontSize: 14 }}>{title}</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: G.muted, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function StatusBar({ sigla, nome, cor, val, max, onVal, onMax }) {
  const pct = max > 0 ? Math.min(100, (val / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: cor, letterSpacing: 2 }}>
          {sigla} <span style={{ color: G.muted, fontSize: 10 }}>— {nome}</span>
        </span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <input
            type="number" min={0} max={max} value={val}
            onChange={e => onVal(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
            style={inpStyle({ width: 44, textAlign: "center", padding: "2px 4px", fontSize: 13, color: cor })}
          />
          <span style={{ color: G.muted }}>/</span>
          <input
            type="number" min={1} value={max}
            onChange={e => onMax(Math.max(1, Number(e.target.value) || 1))}
            style={inpStyle({ width: 44, textAlign: "center", padding: "2px 4px", fontSize: 13 })}
          />
        </div>
      </div>
      <div style={{ height: 6, background: "#111", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: pct + "%",
          background: "linear-gradient(90deg," + cor + "88," + cor + ")",
          transition: "width .3s", boxShadow: "0 0 8px " + cor + "66",
        }} />
      </div>
      {val === 0 && (
        <div style={{ fontSize: 10, color: "#ff4444", fontFamily: "monospace", marginTop: 2 }}>
          ⚠ {STATUS_CFG.find(s => s.sigla === sigla)?.msg}
        </div>
      )}
    </div>
  );
}

export function ModificadoresEditor({ title, list, onChange, inventarioItens, onClose }) {
  const add = () => onChange([...(list || []), { id: uid(), tipo: "Buff", nome: "", efeito: "", origem: "Efeito", origemDetalhe: "" }]);
  const up = (id, patch) => onChange((list || []).map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const del = (id) => onChange((list || []).filter((m) => m.id !== id));

  return (
    <Modal title={title} onClose={onClose} wide>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <HoverButton onClick={add}>+ Modificador</HoverButton>
      </div>
      <div style={{ maxHeight: "58vh", overflowY: "auto", paddingRight: 4 }}>
        {(list || []).map((m) => (
          <div key={m.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 130px 1fr 36px", gap: 6, marginBottom: 8, border: "1px solid #222", borderRadius: 8, padding: 8, background: "#0b0b0b" }}>
            <select value={m.tipo} onChange={(e) => up(m.id, { tipo: e.target.value })} style={inpStyle()}><option>Buff</option><option>Debuff</option></select>
            <input value={m.nome} onChange={(e) => up(m.id, { nome: e.target.value })} placeholder="Nome" style={inpStyle()} />
            <input value={m.efeito} onChange={(e) => up(m.id, { efeito: e.target.value })} placeholder="Efeito mecânico ex: +4FOR" style={inpStyle()} />
            <select value={m.origem || "Efeito"} onChange={(e) => up(m.id, { origem: e.target.value, origemDetalhe: "" })} style={inpStyle()}>
              {MOD_ORIGENS.map((o) => <option key={o}>{o}</option>)}
            </select>
            {(m.origem === "Item") ? (
              <select value={m.origemDetalhe || ""} onChange={(e) => up(m.id, { origemDetalhe: e.target.value })} style={inpStyle()}>
                <option value="">Selecione item</option>
                {inventarioItens.map((it) => <option key={it}>{it}</option>)}
              </select>
            ) : (
              <input value={m.origemDetalhe || ""} onChange={(e) => up(m.id, { origemDetalhe: e.target.value })} placeholder={m.origem === "Outro" ? "Descreva origem" : "Detalhe"} style={inpStyle()} />
            )}
            <HoverButton onClick={() => del(m.id)} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c", padding: "4px" })}>✕</HoverButton>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function ItemIcon({ item, size = 20 }) {
  if (item.iconeModo === "url" && item.iconeUrl) {
    return <img src={item.iconeUrl} alt={item.nome} style={{ width: size, height: size, objectFit: "cover", borderRadius: 4 }} />;
  }
  if (item.iconeModo === "upload" && item.iconeData) {
    return <img src={item.iconeData} alt={item.nome} style={{ width: size, height: size, objectFit: "cover", borderRadius: 4 }} />;
  }
  return <span style={{ fontSize: size }}>{item.icone || "📦"}</span>;
}

export function BackgroundParticles() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <style>{`@keyframes vasterraFloat { from { transform: translateX(-10vw) translateY(0); opacity: .15; } to { transform: translateX(110vw) translateY(-12px); opacity: .35; } }`}</style>
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${(i * 13) % 100}%`,
            top: `${(i * 17) % 100}%`,
            width: 2 + (i % 3),
            height: 2 + (i % 3),
            borderRadius: "50%",
            background: i % 2 ? "#c8a96e66" : "#e8d5b055",
            animation: `vasterraFloat ${8 + (i % 7)}s linear infinite`,
          }}
        />
      ))}
    </div>
  );
}
