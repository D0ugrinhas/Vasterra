import React, { useEffect, useMemo, useRef, useState } from "react";
import { uid } from "../../../core/factories";
import { instantiateEffectFromTemplate } from "../../../core/effects";
import { aggregateStatusModifiers } from "../../../core/effects";
import { buildFormulaVars, evaluateStatusFormula, getMechanicalText, parseDurationRounds, toNumber } from "./combate/utils";
import { RANK_COR } from "../../../data/gameData";
import { G, btnStyle, inpStyle } from "../../../ui/theme";
import { HoverButton } from "../../../components/primitives/Interactive";
import { Modal, EffectDetailsModal } from "../../shared/components";
import { SkillDetalhe } from "../../biblioteca/SkillDetalhe";
import { ImageViewport } from "../../../components/media/ImageAttachModal";

const CORE_RESOURCES = [
  { codigo: "ACO", nome: "Ação", cor: "#2ecc71", shape: "circle", total: 2 },
  { codigo: "MOV", nome: "Movimento", cor: "#3498db", shape: "square", total: 1 },
  { codigo: "REA", nome: "Reação", cor: "#e74c3c", shape: "triangle", total: 1 },
  { codigo: "ESF", nome: "Esforço", cor: "#8b0000", shape: "hexagon", total: 1 },
];

const SHAPE_OPTIONS = [
  { value: "square", label: "Quadrado" },
  { value: "circle", label: "Círculo" },
  { value: "triangle", label: "Triângulo" },
  { value: "hexagon", label: "Hexágono" },
];

const CORE_STATUS_META = {
  VIT: { label: "VIT", cor: "#ff5b4d" },
  EST: { label: "EST", cor: "#d7d748" },
  MAN: { label: "MAN", cor: "#4a7dff" },
  SAN: { label: "SAN", cor: "#c15cff" },
  CONS: { label: "CONSC", cor: "#50c5aa" },
};

function FormulaInput({ value, onChange, placeholder, suggestions = [] }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const filtered = useMemo(() => {
    const tail = String(value || "").split(/[^A-Za-zÀ-ÿ0-9_]+/).pop() || "";
    if (!tail) return suggestions.slice(0, 8);
    return suggestions.filter((s) => s.toLowerCase().includes(tail.toLowerCase())).slice(0, 8);
  }, [value, suggestions]);

  return (
    <div style={{ position: "relative" }}>
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!open || filtered.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setIdx((p) => (p + 1) % filtered.length); }
          if (e.key === "ArrowUp") { e.preventDefault(); setIdx((p) => (p - 1 + filtered.length) % filtered.length); }
          if (e.key === "Enter") {
            e.preventDefault();
            const token = filtered[idx] || filtered[0];
            const raw = String(value || "");
            const next = raw.replace(/([A-Za-zÀ-ÿ0-9_]+)?$/, token);
            onChange(next);
            setOpen(true)
          }
        }}
        placeholder={placeholder}
        style={inpStyle({ fontFamily: "monospace", fontSize: 11 })}
      />
      {open && filtered.length > 0 && (
        <div style={{ position: "absolute", zIndex: 20, left: 0, right: 0, top: "102%", border: "1px solid #4f4028", borderRadius: 8, background: "#130f0a", maxHeight: 150, overflow: "auto" }}>
          {filtered.map((s, i) => (
            <div key={s} onMouseDown={() => onChange(String(value || "").replace(/([A-Za-zÀ-ÿ0-9_]+)?$/, s))} style={{ padding: "4px 6px", cursor: "pointer", background: i === idx ? "#2a1d0f" : "transparent", color: "#e7d5b1", fontFamily: "monospace", fontSize: 11 }}>{s}</div>
          ))}
        </div>
      )}
    </div>
  );
}
function durationInfo(effect, rodadaAtual) {
  const total = parseDurationRounds(effect);
  if (!total) return null;
  const ini = Math.max(0, Math.floor(toNumber(effect?.rodadaInicio ?? 0, 0)));
  const restante = Math.max(0, ini + total - rodadaAtual);
  return { total, restante, inicio: ini };
}

function normalizeCombateState(combate = {}) {
  const rawResources = Array.isArray(combate?.recursos) ? combate.recursos : [];
  const byCode = new Map(rawResources.map((r) => [String(r.codigo || r.nome || "").toUpperCase(), r]));

  const base = CORE_RESOURCES.map((core) => {
    const old = byCode.get(core.codigo);
    const oldTotal = toNumber(old?.total ?? old?.max ?? NaN, NaN);
    const total = oldTotal > 0 ? Math.max(0, Math.floor(oldTotal)) : core.total;
    const atual = Math.max(0, Math.min(total, Math.floor(toNumber(old?.atual ?? old?.max ?? total, total))));
    return {
      id: old?.id || uid(),
      codigo: core.codigo,
      nome: old?.nome || core.nome,
      cor: old?.cor || core.cor,
      shape: old?.shape || core.shape || "square",
      total,
      atual,
      custom: false,
    };
  });

  const custom = rawResources
    .filter((r) => !CORE_RESOURCES.some((core) => core.codigo === String(r.codigo || r.nome || "").toUpperCase()))
    .map((r) => {
      const total = Math.max(0, Math.floor(toNumber(r.total ?? r.max ?? 0, 0)));
      return {
        id: r.id || uid(),
        codigo: String(r.codigo || r.nome || "").toUpperCase() || "NOVO",
        nome: r.nome || "Recurso",
        cor: r.cor || "#7f8c8d",
        shape: r.shape || "square",
        total,
        atual: Math.max(0, Math.min(total, Math.floor(toNumber(r.atual ?? r.max ?? total, total)))),
        custom: true,
      };
    });

  return {
    rodadaAtual: Math.max(0, Math.floor(toNumber(combate?.rodadaAtual ?? 0, 0))),
    lembretes: Array.isArray(combate?.lembretes) ? combate.lembretes : [],
    logs: Array.isArray(combate?.logs) ? combate.logs : [],
    pendingSkillIds: Array.isArray(combate?.pendingSkillIds) ? combate.pendingSkillIds : [],
    recursos: [...base, ...custom],
    statusMeta: combate?.statusMeta && typeof combate.statusMeta === "object" ? combate.statusMeta : {},
  };
}

function skillFromEntry(entry) {
  return entry?.effectiveSkill || entry?.skill || entry || {};
}

function parseSkillCosts(skill) {
  return (skill?.custos || []).map((c) => ({
    codigo: String(c.codigo || "").toUpperCase(),
    quantidade: Math.max(0, Number(c.quantidade || 0)),
  })).filter((c) => c.codigo && c.quantidade > 0);
}

function resolveCostStyle(skill, code) {
  const found = (skill?.custoCatalogo || []).find((c) => String(c.nome || "").toUpperCase() === String(code || "").toUpperCase());
  return { bg: found?.cor || "#3b4756", fg: found?.textoCor || "#fff" };
}

function skillIconSrc(skill = {}) {
  if (skill.iconeModo === "url" && skill.iconeUrl) return skill.iconeUrl;
  if (skill.iconeModo === "upload" && skill.iconeData) return skill.iconeData;
  return "";
}

function ResourcePip({ active, willSpend = false, color, shape = "square", onClick, title }) {
  const styleByShape = {
    square: { borderRadius: "3px" },
    circle: { borderRadius: "999px" },
    triangle: { clipPath: "polygon(50% 6%, 96% 92%, 4% 92%)", borderRadius: 0 },
    hexagon: { clipPath: "polygon(25% 6%, 75% 6%, 97% 50%, 75% 94%, 25% 94%, 3% 50%)", borderRadius: 0 },
  };
  const common = {
    display: "inline-block",
    width: 17,
    height: 17,
    cursor: "pointer",
    transition: "all .18s ease",
    filter: willSpend ? "drop-shadow(0 0 10px rgba(255,110,80,.55))" : active ? "drop-shadow(0 0 8px rgba(255,255,255,.32))" : "grayscale(0.9) brightness(.45)",
    transform: active ? "scale(1)" : "scale(.88)",
    opacity: active ? 1 : 0.72,
    borderRadius: "3px",
    background: color,
    animation: willSpend ? "resourceSpend 1s ease-in-out infinite" : active ? "resourcePulse 1.2s ease-in-out infinite" : "none",
  };

  return (
    <button title={title} onClick={onClick} style={{ border: "none", background: "transparent", padding: 0 }}>
      <span style={{ ...common, ...(styleByShape[shape] || styleByShape.square) }} />
    </button>
  );
}


function shouldTriggerReminder(reminder, rodadaAtual, rodadaAnterior) {
  const mode = reminder?.modo || reminder?.tipo || "naRodada";
  const every = Math.max(1, Number(reminder?.aCada || reminder?.valor || 1));
  const target = Number(reminder?.rodadaAlvo ?? reminder?.lembrarNaRodada ?? 0);
  if (mode === "emX") return rodadaAtual === rodadaAnterior + Math.max(1, Number(reminder?.emX || reminder?.valor || 1));
  if (mode === "cadaX") return rodadaAtual > 0 && rodadaAtual % every === 0;
  return rodadaAtual === target;
}

export function TabCombate({ ficha, onUpdate, efeitosCaldeirao = [], skillTags = [], onNotify }) {
  const [query, setQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [skillModal, setSkillModal] = useState(null);
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [effectDetail, setEffectDetail] = useState(null);
  const [resourceModal, setResourceModal] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [logDetail, setLogDetail] = useState(null);

  const combate = useMemo(() => normalizeCombateState(ficha?.combate || {}), [ficha?.combate]);
  const tagsById = useMemo(() => Object.fromEntries((skillTags || []).map((t) => [t.id, t])), [skillTags]);
  const assigned = useMemo(() => (ficha?.skills || []).map((entry) => ({ entry, skill: skillFromEntry(entry) })), [ficha?.skills]);
  const filteredSkills = useMemo(() => assigned.filter(({ skill }) => (`${skill.nome || ""} ${skill.descricao || ""} ${(skill.custos || []).map((c) => c.codigo).join(" ")}`).toLowerCase().includes(query.toLowerCase())), [assigned, query]);

  const activeEffects = useMemo(() => (ficha?.modificadores?.efeitos || []).filter((e) => e.ativo !== false), [ficha?.modificadores?.efeitos]);
  const activeStatusMods = useMemo(() => aggregateStatusModifiers(activeEffects), [activeEffects]);
  const pendingEntries = useMemo(() => assigned.filter(({ entry }) => combate.pendingSkillIds.includes(entry.id)), [assigned, combate.pendingSkillIds]);

  const combatStatus = useMemo(() => {
    const out = {};
    Object.entries(ficha?.status || {}).forEach(([key, data]) => {
      const code = key.toUpperCase();
      const mods = activeStatusMods[code] || { base: 0, current: 0, max: 0 };
      const baseVal = Number(data?.val || 0);
      const baseMax = Math.max(1, Number(data?.max || 1));
      const max = Math.max(1, Math.floor(baseMax + mods.base + mods.max));
      const val = Math.max(0, Math.min(max, Math.floor(baseVal + mods.base + mods.current)));
      out[code] = { baseVal, baseMax, val, max, mods };
    });
    return out;
  }, [ficha?.status, activeStatusMods]);

  const statusDefs = useMemo(() => {
    const all = Object.keys(ficha?.status || {}).map((key) => {
      const up = key.toUpperCase();
      const fromCombate = combate.statusMeta?.[up] || combate.statusMeta?.[key] || {};
      const base = CORE_STATUS_META[up] || {};
      return {
        key,
        code: up,
        label: fromCombate.label || base.label || up,
        cor: fromCombate.cor || base.cor || "#9ca3af",
      };
    });
    all.sort((a, b) => {
      const ia = Object.keys(CORE_STATUS_META).indexOf(a.code);
      const ib = Object.keys(CORE_STATUS_META).indexOf(b.code);
      if (ia === -1 && ib === -1) return a.code.localeCompare(b.code);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return all;
  }, [ficha?.status, combate.statusMeta]);

  const previewCosts = useMemo(() => {
    const sum = {};
    pendingEntries.forEach(({ skill }) => {
      parseSkillCosts(skill).forEach((c) => {
        sum[c.codigo] = (sum[c.codigo] || 0) + c.quantidade;
      });
    });
    return sum;
  }, [pendingEntries]);

  const previewRemainingByResource = useMemo(() => Object.fromEntries(
    (combate.recursos || []).map((r) => [
      r.codigo,
      Math.max(0, Number(r.atual || 0) - Number(previewCosts[r.codigo] || 0)),
    ]),
  ), [combate.recursos, previewCosts]);

  const byResource = new Map((combate.recursos || []).map((r) => [r.codigo, r]));
  const byStatus = new Map(Object.entries(combatStatus || {}).map(([k, v]) => [k.toUpperCase(), v]));
  const resolveCode = (code) => (code === "CONSC" ? "CONS" : code);

  const canCloseRound = Object.entries(previewCosts).every(([rawCode, qtd]) => {
    const code = resolveCode(rawCode);
    const resource = byResource.get(code);
    if (resource) return Number(resource.atual || 0) >= qtd;
    const status = byStatus.get(code);
    if (status) return Number(status.val || 0) >= qtd;
    return false;
  });

  const saveCombate = (patch) => onUpdate({ combate: { ...(ficha.combate || {}), ...patch } });
  const updateResourceById = (id, patch) => saveCombate({ recursos: combate.recursos.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  const toggleSkill = (id) => {
    const list = combate.pendingSkillIds.includes(id)
      ? combate.pendingSkillIds.filter((x) => x !== id)
      : [...combate.pendingSkillIds, id];
    saveCombate({ pendingSkillIds: list });
  };

  const addLog = (mensagem, rodada = combate.rodadaAtual, baseLogs = combate.logs || [], extra = {}) => [{ id: uid(), rodada, mensagem, em: Date.now(), ...extra }, ...baseLogs].slice(0, 220);

  const logViewportRef = useRef(null);
  const groupedLogs = useMemo(() => {
    const asc = [...(combate.logs || [])].reverse();
    const groups = [];
    asc.forEach((log) => {
      const last = groups[groups.length - 1];
      if (!last || last.rodada !== log.rodada) groups.push({ rodada: log.rodada, items: [log] });
      else last.items.push(log);
    });
    return groups;
  }, [combate.logs]);

  useEffect(() => {
    if (!logViewportRef.current) return;
    logViewportRef.current.scrollTop = logViewportRef.current.scrollHeight;
  }, [groupedLogs]);

  const setRound = (nextRound) => saveCombate({ rodadaAtual: Math.max(0, Math.floor(nextRound)) });

  const handleEffectExpiration = (nextRound, baseLogs = combate.logs || []) => {
    const list = ficha?.modificadores?.efeitos || [];
    const expiredNames = [];
    const nextEffects = list.map((ef) => {
      if (ef.ativo === false) return ef;
      const info = durationInfo(ef, nextRound);
      if (!info) return ef;
      if (info.restante <= 0) {
        expiredNames.push(ef.nome || "Efeito");
        return { ...ef, ativo: false };
      }
      return ef;
    });

    if (expiredNames.length > 0) {
      onUpdate({
        modificadores: { ...(ficha.modificadores || {}), efeitos: nextEffects },
        combate: { ...(ficha.combate || {}), logs: expiredNames.reduce((acc, name) => addLog(`Efeito expirou: ${name}`, nextRound, acc), baseLogs) },
      });
      onNotify?.(`Efeito expirou: ${expiredNames.join(", ")}`, "info");
    }
  };

  const closeRound = () => {
    if (!canCloseRound) {
      onNotify?.("Custos excedem os status atuais.", "error");
      return;
    }

    const nextRound = combate.rodadaAtual + 1;
    const nextResources = combate.recursos.map((r) => ({ ...r, atual: Math.max(0, Number(r.total || 0)) }));
    const nextStatus = { ...(ficha.status || {}) };
    const statusLogs = [];
    const resourceLogs = [];

    Object.entries(previewCosts).forEach(([rawCode, qtd]) => {
      const code = resolveCode(rawCode);
      const resource = combate.recursos.find((r) => r.codigo === code);
      if (resource) {
        const prevVal = Number(resource.atual || 0);
        const total = Math.max(0, Number(resource.total || 0));
        const afterSpend = Math.max(0, prevVal - qtd);
        resourceLogs.push({ code, prevVal, afterSpend, spent: qtd, total, maxAfter: total });
        return;
      }
      if (!nextStatus[code]) return;
      const prevVal = Number(nextStatus[code].val || 0);
      const effective = Number(combatStatus[code]?.val ?? prevVal);
      const nextVal = Math.max(0, prevVal - Math.max(0, qtd - Math.max(0, effective - prevVal)));
      nextStatus[code] = { ...nextStatus[code], val: nextVal };
      statusLogs.push({ code, prevVal, nextVal, spent: qtd, max: Number(nextStatus[code]?.max || 1) });
    });

    const usedSkills = pendingEntries.map(({ skill }) => skill.nome || "Skill").join(", ") || "sem skills";
    let nextLogs = addLog(`Rodada ${nextRound} encerrada • Skills: ${usedSkills}.`, nextRound, undefined, { kind: "round" });
    if (resourceLogs.length) nextLogs = addLog("Recursos atualizados.", nextRound, nextLogs, { kind: "resource", changes: resourceLogs });
    else nextLogs = addLog("Recursos resetados para o máximo.", nextRound, nextLogs, { kind: "resource" });
    if (statusLogs.length) nextLogs = addLog("Status atualizados.", nextRound, nextLogs, { kind: "status", changes: statusLogs });

    const remindersTriggered = (combate.lembretes || []).filter((r) => shouldTriggerReminder(r, nextRound, combate.rodadaAtual));
    remindersTriggered.forEach((r) => {
      const msg = `${r.nome || "Lembrete"}: ${r.texto || r.descricao || "Sem descrição"}`;
      nextLogs = addLog(msg, nextRound, nextLogs, { kind: "reminder", reminder: r });
      onNotify?.(`⏰ ${msg}`, "info");
    });

    onUpdate({
      status: nextStatus,
      combate: { ...(ficha.combate || {}), recursos: nextResources, rodadaAtual: nextRound, pendingSkillIds: [], logs: nextLogs },
    });

    handleEffectExpiration(nextRound, nextLogs);
  };

  const resetCombate = () => {
    const resetResources = combate.recursos.map((r) => ({ ...r, atual: Number(r.total || 0) }));
    saveCombate({ rodadaAtual: 0, pendingSkillIds: [], recursos: resetResources, logs: [] });
    onNotify?.("Combate resetado (rodada, seleção e logs).", "success");
  };

  const togglePip = (resource, idx) => {
    const next = idx < Number(resource.atual || 0) ? idx : idx + 1;
    updateResourceById(resource.id, { atual: Math.max(0, Math.min(Number(resource.total || 0), next)) });
  };

  const setStatusValue = (key, field, value) => {
    const curr = ficha?.status?.[key] || { val: 0, max: 1 };
    const patch = { ...curr, [field]: value };
    if (field === "max") patch.val = Math.min(Number(patch.val || 0), Number(value || 1));
    if (field === "val") patch.val = Math.max(0, Math.min(Number(value || 0), Number(curr.max || 1)));
    onUpdate({ status: { ...(ficha.status || {}), [key]: patch } });
  };

  const addReminder = () => {
    const next = [{ id: uid(), nome: "Novo lembrete", descricao: "", texto: "", modo: "naRodada", rodadaAlvo: combate.rodadaAtual + 1, aCada: 1, emX: 1 }, ...(combate.lembretes || [])];
    saveCombate({ lembretes: next });
  };

  const removeResource = (id) => {
    const target = combate.recursos.find((r) => r.id === id);
    if (!target) return;
    if (!window.confirm(`Apagar recurso ${target.codigo}?`)) return;
    saveCombate({ recursos: combate.recursos.filter((r) => r.id !== id) });
    setResourceModal(null);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "330px 1fr 390px", gap: 12, height: "100%" }}>
      <style>{`
        .combat-card { border:1px solid ${G.border}; border-radius:12px; background:linear-gradient(180deg,#13100c,#0c0906); box-shadow:0 8px 30px rgba(0,0,0,.18); transition:transform .25s ease, box-shadow .25s ease, border-color .25s ease; }
        .combat-card:hover { transform: translateY(-2px); box-shadow:0 12px 32px rgba(0,0,0,.28); border-color:#7d6236; }
        .resource-group:hover { border-color:#8a6e3e !important; transform:translateY(-1px) scale(1.01); }
        .skill-row:hover { border-color:#96713a !important; transform:translateY(-1px) scale(1.01); }
        .combat-log-item { border:1px solid #3e2f1d; border-radius:8px; padding:6px; background:linear-gradient(90deg,rgba(46,32,18,.7),rgba(16,12,8,.7)); animation:logEnter .25s ease; }
        .combat-log-item:hover { border-color:#8b6a3a; background:linear-gradient(90deg,rgba(68,47,24,.75),rgba(27,19,12,.75)); }
        .status-fill { transition: width .35s ease, filter .25s ease; animation: statusGlow 1.9s ease-in-out infinite; }
        .status-card:hover .status-fill { filter: brightness(1.2); }
        .round-chip { animation:roundPulse 1.6s ease-in-out infinite; }
        @keyframes resourcePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        @keyframes resourceSpend { 0%,100% { transform: scale(1); filter: hue-rotate(0deg); } 50% { transform: scale(1.14); filter: hue-rotate(-25deg) brightness(1.2); } }
        @keyframes statusGlow { 0%,100% { box-shadow:0 0 0 rgba(255,255,255,0); } 50% { box-shadow:0 0 8px rgba(255,255,255,.45); } }
        @keyframes roundPulse { 0%,100% { text-shadow:0 0 0 rgba(255,220,160,.0); } 50% { text-shadow:0 0 12px rgba(255,220,160,.45); } }
        @keyframes logEnter { from { opacity:0; transform:translateY(3px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div className="combat-card" style={{ padding: 10, display: "grid", gridTemplateRows: "auto auto 1fr auto" }}>
        <div style={{ fontFamily: "'Cinzel',serif", color: G.gold, fontSize: 13, letterSpacing: 2 }}>Rodadas</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "8px 0 10px" }}>
          <HoverButton onClick={() => setRound(combate.rodadaAtual - 1)} style={btnStyle({ padding: "4px 8px" })}>◀</HoverButton>
          <div className="round-chip" style={{ color: "#d7c7aa", fontFamily: "monospace", fontSize: 18 }}>R{combate.rodadaAtual}</div>
          <HoverButton onClick={() => setRound(combate.rodadaAtual + 1)} style={btnStyle({ padding: "4px 8px" })}>▶</HoverButton>
        </div>
        <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
          <HoverButton style={btnStyle()} onClick={closeRound}>Próxima rodada (gastar + recarregar)</HoverButton>
          <div style={{ display: "flex", gap: 6 }}>
            <HoverButton style={btnStyle({ flex: 1, borderColor: "#6b5b35", color: "#d7c193" })} onClick={() => setRemindersOpen(true)}>Lembretes</HoverButton>
            <HoverButton style={btnStyle({ flex: 1, borderColor: "#55739a", color: "#9dcbff" })} onClick={() => setEffectsOpen(true)}>Efeitos</HoverButton>
            <HoverButton style={btnStyle({ borderColor: "#794940", color: "#ff9d90" })} onClick={resetCombate}>Resetar</HoverButton>
          </div>
        </div>

        <div style={{ border: "1px solid #3f3121", borderRadius: 8, padding: 8, background: "#0d0a07", overflow: "auto" }}>
          <div style={{ color: "#c8b188", fontFamily: "monospace", fontSize: 11, marginBottom: 6 }}>Efeitos ativos</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {activeEffects.map((ef) => {
              const dur = durationInfo(ef, combate.rodadaAtual);
              const src = effectIconSrc(ef);
              return (
                <button
                  key={ef.id}
                  title={`${ef.nome || "Efeito"}${dur ? ` · restante: ${dur.restante}/${dur.total}` : ""}`}
                  onClick={() => setEffectDetail(ef)}
                  style={{ width: 38, height: 38, borderRadius: 8, border: "1px solid #5f4f31", background: "#1a130b", color: "#f2ddb8", cursor: "pointer", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0 }}
                >
                  {src ? <ImageViewport src={src} alt={ef.nome || "Efeito"} size={34} radius={6} adjust={ef.iconeAjuste} /> : (ef.icone || (ef.nome || "E").slice(0, 1).toUpperCase())}
                </button>
              );
            })}
            {activeEffects.length === 0 && <span style={{ color: G.muted, fontSize: 11, fontFamily: "monospace" }}>Sem efeitos ativos.</span>}
          </div>
        </div>

        <div ref={logViewportRef} style={{ marginTop: 10, border: "1px solid #3f3121", borderRadius: 8, padding: 8, background: "#0d0a07", minHeight: 120, maxHeight: 260, overflow: "auto" }}>
          <div style={{ color: "#c8b188", fontFamily: "monospace", fontSize: 11, marginBottom: 6 }}>Linha do tempo da luta</div>
          {groupedLogs.map((group) => (
            <div key={`rod-${group.rodada}`} style={{ marginBottom: 8 }}>
              <div style={{ color: "#e0bd84", fontFamily: "'Cinzel',serif", fontSize: 12, marginBottom: 4, borderBottom: "1px dashed #5d4728" }}>Rodada {group.rodada}</div>
              {group.items.map((log) => (
                <button key={log.id} className="combat-log-item" onClick={() => setLogDetail(log)} style={{ textAlign: "left", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#bca57a", fontFamily: "monospace", fontSize: 10 }}>
                    <span>{log.kind === "resource" ? "Recursos" : log.kind === "status" ? "Status" : "Evento"}</span>
                    <span>{new Date(log.em || Date.now()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                  </div>
                  <div style={{ color: "#e7d8bf", fontFamily: "monospace", fontSize: 11 }}>{log.mensagem}</div>
                  {Array.isArray(log.changes) && log.kind === "status" && (
                    <div style={{ marginTop: 4, display: "grid", gap: 4 }}>
                      {log.changes.map((it, i) => {
                        const before = Math.max(1, Number(it.max || 1));
                        const p1 = Math.max(0, Math.min(100, (Number(it.prevVal || 0) / before) * 100));
                        const p2 = Math.max(0, Math.min(100, (Number(it.nextVal || 0) / before) * 100));
                        return <div key={`${log.id}-s-${i}`}><div style={{ color: "#a8b8cf", fontSize: 10, fontFamily: "monospace" }}>{it.code}: {it.prevVal}→{it.nextVal}</div><div style={{ height: 5, borderRadius: 3, background: "#2a2116" }}><div style={{ width: `${p1}%`, height: "100%", background: "#6aa5ff55", borderRadius: 3 }} /></div><div style={{ marginTop: 1, height: 5, borderRadius: 3, background: "#2a2116" }}><div style={{ width: `${p2}%`, height: "100%", background: "#6aa5ff", borderRadius: 3, transition: "width .3s" }} /></div></div>;
                      })}
                    </div>
                  )}
                  {Array.isArray(log.changes) && log.kind === "resource" && (
                    <div style={{ marginTop: 4, display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {log.changes.map((it, i) => <span key={`${log.id}-r-${i}`} style={{ color: "#9fd39f", fontFamily: "monospace", fontSize: 10 }}>{it.code}: -{it.spent} ↺ {it.maxAfter}</span>)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ))}
          {groupedLogs.length === 0 && <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 11 }}>Sem eventos recentes.</div>}
        </div>
      </div>

      <div className="combat-card" style={{ padding: 10, display: "grid", gridTemplateRows: "auto auto 1fr" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8, marginBottom: 10 }}>
          {statusDefs.map((st) => {
            const status = combatStatus[st.code] || { val: 0, max: 1 };
            const pct = Math.max(0, Math.min(100, (Number(status.val || 0) / Math.max(1, Number(status.max || 1))) * 100));
            const spendPreview = previewCosts[st.code] || previewCosts[st.label] || 0;
            const previewVal = Math.max(0, Number(status.val || 0) - spendPreview);
            const previewPct = Math.max(0, Math.min(100, (previewVal / Math.max(1, Number(status.max || 1))) * 100));
            return (
              <button className="status-card" key={st.key} onClick={() => setStatusModal(st)} style={{ border: "1px solid #52422b", borderRadius: 8, background: "#0d0a07", padding: 6, textAlign: "left", cursor: "pointer", transition: "all .2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: st.cor, fontFamily: "monospace", fontSize: 11 }}>
                  <span>{st.label}</span>
                  <span>{status.val}/{status.max}</span>
                </div>
                <div style={{ height: 7, borderRadius: 4, background: "#221a12", margin: "5px 0", overflow: "hidden" }}><div className="status-fill" style={{ width: `${pct}%`, height: "100%", background: st.cor, borderRadius: 4 }} /></div>
                {spendPreview > 0 && <div style={{ height: 5, borderRadius: 4, background: "#221a12", overflow: "hidden" }}><div className="status-fill" style={{ width: `${previewPct}%`, height: "100%", background: `${st.cor}aa`, borderRadius: 4 }} /></div>}
                <div style={{ display: "flex", justifyContent: "space-between", color: G.muted, fontFamily: "monospace", fontSize: 10 }}>
                  <span>Toque para editar</span>
                  {spendPreview > 0 ? <span style={{ color: "#ff9f9f" }}>- {spendPreview}</span> : <span>—</span>}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ border: "1px solid #52422b", borderRadius: 8, background: "#0d0a07", padding: 8, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ color: G.gold, fontFamily: "'Cinzel',serif", fontSize: 12 }}>Recursos (toque para painel mobile)</div>
            <HoverButton style={btnStyle({ padding: "4px 8px", borderColor: "#695532", color: "#e2c38a" })} onClick={() => setSettingsOpen(true)}>Configurações</HoverButton>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8 }}>
            {(combate.recursos || []).map((r) => {
              const spendPreview = previewCosts[r.codigo] || 0;
              const previewRemaining = previewRemainingByResource[r.codigo] ?? Number(r.atual || 0);
              return (
                <button key={r.id} className="resource-group" onClick={() => setResourceModal(r)} style={{ border: "1px solid #4f4028", borderRadius: 9, padding: 7, transition: "all .2s", background: "transparent", textAlign: "left", cursor: "pointer" }}>
                  <div style={{ color: "#e7d5b1", fontFamily: "monospace", fontSize: 11, marginBottom: 5, display: "flex", justifyContent: "space-between" }}>
                    <span>{r.codigo}</span>
                    <span style={{ color: G.muted }}>{r.atual}/{r.total}{spendPreview > 0 ? ` · gasto previsto ${spendPreview}` : ""}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, minHeight: 20, alignItems: "center", flexWrap: "wrap" }}>
                    {Array.from({ length: Number(r.total || 0) }).map((_, idx) => (
                      <ResourcePip
                        key={`${r.id}-${idx}`}
                        color={r.cor}
                        active={idx < Number(r.atual || 0)}
                        willSpend={spendPreview > 0 && idx >= previewRemaining && idx < Number(r.atual || 0)}
                        shape={r.shape || "square"}
                        title={`${r.codigo} ${idx + 1}/${r.total}`}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePip(r, idx); }}
                      />
                    ))}
                    {Number(r.total || 0) === 0 && <span style={{ color: G.muted, fontFamily: "monospace", fontSize: 10 }}>Defina em configurações</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ border: "1px solid #52422b", borderRadius: 8, background: "#0d0a07", padding: 8 }}>
          <div style={{ color: "#d6bb89", fontFamily: "monospace", fontSize: 11, marginBottom: 6 }}>Prévia de custos selecionados</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            {Object.entries(previewCosts).map(([code, val]) => {
              const sample = pendingEntries.map((p) => p.skill).find((s) => (s?.custos || []).some((c) => String(c.codigo || "").toUpperCase() === code));
              const st = resolveCostStyle(sample, code);
              return <span key={code} style={{ padding: "2px 8px", borderRadius: 999, background: st.bg, color: st.fg, fontFamily: "monospace", fontSize: 11 }}>{val}{code}</span>;
            })}
            {Object.keys(previewCosts).length === 0 && <span style={{ color: G.muted, fontFamily: "monospace", fontSize: 11 }}>Nenhum custo selecionado.</span>}
          </div>
          <div style={{ color: canCloseRound ? "#8ef7a9" : "#ff8f8f", fontFamily: "monospace", fontSize: 11 }}>{canCloseRound ? "Pronto para avançar rodada." : "Custos inválidos para rodada atual."}</div>
          {activeEffects.length > 0 && <div style={{ color: "#9cc8ff", fontFamily: "monospace", fontSize: 10, marginTop: 4 }}>Efeitos ativos aplicados aos status: {activeEffects.length}</div>}
        </div>
      </div>

      <div className="combat-card" style={{ padding: 10, display: "grid", gridTemplateRows: "auto 1fr" }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ color: G.gold, fontFamily: "'Cinzel',serif", fontSize: 13 }}>Skills atribuídas</div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar skill..." style={inpStyle({ marginTop: 6 })} />
        </div>

        <div style={{ overflow: "auto", display: "grid", gap: 7 }}>
          {filteredSkills.map(({ entry, skill }) => {
            const selected = combate.pendingSkillIds.includes(entry.id);
            const costs = parseSkillCosts(skill);
            const src = skillIconSrc(skill);
            const rankCor = RANK_COR[skill.rank] || skill.cor || "#93a6bf";
            return (
              <button key={entry.id} className="skill-row" onClick={() => toggleSkill(entry.id)} style={{ border: `1px solid ${selected ? "#9f7a3a" : "#443621"}`, borderRadius: 10, padding: 8, background: selected ? "#231a10" : "#0d0a07", transition: "all .2s", textAlign: "left", cursor: "pointer" }}>
                <div style={{ display: "grid", gridTemplateColumns: "44px 1fr auto", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 8, border: "1px solid #6b5431", display: "grid", placeItems: "center", background: "#1d1409", overflow: "hidden" }}>
                    {src ? <ImageViewport src={src} alt={skill?.nome || "Skill"} size={40} radius={6} adjust={skill?.iconeAjuste} /> : <span style={{ fontSize: 18 }}>{skill?.icone || "?"}</span>}
                  </div>
                  <div>
                    <div style={{ color: "#f1dfbe", fontFamily: "'Cinzel',serif", fontSize: 12 }}>{selected ? "✓ " : ""}{skill.nome || "Skill"}</div>
                    <div style={{ color: rankCor, fontFamily: "monospace", fontSize: 10 }}>{skill.rank || "Sem rank"}</div>
                  </div>
                  <HoverButton style={btnStyle({ padding: "2px 7px", borderColor: "#6f5a34", color: "#d8bf8b" })} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSkillModal(skill); }}>Detalhes</HoverButton>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                  {(skill.tagIds || []).slice(0, 4).map((id) => tagsById[id]).filter(Boolean).map((tag) => (
                    <span key={tag.id} style={{ padding: "2px 8px", borderRadius: 999, background: tag.cor, color: "#fff", fontFamily: "monospace", fontSize: 10 }}>{tag.nome}</span>
                  ))}
                  {(skill.tagIds || []).length === 0 && <span style={{ color: G.muted, fontFamily: "monospace", fontSize: 10 }}>Sem tags</span>}
                </div>

                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                  {costs.map((c) => {
                    const st = resolveCostStyle(skill, c.codigo);
                    return <span key={`${entry.id}-${c.codigo}`} style={{ fontSize: 10, fontFamily: "monospace", padding: "2px 7px", borderRadius: 999, background: st.bg, color: st.fg }}>{c.quantidade}{c.codigo}</span>;
                  })}
                  {costs.length === 0 && <span style={{ color: G.muted, fontFamily: "monospace", fontSize: 10 }}>Sem custo</span>}
                </div>
              </button>
            );
          })}
          {filteredSkills.length === 0 && <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 12 }}>Nenhuma skill encontrada.</div>}
        </div>
      </div>

      {settingsOpen && <SettingsModal
        combate={combate}
        statusDefs={statusDefs}
        ficha={ficha}
        onClose={() => setSettingsOpen(false)}
        onSave={(payload) => {
          onUpdate({
            combate: { ...(ficha.combate || {}), recursos: payload.recursos, statusMeta: payload.statusMeta },
            status: payload.status,
          });
        }}
      />}

      {effectsOpen && <EffectsModal
        efeitos={ficha?.modificadores?.efeitos || []}
        biblioteca={efeitosCaldeirao || []}
        rodadaAtual={combate.rodadaAtual}
        onClose={() => setEffectsOpen(false)}
        onChange={(next) => onUpdate({ modificadores: { ...(ficha.modificadores || {}), efeitos: next } })}
      />}

      {remindersOpen && <RemindersModal lembretes={combate.lembretes || []} rodadaAtual={combate.rodadaAtual} onClose={() => setRemindersOpen(false)} onChange={(next) => saveCombate({ lembretes: next })} onAdd={addReminder} />}

      {resourceModal && (
        <ResourceQuickModal
          resource={combate.recursos.find((r) => r.id === resourceModal.id) || resourceModal}
          previewCost={previewCosts[resourceModal.codigo] || 0}
          onClose={() => setResourceModal(null)}
          onToggle={(idx) => {
            const current = combate.recursos.find((r) => r.id === resourceModal.id);
            if (!current) return;
            togglePip(current, idx);
          }}
          onDelete={() => removeResource(resourceModal.id)}
        />
      )}

      {statusModal && (
        <StatusQuickModal
          status={ficha?.status?.[statusModal.key] || { val: 0, max: 1 }}
          statusDef={statusModal}
          previewCost={(previewCosts[statusModal.code] || previewCosts[statusModal.label] || 0)}
          onClose={() => setStatusModal(null)}
          onApply={(next) => setStatusValue(statusModal.key, "val", next.val)}
          onSetMax={(nextMax) => setStatusValue(statusModal.key, "max", nextMax)}
          onDelete={() => {
            if (!window.confirm(`Apagar status ${statusModal.label || statusModal.code}?`)) return;
            const nextStatus = { ...(ficha.status || {}) };
            const nextMeta = { ...(combate.statusMeta || {}) };
            delete nextStatus[statusModal.key];
            delete nextMeta[statusModal.code];
            onUpdate({ status: nextStatus, combate: { ...(ficha.combate || {}), statusMeta: nextMeta } });
            setStatusModal(null);
          }}
        />
      )}

      {logDetail && <Modal title={`Log R${logDetail.rodada}`} onClose={() => setLogDetail(null)}><div style={{ display: "grid", gap: 8 }}><div style={{ color: "#f2dfbe", fontFamily: "monospace" }}>{logDetail.mensagem}</div><pre style={{ margin:0, whiteSpace:"pre-wrap", color:"#b7c6dd", fontFamily:"monospace", fontSize:11 }}>{JSON.stringify(logDetail, null, 2)}</pre></div></Modal>}
      {effectDetail && <EffectDetailsModal effect={effectDetail} onClose={() => setEffectDetail(null)} />}
      {skillModal && <Modal title={`Skill: ${skillModal.nome || "Sem nome"}`} onClose={() => setSkillModal(null)} wide><SkillDetalhe skill={skillModal} tagsById={tagsById} /></Modal>}
    </div>
  );
}

function ResourceQuickModal({ resource, previewCost, onClose, onToggle, onDelete }) {
  if (!resource) return null;
  return (
    <Modal title={`Recurso: ${resource.codigo}`} onClose={onClose}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 11 }}>Toque nos ícones para gastar/restaurar. Prévia de gasto da rodada: {previewCost > 0 ? `-${previewCost}` : "—"}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", alignItems: "center", padding: "6px 0" }}>
          {Array.from({ length: Number(resource.total || 0) }).map((_, idx) => (
            <ResourcePip
              key={`${resource.id}-${idx}`}
                            color={resource.cor}
              active={idx < Number(resource.atual || 0)}
              shape={resource.shape || "square"}
              title={`${resource.codigo} ${idx + 1}/${resource.total}`}
              onClick={() => onToggle(idx)}
            />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#e7d5b1", fontFamily: "monospace" }}>{resource.atual}/{resource.total}</span>
          <HoverButton onClick={onDelete} style={btnStyle({ borderColor: "#87413a", color: "#ff9990" })}>Apagar</HoverButton>
        </div>
      </div>
    </Modal>
  );
}

function StatusQuickModal({ status, statusDef, previewCost, onClose, onApply, onSetMax, onDelete }) {
  const [val, setVal] = useState(Number(status?.val || 0));
  const [max, setMax] = useState(Math.max(1, Number(status?.max || 1)));
  const [delta, setDelta] = useState(0);
  const [mode, setMode] = useState("gastar");

  const applyDelta = () => {
    const amount = Math.abs(Number(delta || 0));
    const next = mode === "gastar" ? val - amount : val + amount;
    setVal(Math.max(0, Math.min(max, next)));
  };

  return (
    <Modal title={`Status: ${statusDef?.label || statusDef?.code || "STATUS"}`} onClose={onClose}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 11 }}>Prévia de gasto por skills selecionadas: {previewCost > 0 ? `-${previewCost}` : "—"}</div>
        <input type="range" min={0} max={Math.max(1, max)} value={Math.max(0, Math.min(max, val))} onChange={(e) => setVal(Number(e.target.value) || 0)} style={{ width: "100%", accentColor: statusDef?.cor || "#999" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <div>
            <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 11, marginBottom: 4 }}>Atual</div>
            <input type="number" min={0} max={max} value={val} onChange={(e) => setVal(Math.max(0, Math.min(max, Number(e.target.value) || 0)))} style={inpStyle()} />
          </div>
          <div>
            <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 11, marginBottom: 4 }}>Máximo</div>
            <input type="number" min={1} value={max} onChange={(e) => setMax(Math.max(1, Number(e.target.value) || 1))} style={inpStyle()} />
          </div>
        </div>

        <div style={{ border: "1px solid #3b2f1e", borderRadius: 8, padding: 8 }}>
          <div style={{ color: G.gold, fontFamily: "'Cinzel',serif", fontSize: 12, marginBottom: 6 }}>Gastar / Recuperar rápido</div>
          <div style={{ display: "grid", gridTemplateColumns: "110px 1fr auto", gap: 6 }}>
            <select value={mode} onChange={(e) => setMode(e.target.value)} style={inpStyle()}><option value="gastar">Gastar</option><option value="recuperar">Recuperar</option></select>
            <input type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value) || 0)} style={inpStyle()} />
            <HoverButton onClick={applyDelta} style={btnStyle({ padding: "4px 10px" })}>Aplicar</HoverButton>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <HoverButton onClick={onDelete} style={btnStyle({ borderColor: "#87413a", color: "#ff9990" })}>Apagar</HoverButton>
          <div style={{ display: "flex", gap: 8 }}>
            <HoverButton onClick={onClose} style={btnStyle({ borderColor: "#4f4f4f", color: "#b8b8b8" })}>Fechar</HoverButton>
            <HoverButton onClick={() => { onSetMax(max); onApply({ val: Math.max(0, Math.min(max, val)) }); onClose(); }} style={btnStyle()}>Salvar</HoverButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function SettingsModal({ combate, statusDefs, ficha, onClose, onSave }) {
  const [list, setList] = useState(combate.recursos || []);
  const [statusMeta, setStatusMeta] = useState(combate.statusMeta || {});
  const [statusState, setStatusState] = useState(ficha?.status || {});
  const [resourceDraft, setResourceDraft] = useState({ codigo: "", nome: "", cor: "#e0b44c", shape: "square", total: 1, atual: 1 });
  const [statusDraft, setStatusDraft] = useState({ codigo: "DET", label: "Determinação", cor: "#8dc2ff", val: 10, max: 10 });

  const formulaVars = useMemo(() => buildFormulaVars(ficha, statusState), [ficha, statusState]);
  const formulaSuggestions = useMemo(() => Object.keys(formulaVars).sort(), [formulaVars]);

  const applyStatusFormula = (code, nextMeta) => {
    const key = statusDefs.find((s) => s.code === code)?.key || code;
    const current = { ...(statusState[key] || { val: 0, max: 1 }) };
    const vars = buildFormulaVars(ficha, statusState);
    const x = evaluateStatusFormula(nextMeta.maxFormula, { vars }) ?? Number(current.max || 1);
    const max = Math.max(1, Math.floor(x));
    const valExpr = evaluateStatusFormula(nextMeta.valFormula, { vars, x: max });
    const val = Math.max(0, Math.min(max, Math.floor(valExpr ?? Number(current.val || 0))));
    setStatusState((p) => ({ ...p, [key]: { ...(p[key] || {}), max, val } }));
  };

  return (
    <Modal title="Configurações de Combate" onClose={onClose} wide>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ border: "1px solid #3d2f1f", borderRadius: 8, padding: 10 }}>
          <div style={{ color: G.gold, marginBottom: 6, fontFamily: "'Cinzel',serif" }}>Recurso personalizado</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 140px 90px 90px auto", gap: 6 }}>
            <input value={resourceDraft.codigo} onChange={(e) => setResourceDraft((p) => ({ ...p, codigo: e.target.value.toUpperCase() }))} placeholder="Código" style={inpStyle()} />
            <input value={resourceDraft.nome} onChange={(e) => setResourceDraft((p) => ({ ...p, nome: e.target.value }))} placeholder="Nome" style={inpStyle()} />
            <input type="color" value={resourceDraft.cor} onChange={(e) => setResourceDraft((p) => ({ ...p, cor: e.target.value }))} style={inpStyle({ padding: 2 })} />
            <select value={resourceDraft.shape} onChange={(e) => setResourceDraft((p) => ({ ...p, shape: e.target.value }))} style={inpStyle()}>{SHAPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
            <input type="number" min={0} value={resourceDraft.atual} onChange={(e) => setResourceDraft((p) => ({ ...p, atual: Number(e.target.value) || 0 }))} style={inpStyle()} />
            <input type="number" min={0} value={resourceDraft.total} onChange={(e) => setResourceDraft((p) => ({ ...p, total: Number(e.target.value) || 0 }))} style={inpStyle()} />
            <HoverButton onClick={() => {
              if (!resourceDraft.codigo.trim()) return;
              setList((prev) => [...prev, { id: uid(), ...resourceDraft }]);
              setResourceDraft({ codigo: "", nome: "", cor: "#e0b44c", shape: "square", total: 1, atual: 1 });
            }} style={btnStyle()}>Adicionar</HoverButton>
          </div>
        </div>

        <div style={{ border: "1px solid #3d2f1f", borderRadius: 8, padding: 10 }}>
          <div style={{ color: G.gold, marginBottom: 6, fontFamily: "'Cinzel',serif" }}>Barras de status (nome/cor + valores)</div>
          <div style={{ display: "grid", gap: 6, maxHeight: 230, overflow: "auto" }}>
            {statusDefs.map((s) => {
              const meta = statusMeta[s.code] || { label: s.label, cor: s.cor };
              const st = statusState[s.key] || { val: 0, max: 1 };
              return (
                <div key={s.key} style={{ display: "grid", gridTemplateColumns: "120px 1fr 90px 90px 60px", gap: 6 }}>
                  <input value={s.code} disabled style={inpStyle({ opacity: .65 })} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 46px", gap: 6 }}>
                    <input value={meta.label || s.label} onChange={(e) => setStatusMeta((p) => ({ ...p, [s.code]: { ...(p[s.code] || {}), label: e.target.value, cor: (p[s.code]?.cor || s.cor) } }))} style={inpStyle()} />
                    <input type="color" value={meta.cor || s.cor} onChange={(e) => setStatusMeta((p) => ({ ...p, [s.code]: { ...(p[s.code] || {}), label: (p[s.code]?.label || s.label), cor: e.target.value } }))} style={inpStyle({ padding: 2 })} />
                  </div>
                  <input type="number" value={st.val} onChange={(e) => setStatusState((p) => ({ ...p, [s.key]: { ...(p[s.key] || { val: 0, max: 1 }), val: Number(e.target.value) || 0 } }))} style={inpStyle()} />
                  <input type="number" value={st.max} onChange={(e) => setStatusState((p) => ({ ...p, [s.key]: { ...(p[s.key] || { val: 0, max: 1 }), max: Math.max(1, Number(e.target.value) || 1) } }))} style={inpStyle()} />
                  <span style={{ color: G.muted, fontFamily: "monospace", fontSize: 11, alignSelf: "center" }}>{s.code}</span>
                  <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, background: "#12100c", border: "1px solid #3f3121", borderRadius: 8, padding: 6 }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:6 }}><FormulaInput
                      value={meta.maxFormula || ""}
                      onChange={(val) => { const metaNext = { ...(statusMeta[s.code] || {}), maxFormula: val, valFormula: (statusMeta[s.code]?.valFormula || "") }; setStatusMeta((p) => ({ ...p, [s.code]: metaNext })); applyStatusFormula(s.code, metaNext); }}
                      suggestions={formulaSuggestions}
                      placeholder="MAX: ex ((vigor / 2) * (vit / 6) + 1) + (vontade * (mentalidade * 4))"
                    /><HoverButton onClick={() => { const roll = parseDurationRounds({ duracaoExpressao: meta.maxFormula || "" }); if (roll > 0) setStatusState((p) => ({ ...p, [s.key]: { ...(p[s.key] || {}), max: roll, val: Math.min(roll, Number(p[s.key]?.val || 0)) } })); }} style={btnStyle({ padding:"4px 8px", borderColor:"#6a5a33", color:"#e3c88f" })}>🎲</HoverButton></div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:6 }}><FormulaInput
                      value={meta.valFormula || ""}
                      onChange={(val) => { const metaNext = { ...(statusMeta[s.code] || {}), valFormula: val, maxFormula: (statusMeta[s.code]?.maxFormula || "") }; setStatusMeta((p) => ({ ...p, [s.code]: metaNext })); applyStatusFormula(s.code, metaNext); }}
                      suggestions={formulaSuggestions}
                      placeholder="ATUAL: ex ((vit / 2) + x)"
                    /><HoverButton onClick={() => { const roll = parseDurationRounds({ duracaoExpressao: meta.valFormula || "" }); if (roll > 0) setStatusState((p) => ({ ...p, [s.key]: { ...(p[s.key] || {}), val: Math.max(0, Math.min(Number(p[s.key]?.max || 1), roll)) } })); }} style={btnStyle({ padding:"4px 8px", borderColor:"#6a5a33", color:"#e3c88f" })}>🎲</HoverButton></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 8, borderTop: "1px solid #3d2f1f", paddingTop: 8 }}>
            <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 11, marginBottom: 6 }}>Adicionar nova barra</div>
            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 56px 80px 80px auto", gap: 6 }}>
              <input value={statusDraft.codigo} onChange={(e) => setStatusDraft((p) => ({ ...p, codigo: e.target.value.toUpperCase() }))} style={inpStyle()} placeholder="Cód" />
              <input value={statusDraft.label} onChange={(e) => setStatusDraft((p) => ({ ...p, label: e.target.value }))} style={inpStyle()} placeholder="Nome" />
              <input type="color" value={statusDraft.cor} onChange={(e) => setStatusDraft((p) => ({ ...p, cor: e.target.value }))} style={inpStyle({ padding: 2 })} />
              <input type="number" value={statusDraft.val} onChange={(e) => setStatusDraft((p) => ({ ...p, val: Number(e.target.value) || 0 }))} style={inpStyle()} />
              <input type="number" value={statusDraft.max} onChange={(e) => setStatusDraft((p) => ({ ...p, max: Math.max(1, Number(e.target.value) || 1) }))} style={inpStyle()} />
              <HoverButton onClick={() => {
                const key = statusDraft.codigo.trim().toUpperCase();
                if (!key) return;
                setStatusState((p) => ({ ...p, [key]: { val: statusDraft.val, max: statusDraft.max } }));
                setStatusMeta((p) => ({ ...p, [key]: { label: statusDraft.label || key, cor: statusDraft.cor } }));
              }} style={btnStyle({ borderColor: "#4e7c59", color: "#98e7ad" })}>Adicionar</HoverButton>
            </div>
          </div>
        </div>

        <div style={{ maxHeight: 260, overflow: "auto", display: "grid", gap: 4 }}>
          {list.map((r) => (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 90px 90px 90px auto", gap: 6 }}>
              <input value={r.codigo} onChange={(e) => setList((prev) => prev.map((x) => x.id === r.id ? { ...x, codigo: e.target.value.toUpperCase() } : x))} style={inpStyle()} />
              <input value={r.nome} onChange={(e) => setList((prev) => prev.map((x) => x.id === r.id ? { ...x, nome: e.target.value } : x))} style={inpStyle()} />
              <input type="color" value={r.cor} onChange={(e) => setList((prev) => prev.map((x) => x.id === r.id ? { ...x, cor: e.target.value } : x))} style={inpStyle({ padding: 2 })} />
              <select value={r.shape || "square"} onChange={(e) => setList((prev) => prev.map((x) => x.id === r.id ? { ...x, shape: e.target.value } : x))} style={inpStyle()}>{SHAPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
              <input type="number" min={0} value={r.atual} onChange={(e) => setList((prev) => prev.map((x) => x.id === r.id ? { ...x, atual: Number(e.target.value) || 0 } : x))} style={inpStyle()} />
              <input type="number" min={0} value={r.total} onChange={(e) => setList((prev) => prev.map((x) => x.id === r.id ? { ...x, total: Number(e.target.value) || 0 } : x))} style={inpStyle()} />
              <HoverButton onClick={() => setList((prev) => prev.filter((x) => x.id !== r.id))} style={btnStyle({ borderColor: "#87413a", color: "#ff9990" })}>✕</HoverButton>
            </div>
          ))}
        </div>

        <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 10 }}>Autocomplete: ↑/↓ navega, Enter completa variável (VIG, FOR, est, laminas_grandes...).</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <HoverButton onClick={onClose} style={btnStyle({ borderColor: "#4f4f4f", color: "#b8b8b8" })}>Fechar</HoverButton>
          <HoverButton onClick={() => { onSave({ recursos: list, statusMeta, status: statusState }); onClose(); }} style={btnStyle()}>Salvar</HoverButton>
        </div>
      </div>
    </Modal>
  );
}

function EffectsModal({ efeitos, biblioteca, rodadaAtual, onClose, onChange }) {
  const [query, setQuery] = useState("");
  const [selectedLib, setSelectedLib] = useState("");
  const [inspect, setInspect] = useState(null);

  const filteredLib = useMemo(() => (biblioteca || []).filter((ef) => `${ef.nome || ""} ${ef.descricao || ""} ${getMechanicalText(ef)}`.toLowerCase().includes(query.toLowerCase())), [biblioteca, query]);

  const attach = () => {
    const tpl = (biblioteca || []).find((x) => x.id === selectedLib);
    if (!tpl) return;
    const duracaoBase = String(tpl.duracaoExpressao || tpl.duracao || "").trim();
    const duracaoRolada = parseDurationRounds({ duracaoExpressao: duracaoBase || "0" });
    const mecanico = getMechanicalText(tpl);
    const inst = instantiateEffectFromTemplate(tpl, {
      rodadaInicio: rodadaAtual,
      ativo: true,
      origem: "Efeito",
      origemDetalhe: tpl.nome || "Caldeirão",
      duracaoExpressao: duracaoBase,
      duracaoRolada,
      efeitoMecanico: mecanico,
      efeitosMecanicos: Array.isArray(tpl?.efeitosMecanicos) ? tpl.efeitosMecanicos : [],
    });
    onChange([inst, ...(efeitos || [])]);
  };

  return (
    <Modal title="Efeitos de Combate" onClose={onClose} wide>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ border: "1px solid #2f2f2f", borderRadius: 8, padding: 8 }}>
          <div style={{ color: G.gold, fontFamily: "'Cinzel',serif", marginBottom: 6 }}>Biblioteca (filtro e anexar)</div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar efeito..." style={inpStyle({ marginBottom: 6 })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, marginBottom: 8 }}>
            <select value={selectedLib} onChange={(e) => setSelectedLib(e.target.value)} style={inpStyle()}>
              <option value="">Selecionar...</option>
              {filteredLib.map((ef) => <option key={ef.id} value={ef.id}>{ef.nome || "Sem nome"}</option>)}
            </select>
            <HoverButton onClick={attach} disabled={!selectedLib} style={btnStyle({ padding: "4px 10px" })}>Anexar</HoverButton>
          </div>
          <div style={{ maxHeight: 260, overflow: "auto", display: "grid", gap: 6 }}>
            {filteredLib.map((ef) => (
              <div key={ef.id} style={{ border: `1px solid ${selectedLib === ef.id ? "#8f6f3d" : "#333"}`, borderRadius: 7, padding: 6, cursor: "pointer" }} onClick={() => setSelectedLib(ef.id)}>
                <div style={{ color: "#f2dfbe", fontFamily: "'Cinzel',serif", fontSize: 12 }}>{ef.nome || "Sem nome"}</div>
                <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 10 }}>{getMechanicalText(ef) || "Sem efeito mecânico"}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ border: "1px solid #2f2f2f", borderRadius: 8, padding: 8 }}>
          <div style={{ color: G.gold, fontFamily: "'Cinzel',serif", marginBottom: 6 }}>Efeitos anexados</div>
          <div style={{ maxHeight: 340, overflow: "auto", display: "grid", gap: 6 }}>
            {(efeitos || []).map((ef) => {
              const dur = durationInfo(ef, rodadaAtual);
              return (
                <div key={ef.id} style={{ border: "1px solid #333", borderRadius: 7, padding: 7, display: "grid", gridTemplateColumns: "1fr 100px auto auto auto", gap: 6, alignItems: "center" }}>
                  <div>
                    <div style={{ color: "#f2dfbe", fontFamily: "'Cinzel',serif", fontSize: 12 }}>{ef.nome || "Efeito"}</div>
                    <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 10 }}>{ef.ativo === false ? "Inativo (não aplicado)" : "Ativo"}{dur ? ` · Duração ${dur.restante}/${dur.total}` : ""}</div>
                    <input
                      value={ef.duracaoExpressao || ef.duracao || ""}
                      onChange={(e) => onChange((efeitos || []).map((x) => (x.id === ef.id ? { ...x, duracaoExpressao: e.target.value } : x)))}
                      placeholder="Duração: 2d4, 1d4+5, 3"
                      style={inpStyle({ marginTop: 5, fontFamily: "monospace", fontSize: 10 })}
                    />
                  </div>
                  <select value={ef.ativo === false ? "off" : "on"} onChange={(e) => onChange((efeitos || []).map((x) => (x.id === ef.id ? { ...x, ativo: e.target.value === "on" } : x)))} style={inpStyle()}>
                    <option value="on">Ativo</option>
                    <option value="off">Inativo</option>
                  </select>
                  <HoverButton onClick={() => onChange((efeitos || []).map((x) => (x.id === ef.id ? { ...x, duracaoRolada: parseDurationRounds({ duracaoExpressao: x.duracaoExpressao || x.duracao || "0" }), rodadaInicio: rodadaAtual } : x)))} style={btnStyle({ borderColor: "#5c6a3f", color: "#c9eda0" })}>Rolar</HoverButton>
                  <HoverButton onClick={() => setInspect(ef)} style={btnStyle({ borderColor: "#4b6b8a", color: "#98cfff" })}>Detalhes</HoverButton>
                  <HoverButton onClick={() => onChange((efeitos || []).filter((x) => x.id !== ef.id))} style={btnStyle({ borderColor: "#87413a", color: "#ff9990" })}>✕</HoverButton>
                </div>
              );
            })}
            {(efeitos || []).length === 0 && <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 11 }}>Sem efeitos anexados.</div>}
          </div>
        </div>
      </div>
      {inspect && <EffectDetailsModal effect={inspect} onClose={() => setInspect(null)} />}
    </Modal>
  );
}

function RemindersModal({ lembretes, rodadaAtual, onChange, onClose, onAdd }) {
  const sorted = [...(lembretes || [])].sort((a, b) => Number((a.rodadaAlvo ?? a.lembrarNaRodada) || 0) - Number((b.rodadaAlvo ?? b.lembrarNaRodada) || 0));

  return (
    <Modal title="Lembretes" onClose={onClose} wide>
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 11 }}>Rodada atual: {rodadaAtual}</div>
          <HoverButton onClick={onAdd} style={btnStyle({ padding: "4px 10px" })}>+ Lembrete</HoverButton>
        </div>
        <div style={{ maxHeight: "54vh", overflow: "auto", display: "grid", gap: 6 }}>
          {sorted.map((l) => {
            const modo = l.modo || "naRodada";
            const state = modo === "cadaX" ? `A cada ${l.aCada || 1} rodada(s)` : modo === "emX" ? `Daqui ${l.emX || 1} rodada(s)` : `Na rodada ${l.rodadaAlvo || rodadaAtual}`;
            return (
              <div key={l.id} style={{ border: "1px solid #3b2f1e", borderRadius: 8, padding: 8, display: "grid", gap: 6, background: "#120f0b" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 110px auto", gap: 6 }}>
                  <input value={l.nome || ""} onChange={(e) => onChange((lembretes || []).map((x) => (x.id === l.id ? { ...x, nome: e.target.value } : x)))} placeholder="Nome do lembrete" style={inpStyle()} />
                  <select value={modo} onChange={(e) => onChange((lembretes || []).map((x) => (x.id === l.id ? { ...x, modo: e.target.value } : x)))} style={inpStyle()}>
                    <option value="naRodada">Na rodada X</option>
                    <option value="emX">Em X rodadas</option>
                    <option value="cadaX">A cada X rodadas</option>
                  </select>
                  <HoverButton onClick={() => onChange((lembretes || []).filter((x) => x.id !== l.id))} style={btnStyle({ borderColor: "#87413a", color: "#ff9990" })}>✕</HoverButton>
                </div>
                <input value={l.descricao || ""} onChange={(e) => onChange((lembretes || []).map((x) => (x.id === l.id ? { ...x, descricao: e.target.value } : x)))} placeholder="Descrição" style={inpStyle()} />
                <input value={l.texto || ""} onChange={(e) => onChange((lembretes || []).map((x) => (x.id === l.id ? { ...x, texto: e.target.value } : x)))} placeholder="Lembrete" style={inpStyle()} />
                <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 6, alignItems: "center" }}>
                  {modo === "naRodada" && <input type="number" value={l.rodadaAlvo || rodadaAtual} onChange={(e) => onChange((lembretes || []).map((x) => (x.id === l.id ? { ...x, rodadaAlvo: Number(e.target.value) || rodadaAtual } : x)))} style={inpStyle()} />}
                  {modo === "emX" && <input type="number" min={1} value={l.emX || 1} onChange={(e) => onChange((lembretes || []).map((x) => (x.id === l.id ? { ...x, emX: Math.max(1, Number(e.target.value) || 1) } : x)))} style={inpStyle()} />}
                  {modo === "cadaX" && <input type="number" min={1} value={l.aCada || 1} onChange={(e) => onChange((lembretes || []).map((x) => (x.id === l.id ? { ...x, aCada: Math.max(1, Number(e.target.value) || 1) } : x)))} style={inpStyle()} />}
                  <span style={{ color: "#d7c7aa", fontFamily: "monospace", fontSize: 11 }}>{state}</span>
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 11 }}>Sem lembretes.</div>}
        </div>
      </div>
    </Modal>
  );
}
