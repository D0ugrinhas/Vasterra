import React from "react";
import { G, btnStyle } from "../../ui/theme";
import { RANK_COR } from "../../data/gameData";
import { Pill, ItemIcon } from "../shared/components";

export function ArsenalDetalhe({ item, onEdit, onDup, onDel }) {
  const cor = RANK_COR[item.rank] || "#7f8c8d";
  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <div style={{ width: 72, height: 72, background: cor + "11", border: "1px solid " + cor + "33", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0 }}>
          <ItemIcon item={item} size={32} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 20, color: G.gold2, marginBottom: 6 }}>{item.nome}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Pill label={item.tipo} cor="#888" />
            <Pill label={item.rank} cor={cor} />
            {item.dano    && <Pill label={"Dano: " + item.dano} cor="#fad24b" />}
            {item.critico && <Pill label={"Crit: " + item.critico} cor="#ff9640" />}
            {item.defesa  && <Pill label={"DEF: " + item.defesa} cor="#3498db" />}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button style={btnStyle()} onClick={onEdit}>✎ Editar</button>
        <button style={btnStyle({ borderColor: "#3498db44", color: "#3498db" })} onClick={onDup}>⊕ Duplicar</button>
        <button style={Object.assign({}, btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c" }), { marginLeft: "auto" })} onClick={onDel}>✕ Apagar</button>
      </div>

      {item.descricao && (
        <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 8, padding: 12, marginBottom: 12, fontStyle: "italic", fontSize: 13, color: "#aaa", lineHeight: 1.7 }}>
          {item.descricao}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, fontFamily: "monospace", color: "#888", marginBottom: 12 }}>
        {item.peso > 0 && <span>Peso: <span style={{ color: G.gold }}>{item.peso}kg</span></span>}
        {item.valor    && <span>Valor: <span style={{ color: G.gold }}>{item.valor}</span></span>}
        {item.alcance  && <span>Alcance: <span style={{ color: G.gold }}>{item.alcance}</span></span>}
        {item.tamanho  && <span>Tamanho: <span style={{ color: G.gold }}>{item.tamanho}</span></span>}
        {item.regiao   && <span>Região: <span style={{ color: G.gold }}>{item.regiao}</span></span>}
      </div>

      {item.bonus.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: G.gold, letterSpacing: 2, marginBottom: 6 }}>BÔNUS / ÔNUS</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {item.bonus.map((b, i) => <Pill key={i} label={b.texto} cor={b.tipo === "Bônus" ? "#2ecc71" : "#e74c3c"} />)}
          </div>
        </div>
      )}

      {item.efeitos.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: G.gold, letterSpacing: 2, marginBottom: 6 }}>EFEITOS</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {item.efeitos.map((ef, i) => <Pill key={i} label={ef.titulo} cor="#3498db" />)}
          </div>
        </div>
      )}
    </div>
  );
}
