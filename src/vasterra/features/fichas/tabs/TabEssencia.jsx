import React, { useMemo, useState } from "react";
import { ESSENCIAS_VIRTUDES, ESSENCIAS_PECADOS } from "../../../data/gameData";
import { G, inpStyle, btnStyle } from "../../../ui/theme";

const allEssencias = [...ESSENCIAS_VIRTUDES, ...ESSENCIAS_PECADOS];
const ESSENCIA_NAMES = allEssencias.map((x) => x.nome);
const essenciaByName = Object.fromEntries(allEssencias.map((x) => [x.nome, x]));
const MAX_MARCOS = 5;

const EXP_THRESHOLDS = [
  { id: "latente", pct: 10, label: "Latente", desc: "Pré-Sutil. Primeiros sinais narrativos da essência." },
  { id: "sutil", pct: 25, label: "Sutil", desc: "Primeiro estágio de mutação visível." },
  { id: "moderada", pct: 50, label: "Moderada", desc: "Transformações significativas no corpo e no comportamento." },
  { id: "limiar", pct: 75, label: "Limiar", desc: "Pré-Total. Ponto de não retorno se aproximando." },
  { id: "total", pct: 99, label: "Total", desc: "Estágio final de mutação. Geralmente implica perda de controle." },
];

const PERKS_EXPOSICAO = {
  Ecdise: {
    desc: "Equilibra todas as exposições em 100% no total. Quando excede, reduz proporcionalmente as outras e mantém marcos já alcançados.",
    variacoes: ["Padrão"],
  },
  "Caleidoscópio": {
    desc: "Pode mesclar essências, mas tem limite total de marcos acumulados (atual: 3).",
    variacoes: ["Regressão", "Permanência"],
  },
  Ilimitado: {
    desc: "Sem limite de quantidade de marcos. Acumula todas as essências simultaneamente.",
    variacoes: ["Padrão"],
  },
};

const TIPOS_CORPO = ["Corpo Comum", "Corpo Exposto", "Corpo Vinculado", "Corpo Marcado", "Corpo Nulo", "Casca Vazia"];

const BODY_TEXT = {
  "Corpo Comum": "Sem afinidade especial, mas limitado a até 3 essências ao longo da vida.",
  "Corpo Exposto": "Afinidade inata com uma essência; exposição nela progride mais rápido.",
  "Corpo Vinculado": "Nasce com uma essência fixa e dificuldade para acumular outras.",
  "Corpo Marcado": "Raríssimo. Inicia com Sutil ativo na essência marcada e progressão acelerada.",
  "Corpo Nulo": "Quase imune às essências. Acúmulo extremamente lento e sem mutações consistentes.",
  "Casca Vazia": "Só desperta depois. A primeira essência se torna devotada, permanente e limitada a 99%.",
};

const PROGRESS_TIERS = [
  { pct: 0, label: "Dormente" },
  { pct: 80, label: "Eco" },
  { pct: 180, label: "Convergente" },
  { pct: 280, label: "Catalisador" },
  { pct: 380, label: "Avatar Cardial" },
];

const getMarcoFixo = (pct) => EXP_THRESHOLDS.reduce((acc, lvl) => (pct >= lvl.pct ? lvl.pct : acc), 0);
const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));

const getExposureState = (ficha) => ficha.exposicaoDetalhada || {
  tipoVisual: "pizza",
  perkExposicao: "Ecdise",
  perkVariacao: "Padrão",
  tipoCorpo: "Corpo Comum",
  corpoEssenciaVinculada: "",
  corpoHistoricoEssencias: [],
  marcoFixo: {},
  ajustes: {},
  exposicoes: {},
  eventosHistorico: [],
};

function getStageCount(pct) {
  return [25, 50, 99].reduce((acc, mark) => (pct >= mark ? acc + 1 : acc), 0);
}

function applyEcdiseCap(exposicoes, marcoFixo, targetEssencia) {
  const next = { ...exposicoes };
  let total = Object.values(next).reduce((sum, val) => sum + val, 0);
  if (total <= 100) return next;

  const others = ESSENCIA_NAMES.filter((n) => n !== targetEssencia && (next[n] || 0) > 0);
  const overflow = total - 100;
  const othersTotal = others.reduce((sum, n) => sum + (next[n] || 0), 0) || 1;

  others.forEach((n) => {
    const cut = overflow * ((next[n] || 0) / othersTotal);
    next[n] = Math.max(marcoFixo[n] || 0, (next[n] || 0) - cut);
  });

  total = Object.values(next).reduce((sum, val) => sum + val, 0);
  if (total > 100) next[targetEssencia] = Math.max(marcoFixo[targetEssencia] || 0, (next[targetEssencia] || 0) - (total - 100));
  return next;
}

function buildExposureState(state) {
  const marcoFixo = { ...(state.marcoFixo || {}) };
  const eventos = state.eventosHistorico || [];
  const ajustes = state.ajustes || {};
  const raw = Object.fromEntries(ESSENCIA_NAMES.map((name) => [name, Number(ajustes[name]) || 0]));

  eventos.forEach((ev) => {
    raw[ev.essencia] = (raw[ev.essencia] || 0) + (Number(ev.valor) || 0);
  });

  if (state.tipoCorpo === "Corpo Exposto" && state.corpoEssenciaVinculada) raw[state.corpoEssenciaVinculada] *= 1.4;
  if (state.tipoCorpo === "Corpo Vinculado" && state.corpoEssenciaVinculada) {
    ESSENCIA_NAMES.forEach((name) => {
      if (name !== state.corpoEssenciaVinculada) raw[name] *= 0.6;
    });
    raw[state.corpoEssenciaVinculada] = Math.max(25, raw[state.corpoEssenciaVinculada] || 0);
  }

  if (state.tipoCorpo === "Corpo Marcado" && state.corpoEssenciaVinculada) {
    raw[state.corpoEssenciaVinculada] = Math.max(25, (raw[state.corpoEssenciaVinculada] || 0) * 1.8);
  }

  if (state.tipoCorpo === "Corpo Nulo") {
    ESSENCIA_NAMES.forEach((name) => {
      raw[name] = Math.min(9, (raw[name] || 0) * 0.1);
    });
  }

  if (state.tipoCorpo === "Casca Vazia") {
    const devotada = state.corpoEssenciaVinculada || Object.entries(raw).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
    if (devotada) {
      ESSENCIA_NAMES.forEach((name) => {
        if (name !== devotada) raw[name] = 0;
      });
      const pico = Math.max(Number(state.cascaPico) || 0, raw[devotada] || 0);
      raw[devotada] = Math.min(99, pico);
      state.corpoEssenciaVinculada = devotada;
      state.cascaPico = raw[devotada];
    }
  }

  const historico = new Set(state.corpoHistoricoEssencias || []);
  Object.entries(raw).forEach(([name, pct]) => {
    if (pct > 0) historico.add(name);
  });

  if (state.tipoCorpo === "Corpo Comum") {
    const allowed = new Set(Array.from(historico).slice(0, 3));
    ESSENCIA_NAMES.forEach((name) => {
      if (!allowed.has(name)) raw[name] = 0;
    });
  }

  let exposicoes = Object.fromEntries(ESSENCIA_NAMES.map((name) => [name, clamp(raw[name] || 0)]));

  ESSENCIA_NAMES.forEach((name) => {
    const marcoAtual = getMarcoFixo(exposicoes[name]);
    if (state.perkExposicao === "Ecdise" || (state.perkExposicao === "Caleidoscópio" && state.perkVariacao === "Permanência")) {
      marcoFixo[name] = Math.max(marcoFixo[name] || 0, marcoAtual);
      exposicoes[name] = Math.max(marcoFixo[name], exposicoes[name]);
    }
  });

  if (state.perkExposicao === "Ecdise") {
    const targetEssencia = eventos[eventos.length - 1]?.essencia || state.corpoEssenciaVinculada || ESSENCIA_NAMES[0];
    exposicoes = applyEcdiseCap(exposicoes, marcoFixo, targetEssencia);
  }

  if (state.perkExposicao === "Caleidoscópio") {
    let marcos = ESSENCIA_NAMES.reduce((sum, name) => sum + getStageCount(exposicoes[name] || 0), 0);
    if (marcos > MAX_MARCOS) {
      const priority = [...ESSENCIA_NAMES].sort((a, b) => exposicoes[a] - exposicoes[b]);
      for (const name of priority) {
        if (marcos <= MAX_MARCOS) break;
        while (marcos > MAX_MARCOS && exposicoes[name] >= 25) {
          const floor = state.perkVariacao === "Permanência" ? (marcoFixo[name] || 0) : 0;
          const before = getStageCount(exposicoes[name]);
          const nextDown = before >= 3 ? 75 : before >= 2 ? 49 : before >= 1 ? 24 : 0;
          exposicoes[name] = Math.max(floor, nextDown);
          const after = getStageCount(exposicoes[name]);
          marcos -= Math.max(0, before - after);
          if (floor >= exposicoes[name]) break;
        }
      }
    }
  }

  const exposicoesDetalhadas = Object.fromEntries(
    ESSENCIA_NAMES.map((name) => [
      name,
      {
        pct: Number((exposicoes[name] || 0).toFixed(2)),
        marcoFixo: marcoFixo[name] || 0,
      },
    ]),
  );

  return {
    ...state,
    marcoFixo,
    corpoHistoricoEssencias: Array.from(historico),
    exposicoes: exposicoesDetalhadas,
  };
}

function EssenciaBtn({ es, sel, onClick, pct }) {
  return (
    <button onClick={onClick} style={{ width: "100%", textAlign: "left", padding: "7px 10px", marginBottom: 4, background: sel ? es.cor + "1f" : "#080808", border: "1px solid " + (sel ? es.cor + "77" : "#1a1a1a"), borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all .18s ease" }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: es.cor, boxShadow: sel ? "0 0 10px " + es.cor : "none", flexShrink: 0 }} />
      <span style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: sel ? es.cor : "#777", flex: 1 }}>{es.nome}</span>
      <span style={{ fontSize: 10, fontFamily: "monospace", color: pct >= 25 ? es.cor : "#555" }}>{Math.round(pct)}%</span>
    </button>
  );
}

export function TabEssencia({ ficha, onUpdate }) {
  const [subtab, setSubtab] = useState("visao");
  const [eventoForm, setEventoForm] = useState({ nome: "", valor: "+10", essencia: ESSENCIA_NAMES[0], descricao: "" });
  const e = ficha.essencia;
  const baseState = getExposureState(ficha);
  const detailState = buildExposureState({ ...baseState });
  const selectedName = e?.nome || ESSENCIA_NAMES[0];
  const current = detailState.exposicoes[selectedName] || { pct: 0, marcoFixo: 0 };

  const totalPie = useMemo(
    () => allEssencias.map((ess) => ({ nome: ess.nome, cor: ess.cor, pct: detailState.exposicoes?.[ess.nome]?.pct || 0 })).filter((x) => x.pct > 0),
    [detailState],
  );

  const totalExposure = useMemo(() => Object.values(detailState.exposicoes || {}).reduce((sum, item) => sum + (item.pct || 0), 0), [detailState]);
  const progressTier = [...PROGRESS_TIERS].reverse().find((x) => totalExposure >= x.pct) || PROGRESS_TIERS[0];

  const pieGradient = totalPie.length === 0
    ? "conic-gradient(#222 0deg 360deg)"
    : (() => {
      let deg = 0;
      const parts = totalPie.map((p) => {
        const start = deg;
        const end = deg + (p.pct / Math.max(totalExposure || 100, 1)) * 360;
        deg = end;
        return `${p.cor} ${start}deg ${end}deg`;
      });
      return `conic-gradient(${parts.join(",")})`;
    })();

  const setDetailState = (next) => onUpdate({ exposicaoDetalhada: buildExposureState(next) });
  const selectEssencia = (es) => onUpdate({ essencia: e && e.nome === es.nome ? null : es });
  const resetEssencia = () => onUpdate({
    essencia: null,
    exposicao: 0,
    exposicaoDetalhada: {
      tipoVisual: "pizza",
      perkExposicao: "Ecdise",
      perkVariacao: "Padrão",
      tipoCorpo: "Corpo Comum",
      corpoEssenciaVinculada: "",
      exposicoes: {},
      ajustes: {},
      eventosHistorico: [],
      marcoFixo: {},
      corpoHistoricoEssencias: [],
      cascaPico: 0,
    },
  });

  const addEvento = () => {
    const val = Number(String(eventoForm.valor).replace("+", ""));
    if (!eventoForm.nome.trim() || Number.isNaN(val)) return;
    const evento = {
      id: Math.random().toString(36).slice(2, 10),
      nome: eventoForm.nome.trim(),
      valor: val,
      essencia: eventoForm.essencia,
      descricao: eventoForm.descricao.trim(),
      at: Date.now(),
    };
    setDetailState({ ...detailState, eventosHistorico: [...(detailState.eventosHistorico || []), evento] });
    setEventoForm((prev) => ({ ...prev, nome: "", valor: "+10", descricao: "" }));
  };

  const removeEvento = (id) => {
    setDetailState({ ...detailState, eventosHistorico: (detailState.eventosHistorico || []).filter((ev) => ev.id !== id) });
  };

  const setAjuste = (essNome, value) => {
    setDetailState({ ...detailState, ajustes: { ...(detailState.ajustes || {}), [essNome]: value } });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: 16 }}>
      <style>{`
        @keyframes essencePulse { 0% { box-shadow: 0 0 0 rgba(200,169,110,.0); } 50% { box-shadow: 0 0 22px rgba(200,169,110,.25); } 100% { box-shadow: 0 0 0 rgba(200,169,110,.0); } }
        .essence-card { animation: essencePulse 4s ease-in-out infinite; }
        .event-scroll::-webkit-scrollbar { width: 6px; }
        .event-scroll::-webkit-scrollbar-thumb { background: rgba(200,169,110,.35); border-radius: 8px; }
      `}</style>

      <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 12, padding: 14 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 12 }}>◈ ESSÊNCIAS</div>
        <div style={{ fontSize: 10, color: "#c8a96e88", fontFamily: "monospace", marginBottom: 6, letterSpacing: 2 }}>✨ VIRTUDES</div>
        {ESSENCIAS_VIRTUDES.map((es) => <EssenciaBtn key={es.nome} es={es} pct={detailState.exposicoes?.[es.nome]?.pct || 0} sel={!!e && e.nome === es.nome} onClick={() => selectEssencia(es)} />)}
        <div style={{ fontSize: 10, color: "#c8a96e88", fontFamily: "monospace", marginTop: 10, marginBottom: 6, letterSpacing: 2 }}>💀 PECADOS</div>
        {ESSENCIAS_PECADOS.map((es) => <EssenciaBtn key={es.nome} es={es} pct={detailState.exposicoes?.[es.nome]?.pct || 0} sel={!!e && e.nome === es.nome} onClick={() => selectEssencia(es)} />)}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[{ id: "visao", label: "Visão Geral" }, { id: "detalhe", label: "Sistema de Exposição" }].map((t) => (
            <button key={t.id} onClick={() => setSubtab(t.id)} style={btnStyle({ background: subtab === t.id ? "linear-gradient(135deg,#1a1208,#2a1e08)" : "#0d0d0d", color: subtab === t.id ? G.gold : G.muted, borderColor: subtab === t.id ? "#c8a96e66" : "#222" })}>{t.label}</button>
          ))}
        </div>

        {subtab === "visao" && e && (
          <div className="essence-card" style={{ background: e.cor + "0d", border: "1px solid " + e.cor + "44", borderRadius: 12, padding: 16 }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 20, color: e.cor }}>{e.nome} {e.tag ? `(${e.tag})` : ""}</div>
            <div style={{ fontSize: 12, color: "#888", fontStyle: "italic", background: "#050505", borderRadius: 6, padding: "8px 12px", marginTop: 8 }}>{e.forma}</div>
            <div style={{ marginTop: 10, fontFamily: "monospace", fontSize: 11, color: G.muted }}>
              {EXP_THRESHOLDS.map((lvl) => (
                <div key={lvl.id}>{lvl.pct}% · {lvl.label} · {(current.pct || 0) >= lvl.pct ? lvl.desc : "???"}</div>
              ))}
            </div>
          </div>
        )}

        {subtab === "detalhe" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 12, padding: 12 }}>
              <div style={{ fontFamily: "'Cinzel',serif", color: G.gold, marginBottom: 8 }}>Perk de Exposição e Tipo de Corpo</div>
              <select value={detailState.perkExposicao} onChange={(ev) => setDetailState({ ...detailState, perkExposicao: ev.target.value, perkVariacao: PERKS_EXPOSICAO[ev.target.value].variacoes[0] })} style={inpStyle({ marginBottom: 6 })}>
                {Object.keys(PERKS_EXPOSICAO).map((k) => <option key={k}>{k}</option>)}
              </select>
              <select value={detailState.perkVariacao} onChange={(ev) => setDetailState({ ...detailState, perkVariacao: ev.target.value })} style={inpStyle({ marginBottom: 6 })}>
                {PERKS_EXPOSICAO[detailState.perkExposicao].variacoes.map((v) => <option key={v}>{v}</option>)}
              </select>
              <div style={{ fontSize: 11, color: G.muted, fontFamily: "monospace", marginBottom: 10 }}>{PERKS_EXPOSICAO[detailState.perkExposicao].desc}</div>

              <select value={detailState.tipoCorpo} onChange={(ev) => setDetailState({ ...detailState, tipoCorpo: ev.target.value })} style={inpStyle({ marginBottom: 6 })}>
                {TIPOS_CORPO.map((t) => <option key={t}>{t}</option>)}
              </select>

              {["Corpo Exposto", "Corpo Vinculado", "Corpo Marcado", "Casca Vazia"].includes(detailState.tipoCorpo) && (
                <select value={detailState.corpoEssenciaVinculada || ""} onChange={(ev) => setDetailState({ ...detailState, corpoEssenciaVinculada: ev.target.value })} style={inpStyle({ marginBottom: 6 })}>
                  <option value="">Selecione essência de afinidade</option>
                  {allEssencias.map((x) => <option key={x.nome} value={x.nome}>{x.nome}</option>)}
                </select>
              )}
              <div style={{ fontSize: 11, color: G.muted, fontFamily: "monospace" }}>{BODY_TEXT[detailState.tipoCorpo]}</div>
            </div>

            <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontFamily: "'Cinzel',serif", color: G.gold }}>Exposição Total · {Math.round(totalExposure)}%</div>
                <span style={{ fontFamily: "monospace", fontSize: 11, color: G.gold }}>{progressTier.label}</span>
              </div>

              {(detailState.tipoVisual === "pizza" || detailState.perkExposicao === "Ecdise") ? (
                <div style={{ width: 180, height: 180, borderRadius: "50%", margin: "0 auto 10px", background: pieGradient, border: "1px solid #333", boxShadow: "0 0 14px #000 inset" }} />
              ) : (
                <div style={{ height: 16, background: "#111", borderRadius: 8, overflow: "hidden", marginBottom: 10 }}><div style={{ width: `${Math.min(100, current.pct || 0)}%`, height: "100%", background: e?.cor || G.gold }} /></div>
              )}

              <label style={{ fontFamily: "monospace", fontSize: 10, color: G.muted }}>Ajuste manual de {selectedName}</label>
              <input type="number" value={Number(detailState.ajustes?.[selectedName] || 0)} onChange={(ev) => setAjuste(selectedName, Number(ev.target.value) || 0)} style={inpStyle({ marginBottom: 6 })} />
              <div style={{ fontFamily: "monospace", fontSize: 11, color: G.muted }}>Atual: <span style={{ color: essenciaByName[selectedName]?.cor || G.gold }}>{Math.round(current.pct)}%</span> · Marco fixo: {current.marcoFixo || 0}%</div>
            </div>

            <div style={{ gridColumn: "1 / -1", background: G.bg2, border: "1px solid " + G.border, borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><div style={{ fontFamily: "'Cinzel',serif", color: G.gold }}>Eventos de Exposição</div><button onClick={resetEssencia} style={btnStyle({ padding: "4px 10px", borderColor: "#e74c3c44", color: "#e74c3c" })}>Resetar Essências</button></div>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 120px 180px 1.6fr auto", gap: 8, marginBottom: 10 }}>
                <input value={eventoForm.nome} onChange={(ev) => setEventoForm((p) => ({ ...p, nome: ev.target.value }))} placeholder="Nome do evento" style={inpStyle()} />
                <input value={eventoForm.valor} onChange={(ev) => setEventoForm((p) => ({ ...p, valor: ev.target.value }))} placeholder="+10 / -5" style={inpStyle()} />
                <select value={eventoForm.essencia} onChange={(ev) => setEventoForm((p) => ({ ...p, essencia: ev.target.value }))} style={inpStyle()}>
                  {allEssencias.map((x) => <option key={x.nome} value={x.nome}>{x.nome}</option>)}
                </select>
                <input value={eventoForm.descricao} onChange={(ev) => setEventoForm((p) => ({ ...p, descricao: ev.target.value }))} placeholder="Descrição narrativa" style={inpStyle()} />
                <button onClick={addEvento} style={btnStyle({ padding: "6px 12px" })}>+ Evento</button>
              </div>

              <div className="event-scroll" style={{ maxHeight: 240, overflowY: "auto", display: "grid", gap: 6, paddingRight: 4 }}>
                {(detailState.eventosHistorico || []).slice().reverse().map((ev) => {
                  const cor = essenciaByName[ev.essencia]?.cor || G.gold;
                  return (
                    <div key={ev.id} style={{ display: "grid", gridTemplateColumns: "1.1fr 90px 150px 1.6fr auto", gap: 8, alignItems: "center", border: "1px solid #222", borderLeft: "3px solid " + cor, borderRadius: 8, padding: "8px 10px", background: "#090909" }}>
                      <span style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: G.text }}>{ev.nome}</span>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: ev.valor >= 0 ? "#55d88d" : "#ff6f61" }}>{ev.valor >= 0 ? `+${ev.valor}` : ev.valor}%</span>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: cor }}>{ev.essencia}</span>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: G.muted }}>{ev.descricao || "—"}</span>
                      <button onClick={() => removeEvento(ev.id)} style={btnStyle({ padding: "4px 8px", borderColor: "#e74c3c44", color: "#e74c3c" })}>Apagar</button>
                    </div>
                  );
                })}
                {(detailState.eventosHistorico || []).length === 0 && <div style={{ fontFamily: "monospace", color: "#666", fontSize: 11 }}>Nenhum evento registrado.</div>}
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1", background: G.bg2, border: "1px solid " + G.border, borderRadius: 12, padding: 12 }}>
              <div style={{ fontFamily: "'Cinzel',serif", color: G.gold, marginBottom: 8 }}>Marcos por Essência ({selectedName})</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
                {EXP_THRESHOLDS.map((lvl) => {
                  const reached = (current.pct || 0) >= lvl.pct;
                  return <div key={lvl.id} style={{ border: "1px solid " + (reached ? "#2ecc7166" : "#2a2a2a"), borderRadius: 8, padding: 8, background: reached ? "#2ecc7112" : "#0a0a0a" }}><div style={{ color: reached ? "#2ecc71" : G.muted, fontFamily: "'Cinzel',serif", fontSize: 11 }}>{lvl.label} ({lvl.pct}%)</div><div style={{ marginTop: 4, fontSize: 11, color: reached ? G.text : G.muted, fontFamily: "monospace" }}>{reached ? lvl.desc : "???"}</div></div>;
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
