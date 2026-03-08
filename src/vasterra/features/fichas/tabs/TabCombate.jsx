import React, { useMemo, useState } from "react";
import { uid } from "../../../core/factories";
import { instantiateEffectFromTemplate } from "../../../core/effects";
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
  { codigo: "ESF", nome: "Esforço", cor: "#8b0000", shape: "hex", total: 1 },
];

const CORE_STATUS_META = {
  VIT: { label: "VIT", cor: "#ff5b4d" },
  EST: { label: "EST", cor: "#d7d748" },
  MAN: { label: "MAN", cor: "#4a7dff" },
  SAN: { label: "SAN", cor: "#c15cff" },
  CONS: { label: "CONSC", cor: "#50c5aa" },
};

function normalizeCombateState(combate = {}) {
  const rawResources = Array.isArray(combate?.recursos) ? combate.recursos : [];
  const byCode = new Map(rawResources.map((r) => [String(r.codigo || r.nome || "").toUpperCase(), r]));

  const base = CORE_RESOURCES.map((core) => {
    const old = byCode.get(core.codigo);
    const total = Math.max(0, Number(old?.total ?? old?.max ?? core.total));
    const atual = Math.max(0, Math.min(total, Number(old?.atual ?? old?.max ?? total)));
    return {
      id: old?.id || uid(),
      codigo: core.codigo,
      nome: old?.nome || core.nome,
      cor: old?.cor || core.cor,
      shape: old?.shape || old?.slotShape || core.shape,
      total,
      atual,
      custom: false,
    };
  });

  const custom = rawResources
    .filter((r) => !CORE_RESOURCES.some((core) => core.codigo === String(r.codigo || r.nome || "").toUpperCase()))
    .map((r) => {
      const total = Math.max(0, Number(r.total ?? r.max ?? 0));
      return {
        id: r.id || uid(),
        codigo: String(r.codigo || r.nome || "").toUpperCase() || "NOVO",
        nome: r.nome || "Recurso",
        cor: r.cor || "#7f8c8d",
        shape: r.shape || r.slotShape || "square",
        total,
        atual: Math.max(0, Math.min(total, Number(r.atual ?? r.max ?? total))),
        custom: true,
      };
    });

  return {
    rodadaAtual: Math.max(0, Number(combate?.rodadaAtual || 0)),
    lembretes: Array.isArray(combate?.lembretes) ? combate.lembretes : [],
    logs: Array.isArray(combate?.logs) ? combate.logs : [],
    pendingSkillIds: Array.isArray(combate?.pendingSkillIds) ? combate.pendingSkillIds : [],
    recursos: [...base, ...custom],
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

function parseEffectDuration(effect, rodadaAtual) {
  const dur = Number(effect?.duracaoRolada ?? effect?.duracao ?? effect?.duracaoRodadas ?? 0);
  const ini = Number(effect?.rodadaInicio ?? 0);
  if (!dur || !Number.isFinite(dur)) return null;
  return { total: dur, restante: Math.max(0, ini + dur - rodadaAtual) };
}

function resolveCostStyle(skill, code) {
  const found = (skill?.custoCatalogo || []).find((c) => String(c.nome || "").toUpperCase() === String(code || "").toUpperCase());
  return { bg: found?.cor || "#3b4756", fg: found?.textoCor || "#fff" };
}

function iconSrc(skill = {}) {
  if (skill.iconeModo === "url" && skill.iconeUrl) return skill.iconeUrl;
  if (skill.iconeModo === "upload" && skill.iconeData) return skill.iconeData;
  return "";
}

function ResourcePip({ shape, active, color, onClick, title }) {
  const common = {
    width: 16,
    height: 16,
    cursor: "pointer",
    transition: "all .18s ease",
    filter: active ? "drop-shadow(0 0 6px rgba(255,255,255,.25))" : "grayscale(0.85) brightness(.45)",
    transform: active ? "scale(1)" : "scale(.92)",
    opacity: active ? 1 : 0.72,
  };
  if (shape === "triangle") return <button title={title} onClick={onClick} style={{ border: "none", background: "transparent", padding: 0 }}><span style={{ ...common, width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: `15px solid ${color}` }} /></button>;
  if (shape === "hex") return <button title={title} onClick={onClick} style={{ border: "none", background: "transparent", padding: 0 }}><span style={{ ...common, background: color, clipPath: "polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%)" }} /></button>;
  const radius = shape === "circle" ? "50%" : "4px";
  return <button title={title} onClick={onClick} style={{ border: "none", background: "transparent", padding: 0 }}><span style={{ ...common, background: color, borderRadius: radius }} /></button>;
}

export function TabCombate({ ficha, onUpdate, efeitosCaldeirao = [], skillTags = [], onNotify }) {
  const [query, setQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [skillModal, setSkillModal] = useState(null);
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [effectDetail, setEffectDetail] = useState(null);

  const combate = useMemo(() => normalizeCombateState(ficha?.combate || {}), [ficha?.combate]);
  const tagsById = useMemo(() => Object.fromEntries((skillTags || []).map((t) => [t.id, t])), [skillTags]);
  const assigned = useMemo(() => (ficha?.skills || []).map((entry) => ({ entry, skill: skillFromEntry(entry) })), [ficha?.skills]);
  const filteredSkills = useMemo(() => assigned.filter(({ skill }) => (`${skill.nome || ""} ${skill.descricao || ""} ${(skill.custos || []).map((c) => c.codigo).join(" ")}`).toLowerCase().includes(query.toLowerCase())), [assigned, query]);

  const activeEffects = useMemo(() => (ficha?.modificadores?.efeitos || []).filter((e) => e.ativo !== false), [ficha?.modificadores?.efeitos]);
  const pendingEntries = useMemo(() => assigned.filter(({ entry }) => combate.pendingSkillIds.includes(entry.id)), [assigned, combate.pendingSkillIds]);

  const statusDefs = useMemo(() => {
    const all = Object.keys(ficha?.status || {}).map((key) => {
      const up = key.toUpperCase();
      const base = CORE_STATUS_META[up];
      return {
        key,
        label: base?.label || up,
        cor: base?.cor || "#9ca3af",
      };
    });
    all.sort((a, b) => {
      const ia = Object.keys(CORE_STATUS_META).indexOf(a.key.toUpperCase());
      const ib = Object.keys(CORE_STATUS_META).indexOf(b.key.toUpperCase());
      if (ia === -1 && ib === -1) return a.key.localeCompare(b.key);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return all;
  }, [ficha?.status]);

  const previewCosts = useMemo(() => {
    const sum = {};
    pendingEntries.forEach(({ skill }) => {
      parseSkillCosts(skill).forEach((c) => {
        sum[c.codigo] = (sum[c.codigo] || 0) + c.quantidade;
      });
    });
    return sum;
  }, [pendingEntries]);

  const byResource = new Map((combate.recursos || []).map((r) => [r.codigo, r]));
  const byStatus = new Map(Object.entries(ficha?.status || {}).map(([k, v]) => [k.toUpperCase(), v]));
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

  const addLog = (mensagem, rodada = combate.rodadaAtual) => {
    saveCombate({ logs: [{ id: uid(), rodada, mensagem, em: Date.now() }, ...(combate.logs || [])].slice(0, 140) });
  };

  const setRound = (nextRound) => saveCombate({ rodadaAtual: Math.max(0, nextRound) });

  const closeRound = () => {
    if (!canCloseRound) {
      onNotify?.("Custos excedem os recursos/status atuais.", "error");
      return;
    }
    const nextResources = combate.recursos.map((r) => ({ ...r, atual: Math.max(0, Number(r.atual || 0) - (previewCosts[r.codigo] || 0)) }));
    const nextStatus = { ...(ficha.status || {}) };
    Object.entries(previewCosts).forEach(([rawCode, qtd]) => {
      const code = resolveCode(rawCode);
      if (!nextStatus[code]) return;
      nextStatus[code] = { ...nextStatus[code], val: Math.max(0, Number(nextStatus[code].val || 0) - qtd) };
    });
    const nextRound = combate.rodadaAtual + 1;
    onUpdate({
      status: nextStatus,
      combate: { ...(ficha.combate || {}), recursos: nextResources, rodadaAtual: nextRound, pendingSkillIds: [] },
    });
    addLog(`Rodada ${nextRound}: ${pendingEntries.map(({ skill }) => skill.nome || "Skill").join(", ") || "sem skills"}.`, nextRound);
  };

  const resetCombate = () => {
    const resetResources = combate.recursos.map((r) => ({ ...r, atual: Number(r.total || 0) }));
    saveCombate({ rodadaAtual: 0, pendingSkillIds: [], recursos: resetResources });
    addLog("Combate resetado para rodada 0.", 0);
  };

  const togglePip = (resource, idx) => {
    const next = idx < Number(resource.atual || 0) ? idx : idx + 1;
    updateResourceById(resource.id, { atual: Math.max(0, Math.min(Number(resource.total || 0), next)) });
  };

  const setStatusValue = (key, field, value) => {
    const curr = ficha?.status?.[key] || { val: 0, max: 1 };
    const patch = { ...curr, [field]: value };
    if (field === "max") patch.val = Math.min(Number(patch.val || 0), Number(value || 1));
    if (field === "val") patch.val = Math.min(Number(value || 0), Number(curr.max || 1));
    onUpdate({ status: { ...(ficha.status || {}), [key]: patch } });
  };

  const addReminder = () => {
    const next = [{ id: uid(), texto: "Novo lembrete", lembrarNaRodada: combate.rodadaAtual + 1, tipo: "naRodada" }, ...(combate.lembretes || [])];
    saveCombate({ lembretes: next });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "330px 1fr 380px", gap: 12, height: "100%" }}>
      <style>{`
        .combat-card { border:1px solid ${G.border}; border-radius:12px; background:linear-gradient(180deg,#13100c,#0c0906); box-shadow:0 8px 30px rgba(0,0,0,.18); }
        .resource-group:hover { border-color:#8a6e3e !important; transform:translateY(-1px); }
      `}</style>

      <div className="combat-card" style={{ padding: 10, display: "grid", gridTemplateRows: "auto auto 1fr auto" }}>
        <div style={{ fontFamily: "'Cinzel',serif", color: G.gold, fontSize: 13, letterSpacing: 2 }}>Rodadas</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "8px 0 10px" }}>
          <HoverButton onClick={() => setRound(combate.rodadaAtual - 1)} style={btnStyle({ padding: "4px 8px" })}>◀</HoverButton>
          <div style={{ color: "#d7c7aa", fontFamily: "monospace", fontSize: 18 }}>R{combate.rodadaAtual}</div>
          <HoverButton onClick={() => setRound(combate.rodadaAtual + 1)} style={btnStyle({ padding: "4px 8px" })}>▶</HoverButton>
        </div>
        <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
          <HoverButton style={btnStyle()} onClick={closeRound}>Próxima rodada (gastar)</HoverButton>
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
              const dur = parseEffectDuration(ef, combate.rodadaAtual);
              return (
                <button
                  key={ef.id}
                  title={`${ef.nome || "Efeito"}${dur ? ` · restante: ${dur.restante}/${dur.total}` : ""}`}
                  onClick={() => setEffectDetail(ef)}
                  style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid #5f4f31", background: "#1a130b", color: "#f2ddb8", cursor: "pointer" }}
                >
                  {ef.icone || (ef.nome || "E").slice(0, 1).toUpperCase()}
                </button>
              );
            })}
            {activeEffects.length === 0 && <span style={{ color: G.muted, fontSize: 11, fontFamily: "monospace" }}>Sem efeitos ativos.</span>}
          </div>
        </div>

        <div style={{ marginTop: 10, border: "1px solid #3f3121", borderRadius: 8, padding: 8, background: "#0d0a07", minHeight: 120, overflow: "auto" }}>
          <div style={{ color: "#c8b188", fontFamily: "monospace", fontSize: 11, marginBottom: 6 }}>Logs e situações</div>
          {(combate.logs || []).slice(0, 14).map((log) => <div key={log.id} style={{ color: "#d7c8ae", fontFamily: "monospace", fontSize: 11, marginBottom: 3 }}>[R{log.rodada}] {log.mensagem}</div>)}
          {(combate.logs || []).length === 0 && <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 11 }}>Sem eventos recentes.</div>}
        </div>
      </div>

      <div className="combat-card" style={{ padding: 10, display: "grid", gridTemplateRows: "auto auto 1fr" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8, marginBottom: 10 }}>
          {statusDefs.map((st) => {
            const status = ficha?.status?.[st.key] || { val: 0, max: 1 };
            const pct = Math.max(0, Math.min(100, (Number(status.val || 0) / Math.max(1, Number(status.max || 1))) * 100));
            return (
              <div key={st.key} style={{ border: "1px solid #52422b", borderRadius: 8, background: "#0d0a07", padding: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: st.cor, fontFamily: "monospace", fontSize: 11 }}>
                  <span>{st.label}</span>
                  <span>{status.val}/{status.max}</span>
                </div>
                <div style={{ height: 7, borderRadius: 4, background: "#221a12", margin: "5px 0" }}><div style={{ width: `${pct}%`, height: "100%", background: st.cor, borderRadius: 4, transition: "width .2s" }} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  <input type="number" min={0} value={status.val} onChange={(e) => setStatusValue(st.key, "val", Math.max(0, Number(e.target.value) || 0))} style={inpStyle({ padding: "3px 5px", fontSize: 10 })} />
                  <input type="number" min={1} value={status.max} onChange={(e) => setStatusValue(st.key, "max", Math.max(1, Number(e.target.value) || 1))} style={inpStyle({ padding: "3px 5px", fontSize: 10 })} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ border: "1px solid #52422b", borderRadius: 8, background: "#0d0a07", padding: 8, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ color: G.gold, fontFamily: "'Cinzel',serif", fontSize: 12 }}>Recursos (clique para gastar/retornar)</div>
            <HoverButton style={btnStyle({ padding: "4px 8px", borderColor: "#695532", color: "#e2c38a" })} onClick={() => setSettingsOpen(true)}>Configurações</HoverButton>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8 }}>
            {(combate.recursos || []).map((r) => (
              <div key={r.id} className="resource-group" style={{ border: "1px solid #4f4028", borderRadius: 9, padding: 7, transition: "all .2s" }}>
                <div style={{ color: "#e7d5b1", fontFamily: "monospace", fontSize: 11, marginBottom: 5, display: "flex", justifyContent: "space-between" }}>
                  <span>{r.codigo}</span>
                  <span style={{ color: G.muted }}>{r.atual}/{r.total}</span>
                </div>
                <div style={{ display: "flex", gap: 6, minHeight: 20, alignItems: "center", flexWrap: "wrap" }}>
                  {Array.from({ length: Number(r.total || 0) }).map((_, idx) => (
                    <ResourcePip
                      key={`${r.id}-${idx}`}
                      shape={r.shape}
                      color={r.cor}
                      active={idx < Number(r.atual || 0)}
                      title={`${r.codigo} ${idx + 1}/${r.total}`}
                      onClick={() => togglePip(r, idx)}
                    />
                  ))}
                  {Number(r.total || 0) === 0 && <span style={{ color: G.muted, fontFamily: "monospace", fontSize: 10 }}>Defina em configurações</span>}
                </div>
              </div>
            ))}
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
            const skillIcon = iconSrc(skill);
            const rankCor = RANK_COR[skill.rank] || skill.cor || "#93a6bf";
            return (
              <div key={entry.id} style={{ border: `1px solid ${selected ? "#9f7a3a" : "#443621"}`, borderRadius: 10, padding: 8, background: selected ? "#231a10" : "#0d0a07", transition: "all .2s" }}>
                <div style={{ display: "grid", gridTemplateColumns: "44px 1fr auto", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 8, border: "1px solid #6b5431", display: "grid", placeItems: "center", background: "#1d1409", overflow: "hidden" }}>
                    {skillIcon ? <ImageViewport src={skillIcon} alt={skill?.nome || "Skill"} size={40} radius={6} adjust={skill?.iconeAjuste} /> : <span style={{ fontSize: 18 }}>{skill?.icone || "?"}</span>}
                  </div>
                  <button onClick={() => toggleSkill(entry.id)} style={{ background: "transparent", border: "none", textAlign: "left", cursor: "pointer" }}>
                    <div style={{ color: "#f1dfbe", fontFamily: "'Cinzel',serif", fontSize: 12 }}>{selected ? "✓ " : ""}{skill.nome || "Skill"}</div>
                    <div style={{ color: rankCor, fontFamily: "monospace", fontSize: 10 }}>{skill.rank || "Sem rank"}</div>
                  </button>
                  <HoverButton style={btnStyle({ padding: "2px 7px", borderColor: "#6f5a34", color: "#d8bf8b" })} onClick={() => setSkillModal(skill)}>Detalhes</HoverButton>
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

      {settingsOpen && <SettingsModal
        combate={combate}
        onClose={() => setSettingsOpen(false)}
        onSave={(nextResources) => saveCombate({ recursos: nextResources })}
        onAddStatus={(payload) => {
          onUpdate({ status: { ...(ficha.status || {}), [payload.codigo]: { val: payload.val, max: payload.max } } });
          onNotify?.(`Barra ${payload.codigo} adicionada em Informações.`, "success");
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

      {effectDetail && <EffectDetailsModal effect={effectDetail} onClose={() => setEffectDetail(null)} />}
      {skillModal && <Modal title={`Skill: ${skillModal.nome || "Sem nome"}`} onClose={() => setSkillModal(null)} wide><SkillDetalhe skill={skillModal} tagsById={tagsById} /></Modal>}
    </div>
  );
}

function SettingsModal({ combate, onClose, onSave, onAddStatus }) {
  const [list, setList] = useState(combate.recursos || []);
  const [resourceDraft, setResourceDraft] = useState({ codigo: "", nome: "", cor: "#e0b44c", shape: "square", total: 1, atual: 1 });
  const [statusDraft, setStatusDraft] = useState({ codigo: "DET", nome: "Determinação", val: 10, max: 10 });

  return (
    <Modal title="Configurações de Combate" onClose={onClose} wide>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ border: "1px solid #3d2f1f", borderRadius: 8, padding: 10 }}>
          <div style={{ color: G.gold, marginBottom: 6, fontFamily: "'Cinzel',serif" }}>Recurso personalizado</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 110px 90px 90px auto", gap: 6 }}>
            <input value={resourceDraft.codigo} onChange={(e) => setResourceDraft((p) => ({ ...p, codigo: e.target.value.toUpperCase() }))} placeholder="Código" style={inpStyle()} />
            <input value={resourceDraft.nome} onChange={(e) => setResourceDraft((p) => ({ ...p, nome: e.target.value }))} placeholder="Nome" style={inpStyle()} />
            <input type="color" value={resourceDraft.cor} onChange={(e) => setResourceDraft((p) => ({ ...p, cor: e.target.value }))} style={inpStyle({ padding: 2 })} />
            <select value={resourceDraft.shape} onChange={(e) => setResourceDraft((p) => ({ ...p, shape: e.target.value }))} style={inpStyle()}><option value="square">Quadrado</option><option value="circle">Círculo</option><option value="triangle">Triângulo</option><option value="hex">Hexágono</option></select>
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
          <div style={{ color: G.gold, marginBottom: 6, fontFamily: "'Cinzel',serif" }}>Barra de status personalizada (integrada em Informações)</div>
          <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 90px 90px auto", gap: 6 }}>
            <input value={statusDraft.codigo} onChange={(e) => setStatusDraft((p) => ({ ...p, codigo: e.target.value.toUpperCase() }))} style={inpStyle()} />
            <input value={statusDraft.nome} onChange={(e) => setStatusDraft((p) => ({ ...p, nome: e.target.value }))} style={inpStyle()} />
            <input type="number" value={statusDraft.val} onChange={(e) => setStatusDraft((p) => ({ ...p, val: Number(e.target.value) || 0 }))} style={inpStyle()} />
            <input type="number" value={statusDraft.max} onChange={(e) => setStatusDraft((p) => ({ ...p, max: Number(e.target.value) || 1 }))} style={inpStyle()} />
            <HoverButton onClick={() => onAddStatus(statusDraft)} style={btnStyle({ borderColor: "#4e7c59", color: "#98e7ad" })}>Adicionar</HoverButton>
          </div>
        </div>

        <div style={{ maxHeight: 260, overflow: "auto", display: "grid", gap: 4 }}>
          {list.map((r) => (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 110px 90px 90px auto", gap: 6 }}>
              <input value={r.codigo} onChange={(e) => setList((prev) => prev.map((x) => x.id === r.id ? { ...x, codigo: e.target.value.toUpperCase() } : x))} style={inpStyle()} />
              <input value={r.nome} onChange={(e) => setList((prev) => prev.map((x) => x.id === r.id ? { ...x, nome: e.target.value } : x))} style={inpStyle()} />
              <input type="color" value={r.cor} onChange={(e) => setList((prev) => prev.map((x) => x.id === r.id ? { ...x, cor: e.target.value } : x))} style={inpStyle({ padding: 2 })} />
              <select value={r.shape} onChange={(e) => setList((prev) => prev.map((x) => x.id === r.id ? { ...x, shape: e.target.value } : x))} style={inpStyle()}><option value="square">Quadrado</option><option value="circle">Círculo</option><option value="triangle">Triângulo</option><option value="hex">Hexágono</option></select>
              <input type="number" min={0} value={r.atual} onChange={(e) => setList((prev) => prev.map((x) => x.id === r.id ? { ...x, atual: Number(e.target.value) || 0 } : x))} style={inpStyle()} />
              <input type="number" min={0} value={r.total} onChange={(e) => setList((prev) => prev.map((x) => x.id === r.id ? { ...x, total: Number(e.target.value) || 0 } : x))} style={inpStyle()} />
              <HoverButton onClick={() => setList((prev) => prev.filter((x) => x.id !== r.id))} style={btnStyle({ borderColor: "#87413a", color: "#ff9990" })}>✕</HoverButton>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <HoverButton onClick={onClose} style={btnStyle({ borderColor: "#4f4f4f", color: "#b8b8b8" })}>Fechar</HoverButton>
          <HoverButton onClick={() => { onSave(list); onClose(); }} style={btnStyle()}>Salvar</HoverButton>
        </div>
      </div>
    </Modal>
  );
}

function EffectsModal({ efeitos, biblioteca, rodadaAtual, onClose, onChange }) {
  const [query, setQuery] = useState("");
  const [selectedLib, setSelectedLib] = useState("");
  const [inspect, setInspect] = useState(null);

  const filteredLib = useMemo(() => (biblioteca || []).filter((ef) => `${ef.nome || ""} ${ef.descricao || ""} ${ef.efeitoMecanico || ""}`.toLowerCase().includes(query.toLowerCase())), [biblioteca, query]);

  const attach = () => {
    const tpl = (biblioteca || []).find((x) => x.id === selectedLib);
    if (!tpl) return;
    const inst = instantiateEffectFromTemplate(tpl, { rodadaInicio: rodadaAtual, ativo: true, origem: "Efeito", origemDetalhe: tpl.nome || "Caldeirão" });
    onChange([inst, ...(efeitos || [])]);
  };

  return (
    <Modal title="Efeitos de Combate" onClose={onClose} wide>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ border: "1px solid #2f2f2f", borderRadius: 8, padding: 8 }}>
          <div style={{ color: G.gold, fontFamily: "'Cinzel',serif", marginBottom: 6 }}>Biblioteca</div>
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
                <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 10 }}>{ef.efeitoMecanico || "Sem efeito mecânico"}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ border: "1px solid #2f2f2f", borderRadius: 8, padding: 8 }}>
          <div style={{ color: G.gold, fontFamily: "'Cinzel',serif", marginBottom: 6 }}>Efeitos anexados</div>
          <div style={{ maxHeight: 340, overflow: "auto", display: "grid", gap: 6 }}>
            {(efeitos || []).map((ef) => {
              const dur = parseEffectDuration(ef, rodadaAtual);
              return (
                <div key={ef.id} style={{ border: "1px solid #333", borderRadius: 7, padding: 7, display: "grid", gridTemplateColumns: "1fr 100px auto auto", gap: 6, alignItems: "center" }}>
                  <div>
                    <div style={{ color: "#f2dfbe", fontFamily: "'Cinzel',serif", fontSize: 12 }}>{ef.nome || "Efeito"}</div>
                    <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 10 }}>{ef.ativo === false ? "Inativo (não aplicado)" : "Ativo"}{dur ? ` · Duração ${dur.restante}/${dur.total}` : ""}</div>
                  </div>
                  <select value={ef.ativo === false ? "off" : "on"} onChange={(e) => onChange((efeitos || []).map((x) => (x.id === ef.id ? { ...x, ativo: e.target.value === "on" } : x)))} style={inpStyle()}>
                    <option value="on">Ativo</option>
                    <option value="off">Inativo</option>
                  </select>
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
  return (
    <Modal title="Lembretes" onClose={onClose} wide>
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 11 }}>Rodada atual: {rodadaAtual}</div>
          <HoverButton onClick={onAdd} style={btnStyle({ padding: "4px 10px" })}>+ Lembrete</HoverButton>
        </div>
        {(lembretes || []).map((l) => (
          <div key={l.id} style={{ display: "grid", gridTemplateColumns: "1fr 140px auto", gap: 6 }}>
            <input value={l.texto || ""} onChange={(e) => onChange((lembretes || []).map((x) => (x.id === l.id ? { ...x, texto: e.target.value } : x)))} style={inpStyle()} />
            <input type="number" value={l.lembrarNaRodada || rodadaAtual} onChange={(e) => onChange((lembretes || []).map((x) => (x.id === l.id ? { ...x, lembrarNaRodada: Number(e.target.value) || rodadaAtual, tipo: "naRodada" } : x)))} style={inpStyle()} />
            <HoverButton onClick={() => onChange((lembretes || []).filter((x) => x.id !== l.id))} style={btnStyle({ borderColor: "#87413a", color: "#ff9990" })}>✕</HoverButton>
          </div>
        ))}
      </div>
    </Modal>
  );
}
