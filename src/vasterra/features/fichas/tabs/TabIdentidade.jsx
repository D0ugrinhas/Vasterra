import React, { useState } from "react";
import { RACAS, CLASSES, resolverNomeRaca } from "../../../data/gameData";
import { G, inpStyle, btnStyle } from "../../../ui/theme";
import { getFichaTitulos } from "../../../components/fichas/FichaCardInventory";

export function TabIdentidade({ ficha, onUpdate }) {
  const [filtro, setFiltro] = useState("");
  const [novoTitulo, setNovoTitulo] = useState("");

  const titulos = getFichaTitulos(ficha);
  const tituloSelecionado = ficha.tituloSelecionado || titulos[0] || "";

  const toggleClasse = (c) => {
    if (ficha.classes.includes(c)) onUpdate({ classes: ficha.classes.filter(x => x !== c) });
    else if (ficha.classes.length < 3) onUpdate({ classes: [...ficha.classes, c] });
  };

  const racasExtras = ficha.racasExtras || [];
  const racaResolvida = resolverNomeRaca(ficha.raca, racasExtras);

  const toggleRacaExtra = (r) => {
    if (r === ficha.raca) return;
    if (racasExtras.includes(r)) onUpdate({ racasExtras: racasExtras.filter((x) => x !== r) });
    else onUpdate({ racasExtras: [...racasExtras, r] });
  };

  const addTitulo = () => {
    const titulo = novoTitulo.trim();
    if (!titulo) return;
    if (titulos.includes(titulo)) return;
    onUpdate({ titulos: [...titulos, titulo], tituloSelecionado: titulo });
    setNovoTitulo("");
  };

  const removeTitulo = (titulo) => {
    const next = titulos.filter((t) => t !== titulo);
    onUpdate({ titulos: next, tituloSelecionado: (ficha.tituloSelecionado === titulo ? (next[0] || "") : ficha.tituloSelecionado) });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 10 }}>◈ RAÇA</div>
          <div style={{ fontSize: 11, color: G.muted, fontFamily: "monospace", marginBottom: 8 }}>Resultado atual: <span style={{ color: G.gold }}>{racaResolvida}</span>{racasExtras.length > 0 && <span> · ({racasExtras.join(" + ")})</span>}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
            {RACAS.map(r => <button key={r} onClick={() => onUpdate({ raca: r, racasExtras: (ficha.racasExtras || []).filter(x => x !== r) })} style={{ padding: "5px 12px", background: ficha.raca === r ? "#1a1208" : "#080808", border: "1px solid " + (ficha.raca === r ? "#c8a96e88" : "#1a1a1a"), borderRadius: 6, color: ficha.raca === r ? G.gold : "#666", fontFamily: "'Cinzel',serif", fontSize: 11, cursor: "pointer" }}>{r}</button>)}
          </div>
          <div style={{ fontSize: 10, color: G.muted, fontFamily: "monospace", marginBottom: 5 }}>Raças adicionais (mestiço)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {RACAS.map(r => <button key={r + "_extra"} onClick={() => toggleRacaExtra(r)} style={{ padding: "4px 10px", background: racasExtras.includes(r) ? "#1b1420" : "#0a0a0a", border: "1px solid " + (racasExtras.includes(r) ? "#9b59b688" : "#222"), borderRadius: 14, color: racasExtras.includes(r) ? "#bf8fe8" : "#666", fontFamily: "monospace", fontSize: 10, cursor: "pointer" }}>{r}</button>)}
          </div>
        </div>

        <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 10 }}>◈ PERFIL</div>

          <label style={{ color: G.muted, fontFamily: "monospace", fontSize: 11, display: "block", marginBottom: 4 }}>Títulos</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, marginBottom: 6 }}>
            <select
              value={tituloSelecionado}
              onChange={(e) => onUpdate({ tituloSelecionado: e.target.value, titulos })}
              style={inpStyle()}
            >
              <option value="">Sem título</option>
              {titulos.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={addTitulo} style={btnStyle({ padding: "6px 10px" })}>Adicionar</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, marginBottom: 10 }}>
            <input
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTitulo()}
              placeholder="Novo título..."
              style={inpStyle()}
            />
            <button
              onClick={() => tituloSelecionado && removeTitulo(tituloSelecionado)}
              style={btnStyle({ padding: "6px 10px", borderColor: "#e74c3c44", color: "#ff6b5f" })}
            >
              Remover
            </button>
          </div>

          <label style={{ color: G.muted, fontFamily: "monospace", fontSize: 11, display: "block", marginBottom: 4 }}>Aparência física</label>
          <textarea value={ficha.aparencia} onChange={e => onUpdate({ aparencia: e.target.value })} rows={3} style={Object.assign({}, inpStyle(), { resize: "vertical", marginBottom: 8 })} />
          <label style={{ color: G.muted, fontFamily: "monospace", fontSize: 11, display: "block", marginBottom: 4 }}>Histórico / Background</label>
          <textarea value={ficha.historico} onChange={e => onUpdate({ historico: e.target.value })} rows={4} style={Object.assign({}, inpStyle(), { resize: "vertical", marginBottom: 8 })} />
          <label style={{ color: G.muted, fontFamily: "monospace", fontSize: 11, display: "block", marginBottom: 4 }}>Notas da sessão</label>
          <textarea value={ficha.notas} onChange={e => onUpdate({ notas: e.target.value })} rows={3} style={Object.assign({}, inpStyle(), { resize: "vertical" })} />
        </div>
      </div>

      <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><span style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3 }}>◈ CLASSES</span><span style={{ fontSize: 10, color: G.muted, fontFamily: "monospace" }}>{ficha.classes.length}/3</span></div>
        {ficha.classes.length > 0 && <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid " + G.border }}>{ficha.classes.map(c => <span key={c} style={{ padding: "3px 10px", background: "#1a1208", border: "1px solid #c8a96e55", borderRadius: 20, fontSize: 11, color: G.gold, fontFamily: "'Cinzel',serif" }}>{c}</span>)}</div>}
        <div style={{ display: "flex", gap: 5, marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid " + G.border }}>{["", "Estrutural", "Funcional", "Dominante"].map(t => <button key={t || "all"} onClick={() => setFiltro(t)} style={{ flex: 1, padding: "5px", background: filtro === t ? "#1a1208" : "transparent", border: "1px solid " + (filtro === t ? "#c8a96e44" : G.border), borderRadius: 6, color: filtro === t ? G.gold : G.muted, fontFamily: "'Cinzel',serif", fontSize: 10, cursor: "pointer" }}>{t || "Todas"}</button>)}</div>
        {Object.entries(CLASSES).map(([tipo, lista]) => {
          if (filtro && filtro !== tipo) return null;
          const cor = tipo === "Estrutural" ? "#3498db" : tipo === "Funcional" ? "#2ecc71" : "#e74c3c";
          return <div key={tipo}><div style={{ fontSize: 9, color: G.muted, fontFamily: "'Cinzel',serif", letterSpacing: 2, marginBottom: 6, marginTop: 8 }}>{tipo.toUpperCase()}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>{lista.map(c => <button key={c} onClick={() => toggleClasse(c)} style={{ padding: "4px 9px", background: ficha.classes.includes(c) ? cor + "22" : "#0a0a0a", border: "1px solid " + (ficha.classes.includes(c) ? cor + "55" : "#222"), borderRadius: 16, color: ficha.classes.includes(c) ? cor : "#555", fontFamily: "monospace", fontSize: 10, cursor: "pointer" }}>{c}</button>)}</div></div>;
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FICHAS — ABA ESSÊNCIA
// ─────────────────────────────────────────────
const EXP_LABELS = ["Sem Mutação", "Sutil", "Moderada", "Total"];
const EXP_CORES  = ["#555", "#c8a96e", "#e67e22", "#e74c3c"];

function EssenciaBtn({ es, sel, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", textAlign: "left", padding: "6px 10px", marginBottom: 4,
        background: sel ? es.cor + "22" : "#080808",
        border: "1px solid " + (sel ? es.cor + "66" : "#1a1a1a"),
        borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
      }}
    >
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: es.cor, boxShadow: sel ? "0 0 8px " + es.cor : "none", flexShrink: 0 }} />
      <span style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: sel ? es.cor : "#666", flex: 1 }}>{es.nome}</span>
      {es.tag && <span style={{ fontSize: 9, color: sel ? es.cor + "99" : "#444", fontFamily: "monospace" }}>{es.tag}</span>}
      {es.coringa && <span style={{ fontSize: 10, color: "#ffd70099" }}>🃏</span>}
    </button>
  );
}
