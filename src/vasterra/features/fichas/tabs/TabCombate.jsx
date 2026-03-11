import React, { useEffect, useMemo, useRef, useState } from "react";
import { uid } from "../../../core/factories";
import { instantiateEffectFromTemplate, parseMechanicalEffects } from "../../../core/effects";
import { aggregateModifiers, aggregateResourceModifiers, aggregateStatusModifiers } from "../../../core/effects";
import { evaluateStatusFormula, getMechanicalText, parseDurationRounds, toNumber } from "./combate/utils";
import { buildFichaExpressionVars } from "../../../core/fichaFormula";
import { evaluateMathExpression } from "../../../core/mathExpression";
import { RANK_COR } from "../../../data/gameData";
import { G, btnStyle, inpStyle } from "../../../ui/theme";
import { HoverButton } from "../../../components/primitives/Interactive";
import { ConfiguradorFichaModal, Modal, EffectDetailsModal } from "../../shared/components";
import { SkillDetalhe } from "../../biblioteca/SkillDetalhe";
import { ImageViewport } from "../../../components/media/ImageAttachModal";

const CORE_RESOURCES = [
  { codigo: "ACO", nome: "Ação", cor: "#3498db", shape: "circle", total: 2 },
  { codigo: "MOV", nome: "Movimento", cor: "#2ecc71", shape: "square", total: 1 },
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
  CONS: { label: "CONS", cor: "#50c5aa" },
};

const normalizeStatusCode = (raw) => {
  const up = String(raw || "").trim().toUpperCase();
  if (up === "CONSC") return "CONS";
  return up;
};


function durationInfo(effect, rodadaAtual) {
  const total = parseDurationRounds(effect);
  if (!total) return null;
  const ini = Math.max(0, Math.floor(toNumber(effect?.rodadaInicio ?? 0, 0)));
  const restante = Math.max(0, ini + total - rodadaAtual);
  return { total, restante, inicio: ini };
}

function normalizeCombateState(combate = {}, ficha = {}) {
  const formulaVars = buildFichaExpressionVars(ficha);
  const rawResources = Array.isArray(combate?.recursos) ? combate.recursos : [];
  const byCode = new Map(rawResources.map((r) => [String(r.codigo || r.nome || "").toUpperCase(), r]));

  const base = CORE_RESOURCES.map((core) => {
    const old = byCode.get(core.codigo);
    const oldTotal = toNumber(old?.total ?? old?.max ?? NaN, NaN);
    const exprTotal = evaluateMathExpression(old?.totalExpr, { fallback: oldTotal, min: 0, variables: formulaVars }).value;
    const total = exprTotal > 0 ? Math.max(0, Math.floor(exprTotal)) : (oldTotal > 0 ? Math.max(0, Math.floor(oldTotal)) : core.total);
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
      const baseTotal = Math.max(0, Math.floor(toNumber(r.total ?? r.max ?? 0, 0)));
      const total = Math.max(0, Math.floor(evaluateMathExpression(r.totalExpr, { fallback: baseTotal, min: 0, variables: formulaVars }).value));
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
    pendingSkillCounts: combate?.pendingSkillCounts && typeof combate.pendingSkillCounts === "object" ? combate.pendingSkillCounts : {},
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


function effectIconSrc(effect = {}) {
  if (effect.iconeModo === "url" && effect.iconeUrl) return effect.iconeUrl;
  if (effect.iconeModo === "upload" && effect.iconeData) return effect.iconeData;
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
    <span
      role="button"
      tabIndex={0}
      title={title}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(e); }}
      style={{ display: "inline-flex", border: "none", background: "transparent", padding: 0, cursor: "pointer" }}
    >
      <span style={{ ...common, ...(styleByShape[shape] || styleByShape.square) }} />
    </span>
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

function rollDiceExpression(raw = "") {
  const input = String(raw || "").trim();
  if (!input) return null;
  const expr = input.replace(/\s+/g, "");
  if (!/^[0-9dD+\-*/().]+$/.test(expr)) return null;
  const parts = [];
  const rolledExpr = expr.replace(/(\d*)d(\d+)/gi, (full, qtyRaw, facesRaw) => {
    const qty = Math.max(1, Number(qtyRaw || 1));
    const faces = Math.max(2, Number(facesRaw || 2));
    const rolls = [];
    let sum = 0;
    for (let i = 0; i < qty; i += 1) {
      const one = 1 + Math.floor(Math.random() * faces);
      rolls.push(one);
      sum += one;
    }
    parts.push({ token: `${qty}d${faces}`, rolls, sum });
    return String(sum);
  });
  try {
    const total = Number(Function(`"use strict"; return (${rolledExpr});`)());
    if (!Number.isFinite(total)) return null;
    return { total, expr: rolledExpr, parts };
  } catch {
    return null;
  }
}

function resolveNarrativeEffectMessage(raw = "") {
  const source = String(raw || "").trim();
  if (!source) return "";
  const quoted = [...source.matchAll(/"([^"]+)"/g)].map((m) => String(m[1] || "").trim()).filter(Boolean);
  const expressionMatch = source.match(/\(([^)]+)\)/);
  const expressionRaw = expressionMatch?.[1]?.trim() || "";
  const outside = source
    .replace(/"[^"]*"/g, " ")
    .replace(/\(([^)]+)\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const text = [...quoted, outside].filter(Boolean).join(" ").trim();

  if (!expressionRaw) return text || source;
  const roll = rollDiceExpression(expressionRaw);
  if (!roll) return text || source;

  const detailDice = roll.parts.map((p) => `${p.token}=${p.rolls.join("+")}`).join("; ");
  const detail = `${detailDice}${roll.expr !== String(roll.total) ? ` => ${roll.expr}` : ""}`;
  return `${roll.total}${text ? ` ${text}` : ""}${detail ? ` ((${detail}))` : ""}`;
}

function parseExpressionValue(raw, fallback, context = {}) {
  const v = Number(raw);
  if (Number.isFinite(v)) return v;
  const txt = String(raw || "").trim();
  if (!txt) return fallback;
  if (/\d+d\d+/i.test(txt)) {
    const dice = parseDurationRounds({ duracaoExpressao: txt });
    if (Number.isFinite(dice)) return dice;
  }
  const expr = evaluateStatusFormula(txt, context);
  return Number.isFinite(expr) ? expr : fallback;
}

export function TabCombate({ ficha, onUpdate, efeitosCaldeirao = [], skillTags = [], onNotify }) {
  const [query, setQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fichaConfigOpen, setFichaConfigOpen] = useState(false);
  const [skillModal, setSkillModal] = useState(null);
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [effectDetail, setEffectDetail] = useState(null);
  const [resourceModal, setResourceModal] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [logDetail, setLogDetail] = useState(null);

  const combate = useMemo(() => normalizeCombateState(ficha?.combate || {}, ficha), [ficha]);
  const activeEffects = useMemo(() => (Array.isArray(ficha?.modificadores?.efeitos) ? ficha.modificadores.efeitos : []).filter((e) => e && e.ativo !== false), [ficha?.modificadores?.efeitos]);
  const attributeBonus = useMemo(() => aggregateModifiers(activeEffects, "atributos"), [activeEffects]);
  const skillBonus = useMemo(() => aggregateModifiers(activeEffects, "pericias"), [activeEffects]);
  const statusBonusForFormula = useMemo(() => aggregateStatusModifiers(activeEffects), [activeEffects]);
  const resourceBonusForFormula = useMemo(() => aggregateResourceModifiers(activeEffects), [activeEffects]);
  const formulaVars = useMemo(() => buildFichaExpressionVars(ficha, {
    attributeMods: attributeBonus,
    skillMods: skillBonus,
    statusMods: statusBonusForFormula,
    resourceMods: resourceBonusForFormula,
    effects: activeEffects,
  }), [ficha?.atributos, ficha?.pericias, ficha?.status, ficha?.recursos, ficha?.combate?.recursos, attributeBonus, skillBonus, statusBonusForFormula, resourceBonusForFormula, activeEffects]);
  const tagsById = useMemo(() => Object.fromEntries((skillTags || []).map((t) => [t.id, t])), [skillTags]);
  const assigned = useMemo(() => (ficha?.skills || []).map((entry) => ({ entry, skill: skillFromEntry(entry) })), [ficha?.skills]);
  const filteredSkills = useMemo(() => assigned.filter(({ skill }) => (`${skill.nome || ""} ${skill.descricao || ""} ${(skill.custos || []).map((c) => c.codigo).join(" ")}`).toLowerCase().includes(query.toLowerCase())), [assigned, query]);

  const activeStatusMods = useMemo(() => { try { return aggregateStatusModifiers(activeEffects); } catch { return {}; } }, [activeEffects]);
  const activeResourceMods = useMemo(() => { try { return aggregateResourceModifiers(activeEffects); } catch { return {}; } }, [activeEffects]);
  const pendingCounts = combate.pendingSkillCounts && Object.keys(combate.pendingSkillCounts).length ? combate.pendingSkillCounts : Object.fromEntries((combate.pendingSkillIds || []).map((id) => [id, 1]));
  const pendingEntries = useMemo(() => assigned.filter(({ entry }) => Number(pendingCounts[entry.id] || 0) > 0).map((x) => ({ ...x, count: Math.max(1, Number(pendingCounts[x.entry.id] || 1)) })), [assigned, pendingCounts]);

  const computedStatusBase = useMemo(() => {
    const statusEntries = Object.entries(ficha?.status || {});
    const allStatusKeys = Array.from(new Set([
      ...statusEntries.map(([k]) => normalizeStatusCode(k)),
      ...Object.keys(combate.statusMeta || {}).map((k) => normalizeStatusCode(k)),
    ])).filter(Boolean);
    return Object.fromEntries(allStatusKeys.map((code) => {
      const fromStatus = statusEntries.find(([k]) => normalizeStatusCode(k) === code)?.[1] || {};
      const rawVal = Number(fromStatus?.val || 0);
      const rawMax = Math.max(1, Number(fromStatus?.max || 1));
      const resolvedMax = evaluateMathExpression(fromStatus?.maxExpr, { fallback: rawMax, min: 1, variables: formulaVars }).value;
      const resolvedVal = evaluateMathExpression(fromStatus?.valExpr, { fallback: rawVal, min: 0, max: resolvedMax, variables: formulaVars }).value;
      return [code, { val: resolvedVal, max: resolvedMax }];
    }));
  }, [ficha?.status, combate.statusMeta, formulaVars]);

  const combatStatus = useMemo(() => {
    const out = {};
    Object.entries(computedStatusBase || {}).forEach(([key, data]) => {
      const code = key.toUpperCase();
      const mods = activeStatusMods[code] || { base: 0, current: 0, max: 0 };
      const baseVal = Number(data?.val || 0);
      const baseMax = Math.max(1, Number(data?.max || 1));
      const overflowMax = Math.max(0, Math.floor(mods.base + mods.current));
      const max = Math.max(1, Math.floor(baseMax + mods.max + overflowMax));
      const val = Math.max(0, Math.min(max, Math.floor(baseVal + mods.base + mods.current)));
      out[code] = { baseVal, baseMax, val, max, mods, overflowMax };
    });
    return out;
  }, [computedStatusBase, activeStatusMods]);

  const statusDefs = useMemo(() => {
    const allCodes = Array.from(new Set([
      ...Object.keys(ficha?.status || {}).map((key) => normalizeStatusCode(key)),
      ...Object.keys(combate.statusMeta || {}).map((key) => normalizeStatusCode(key)),
    ])).filter(Boolean);
    const all = allCodes.map((up) => {
      const existingKey = Object.keys(ficha?.status || {}).find((k) => normalizeStatusCode(k) === up) || up;
      const fromCombate = combate.statusMeta?.[up] || (up === "CONS" ? combate.statusMeta?.CONSC : null) || {};
      const base = CORE_STATUS_META[up] || {};
      return {
        key: existingKey,
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
    pendingEntries.forEach(({ skill, count }) => {
      parseSkillCosts(skill).forEach((c) => {
        sum[c.codigo] = (sum[c.codigo] || 0) + (c.quantidade * Math.max(1, Number(count || 1)));
      });
    });
    return sum;
  }, [pendingEntries]);

  const effectiveResources = useMemo(() => Object.fromEntries(
    (combate.recursos || []).map((r) => {
      const code = String(r.codigo || "").toUpperCase();
      const mods = activeResourceMods[code] || { current: 0, max: 0 };
      const baseTotal = Math.max(0, Number(r.total || 0));
      const overflowMax = Math.max(0, Math.floor(mods.current));
      const total = Math.max(0, Math.floor(baseTotal + mods.max + overflowMax));
      const current = Math.max(0, Math.min(total, Math.floor(Number(r.atual || 0) + mods.current)));
      return [code, { ...r, codigo: code, total, atual: current, mods, overflowMax }];
    }),
  ), [combate.recursos, activeResourceMods]);

  const previewRemainingByResource = useMemo(() => Object.fromEntries(
    Object.values(effectiveResources).map((r) => [
      r.codigo,
      Math.max(0, Number(r.atual || 0) - Number(previewCosts[r.codigo] || 0)),
    ]),
  ), [effectiveResources, previewCosts]);

  const byResource = new Map(Object.values(effectiveResources).map((r) => [r.codigo, r]));
  const byStatus = new Map(Object.entries(combatStatus || {}).map(([k, v]) => [k.toUpperCase(), v]));
  const resolveCode = (code) => normalizeStatusCode(code);

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

  const setSkillCount = (id, delta) => {
    const next = { ...(pendingCounts || {}) };
    const curr = Math.max(0, Number(next[id] || 0));
    const val = Math.max(0, curr + delta);
    if (val <= 0) delete next[id];
    else next[id] = val;
    saveCombate({ pendingSkillCounts: next, pendingSkillIds: Object.keys(next) });
  };

  const toggleSkill = (id) => {
    const curr = Math.max(0, Number(pendingCounts[id] || 0));
    const next = { ...(pendingCounts || {}) };
    if (curr > 0) delete next[id]; else next[id] = 1;
    saveCombate({ pendingSkillCounts: next, pendingSkillIds: Object.keys(next) });
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
    const nextResources = combate.recursos.map((r) => {
      const code = String(r.codigo || "").toUpperCase();
      const effective = effectiveResources[code];
      return { ...r, atual: Math.max(0, Number(effective?.total ?? r.total ?? 0)) };
    });
    const nextStatus = {
      ...Object.fromEntries(Object.entries(combatStatus || {}).map(([code, st]) => [code, { val: Number(st?.baseVal || 0), max: Math.max(1, Number(st?.baseMax || 1)) }])),
      ...(ficha.status || {}),
    };
    const statusLogs = [];
    const resourceLogs = [];

    Object.entries(previewCosts).forEach(([rawCode, qtd]) => {
      const code = resolveCode(rawCode);
      const resource = effectiveResources[code];
      if (resource) {
        const prevVal = Number(resource.atual || 0);
        const total = Math.max(0, Number(resource.total || 0));
        const afterSpend = Math.max(0, prevVal - qtd);
        resourceLogs.push({ code, prevVal, afterSpend, spent: qtd, total, maxAfter: total });
        return;
      }
      const prevVal = Number(nextStatus[code]?.val || 0);
      const effective = Number(combatStatus[code]?.val ?? prevVal);
      const nextVal = Math.max(0, prevVal - Math.max(0, qtd - Math.max(0, effective - prevVal)));
      nextStatus[code] = { ...(nextStatus[code] || { max: Math.max(1, Number(combatStatus[code]?.baseMax || 1)) }), val: nextVal };
      statusLogs.push({ code, prevVal, nextVal, spent: qtd, max: Number(nextStatus[code]?.max || 1) });
    });

    const usedSkillMeta = pendingEntries.flatMap(({ skill, count }) => Array.from({ length: Math.max(1, Number(count || 1)) }).map(() => ({ nome: skill.nome || "Skill", icone: skillIconSrc(skill) || skill.icone || "⚔" })));
    const usedSkills = usedSkillMeta.map((s) => s.nome).join(", ") || "sem skills";
    let nextLogs = addLog(`Rodada ${nextRound} encerrada • Skills: ${usedSkills}.`, nextRound, undefined, { kind: "round", skills: usedSkillMeta });
    if (resourceLogs.length) nextLogs = addLog("Recursos atualizados.", nextRound, nextLogs, { kind: "resource", changes: resourceLogs });
    else nextLogs = addLog("Recursos resetados para o máximo.", nextRound, nextLogs, { kind: "resource" });
    if (statusLogs.length) nextLogs = addLog("Status atualizados.", nextRound, nextLogs, { kind: "status", changes: statusLogs });

    const remindersTriggered = (combate.lembretes || []).filter((r) => shouldTriggerReminder(r, nextRound, combate.rodadaAtual));
    remindersTriggered.forEach((r) => {
      const msg = `${r.nome || "Lembrete"}: ${r.texto || r.descricao || "Sem descrição"}`;
      nextLogs = addLog(msg, nextRound, nextLogs, { kind: "reminder", reminder: r });
      onNotify?.(`⏰ ${msg}`, "info");
    });

    const effectMessages = activeEffects
      .map((ef) => ({ ef, raw: String(getMechanicalText(ef) || "").trim() }))
      .filter(({ raw }) => raw && parseMechanicalEffects(raw).length === 0);
    effectMessages.forEach(({ ef, raw }) => {
      const rolled = resolveNarrativeEffectMessage(raw);
      if (!rolled) return;
      const msg = `${ef.nome || "Efeito"}: ${rolled}`;
      nextLogs = addLog(msg, nextRound, nextLogs, { kind: "effect", effectId: ef.id, text: rolled });
      onNotify?.(`✨ ${msg}`, "info");
    });

    onUpdate({
      status: nextStatus,
      combate: { ...(ficha.combate || {}), recursos: nextResources, rodadaAtual: nextRound, pendingSkillIds: [], pendingSkillCounts: {}, logs: nextLogs },
    });

    handleEffectExpiration(nextRound, nextLogs);
  };

  const resetCombate = () => {
    const resetResources = combate.recursos.map((r) => ({ ...r, atual: Number(r.total || 0) }));
    saveCombate({ rodadaAtual: 0, pendingSkillIds: [], pendingSkillCounts: {}, recursos: resetResources, logs: [] });
    onNotify?.("Combate resetado (rodada, seleção e logs).", "success");
  };

  const togglePip = (resource, idx) => {
    const next = idx < Number(resource.atual || 0) ? idx : idx + 1;
    updateResourceById(resource.id, { atual: Math.max(0, Math.min(Number(resource.total || 0), next)) });
  };


  const saveStatusValues = (key, nextValues = {}) => {
    const curr = ficha?.status?.[key] || { val: 0, max: 1 };
    const code = String(key || "").toUpperCase();
    const runtime = combatStatus[code] || { mods: { base: 0, current: 0, max: 0 }, overflowMax: 0, max: curr.max };
    const mods = runtime.mods || { base: 0, current: 0, max: 0 };
    const baseShift = Number(mods.base || 0) + Number(mods.current || 0);
    const maxShift = Number(mods.max || 0) + Number(runtime.overflowMax || 0);

    const targetEffectiveMax = Math.max(1, Math.floor(Number(nextValues.max ?? runtime.max ?? curr.max ?? 1)));
    const nextBaseMax = Math.max(1, Math.floor(targetEffectiveMax - maxShift));
    const maxForEffectiveVal = Math.max(1, targetEffectiveMax);
    const targetEffectiveVal = Math.max(0, Math.min(maxForEffectiveVal, Math.floor(Number(nextValues.val ?? runtime.val ?? curr.val ?? 0))));
    const nextBaseVal = Math.max(0, Math.min(nextBaseMax, Math.floor(targetEffectiveVal - baseShift)));

    onUpdate({
      status: {
        ...(ficha.status || {}),
        [key]: { ...curr, max: nextBaseMax, val: nextBaseVal },
      },
    });
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
                <button key={log.id} className="combat-log-item" onClick={() => setLogDetail(log)} style={{ textAlign: "left", cursor: "pointer", width:"100%", boxSizing:"border-box" }}>
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
            <HoverButton style={btnStyle({ padding: "4px 8px", borderColor: "#695532", color: "#e2c38a" })} onClick={() => setFichaConfigOpen(true)}>Configurador de Ficha</HoverButton>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8 }}>
            {Object.values(effectiveResources).map((r) => {
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
            const selectedCount = Math.max(0, Number(pendingCounts[entry.id] || 0));
            const selected = selectedCount > 0;
            const costs = parseSkillCosts(skill);
            const src = skillIconSrc(skill);
            const rankCor = RANK_COR[skill.rank] || skill.cor || "#93a6bf";
            return (
              <div
                key={entry.id}
                className="skill-row"
                role="button"
                tabIndex={0}
                onClick={() => toggleSkill(entry.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSkill(entry.id); } }}
                style={{ border: `1px solid ${selected ? "#9f7a3a" : "#443621"}`, borderRadius: 10, padding: 8, background: selected ? "#231a10" : "#0d0a07", transition: "all .2s", textAlign: "left", cursor: "pointer" }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "44px 1fr auto", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 8, border: "1px solid #6b5431", display: "grid", placeItems: "center", background: "#1d1409", overflow: "hidden" }}>
                    {src ? <ImageViewport src={src} alt={skill?.nome || "Skill"} size={40} radius={6} adjust={skill?.iconeAjuste} /> : <span style={{ fontSize: 18 }}>{skill?.icone || "?"}</span>}
                  </div>
                  <div>
                    <div style={{ color: "#f1dfbe", fontFamily: "'Cinzel',serif", fontSize: 12 }}>{selected ? "✓ " : ""}{skill.nome || "Skill"}</div>
                    <div style={{ color: rankCor, fontFamily: "monospace", fontSize: 10 }}>{skill.rank || "Sem rank"}</div>
                  </div>
                  <div style={{ display:"flex", gap:4, alignItems:"center" }}><HoverButton style={btnStyle({ padding: "2px 7px", borderColor: "#6f5a34", color: "#d8bf8b" })} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSkillModal(skill); }}>Detalhes</HoverButton><HoverButton style={btnStyle({ padding:"2px 6px" })} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSkillCount(entry.id, -1); }}>-</HoverButton><span style={{minWidth:18,textAlign:"center",fontFamily:"monospace",color:"#d8c39b"}}>{selectedCount}</span><HoverButton style={btnStyle({ padding:"2px 6px" })} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSkillCount(entry.id, +1); }}>+</HoverButton></div>
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
              </div>
            );
          })}
          {filteredSkills.length === 0 && <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 12 }}>Nenhuma skill encontrada.</div>}
        </div>
      </div>

      <ConfiguradorFichaModal
        open={fichaConfigOpen}
        ficha={ficha}
        onClose={() => setFichaConfigOpen(false)}
        onApply={(payload) => {
          if (payload.tipo === "status") {
            const code = normalizeStatusCode(payload.codigo);
            onUpdate({
              status: { ...(ficha.status || {}), [code]: { ...(ficha.status?.[code] || {}), val: payload.max, max: payload.max, maxExpr: payload.maxFormula || "" } },
              combate: { ...(ficha.combate || {}), statusMeta: { ...(combate.statusMeta || {}), [code]: { label: payload.nome || code, cor: payload.cor } } },
            });
            return;
          }
          const exists = (combate.recursos || []).some((r) => String(r.codigo || "").toUpperCase() === payload.codigo);
          if (exists) return;
          const nextResources = [...(combate.recursos || []), {
            id: uid(),
            codigo: payload.codigo,
            nome: payload.nome || payload.codigo,
            cor: payload.cor,
            shape: payload.shape || "square",
            total: payload.max,
            atual: payload.max,
            custom: true,
            totalExpr: payload.maxFormula || "",
          }];
          onUpdate({
            combate: { ...(ficha.combate || {}), recursos: nextResources },
            recursos: { ...(ficha.recursos || {}), [payload.codigo]: { total: payload.max, usado: 0, totalExpr: payload.maxFormula || "" } },
          });
        }}
      />
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
          resource={effectiveResources[String(resourceModal.codigo || "").toUpperCase()] || combate.recursos.find((r) => r.id === resourceModal.id) || resourceModal}
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
          status={combatStatus[statusModal.code] || ficha?.status?.[statusModal.key] || { val: 0, max: 1 }}
          statusDef={statusModal}
          previewCost={(previewCosts[statusModal.code] || previewCosts[statusModal.label] || 0)}
          onClose={() => setStatusModal(null)}
          onApply={(next) => saveStatusValues(statusModal.key, next)}
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

      {logDetail && <Modal title={`Log R${logDetail.rodada}`} onClose={() => setLogDetail(null)}><div style={{ display: "grid", gap: 8 }}><div style={{ color: "#f2dfbe", fontFamily: "monospace" }}>{logDetail.mensagem}</div>{Array.isArray(logDetail.skills) && <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>{logDetail.skills.map((s,i)=><span key={i} style={{display:"inline-flex",gap:4,alignItems:"center",padding:"2px 8px",border:"1px solid #5d4728",borderRadius:999,color:"#e8d2aa"}}><span>{s.icone}</span><span>{s.nome}</span></span>)}</div>}{Array.isArray(logDetail.changes) && <div style={{display:"grid",gap:4}}>{logDetail.changes.map((c,i)=><div key={i} style={{color:"#b7c6dd",fontFamily:"monospace",fontSize:11}}>{c.code || ""} {c.prevVal != null ? `${c.prevVal}→${c.nextVal}` : c.spent != null ? `-${c.spent} / ${c.maxAfter}` : ""}</div>)}</div>}</div></Modal>}
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

function StatusQuickModal({ status, statusDef, previewCost, onClose, onApply, onDelete }) {
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
            <HoverButton onClick={() => { onApply({ max, val: Math.max(0, Math.min(max, val)) }); onClose(); }} style={btnStyle()}>Salvar</HoverButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function SettingsModal({ combate, statusDefs, ficha, onClose, onSave }) {
  const [list, setList] = useState(combate.recursos || []);
  const [statusMeta, setStatusMeta] = useState(() => {
    const base = combate.statusMeta || {};
    const fromDefs = Object.fromEntries((statusDefs || []).map((s) => [s.code, { label: s.label, cor: s.cor }]));
    return { ...fromDefs, ...base };
  });
  const [statusState, setStatusState] = useState(ficha?.status || {});
  const [statusInput, setStatusInput] = useState(() => Object.fromEntries(Object.entries(ficha?.status || {}).map(([k, v]) => [k, { val: String(v?.val ?? 0), max: String(v?.max ?? 1) }])));
  const [resourceDraft, setResourceDraft] = useState({ codigo: "", nome: "", cor: "#e0b44c", shape: "square", total: 1, atual: 1 });
  const [statusDraft, setStatusDraft] = useState({ codigo: "DET", label: "Determinação", cor: "#8dc2ff", val: 10, max: 10 });
  const [statusEditor, setStatusEditor] = useState(null);

  const localStatusDefs = useMemo(() => {
    const allCodes = Array.from(new Set([
      ...Object.keys(statusState || {}).map((k) => normalizeStatusCode(k)),
      ...Object.keys(statusMeta || {}).map((k) => normalizeStatusCode(k)),
      ...(statusDefs || []).map((s) => normalizeStatusCode(s.code)),
    ])).filter(Boolean);
    return allCodes.map((code) => {
      const base = (statusDefs || []).find((s) => normalizeStatusCode(s.code) === code) || { label: code, cor: "#9ca3af" };
      const meta = statusMeta?.[code] || (code === "CONS" ? statusMeta?.CONSC : null) || {};
      return { key: code, code, label: meta.label || base.label || code, cor: meta.cor || base.cor || "#9ca3af" };
    }).sort((a, b) => {
      const ia = (statusDefs || []).findIndex((x) => normalizeStatusCode(x.code) === a.code);
      const ib = (statusDefs || []).findIndex((x) => normalizeStatusCode(x.code) === b.code);
      if (ia === -1 && ib === -1) return a.code.localeCompare(b.code);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [statusDefs, statusMeta, statusState]);

  const normalizeStatusState = (baseStatus, defs = localStatusDefs) => {
    const normalizedBase = Object.fromEntries(
      Object.entries(baseStatus || {}).map(([k, v]) => [
        normalizeStatusCode(k),
        {
          val: Math.max(0, Number(v?.val || 0)),
          max: Math.max(1, Number(v?.max || 1)),
        },
      ]),
    );
    const next = { ...normalizedBase };
    (defs || []).forEach((s) => {
      const code = normalizeStatusCode(s.code);
      if (!next[code]) next[code] = { val: 0, max: 1 };
    });
    return next;
  };

  useEffect(() => {
    setStatusState((prev) => {
      const next = normalizeStatusState(prev, localStatusDefs);
      return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
    });
  }, [localStatusDefs]);

  useEffect(() => {
    setStatusInput(Object.fromEntries(Object.entries(statusState || {}).map(([k, v]) => [k, { val: String(v?.val ?? 0), max: String(v?.max ?? 1) }])));
  }, [statusState]);

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
          <div style={{ color: G.gold, marginBottom: 6, fontFamily: "'Cinzel',serif" }}>Barras de status</div>
          <div style={{ display: "grid", gap: 8, maxHeight: 260, overflow: "auto" }}>
            {localStatusDefs.map((s) => {
              const meta = statusMeta[s.code] || (s.code === "CONS" ? statusMeta.CONSC : null) || { label: s.label, cor: s.cor };
              const st = statusState[s.key] || { val: 0, max: 1 };
              return (
                <div key={s.key} style={{ border: "1px solid #3f3121", borderRadius: 8, padding: 8, background: "#120f0b", display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "monospace", color: meta.cor || s.cor }}>{s.code}</span>
                      <span style={{ color: "#e7d5b1", fontFamily: "monospace", fontSize: 11 }}>{meta.label || s.label}</span>
                      <span style={{ color: G.muted, fontFamily: "monospace", fontSize: 11 }}>{st.val}/{st.max}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <HoverButton onClick={() => setStatusEditor({ mode: "edit", status: s, draft: { code: s.code, label: meta.label || s.label, cor: meta.cor || s.cor, val: st.val, max: st.max, initialVal: st.val, initialMax: st.max } })} style={btnStyle({ padding: "4px 8px", borderColor: "#4b6b8a", color: "#98cfff" })}>Editar</HoverButton>
                      <HoverButton onClick={() => setStatusEditor({ mode: "duplicate", status: s, draft: { code: `${s.code}_2`, label: `${meta.label || s.label} Cópia`, cor: meta.cor || s.cor, val: st.val, max: st.max, initialVal: st.val, initialMax: st.max } })} style={btnStyle({ padding: "4px 8px", borderColor: "#6b5a34", color: "#d8bf8b" })}>Duplicar</HoverButton>
                      <HoverButton onClick={() => {
                        setStatusState((p) => { const n = { ...p }; delete n[s.key]; return n; });
                        setStatusMeta((p) => {
                          const n = { ...p };
                          delete n[s.code];
                          if (s.code === "CONS") delete n.CONSC;
                          return n;
                        });
                        setStatusInput((p) => { const n = { ...p }; delete n[s.key]; return n; });
                      }} style={btnStyle({ padding: "4px 8px", borderColor: "#87413a", color: "#ff9990" })}>Excluir</HoverButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 8, borderTop: "1px solid #3d2f1f", paddingTop: 8 }}>
            <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 11, marginBottom: 6 }}>Adicionar nova barra</div>
            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 56px 84px 84px auto", gap: 6 }}>
              <input value={statusDraft.codigo} onChange={(e) => setStatusDraft((p) => ({ ...p, codigo: e.target.value.toUpperCase() }))} style={inpStyle()} placeholder="Cód" />
              <input value={statusDraft.label} onChange={(e) => setStatusDraft((p) => ({ ...p, label: e.target.value }))} style={inpStyle()} placeholder="Nome" />
              <input type="color" value={statusDraft.cor} onChange={(e) => setStatusDraft((p) => ({ ...p, cor: e.target.value }))} style={inpStyle({ padding: 2 })} />
              <input type="number" min={0} value={statusDraft.val} onChange={(e) => setStatusDraft((p) => ({ ...p, val: Math.max(0, Number(e.target.value) || 0) }))} style={inpStyle()} placeholder="Atual" />
              <input type="number" min={1} value={statusDraft.max} onChange={(e) => setStatusDraft((p) => ({ ...p, max: Math.max(1, Number(e.target.value) || 1) }))} style={inpStyle()} placeholder="Max" />
              <HoverButton onClick={() => {
                const key = normalizeStatusCode(statusDraft.codigo);
                if (!key) return;
                const nextMeta = {
                  ...(statusMeta || {}),
                  [key]: {
                    ...(statusMeta?.[key] || (key === "CONS" ? statusMeta?.CONSC : null) || {}),
                    label: statusDraft.label || key,
                    cor: statusDraft.cor,
                  },
                };
                const seeded = { ...(statusState || {}), [key]: { ...(statusState?.[key] || {}), val: Math.max(0, Number(statusDraft.val || 0)), max: Math.max(1, Number(statusDraft.max || 1)) } };
                const nextDefs = localStatusDefs.some((s) => normalizeStatusCode(s.code) === key)
                  ? localStatusDefs
                  : [...localStatusDefs, { key, code: key, label: statusDraft.label || key, cor: statusDraft.cor || "#9ca3af" }];
                const recomputed = normalizeStatusState(seeded, nextDefs);
                setStatusMeta(nextMeta);
                setStatusState(recomputed);
                setStatusInput((p) => ({ ...p, [key]: { val: String(recomputed[key]?.val ?? 0), max: String(recomputed[key]?.max ?? 1) } }));
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

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <HoverButton onClick={onClose} style={btnStyle({ borderColor: "#4f4f4f", color: "#b8b8b8" })}>Fechar</HoverButton>
          <HoverButton onClick={() => {
            const nextStatus = normalizeStatusState(statusState, localStatusDefs);
            onSave({ recursos: list, statusMeta, status: nextStatus });
            onClose();
          }} style={btnStyle()}>Salvar</HoverButton>
        </div>
      </div>
      {statusEditor && (
        <Modal title={`${statusEditor.mode === "duplicate" ? "Duplicar" : "Editar"} barra: ${statusEditor.status?.code || "Status"}`} onClose={() => setStatusEditor(null)}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 56px", gap: 6 }}>
              <input value={statusEditor.draft.code} onChange={(e) => setStatusEditor((p) => ({ ...p, draft: { ...p.draft, code: normalizeStatusCode(e.target.value) } }))} style={inpStyle()} />
              <input value={statusEditor.draft.label} onChange={(e) => setStatusEditor((p) => ({ ...p, draft: { ...p.draft, label: e.target.value } }))} style={inpStyle()} />
              <input type="color" value={statusEditor.draft.cor} onChange={(e) => setStatusEditor((p) => ({ ...p, draft: { ...p.draft, cor: e.target.value } }))} style={inpStyle({ padding: 2 })} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <input type="number" min={0} value={statusEditor.draft.val} onChange={(e) => setStatusEditor((p) => ({ ...p, draft: { ...p.draft, val: Math.max(0, Number(e.target.value) || 0) } }))} style={inpStyle()} placeholder="Atual base" />
              <input type="number" min={1} value={statusEditor.draft.max} onChange={(e) => setStatusEditor((p) => ({ ...p, draft: { ...p.draft, max: Math.max(1, Number(e.target.value) || 1) } }))} style={inpStyle()} placeholder="Max base" />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <HoverButton onClick={() => setStatusEditor(null)} style={btnStyle({ borderColor: "#4f4f4f", color: "#b8b8b8" })}>Cancelar</HoverButton>
              <HoverButton onClick={() => {
                const code = normalizeStatusCode(statusEditor.draft.code);
                if (!code) return;
                const exists = localStatusDefs.some((x) => normalizeStatusCode(x.code) === code);
                if (statusEditor.mode === "duplicate" && exists) return;
                const oldCode = normalizeStatusCode(statusEditor.status.code);
                const key = code;

                const nextStatusMeta = { ...(statusMeta || {}) };
                if (code !== oldCode) {
                  delete nextStatusMeta[oldCode];
                  if (oldCode === "CONS") delete nextStatusMeta.CONSC;
                }
                nextStatusMeta[code] = {
                  ...(nextStatusMeta[code] || (code === "CONS" ? nextStatusMeta.CONSC : null) || {}),
                  label: statusEditor.draft.label || code,
                  cor: statusEditor.draft.cor,
                };

                const nextStatusState = { ...(statusState || {}) };
                if (code !== oldCode) delete nextStatusState[oldCode];
                const seedCurrent = statusState?.[key] || statusState?.[oldCode] || {};
                nextStatusState[key] = {
                  val: Math.max(0, Number(statusEditor.draft.val ?? statusEditor.draft.initialVal ?? seedCurrent.val ?? 0) || 0),
                  max: Math.max(1, Number(statusEditor.draft.max ?? statusEditor.draft.initialMax ?? seedCurrent.max ?? 1) || 1),
                };

                const nextDefsBase = localStatusDefs.filter((s) => normalizeStatusCode(s.code) !== oldCode);
                const nextDefs = [...nextDefsBase, { key, code, label: statusEditor.draft.label || code, cor: statusEditor.draft.cor || "#9ca3af" }];

                const recomputed = normalizeStatusState(nextStatusState, nextDefs);
                setStatusMeta(nextStatusMeta);
                setStatusState(recomputed);
                setStatusInput((p) => {
                  const next = { ...(p || {}) };
                  if (code !== oldCode) delete next[oldCode];
                  next[key] = { val: String(recomputed[key]?.val ?? 0), max: String(recomputed[key]?.max ?? 1) };
                  return next;
                });
                setStatusEditor(null);
              }} style={btnStyle()}>Salvar</HoverButton>
            </div>
          </div>
        </Modal>
      )}
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
            {(Array.isArray(efeitos) ? efeitos : []).filter(Boolean).map((ef) => {
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
