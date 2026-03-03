import React, { useMemo, useRef, useState } from "react";
import { uid } from "../../../core/factories";
import { instantiateEffectFromTemplate } from "../../../core/effects";
import { makeDefaultEffect } from "../../caldeirao/EffectForgeEditor";
import { G, inpStyle, btnStyle } from "../../../ui/theme";
import { HoverButton } from "../../../components/primitives/Interactive";

const defaultCombate = () => ({
  rodadaAtual: 0,
  abaAtiva: "recursos",
  lembretes: [],
  recursos: [
    { id: uid(), nome: "ACO", cor: "#2ecc71", max: 2, atual: 2 },
    { id: uid(), nome: "MOV", cor: "#3498db", max: 1, atual: 1 },
    { id: uid(), nome: "REA", cor: "#e74c3c", max: 1, atual: 1 },
    { id: uid(), nome: "ESF", cor: "#8b0000", max: 1, atual: 1 },
  ],
});

const EFFECT_TARGETS = ["Portador", "Alvo", "Área", "Condição", "Todos"];
const DEFAULT_RESOURCE_COLORS = { ACO: "#2ecc71", MOV: "#3498db", REA: "#e74c3c", ESF: "#8b0000" };

function parseDice(expr = "") {
  const m = String(expr).trim().match(/^(\d+)d(\d+)$/i);
  if (!m) return null;
  return { n: Number(m[1]), d: Number(m[2]) };
}

function rollDice(expr = "") {
  const parsed = parseDice(expr);
  if (!parsed) return null;
  let total = 0;
  for (let i = 0; i < parsed.n; i += 1) total += 1 + Math.floor(Math.random() * parsed.d);
  return total;
}

export function TabCombate({ ficha, onUpdate, efeitosCaldeirao = [], onOpenCaldeirao, onNotify }) {
  const state = useMemo(() => ({ ...defaultCombate(), ...(ficha.combate || {}) }), [ficha.combate]);
  const [collapsed, setCollapsed] = useState({});
  const [resourceOffset, setResourceOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef(null);
  const charEffects = ficha.modificadores?.efeitos || [];

  const saveCombate = (next) => onUpdate({ combate: { ...state, ...next } });
  const saveEffects = (next) => onUpdate({ modificadores: { ...(ficha.modificadores || {}), efeitos: next } });

  const upResource = (id, patch) => saveCombate({ recursos: state.recursos.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const setTab = (abaAtiva) => saveCombate({ abaAtiva });
  const setRodada = (rodadaAtual) => saveCombate({ rodadaAtual: Math.max(0, rodadaAtual) });

  const proxRodada = () => {
    const recursos = (state.recursos || []).map((r) => ({ ...r, atual: r.max }));
    saveCombate({ rodadaAtual: state.rodadaAtual + 1, recursos });
    onNotify?.("Nova rodada: recursos resetados para o máximo.", "info");
  };

  const activeLembretes = (state.lembretes || []).filter((l) => {
    const rodadaLembrete = l.tipo === "naRodada" ? l.lembrarNaRodada : (l.criadoNaRodada + l.lembrarNaRodada);
    return rodadaLembrete === state.rodadaAtual;
  });

  const activeEfeitos = (charEffects || []).filter((e) => e.ativo !== false);
  const notifyingEffects = activeEfeitos.filter((e) => e.sinalizar !== false);

  const ensureItemEffects = () => {
    const invEffects = (ficha.inventario || []).flatMap((entry) => {
      const item = entry.item || {};
      return (item.efeitos || []).filter((ef) => ef?.origemEffectId).map((ef) => ({ ef, item }));
    });
    if (!invEffects.length) return;

    const existingKeys = new Set((charEffects || []).map((e) => `${e.origemEffectId || ""}::${e.origemItem || ""}`));
    const additions = [];

    invEffects.forEach(({ ef, item }) => {
      const tpl = (efeitosCaldeirao || []).find((x) => x.id === ef.origemEffectId) || ef;
      if ((tpl.alvo || "Portador") !== "Portador") return;
      const key = `${tpl.id || ef.origemEffectId}::${item.nome || ""}`;
      if (existingKeys.has(key)) return;
      additions.push(instantiateEffectFromTemplate(tpl, { rodadaInicio: state.rodadaAtual, origemItem: item.nome || "Item", ativo: false, sinalizar: false }));
    });

    if (additions.length) {
      saveEffects([...(charEffects || []), ...additions]);
      onNotify?.(`${additions.length} efeito(s) de item sincronizado(s).`, "success");
    }
  };

  const toggleResourceSlot = (resource, index) => {
    const nextAtual = index < resource.atual ? index : Math.min(resource.max, index + 1);
    upResource(resource.id, { atual: nextAtual });
  };

  const onCanvasMouseDown = (e) => {
    dragState.current = { sx: e.clientX, sy: e.clientY, ox: resourceOffset.x, oy: resourceOffset.y };
  };

  const onCanvasMouseMove = (e) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.sx;
    const dy = e.clientY - dragState.current.sy;
    setResourceOffset({ x: dragState.current.ox + dx, y: dragState.current.oy + dy });
  };

  const onCanvasMouseUp = () => { dragState.current = null; };

  return (
    <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 12, padding: 14 }}>
      <style>{`@keyframes pulseSlot {0% {transform: scale(1);} 50% {transform: scale(1.06);} 100% {transform: scale(1);} }`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: "'Cinzel',serif", color: G.gold, letterSpacing: 2 }}>◈ COMBATE</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <HoverButton onClick={() => setRodada(state.rodadaAtual - 1)}>&lt;</HoverButton>
          <span style={{ fontFamily: "monospace", color: "#8ec8ff" }}>Rodada {state.rodadaAtual}</span>
          <HoverButton onClick={() => setRodada(state.rodadaAtual + 1)}>&gt;</HoverButton>
          <HoverButton onClick={proxRodada}>Próx</HoverButton>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {["recursos", "efeitos", "lembretes"].map((aba) => {
          const hasAlert = aba === "lembretes" ? activeLembretes.length > 0 : aba === "efeitos" ? notifyingEffects.length > 0 : false;
          return (
            <button key={aba} onClick={() => setTab(aba)} style={{ ...btnStyle({ padding: "6px 12px" }), borderColor: state.abaAtiva === aba ? "#5dade266" : undefined, color: state.abaAtiva === aba ? "#b6ddff" : undefined, position: "relative" }}>
              {aba[0].toUpperCase() + aba.slice(1)}
              {hasAlert && <span style={{ position: "absolute", top: -6, right: -6, color: "#ff4d6d" }}>❗</span>}
            </button>
          );
        })}
      </div>

      {state.abaAtiva === "recursos" && (
        <div>
          <div
            onMouseDown={onCanvasMouseDown}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onMouseLeave={onCanvasMouseUp}
            style={{
              border: "1px solid #2a2a2a", borderRadius: 12, background: "radial-gradient(circle at 20% 20%, #101726 0, #09090a 50%, #060606 100%)",
              minHeight: 320, overflow: "hidden", position: "relative", cursor: dragState.current ? "grabbing" : "grab",
            }}
          >
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#1a1a1a22 1px, transparent 1px), linear-gradient(90deg, #1a1a1a22 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <div style={{ transform: `translate(${resourceOffset.x}px, ${resourceOffset.y}px)`, transition: dragState.current ? "none" : "transform .12s", position: "relative", padding: 16, display: "grid", gap: 12, width: 900 }}>
              {(state.recursos || []).map((r) => {
                const max = Math.max(0, Number(r.max || 0));
                const atual = Math.max(0, Math.min(max, Number(r.atual || 0)));
                const cor = r.cor || DEFAULT_RESOURCE_COLORS[r.nome] || "#95a5a6";
                return (
                  <div key={r.id} style={{ border: `1px solid ${cor}55`, borderRadius: 10, background: "#00000066", padding: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 36px", gap: 6, marginBottom: 8, alignItems: "center" }}>
                      <input value={r.nome} onChange={(e) => upResource(r.id, { nome: e.target.value })} style={inpStyle({ borderColor: cor + "55", color: cor })} />
                      <input type="number" min={0} value={max} onChange={(e) => upResource(r.id, { max: Math.max(0, Number(e.target.value) || 0), atual: Math.min(atual, Math.max(0, Number(e.target.value) || 0)) })} style={inpStyle()} />
                      <input type="number" min={0} value={atual} onChange={(e) => upResource(r.id, { atual: Math.max(0, Math.min(max, Number(e.target.value) || 0)) })} style={inpStyle()} />
                      <button onClick={() => saveCombate({ recursos: state.recursos.filter((x) => x.id !== r.id) })} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c", padding: "4px 8px" })}>✕</button>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {Array.from({ length: max }).map((_, i) => {
                        const on = i < atual;
                        return (
                          <button
                            key={i}
                            onClick={() => toggleResourceSlot(r, i)}
                            style={{
                              width: 24, height: 24, borderRadius: 6, border: `1px solid ${cor}`,
                              background: on ? cor : "#151515", opacity: on ? 1 : 0.35,
                              boxShadow: on ? `0 0 10px ${cor}99` : "none", animation: on ? "pulseSlot 1.2s ease-in-out infinite" : "none",
                              cursor: "pointer", transition: "all .18s",
                            }}
                            title={`${r.nome} ${i + 1}/${max}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <HoverButton onClick={() => saveCombate({ recursos: [...(state.recursos || []), { id: uid(), nome: "NOVO", cor: "#95a5a6", max: 1, atual: 1 }] })}>+ Novo Recurso</HoverButton>
            <HoverButton onClick={() => saveCombate({ recursos: (state.recursos || []).map((r) => ({ ...r, atual: r.max })) })} style={btnStyle({ borderColor: "#2ecc7144", color: "#7cf0b3" })}>Resetar Recursos</HoverButton>
          </div>
        </div>
      )}

      {state.abaAtiva === "efeitos" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 6, marginBottom: 8 }}>
            <select defaultValue="" onChange={(ev) => {
              const ref = (efeitosCaldeirao || []).find((x) => x.id === ev.target.value);
              if (!ref) return;
              const next = instantiateEffectFromTemplate(ref, { rodadaInicio: state.rodadaAtual, ativo: false });
              saveEffects([next, ...(charEffects || [])]);
              onNotify?.(`Efeito anexado: ${next.nome}`, "success");
              ev.target.value = "";
            }} style={inpStyle()}>
              <option value="">Adicionar efeito do Caldeirão...</option>
              {(efeitosCaldeirao || []).map((ef) => <option key={ef.id} value={ef.id}>{ef.nome} · {ef.efeitoMecanico || "—"}</option>)}
            </select>
            <HoverButton onClick={() => onOpenCaldeirao?.()}>Criar no Caldeirão</HoverButton>
            <HoverButton onClick={() => saveEffects([instantiateEffectFromTemplate(makeDefaultEffect(), { nome: "Novo efeito local", origem: "Local", origemDetalhe: "Combate", ativo: false, rodadaInicio: state.rodadaAtual, sinalizar: false }), ...(charEffects || [])])} style={btnStyle({ borderColor: "#8e44ad55", color: "#dcb3ff" })}>Criar local</HoverButton>
            <HoverButton onClick={ensureItemEffects} style={btnStyle({ borderColor: "#2ecc7144", color: "#7cf0b3" })}>Sincronizar itens</HoverButton>
            <HoverButton onClick={() => saveEffects([...(charEffects || [])])}>Atualizar</HoverButton>
          </div>

          {(charEffects || []).map((e) => {
            const isCollapsed = collapsed[e.id] ?? true;
            return (
              <div key={e.id} style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: 8, marginBottom: 8, background: "#0a0a0a", display: "grid", gap: 6 }}>
                <div style={{ display: "grid", gridTemplateColumns: "24px 80px 24px 24px 1fr auto auto", gap: 6, alignItems: "center" }}>
                  <input type="checkbox" checked={e.ativo !== false} onChange={(ev) => { saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, ativo: ev.target.checked } : x)); onNotify?.(`Efeito ${ev.target.checked ? "ativado" : "desativado"}: ${e.nome || "Sem nome"}`, "info"); }} />
                  <select value={e.tipo || "Buff"} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, tipo: ev.target.value } : x))} style={inpStyle()}><option>Buff</option><option>Debuff</option></select>
                  <button onClick={() => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, sinalizar: !(x.sinalizar !== false) } : x))} style={btnStyle({ padding: "2px 4px" })}>{e.sinalizar !== false ? "🔔" : "🔕"}</button>
                  <button onClick={() => setCollapsed((p) => ({ ...p, [e.id]: !isCollapsed }))} style={btnStyle({ padding: "2px 4px" })}>{isCollapsed ? "▸" : "▾"}</button>
                  <input value={e.nome || ""} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, nome: ev.target.value } : x))} style={inpStyle()} />
                  <HoverButton onClick={() => saveEffects([{ ...e, id: uid(), nome: `${e.nome || "Efeito"} (cópia)` }, ...(charEffects || [])])}>⎘</HoverButton>
                  <HoverButton onClick={() => saveEffects(charEffects.filter((x) => x.id !== e.id))} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c" })}>✕</HoverButton>
                </div>

                {isCollapsed ? (
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: G.muted }}>{e.tipo || "—"} · {e.nome || "Sem nome"} · {e.efeitoMecanico || "—"}</div>
                ) : (
                  <>
                    <textarea value={e.descricao || ""} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, descricao: ev.target.value } : x))} rows={2} style={inpStyle({ resize: "vertical" })} />
                    <input value={e.frase || ""} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, frase: ev.target.value } : x))} placeholder="Frase de efeito" style={inpStyle()} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                      <input value={e.duracao || ""} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, duracao: ev.target.value } : x))} placeholder="Duração (ex: 2d4)" style={inpStyle()} disabled={!!e.eterno} />
                      <select value={String(!!e.eterno)} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, eterno: ev.target.value === "true", duracao: ev.target.value === "true" ? "" : (x.duracao || "") } : x))} style={inpStyle()}><option value="false">Não eterno</option><option value="true">Eterno</option></select>
                      <HoverButton onClick={() => { const roll = rollDice(e.duracao || ""); if (roll == null) return; saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, duracaoRolada: roll, rodadaInicio: state.rodadaAtual } : x)); }}>🎲 Duração</HoverButton>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr", gap: 6 }}>
                      <input value={e.rank || "Comum"} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, rank: ev.target.value } : x))} style={inpStyle()} />
                      <input value={e.efeitoMecanico || ""} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, efeitoMecanico: ev.target.value } : x))} placeholder="-2FOR, +2VIT" style={inpStyle()} />
                      <select value={e.alvo || "Portador"} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, alvo: ev.target.value } : x))} style={inpStyle()}>{EFFECT_TARGETS.map((t) => <option key={t}>{t}</option>)}</select>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {state.abaAtiva === "lembretes" && (
        <div>
          {(state.lembretes || []).map((l) => (
            <div key={l.id} style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: 8, marginBottom: 8, background: "#0a0a0a", display: "grid", gridTemplateColumns: "1fr 140px 140px auto auto", gap: 6, alignItems: "center" }}>
              <input value={l.texto} onChange={(ev) => saveCombate({ lembretes: state.lembretes.map((x) => x.id === l.id ? { ...x, texto: ev.target.value } : x) })} style={inpStyle()} />
              <select value={l.tipo || "emX"} onChange={(ev) => saveCombate({ lembretes: state.lembretes.map((x) => x.id === l.id ? { ...x, tipo: ev.target.value } : x) })} style={inpStyle()}><option value="emX">Em X rodadas</option><option value="naRodada">Na rodada</option></select>
              <input type="number" value={l.lembrarNaRodada} onChange={(ev) => saveCombate({ lembretes: state.lembretes.map((x) => x.id === l.id ? { ...x, lembrarNaRodada: Math.max(0, Number(ev.target.value) || 0) } : x) })} style={inpStyle()} />
              <HoverButton onClick={() => saveCombate({ lembretes: state.lembretes.map((x) => x.id === l.id ? { ...x, criadoNaRodada: state.rodadaAtual } : x) })}>🔄</HoverButton>
              <HoverButton onClick={() => saveCombate({ lembretes: state.lembretes.filter((x) => x.id !== l.id) })} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c" })}>✕</HoverButton>
            </div>
          ))}
          <HoverButton onClick={() => saveCombate({ lembretes: [...(state.lembretes || []), { id: uid(), texto: "Novo lembrete", criadoNaRodada: state.rodadaAtual, lembrarNaRodada: state.rodadaAtual + 1, tipo: "emX" }] })}>+ Novo Lembrete</HoverButton>
        </div>
      )}
    </div>
  );
}
