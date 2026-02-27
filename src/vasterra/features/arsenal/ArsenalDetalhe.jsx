import React from "react";
import { G, btnStyle } from "../../ui/theme";
import { RANK_COR } from "../../data/gameData";
import { Pill, ItemIcon } from "../shared/components";

const fmtVastos = (v = {}) => `C:${v.cobre || 0} · P:${v.prata || 0} · O:${v.ouro || 0} · Pl:${v.platina || 0}`;

export function ArsenalDetalhe({ item, onEdit, onDup, onDel }) {
  const cor = RANK_COR[item.rank] || "#7f8c8d";
  return (
    <div style={{ maxWidth: 980 }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "center" }}>
        <div style={{ width: 82, height: 82, background: cor + "11", border: "1px solid " + cor + "33", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, flexShrink: 0 }}>
          <ItemIcon item={item} size={34} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: G.gold2, marginBottom: 6 }}>{item.nome}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <Pill label={item.tipo} cor="#888" />
            <Pill label={item.rank} cor={cor} />
            <Pill label={`Slots: ${item.slots || 1}`} cor="#8ad2ff" />
            <Pill label={`Peso: ${Number(item.peso || 0)}kg`} cor="#d6b57a" />
            {item.essenciaAtribuida && <Pill label={`Essência: ${item.essenciaAtribuida}`} cor="#74c2ff" />}
          </div>
          {item.comentario && <div style={{ fontStyle: "italic", color: "#d2bc91" }}>“{item.comentario}”</div>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button style={btnStyle()} onClick={onEdit}>✎ Editar</button>
        <button style={btnStyle({ borderColor: "#3498db44", color: "#3498db" })} onClick={onDup}>⊕ Duplicar</button>
        <button style={{ ...btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c" }), marginLeft: "auto" }} onClick={onDel}>✕ Apagar</button>
      </div>

      <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 12, marginBottom: 10, color: G.text }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, fontFamily: "monospace", fontSize: 11, marginBottom: 8 }}>
          <div>Preço: <span style={{ color: G.gold }}>{fmtVastos(item.vastos || {})}</span></div>
          <div>Subtipo: <span style={{ color: G.gold }}>{item.subtipo || item.subtipoOutro || "—"}</span></div>
          <div>Região efeito: <span style={{ color: G.gold }}>{item.regiaoEfeitoOutro || item.regiaoEfeito || "—"}</span></div>
        </div>
        {item.descricao && <div style={{ fontStyle: "italic", color: "#aaa", lineHeight: 1.6 }}>{item.descricao}</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 10 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, marginBottom: 6 }}>Bônus</div>
          {(item.bonus || []).length === 0 && <div style={{ fontFamily: "monospace", color: "#666", fontSize: 11 }}>Sem bônus.</div>}
          {(item.bonus || []).map((b) => <div key={b.id || b.nome} style={{ marginBottom: 6, border: "1px solid #222", borderRadius: 7, padding: 8 }}><div style={{ color: "#7be5a3", fontFamily: "'Cinzel',serif", fontSize: 11 }}>{b.nome || "Bônus"} {b.valor ? `(${b.valor})` : ""}</div><div style={{ fontFamily: "monospace", fontSize: 11, color: G.muted }}>{b.descricao || "—"}</div></div>)}
        </div>
        <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 10 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, marginBottom: 6 }}>Efeitos</div>
          {(item.efeitos || []).length === 0 && <div style={{ fontFamily: "monospace", color: "#666", fontSize: 11 }}>Sem efeitos.</div>}
          {(item.efeitos || []).map((ef) => <div key={ef.id || ef.nome} style={{ marginBottom: 6, border: "1px solid #222", borderRadius: 7, padding: 8 }}><div style={{ color: "#8dc4ff", fontFamily: "'Cinzel',serif", fontSize: 11 }}>{ef.nome || "Efeito"} {ef.valor ? `(${ef.valor})` : ""}</div><div style={{ fontFamily: "monospace", fontSize: 11, color: G.muted }}>{ef.descricao || "—"}</div></div>)}
        </div>
      </div>
    </div>
  );
}
