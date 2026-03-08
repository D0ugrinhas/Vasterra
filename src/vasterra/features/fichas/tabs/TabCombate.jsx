import React, { useMemo, useState } from "react";
import { uid } from "../../../core/factories";
import { G, btnStyle, inpStyle } from "../../../ui/theme";
import { HoverButton } from "../../../components/primitives/Interactive";
import { Modal, EffectDetailsModal } from "../../shared/components";
import { SkillDetalhe } from "../../biblioteca/SkillDetalhe";

const CORE_RESOURCES = [
  { codigo: "ACO", nome: "Ação", cor: "#37c96a", shape: "circle", total: 2 },
  { codigo: "MOV", nome: "Movimento", cor: "#2b83ff", shape: "square", total: 1 },
  { codigo: "REA", nome: "Reação", cor: "#ff4f4f", shape: "triangle", total: 1 },
  { codigo: "ESF", nome: "Esforço", cor: "#8a1414", shape: "hex", total: 1 },
];

const CORE_STATUS = [
  { key: "VIT", label: "VIT", cor: "#ff5b4d" },
  { key: "EST", label: "EST", cor: "#d7d748" },
  { key: "MAN", label: "MAN", cor: "#4a7dff" },
  { key: "SAN", label: "SAN", cor: "#c15cff" },
  { key: "CONS", label: "CONSC", cor: "#50c5aa" },
];

const SHAPE = {
  circle: "50%",
  square: "5px",
  triangle: "0",
  hex: "8px",
};

function normalizeCombateState(combate = {}) {
  const fromOld = Array.isArray(combate?.recursos) ? combate.recursos : [];
  const resourceByCode = new Map(fromOld.map((r) => [String(r.nome || r.codigo || "").toUpperCase(), r]));
  const base = CORE_RESOURCES.map((core) => {
    const old = resourceByCode.get(core.codigo);
    return {
      id: old?.id || uid(),
      codigo: core.codigo,
      nome: core.nome,
      cor: old?.cor || core.cor,
      shape: old?.slotShape || old?.shape || core.shape,
      total: Number(old?.max ?? old?.total ?? core.total),
      atual: Number(old?.atual ?? old?.max ?? old?.total ?? core.total),
    };
  });
  const customs = fromOld
    .filter((r) => !CORE_RESOURCES.some((c) => c.codigo === String(r.nome || r.codigo || "").toUpperCase()))
    .map((r) => ({
      id: r.id || uid(),
      codigo: String(r.nome || r.codigo || "").toUpperCase() || "NOVO",
      nome: r.descricao || String(r.nome || r.codigo || "Recurso"),
      cor: r.cor || "#7f8c8d",
      shape: r.slotShape || r.shape || "square",
      total: Number(r.max ?? r.total ?? 0),
      atual: Number(r.atual ?? r.max ?? r.total ?? 0),
    }));

  return {
    rodadaAtual: Number(combate?.rodadaAtual || 0),
    lembretes: Array.isArray(combate?.lembretes) ? combate.lembretes : [],
    logs: Array.isArray(combate?.logs) ? combate.logs : [],
    pendingSkillIds: Array.isArray(combate?.pendingSkillIds) ? combate.pendingSkillIds : [],
    recursos: [...base, ...customs],
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

function shapeView(shape, color) {
  if (shape === "triangle") {
    return <span style={{ width: 0, height: 0, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderBottom: `16px solid ${color}` }} />;
  }
  if (shape === "hex") {
    return <span style={{ width: 16, height: 16, background: color, clipPath: "polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%)" }} />;
  }
  return <span style={{ width: 16, height: 16, borderRadius: SHAPE[shape] || "5px", background: color }} />;
}

export function TabCombate({ ficha, onUpdate, onNotify }) {
  const [query, setQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [skillModal, setSkillModal] = useState(null);
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [effectDetail, setEffectDetail] = useState(null);

  const combate = useMemo(() => normalizeCombateState(ficha?.combate || {}), [ficha?.combate]);
  const assigned = useMemo(() => (ficha?.skills || []).map((entry) => ({ entry, skill: skillFromEntry(entry) })), [ficha?.skills]);
  const filteredSkills = useMemo(() => assigned.filter(({ skill }) => (`${skill.nome || ""} ${skill.descricao || ""} ${(skill.custos || []).map((c) => c.codigo).join(" ")}`).toLowerCase().includes(query.toLowerCase())), [assigned, query]);

  const activeEffects = useMemo(() => (ficha?.modificadores?.efeitos || []).filter((e) => e.ativo !== false), [ficha?.modificadores?.efeitos]);

  const pendingEntries = useMemo(() => assigned.filter(({ entry }) => combate.pendingSkillIds.includes(entry.id)), [assigned, combate.pendingSkillIds]);

  const previewCosts = useMemo(() => {
    const sum = {};
    pendingEntries.forEach(({ skill }) => {
      parseSkillCosts(skill).forEach((c) => { sum[c.codigo] = (sum[c.codigo] || 0) + c.quantidade; });
    });
    return sum;
  }, [pendingEntries]);

  const byResource = new Map((combate.recursos || []).map((r) => [r.codigo, r]));
  const byStatus = new Map(Object.entries(ficha?.status || {}).map(([k, v]) => [k.toUpperCase(), v]));
  const resolveCode = (code) => (code === "CONSC" ? "CONS" : code);

  const canCloseRound = Object.entries(previewCosts).every(([rawCode, qtd]) => {
    const code = resolveCode(rawCode);
    const res = byResource.get(code);
    if (res) return Number(res.atual || 0) >= qtd;
    const st = byStatus.get(code);
    if (st) return Number(st.val || 0) >= qtd;
    return false;
  });

  const saveCombate = (patch) => onUpdate({ combate: { ...(ficha.combate || {}), ...patch } });

  const updateResource = (id, patch) => saveCombate({ recursos: combate.recursos.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  const toggleSkill = (id) => {
    const list = combate.pendingSkillIds.includes(id)
      ? combate.pendingSkillIds.filter((x) => x !== id)
      : [...combate.pendingSkillIds, id];
    saveCombate({ pendingSkillIds: list });
  };

  const addLog = (mensagem) => {
    saveCombate({ logs: [{ id: uid(), rodada: combate.rodadaAtual, mensagem, em: Date.now() }, ...(combate.logs || [])].slice(0, 120) });
  };

  const closeRound = () => {
    if (!canCloseRound) {
      onNotify?.("Custos excedem os recursos/status atuais.", "error");
      return;
    }
    const newResources = combate.recursos.map((r) => {
      const spend = previewCosts[r.codigo] || 0;
      return { ...r, atual: Math.max(0, Number(r.atual || 0) - spend) };
    });
    const nextStatus = { ...(ficha.status || {}) };
    Object.entries(previewCosts).forEach(([rawCode, qtd]) => {
      const code = resolveCode(rawCode);
      if (!nextStatus[code]) return;
      nextStatus[code] = { ...nextStatus[code], val: Math.max(0, Number(nextStatus[code].val || 0) - qtd) };
    });
    const usedNames = pendingEntries.map(({ skill }) => skill.nome || "Skill").join(", ");
    onUpdate({ status: nextStatus, combate: { ...(ficha.combate || {}), recursos: newResources, rodadaAtual: combate.rodadaAtual + 1, pendingSkillIds: [] } });
    addLog(`Rodada ${combate.rodadaAtual + 1}: ${usedNames || "sem skills"}.`);
    onNotify?.("Rodada avançada com sucesso.", "success");
  };

  const setStatusValue = (key, field, value) => {
    const curr = ficha?.status?.[key] || { val: 0, max: 1 };
    const patch = { ...curr, [field]: value };
    if (field === "max") patch.val = Math.min(Number(patch.val || 0), Number(value || 1));
    onUpdate({ status: { ...(ficha.status || {}), [key]: patch } });
  };

  const addReminder = () => {
    const next = [{ id: uid(), texto: "Novo lembrete", lembrarNaRodada: combate.rodadaAtual + 1, tipo: "naRodada" }, ...(combate.lembretes || [])];
    saveCombate({ lembretes: next });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr 360px", gap: 12, height: "100%" }}>
      <div style={{ border: `1px solid ${G.border}`, borderRadius: 10, padding: 10, background: G.bg2, display: "grid", gridTemplateRows: "auto auto 1fr auto" }}>
        <div style={{ fontFamily: "'Cinzel',serif", color: G.gold, fontSize: 13, letterSpacing: 2 }}>Rodadas</div>
        <div style={{ color: "#c8b188", marginBottom: 6 }}>Atual: <b>{combate.rodadaAtual}</b></div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <HoverButton style={btnStyle({ flex: 1 })} onClick={closeRound}>Próxima rodada</HoverButton>
          <HoverButton style={btnStyle({ borderColor: "#6b5b35", color: "#d7c193" })} onClick={() => setRemindersOpen(true)}>Lembretes</HoverButton>
          <HoverButton style={btnStyle({ borderColor: "#55739a", color: "#9dcbff" })} onClick={() => setEffectsOpen(true)}>Efeitos</HoverButton>
        </div>

        <div style={{ border: "1px solid #3f3121", borderRadius: 8, padding: 8, background: "#0d0a07", overflow: "auto" }}>
          <div style={{ color: "#c8b188", fontFamily: "monospace", fontSize: 11, marginBottom: 6 }}>Efeitos ativos</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {activeEffects.map((ef) => (
              <button
                key={ef.id}
                title={`${ef.nome || "Efeito"} · duração: ${ef.duracao || ef.duracaoRodadas || "?"} rodadas`}
                onClick={() => setEffectDetail(ef)}
                style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #5f4f31", background: "#1a130b", color: "#f2ddb8", cursor: "pointer" }}
              >
                {ef.icone || (ef.nome || "E").slice(0, 1).toUpperCase()}
              </button>
            ))}
            {activeEffects.length === 0 && <span style={{ color: G.muted, fontSize: 11, fontFamily: "monospace" }}>Sem efeitos ativos.</span>}
          </div>
        </div>

        <div style={{ marginTop: 10, border: "1px solid #3f3121", borderRadius: 8, padding: 8, background: "#0d0a07", minHeight: 120, overflow: "auto" }}>
          <div style={{ color: "#c8b188", fontFamily: "monospace", fontSize: 11, marginBottom: 6 }}>Logs e situações</div>
          {(combate.logs || []).slice(0, 12).map((log) => <div key={log.id} style={{ color: "#d7c8ae", fontFamily: "monospace", fontSize: 11, marginBottom: 3 }}>[R{log.rodada}] {log.mensagem}</div>)}
          {(combate.logs || []).length === 0 && <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 11 }}>Sem eventos recentes.</div>}
        </div>
      </div>

      <div style={{ border: `1px solid ${G.border}`, borderRadius: 10, background: G.bg2, padding: 10, display: "grid", gridTemplateRows: "auto auto 1fr" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 10 }}>
          {CORE_STATUS.map((st) => {
            const status = ficha?.status?.[st.key] || { val: 0, max: 1 };
            const pct = Math.max(0, Math.min(100, (Number(status.val || 0) / Math.max(1, Number(status.max || 1))) * 100));
            return (
              <div key={st.key} style={{ border: "1px solid #52422b", borderRadius: 8, background: "#0d0a07", padding: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: st.cor, fontFamily: "monospace", fontSize: 11 }}>
                  <span>{st.label}</span>
                  <span>{status.val}/{status.max}</span>
                </div>
                <div style={{ height: 7, borderRadius: 4, background: "#221a12", margin: "5px 0" }}><div style={{ width: `${pct}%`, height: "100%", background: st.cor, borderRadius: 4 }} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  <input type="number" min={0} value={status.val} onChange={(e) => setStatusValue(st.key, "val", Math.max(0, Number(e.target.value) || 0))} style={inpStyle({ padding: "3px 5px", fontSize: 10 })} />
                  <input type="number" min={1} value={status.max} onChange={(e) => setStatusValue(st.key, "max", Math.max(1, Number(e.target.value) || 1))} style={inpStyle({ padding: "3px 5px", fontSize: 10 })} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ border: "1px solid #52422b", borderRadius: 8, background: "#0d0a07", padding: 8, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ color: G.gold, fontFamily: "'Cinzel',serif", fontSize: 12 }}>Recursos</div>
            <HoverButton style={btnStyle({ padding: "4px 8px", borderColor: "#695532", color: "#e2c38a" })} onClick={() => setSettingsOpen(true)}>Configurações</HoverButton>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {(combate.recursos || []).map((r) => (
              <div key={r.id} style={{ border: "1px solid #534124", borderRadius: 8, padding: 6, minWidth: 120 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#e7d5b1", fontFamily: "monospace", fontSize: 11 }}>{shapeView(r.shape, r.cor)} {r.codigo}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 4 }}>
                  <input type="number" min={0} value={r.atual} onChange={(e) => updateResource(r.id, { atual: Math.max(0, Number(e.target.value) || 0) })} style={inpStyle({ padding: "3px 5px", fontSize: 10 })} />
                  <input type="number" min={0} value={r.total} onChange={(e) => updateResource(r.id, { total: Math.max(0, Number(e.target.value) || 0) })} style={inpStyle({ padding: "3px 5px", fontSize: 10 })} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ border: "1px solid #52422b", borderRadius: 8, background: "#0d0a07", padding: 8 }}>
          <div style={{ color: "#d6bb89", fontFamily: "monospace", fontSize: 11, marginBottom: 6 }}>Prévia de custos selecionados</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            {Object.entries(previewCosts).map(([code, val]) => (
              <span key={code} style={{ padding: "2px 8px", borderRadius: 999, background: "#2f2416", border: "1px solid #5f4f31", color: "#f0d7ab", fontFamily: "monospace", fontSize: 11 }}>{val}{code}</span>
            ))}
            {Object.keys(previewCosts).length === 0 && <span style={{ color: G.muted, fontFamily: "monospace", fontSize: 11 }}>Nenhum custo selecionado.</span>}
          </div>
          <div style={{ color: canCloseRound ? "#8ef7a9" : "#ff8f8f", fontFamily: "monospace", fontSize: 11 }}>{canCloseRound ? "Pronto para avançar rodada." : "Custos inválidos para rodada atual."}</div>
        </div>
      </div>

      <div style={{ border: `1px solid ${G.border}`, borderRadius: 10, background: G.bg2, padding: 10, display: "grid", gridTemplateRows: "auto 1fr" }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ color: G.gold, fontFamily: "'Cinzel',serif", fontSize: 13 }}>Skills atribuídas</div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar skill..." style={inpStyle({ marginTop: 6 })} />
        </div>
        <div style={{ overflow: "auto", display: "grid", gap: 6 }}>
          {filteredSkills.map(({ entry, skill }) => {
            const selected = combate.pendingSkillIds.includes(entry.id);
            const costs = parseSkillCosts(skill);
            return (
              <div key={entry.id} style={{ border: `1px solid ${selected ? "#9f7a3a" : "#443621"}`, borderRadius: 8, padding: 7, background: selected ? "#22190f" : "#0d0a07" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                  <button onClick={() => toggleSkill(entry.id)} style={{ background: "transparent", border: "none", color: "#f1dfbe", textAlign: "left", cursor: "pointer", fontFamily: "'Cinzel',serif", fontSize: 12 }}>{selected ? "✓ " : ""}{skill.nome || "Skill"}</button>
                  <HoverButton style={btnStyle({ padding: "2px 7px", borderColor: "#6f5a34", color: "#d8bf8b" })} onClick={() => setSkillModal(skill)}>Detalhes</HoverButton>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                  {costs.map((c) => <span key={`${entry.id}-${c.codigo}`} style={{ fontSize: 10, fontFamily: "monospace", padding: "1px 6px", borderRadius: 999, background: "#2f2416", border: "1px solid #5f4f31", color: "#f0d7ab" }}>{c.quantidade}{c.codigo}</span>)}
                  {costs.length === 0 && <span style={{ color: G.muted, fontFamily: "monospace", fontSize: 10 }}>Sem custo</span>}
                </div>
              </div>
            );
          })}
          {filteredSkills.length === 0 && <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 12 }}>Nenhuma skill encontrada.</div>}
        </div>
      </div>

      {settingsOpen && <SettingsModal combate={combate} onClose={() => setSettingsOpen(false)} onSave={(next) => saveCombate({ recursos: next })} onAddStatus={(payload) => {
        onUpdate({ status: { ...(ficha.status || {}), [payload.codigo]: { val: payload.val, max: payload.max } } });
        onNotify?.(`Barra ${payload.codigo} adicionada em Informações.`, "success");
      }} />}

      {effectsOpen && <EffectsModal effects={ficha?.modificadores?.efeitos || []} onClose={() => setEffectsOpen(false)} onChange={(next) => onUpdate({ modificadores: { ...(ficha.modificadores || {}), efeitos: next } })} />}

      {remindersOpen && <RemindersModal lembretes={combate.lembretes || []} rodadaAtual={combate.rodadaAtual} onClose={() => setRemindersOpen(false)} onChange={(next) => saveCombate({ lembretes: next })} onAdd={addReminder} />}

      {effectDetail && <EffectDetailsModal effect={effectDetail} onClose={() => setEffectDetail(null)} />}
      {skillModal && <Modal title={`Skill: ${skillModal.nome || "Sem nome"}`} onClose={() => setSkillModal(null)} wide><SkillDetalhe skill={skillModal} /></Modal>}
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
          <div style={{ color: G.gold, marginBottom: 6, fontFamily: "'Cinzel',serif" }}>Novo recurso personalizado</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 100px 90px 90px auto", gap: 6 }}>
            <input value={resourceDraft.codigo} onChange={(e) => setResourceDraft((p) => ({ ...p, codigo: e.target.value.toUpperCase() }))} placeholder="Código" style={inpStyle()} />
            <input value={resourceDraft.nome} onChange={(e) => setResourceDraft((p) => ({ ...p, nome: e.target.value }))} placeholder="Nome" style={inpStyle()} />
            <input type="color" value={resourceDraft.cor} onChange={(e) => setResourceDraft((p) => ({ ...p, cor: e.target.value }))} style={inpStyle({ padding: 2 })} />
            <select value={resourceDraft.shape} onChange={(e) => setResourceDraft((p) => ({ ...p, shape: e.target.value }))} style={inpStyle()}><option value="square">Quadrado</option><option value="circle">Círculo</option><option value="triangle">Triângulo</option><option value="hex">Hexágono</option></select>
            <input type="number" value={resourceDraft.atual} onChange={(e) => setResourceDraft((p) => ({ ...p, atual: Number(e.target.value) || 0 }))} style={inpStyle()} />
            <input type="number" value={resourceDraft.total} onChange={(e) => setResourceDraft((p) => ({ ...p, total: Number(e.target.value) || 0 }))} style={inpStyle()} />
            <HoverButton onClick={() => {
              if (!resourceDraft.codigo.trim()) return;
              setList((prev) => [...prev, { id: uid(), ...resourceDraft }]);
              setResourceDraft({ codigo: "", nome: "", cor: "#e0b44c", shape: "square", total: 1, atual: 1 });
            }} style={btnStyle()}>Adicionar</HoverButton>
          </div>
        </div>

        <div style={{ border: "1px solid #3d2f1f", borderRadius: 8, padding: 10 }}>
          <div style={{ color: G.gold, marginBottom: 6, fontFamily: "'Cinzel',serif" }}>Barra de status personalizada (linkada à aba Informações)</div>
          <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 90px 90px auto", gap: 6 }}>
            <input value={statusDraft.codigo} onChange={(e) => setStatusDraft((p) => ({ ...p, codigo: e.target.value.toUpperCase() }))} style={inpStyle()} />
            <input value={statusDraft.nome} onChange={(e) => setStatusDraft((p) => ({ ...p, nome: e.target.value }))} style={inpStyle()} />
            <input type="number" value={statusDraft.val} onChange={(e) => setStatusDraft((p) => ({ ...p, val: Number(e.target.value) || 0 }))} style={inpStyle()} />
            <input type="number" value={statusDraft.max} onChange={(e) => setStatusDraft((p) => ({ ...p, max: Number(e.target.value) || 1 }))} style={inpStyle()} />
            <HoverButton onClick={() => onAddStatus(statusDraft)} style={btnStyle({ borderColor: "#4e7c59", color: "#98e7ad" })}>Adicionar</HoverButton>
          </div>
        </div>

        <div style={{ maxHeight: 250, overflow: "auto", display: "grid", gap: 4 }}>
          {list.map((r) => <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 100px 90px 90px auto", gap: 6 }}>
            <input value={r.codigo} onChange={(e) => setList((prev) => prev.map((x) => x.id === r.id ? { ...x, codigo: e.target.value.toUpperCase() } : x))} style={inpStyle()} />
            <input value={r.nome} onChange={(e) => setList((prev) => prev.map((x) => x.id === r.id ? { ...x, nome: e.target.value } : x))} style={inpStyle()} />
            <input type="color" value={r.cor} onChange={(e) => setList((prev) => prev.map((x) => x.id === r.id ? { ...x, cor: e.target.value } : x))} style={inpStyle({ padding: 2 })} />
            <select value={r.shape} onChange={(e) => setList((prev) => prev.map((x) => x.id === r.id ? { ...x, shape: e.target.value } : x))} style={inpStyle()}><option value="square">Quadrado</option><option value="circle">Círculo</option><option value="triangle">Triângulo</option><option value="hex">Hexágono</option></select>
            <input type="number" value={r.atual} onChange={(e) => setList((prev) => prev.map((x) => x.id === r.id ? { ...x, atual: Number(e.target.value) || 0 } : x))} style={inpStyle()} />
            <input type="number" value={r.total} onChange={(e) => setList((prev) => prev.map((x) => x.id === r.id ? { ...x, total: Number(e.target.value) || 0 } : x))} style={inpStyle()} />
            <HoverButton onClick={() => setList((prev) => prev.filter((x) => x.id !== r.id))} style={btnStyle({ borderColor: "#87413a", color: "#ff9990" })}>✕</HoverButton>
          </div>)}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <HoverButton onClick={onClose} style={btnStyle({ borderColor: "#4f4f4f", color: "#b8b8b8" })}>Fechar</HoverButton>
          <HoverButton onClick={() => { onSave(list); onClose(); }} style={btnStyle()}>Salvar</HoverButton>
        </div>
      </div>
    </Modal>
  );
}

function EffectsModal({ effects, onClose, onChange }) {
  return (
    <Modal title="Efeitos e compatibilidade" onClose={onClose} wide>
      <div style={{ display: "grid", gap: 8 }}>
        {(effects || []).map((ef) => (
          <div key={ef.id} style={{ display: "grid", gridTemplateColumns: "1fr 100px auto", gap: 8, border: "1px solid #2f2f2f", borderRadius: 8, padding: 8 }}>
            <div>
              <div style={{ color: "#f0dfc2", fontFamily: "'Cinzel',serif" }}>{ef.nome || "Efeito"}</div>
              <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 11 }}>{ef.efeito || ef.efeitosMecanicos || ef.efeitoMecanico || "Sem descrição"}</div>
            </div>
            <select value={ef.ativo === false ? "off" : "on"} onChange={(e) => onChange((effects || []).map((x) => x.id === ef.id ? { ...x, ativo: e.target.value === "on" } : x))} style={inpStyle()}>
              <option value="on">Ativo</option>
              <option value="off">Inativo</option>
            </select>
            <HoverButton onClick={() => onChange((effects || []).filter((x) => x.id !== ef.id))} style={btnStyle({ borderColor: "#87413a", color: "#ff9990" })}>Remover</HoverButton>
          </div>
        ))}
        {(effects || []).length === 0 && <div style={{ color: G.muted, fontFamily: "monospace" }}>Sem efeitos anexados.</div>}
      </div>
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
            <input value={l.texto || ""} onChange={(e) => onChange((lembretes || []).map((x) => x.id === l.id ? { ...x, texto: e.target.value } : x))} style={inpStyle()} />
            <input type="number" value={l.lembrarNaRodada || rodadaAtual} onChange={(e) => onChange((lembretes || []).map((x) => x.id === l.id ? { ...x, lembrarNaRodada: Number(e.target.value) || rodadaAtual, tipo: "naRodada" } : x))} style={inpStyle()} />
            <HoverButton onClick={() => onChange((lembretes || []).filter((x) => x.id !== l.id))} style={btnStyle({ borderColor: "#87413a", color: "#ff9990" })}>✕</HoverButton>
          </div>
        ))}
      </div>
    </Modal>
  );
}
