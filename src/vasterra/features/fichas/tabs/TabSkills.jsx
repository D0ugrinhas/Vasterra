import React, { useMemo, useState } from "react";
import { HoverButton } from "../../../components/primitives/Interactive";
import { uid, novaSkill } from "../../../core/factories";
import { btnStyle, G, inpStyle } from "../../../ui/theme";
import { SkillEditor } from "../../biblioteca/SkillEditor";
import { resolveSkillCode } from "./skillCodeResolver";

function skillBadge(scope) {
  return scope === "local" ? { text: "LOCAL", color: "#9b59b6" } : { text: "BIBLIOTECA", color: "#3498db" };
}

function normalizeAssignedSkills(ficha) {
  if (!Array.isArray(ficha?.skills)) return [];
  return ficha.skills.map((entry) => {
    if (entry?.skill) return entry;
    return {
      id: uid(),
      scope: "local",
      sourceSkillId: "",
      skill: { ...novaSkill(), ...(entry || {}) },
    };
  });
}

function SkillAssignedCard({ entry, onEdit, onRemove, ficha }) {
  const [showResolved, setShowResolved] = useState(false);
  const badge = skillBadge(entry.scope);
  const preview = useMemo(() => resolveSkillCode(entry.skill?.descricaoCode || "", ficha), [entry.skill?.descricaoCode, ficha]);

  return (
    <div style={{ border: "1px solid #30445f", borderRadius: 10, padding: 10, background: "linear-gradient(180deg,#0f1a2d,#0a1322)", display: "grid", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div>
          <div style={{ color: "#d4e7ff", fontFamily: "'Cinzel',serif" }}>{entry.skill?.nome || "Skill sem nome"}</div>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: badge.color }}>{badge.text}</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <HoverButton onClick={onEdit} style={btnStyle({ padding: "4px 8px" })}>Editar</HoverButton>
          <HoverButton onClick={onRemove} style={btnStyle({ borderColor: "#e74c3c66", color: "#ff9087", padding: "4px 8px" })}>Desatribuir</HoverButton>
        </div>
      </div>

      <div style={{ color: "#8fb5dd", fontSize: 11, fontFamily: "monospace" }}>{entry.skill?.descricao || "Sem descrição"}</div>

      <div style={{ border: "1px solid #273b59", borderRadius: 8, background: "#0a1220", position: "relative" }}>
        <button
          onClick={() => setShowResolved((v) => !v)}
          title="Alternar visão do código"
          style={{ position: "absolute", top: 6, right: 6, border: "1px solid #446089", borderRadius: 999, background: "#0f1a2f", color: "#9ec6ff", width: 24, height: 24, cursor: "pointer" }}
        >
          👁
        </button>
        <pre style={{ margin: 0, padding: "10px 36px 10px 10px", whiteSpace: "pre-wrap", color: "#a6d3ff", fontSize: 11, fontFamily: "monospace" }}>
          {showResolved
            ? `${preview.resolved.join("\n")}${preview.resolved.length ? "\n\n" : ""}${preview.resolvedCode || "// sem descrição code"}`
            : (entry.skill?.descricaoCode || "// sem descrição code")}
        </pre>
      </div>
    </div>
  );
}

export function TabSkills({ ficha, onUpdate, bibliotecaSkills = [], skillTags = [], onNotify }) {
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const assigned = normalizeAssignedSkills(ficha);
  const assignedIds = new Set(assigned.map((s) => s.sourceSkillId).filter(Boolean));

  const filteredBiblioteca = useMemo(() => (bibliotecaSkills || []).filter((s) => {
    const pool = `${s.nome || ""} ${s.descricao || ""}`.toLowerCase();
    return !query || pool.includes(query.toLowerCase());
  }), [bibliotecaSkills, query]);

  const filteredAssigned = useMemo(() => assigned.filter((s) => {
    const sk = s.skill || {};
    const pool = `${sk.nome || ""} ${sk.descricao || ""}`.toLowerCase();
    return !query || pool.includes(query.toLowerCase());
  }), [assigned, query]);

  const persist = (next) => onUpdate({ skills: next });

  const assignFromLibrary = (skill) => {
    if (!skill?.id || assignedIds.has(skill.id)) return;
    persist([
      ...assigned,
      {
        id: uid(),
        scope: "biblioteca",
        sourceSkillId: skill.id,
        skill: { ...skill, id: uid(), atualizado: Date.now() },
      },
    ]);
    onNotify?.(`Skill atribuída: ${skill.nome}`, "success");
  };

  const unassign = (id) => persist(assigned.filter((s) => s.id !== id));

  const openNewLocal = () => {
    const local = { id: uid(), scope: "local", sourceSkillId: "", skill: { ...novaSkill(), nome: "Nova Skill Local" } };
    persist([...assigned, local]);
    setEditingId(local.id);
    setEditorOpen(true);
  };

  const editingEntry = assigned.find((s) => s.id === editingId) || null;

  const saveSkill = (nextSkill) => {
    if (!editingEntry) return;
    persist(assigned.map((s) => (s.id === editingEntry.id ? { ...s, skill: { ...nextSkill, atualizado: Date.now() } } : s)));
    setEditorOpen(false);
    setEditingId(null);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <div style={{ border: "1px solid " + G.border, borderRadius: 10, background: G.bg2, padding: 10, display: "grid", gap: 8 }}>
        <div style={{ fontFamily: "'Cinzel',serif", color: G.gold, letterSpacing: 2 }}>Atribuidor da Biblioteca</div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar skills..." style={inpStyle()} />
        <div style={{ maxHeight: "62vh", overflowY: "auto", display: "grid", gap: 6 }}>
          {filteredBiblioteca.map((s) => {
            const already = assignedIds.has(s.id);
            return (
              <div key={s.id} style={{ border: "1px solid #30445f", borderRadius: 8, padding: 8, display: "grid", gap: 5, background: "#0c1524" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                  <div style={{ color: "#d5e7ff", fontFamily: "'Cinzel',serif", fontSize: 13 }}>{s.nome}</div>
                  <HoverButton
                    disabled={already}
                    onClick={() => assignFromLibrary(s)}
                    style={btnStyle({ padding: "4px 8px", borderColor: already ? "#3d4756" : "#3f78aa", color: already ? "#607085" : "#9ed0ff" })}
                  >
                    {already ? "Atribuída" : "Atribuir"}
                  </HoverButton>
                </div>
                <div style={{ color: "#8fb5dd", fontFamily: "monospace", fontSize: 11 }}>{s.descricao || "Sem descrição"}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ border: "1px solid " + G.border, borderRadius: 10, background: G.bg2, padding: 10, display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "'Cinzel',serif", color: G.gold, letterSpacing: 2 }}>Skills da Ficha</div>
          <HoverButton onClick={openNewLocal}>+ Skill Local</HoverButton>
        </div>
        <div style={{ maxHeight: "62vh", overflowY: "auto", display: "grid", gap: 8 }}>
          {filteredAssigned.map((entry) => (
            <SkillAssignedCard
              key={entry.id}
              entry={entry}
              ficha={ficha}
              onEdit={() => { setEditingId(entry.id); setEditorOpen(true); }}
              onRemove={() => unassign(entry.id)}
            />
          ))}
          {filteredAssigned.length === 0 && <div style={{ color: G.muted, fontFamily: "monospace" }}>Nenhuma skill atribuída para o filtro atual.</div>}
        </div>
      </div>

      {editorOpen && editingEntry && (
        <SkillEditor
          skill={editingEntry.skill}
          tags={skillTags}
          onClose={() => { setEditorOpen(false); setEditingId(null); }}
          onSave={saveSkill}
        />
      )}
    </div>
  );
}
