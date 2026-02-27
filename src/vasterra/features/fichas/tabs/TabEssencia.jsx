import React, { useMemo, useState } from "react";
import { ESSENCIAS_VIRTUDES, ESSENCIAS_PECADOS } from "../../../data/gameData";
import { G, inpStyle, btnStyle } from "../../../ui/theme";

const EXP_THRESHOLDS = [
  { id: "latente", pct: 10, label: "Latente", desc: "WIP: Começa a sentir os pequenos efeitos da essência." },
  { id: "sutil", pct: 25, label: "Sutil", desc: "WIP: As mudanças passam a ser percebidas em detalhes narrativos e físicos leves." },
  { id: "moderado", pct: 50, label: "Moderado", desc: "WIP: A Ideia da Essência se manifesta no corpo e comportamento de forma clara." },
  { id: "limiar", pct: 75, label: "Limiar", desc: "WIP: Sente que pertence mais à Essência do que à pessoa. Efeitos muito pesados, abaixo do Total." },
  { id: "aceitacao", pct: 99, label: "Aceitação", desc: "WIP: Quase injogável. O personagem está na fronteira da transformação absoluta." },
];

const PERKS_EXPOSICAO = {
  Ecdise: {
    desc: "Equilibra exposições em 100% total (gráfico de pizza). Ao passar de 100%, reduz proporcionalmente as outras.",
    variacoes: ["Padrão"],
  },
  "Caleidoscópio": {
    desc: "Muitas essências, mas com limite de marcos acumuláveis (atual: 3 / futuro: 5).",
    variacoes: ["Regressão", "Permanência"],
  },
  Ilimitado: {
    desc: "Sem teto de marcos, pode acumular exposição em todas as Essências simultaneamente.",
    variacoes: ["Padrão"],
  },
};

const TIPOS_CORPO = ["Corpo Comum", "Corpo Exposto", "Corpo Vinculado", "Corpo Marcado", "Corpo Nulo", "Casca Vazia"];

const BodyText = {
  "Corpo Comum": "WIP: Corpo padrão; limitado a 3 tipos de Essências ao longo da existência.",
  "Corpo Exposto": "WIP: Afinidade/fragilidade para uma essência, evolução mais intensa.",
  "Corpo Vinculado": "WIP: Já nasce com a essência presente e dificuldade para outras.",
  "Corpo Marcado": "WIP: Raríssimo; começa com Sutil ativo na essência marcada.",
  "Corpo Nulo": "WIP: Nulifica efeitos de essência, com limitações severas para artefatos.",
  "Casca Vazia": "WIP: Não acumula até certa idade, depois vira devotado à primeira essência e tende a 99%.",
};

const allEssencias = [...ESSENCIAS_VIRTUDES, ...ESSENCIAS_PECADOS];

function EssenciaBtn({ es, sel, onClick }) {
  return (
    <button onClick={onClick} style={{ width: "100%", textAlign: "left", padding: "6px 10px", marginBottom: 4, background: sel ? es.cor + "22" : "#080808", border: "1px solid " + (sel ? es.cor + "66" : "#1a1a1a"), borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: es.cor, boxShadow: sel ? "0 0 8px " + es.cor : "none", flexShrink: 0 }} />
      <span style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: sel ? es.cor : "#666", flex: 1 }}>{es.nome}</span>
      {es.tag && <span style={{ fontSize: 9, color: sel ? es.cor + "99" : "#444", fontFamily: "monospace" }}>{es.tag}</span>}
    </button>
  );
}

const getExposureState = (ficha) => ficha.exposicaoDetalhada || {
  tipoVisual: "pizza",
  perkExposicao: "Ecdise",
  perkVariacao: "Padrão",
  tipoCorpo: "Corpo Comum",
  corpoEssenciaVinculada: "",
  exposicoes: {},
};

const getEntry = (state, essenciaNome) => state.exposicoes?.[essenciaNome] || { pct: 0, eventos: [], marcoFixo: 0 };

function getMarcoFixo(pct) {
  return EXP_THRESHOLDS.reduce((acc, lvl) => (pct >= lvl.pct ? lvl.pct : acc), 0);
}

function applyEcdiseCap(state, essenciaNome, newPct) {
  const next = { ...state, exposicoes: { ...(state.exposicoes || {}) } };
  const target = { ...getEntry(next, essenciaNome), pct: Math.max(0, Math.min(100, newPct)) };
  target.marcoFixo = Math.max(target.marcoFixo || 0, getMarcoFixo(target.pct));
  next.exposicoes[essenciaNome] = target;

  const names = Object.keys(next.exposicoes);
  let total = names.reduce((sum, n) => sum + (next.exposicoes[n].pct || 0), 0);
  if (total <= 100) return next;

  const overflow = total - 100;
  const others = names.filter((n) => n !== essenciaNome);
  const othersTotal = others.reduce((sum, n) => sum + (next.exposicoes[n].pct || 0), 0) || 1;
  others.forEach((n) => {
    const e = { ...next.exposicoes[n] };
    const cut = overflow * ((e.pct || 0) / othersTotal);
    const floor = e.marcoFixo || 0;
    e.pct = Math.max(floor, (e.pct || 0) - cut);
    next.exposicoes[n] = e;
  });

  total = names.reduce((sum, n) => sum + (next.exposicoes[n].pct || 0), 0);
  if (total > 100) {
    const e = { ...next.exposicoes[essenciaNome] };
    e.pct = Math.max(e.marcoFixo || 0, e.pct - (total - 100));
    next.exposicoes[essenciaNome] = e;
  }
  return next;
}

export function TabEssencia({ ficha, onUpdate }) {
  const [subtab, setSubtab] = useState("visao");
  const e = ficha.essencia;
  const detailState = getExposureState(ficha);
  const selectedName = e?.nome || allEssencias[0].nome;
  const current = getEntry(detailState, selectedName);

  const totalPie = useMemo(() => allEssencias.map((ess) => ({ nome: ess.nome, cor: ess.cor, pct: getEntry(detailState, ess.nome).pct || 0 })).filter((x) => x.pct > 0), [detailState]);

  const setDetailState = (next) => onUpdate({ exposicaoDetalhada: next });

  const setPct = (essNome, pct) => {
    let next = { ...detailState, exposicoes: { ...(detailState.exposicoes || {}) } };
    const curr = getEntry(next, essNome);
    next.exposicoes[essNome] = { ...curr, pct: Math.max(curr.marcoFixo || 0, Math.min(100, pct)), marcoFixo: Math.max(curr.marcoFixo || 0, getMarcoFixo(pct)) };

    if (detailState.perkExposicao === "Ecdise") next = applyEcdiseCap(next, essNome, pct);
    if (detailState.tipoCorpo === "Casca Vazia") next.exposicoes[essNome].pct = Math.min(99, next.exposicoes[essNome].pct);
    if (detailState.tipoCorpo === "Corpo Marcado") next.exposicoes[essNome].pct = Math.max(25, next.exposicoes[essNome].pct);

    setDetailState(next);
  };

  const addEvento = (essNome, evento) => {
    const val = Number(evento.valor) || 0;
    const entry = getEntry(detailState, essNome);
    const eventos = [...(entry.eventos || []), { id: Math.random().toString(36).slice(2, 9), nome: evento.nome || "Evento", valor: val }];
    const pct = eventos.reduce((sum, ev) => sum + ev.valor, 0);
    const next = { ...detailState, exposicoes: { ...(detailState.exposicoes || {}), [essNome]: { ...entry, eventos } } };
    setDetailState(next);
    setPct(essNome, pct);
  };

  const removeEvento = (essNome, id) => {
    const entry = getEntry(detailState, essNome);
    const eventos = (entry.eventos || []).filter((ev) => ev.id !== id);
    const pct = eventos.reduce((sum, ev) => sum + ev.valor, 0);
    const next = { ...detailState, exposicoes: { ...(detailState.exposicoes || {}), [essNome]: { ...entry, eventos } } };
    setDetailState(next);
    setPct(essNome, pct);
  };

  const selectEssencia = (es) => onUpdate({ essencia: e && e.nome === es.nome ? null : es });

  const pieGradient = totalPie.length === 0
    ? "conic-gradient(#222 0deg 360deg)"
    : (() => {
      let deg = 0;
      const parts = totalPie.map((p) => {
        const start = deg;
        const end = deg + (p.pct / 100) * 360;
        deg = end;
        return `${p.cor} ${start}deg ${end}deg`;
      });
      return `conic-gradient(${parts.join(",")})`;
    })();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16 }}>
      <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 12 }}>◈ ESSÊNCIA</div>
        <div style={{ fontSize: 10, color: "#c8a96e88", fontFamily: "monospace", marginBottom: 6, letterSpacing: 2 }}>✨ VIRTUDES</div>
        {ESSENCIAS_VIRTUDES.map((es) => <EssenciaBtn key={es.nome} es={es} sel={!!e && e.nome === es.nome} onClick={() => selectEssencia(es)} />)}
        <div style={{ fontSize: 10, color: "#c8a96e88", fontFamily: "monospace", marginTop: 10, marginBottom: 6, letterSpacing: 2 }}>💀 PECADOS</div>
        {ESSENCIAS_PECADOS.map((es) => <EssenciaBtn key={es.nome} es={es} sel={!!e && e.nome === es.nome} onClick={() => selectEssencia(es)} />)}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[{ id: "visao", label: "Visão Geral" }, { id: "detalhe", label: "Exposição Detalhada" }].map((t) => (
            <button key={t.id} onClick={() => setSubtab(t.id)} style={btnStyle({ background: subtab === t.id ? "linear-gradient(135deg,#1a1208,#2a1e08)" : "#0d0d0d", color: subtab === t.id ? G.gold : G.muted, borderColor: subtab === t.id ? "#c8a96e66" : "#222" })}>{t.label}</button>
          ))}
        </div>

        {subtab === "visao" && e && (
          <div style={{ background: e.cor + "0d", border: "1px solid " + e.cor + "44", borderRadius: 10, padding: 16 }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 20, color: e.cor }}>{e.nome}</div>
            <div style={{ fontSize: 12, color: "#888", fontStyle: "italic", background: "#050505", borderRadius: 6, padding: "8px 12px", marginTop: 8 }}>{e.forma}</div>
            <div style={{ marginTop: 10, fontFamily: "monospace", fontSize: 11, color: G.muted }}>
              {EXP_THRESHOLDS.map((lvl) => (
                <div key={lvl.id}>{lvl.pct}% · {lvl.label} · {(current.pct || 0) >= lvl.pct ? lvl.desc : "??? (revelado ao atingir o marco)"}</div>
              ))}
            </div>
          </div>
        )}

        {subtab === "detalhe" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 12 }}>
              <div style={{ fontFamily: "'Cinzel',serif", color: G.gold, marginBottom: 8 }}>Perks de Exposição</div>
              <select value={detailState.perkExposicao} onChange={(ev) => setDetailState({ ...detailState, perkExposicao: ev.target.value, perkVariacao: PERKS_EXPOSICAO[ev.target.value].variacoes[0] })} style={inpStyle({ marginBottom: 6 })}>
                {Object.keys(PERKS_EXPOSICAO).map((k) => <option key={k}>{k}</option>)}
              </select>
              <select value={detailState.perkVariacao} onChange={(ev) => setDetailState({ ...detailState, perkVariacao: ev.target.value })} style={inpStyle({ marginBottom: 6 })}>
                {PERKS_EXPOSICAO[detailState.perkExposicao].variacoes.map((v) => <option key={v}>{v}</option>)}
              </select>
              <div style={{ fontSize: 11, color: G.muted, fontFamily: "monospace", marginBottom: 10 }}>{PERKS_EXPOSICAO[detailState.perkExposicao].desc}</div>

              <div style={{ fontFamily: "'Cinzel',serif", color: G.gold, marginBottom: 8 }}>Tipo de Corpo</div>
              <select value={detailState.tipoCorpo} onChange={(ev) => setDetailState({ ...detailState, tipoCorpo: ev.target.value })} style={inpStyle({ marginBottom: 6 })}>
                {TIPOS_CORPO.map((t) => <option key={t}>{t}</option>)}
              </select>
              {detailState.tipoCorpo === "Corpo Vinculado" && (
                <select value={detailState.corpoEssenciaVinculada || ""} onChange={(ev) => setDetailState({ ...detailState, corpoEssenciaVinculada: ev.target.value })} style={inpStyle({ marginBottom: 6 })}>
                  <option value="">Selecione essência vinculada</option>
                  {allEssencias.map((x) => <option key={x.nome} value={x.nome}>{x.nome}</option>)}
                </select>
              )}
              <div style={{ fontSize: 11, color: G.muted, fontFamily: "monospace" }}>{BodyText[detailState.tipoCorpo]}</div>
            </div>

            <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontFamily: "'Cinzel',serif", color: G.gold }}>Exposição ({selectedName})</div>
                <select value={detailState.tipoVisual || "pizza"} onChange={(ev) => setDetailState({ ...detailState, tipoVisual: ev.target.value })} style={inpStyle({ width: 120, padding: "4px 8px" })}><option value="pizza">Pizza</option><option value="barra">Barra</option></select>
              </div>

              {(detailState.tipoVisual === "pizza" || detailState.perkExposicao === "Ecdise") ? (
                <div style={{ width: 180, height: 180, borderRadius: "50%", margin: "0 auto 10px", background: pieGradient, border: "1px solid #333", boxShadow: "0 0 14px #000 inset" }} />
              ) : (
                <div style={{ height: 16, background: "#111", borderRadius: 8, overflow: "hidden", marginBottom: 10 }}><div style={{ width: `${Math.min(100, current.pct || 0)}%`, height: "100%", background: e?.cor || G.gold }} /></div>
              )}

              <input type="number" min={0} max={100} value={Math.round(current.pct || 0)} onChange={(ev) => setPct(selectedName, Number(ev.target.value) || 0)} style={inpStyle({ marginBottom: 8 })} />
              <EventoEditor onAdd={(evento) => addEvento(selectedName, evento)} />
              <div style={{ display: "grid", gap: 5, marginTop: 8 }}>
                {(current.eventos || []).map((ev) => <div key={ev.id} style={{ display: "flex", gap: 6, alignItems: "center", fontFamily: "monospace", fontSize: 11, color: G.muted }}><span style={{ flex: 1 }}>{ev.nome}</span><span>{ev.valor}%</span><button onClick={() => removeEvento(selectedName, ev.id)} style={btnStyle({ padding: "2px 8px", borderColor: "#e74c3c44", color: "#e74c3c" })}>✕</button></div>)}
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1", background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 12 }}>
              <div style={{ fontFamily: "'Cinzel',serif", color: G.gold, marginBottom: 8 }}>Marcos de Exposição</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
                {EXP_THRESHOLDS.map((lvl) => {
                  const reached = (current.pct || 0) >= lvl.pct;
                  return <div key={lvl.id} style={{ border: "1px solid " + (reached ? "#2ecc7166" : "#2a2a2a"), borderRadius: 8, padding: 8, background: reached ? "#2ecc7110" : "#0a0a0a" }}><div style={{ color: reached ? "#2ecc71" : G.muted, fontFamily: "'Cinzel',serif", fontSize: 11 }}>{lvl.label} ({lvl.pct}%)</div><div style={{ marginTop: 4, fontSize: 11, color: reached ? G.text : G.muted, fontFamily: "monospace" }}>{reached ? lvl.desc : "???"}</div></div>;
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EventoEditor({ onAdd }) {
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState(0);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 90px auto", gap: 6 }}>
      <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Evento de exposição..." style={inpStyle()} />
      <input type="number" value={valor} onChange={(e) => setValor(Number(e.target.value) || 0)} style={inpStyle()} />
      <button onClick={() => { onAdd({ nome, valor }); setNome(""); setValor(0); }} style={btnStyle({ padding: "6px 10px" })}>+ Evento</button>
    </div>
  );
}
