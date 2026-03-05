import React, { useEffect, useMemo, useState } from "react";
import { HoverButton } from "../../../components/primitives/Interactive";
import { uid, novaSkill } from "../../../core/factories";
import { btnStyle, G, inpStyle } from "../../../ui/theme";
import { SkillEditor } from "../../biblioteca/SkillEditor";
import { SkillDetalhe } from "../../biblioteca/SkillDetalhe";
import { resolveSkillCode } from "./skillCodeResolver";
import { ARSENAL_RANKS } from "../../../data/gameData";

function skillBadge(scope) {
  return scope === "local" ? { text: "LOCAL", color: "#b07cff" } : { text: "BIBLIOTECA", color: "#69c2ff" };
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

function tagNames(skill, tagsById) {
  return (skill?.tagIds || []).map((id) => tagsById[id]?.nome || "").filter(Boolean);
}

function ResolvedCodePanel({ entry, ficha }) {
  const [showResolved, setShowResolved] = useState(false);
  const skill = entry?.skill || {};
  const preview = useMemo(() => resolveSkillCode(skill.descricaoCode || "", ficha), [skill.descricaoCode, ficha]);
  if (!entry) return null;
  return (
    <div style={{ border: "1px solid #5c4a2c", borderRadius: 12, background: "#101827", position: "relative" }}>
      <button onClick={() => setShowResolved((v) => !v)} title="Alternar código/resolvido" style={{ position: "absolute", right: 8, top: 8, border: "1px solid #47658f", background: "#10213a", color: "#9ec6ff", borderRadius: 999, width: 24, height: 24, cursor: "pointer" }}>👁</button>
      <pre style={{ margin: 0, padding: "12px 38px 12px 12px", color: "#8fc8ff", fontFamily: "monospace", whiteSpace: "pre-wrap", minHeight: 110 }}>
        {showResolved
          ? `${preview.resolved.join("\n")}${preview.resolved.length ? "\n\n" : ""}${preview.resolvedCode || "// sem descrição code"}`
          : (skill.descricaoCode || "// sem descrição code")}
      </pre>
    </div>
  );
}

function AssignModal({ open, onClose, pool = [], onPick, tagsById }) {
  const [query, setQuery] = useState("");
  const [fRank, setFRank] = useState("");
  const [fEssencia, setFEssencia] = useState("");
  const [fTag, setFTag] = useState("");
  const [cursor, setCursor] = useState(0);

  const filtered = useMemo(() => pool.filter((s) => {
    const tg = tagNames(s, tagsById).join(" ").toLowerCase();
    const full = `${s.nome || ""} ${s.descricao || ""} ${s.dono || ""} ${s.alcance || ""} ${tg}`.toLowerCase();
    if (query && !full.includes(query.toLowerCase())) return false;
    if (fRank && s.rank !== fRank) return false;
    if (fEssencia && (s.essenciaAtribuida || "Nenhuma") !== fEssencia) return false;
    if (fTag && !tg.includes(fTag.toLowerCase())) return false;
    return true;
  }), [pool, query, fRank, fEssencia, fTag, tagsById]);

  const suggestions = filtered.slice(0, 8);

  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(0, suggestions.length - 1)));
  }, [suggestions.length]);

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", zIndex: 80, display: "grid", placeItems: "center" }}>
      <div style={{ width: "min(980px, 92vw)", maxHeight: "86vh", overflow: "auto", border: "1px solid #3c5472", borderRadius: 12, background: "linear-gradient(180deg,#0c1628,#09111f)", padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontFamily: "'Cinzel Decorative',serif", color: G.gold, letterSpacing: 2 }}>Atribuir Skill da Biblioteca</div>
          <HoverButton onClick={onClose} style={btnStyle({ borderColor: "#55657c", color: "#a5b5cc", padding: "4px 10px" })}>Fechar</HoverButton>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 140px 140px", gap: 6, marginBottom: 8 }}>
          <div style={{ position: "relative" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (!suggestions.length) return;
                if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => (c + 1) % suggestions.length); }
                if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => (c - 1 + suggestions.length) % suggestions.length); }
                if (e.key === "Enter") { e.preventDefault(); onPick(suggestions[cursor]); }
              }}
              placeholder="Pesquisar com autocomplete (↑ ↓ Enter)..."
              style={inpStyle()}
              autoFocus
            />
            {!!suggestions.length && (
              <div style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 2px)", border: "1px solid #3a4f69", borderRadius: 8, background: "#08101d", zIndex: 2, maxHeight: 220, overflowY: "auto" }}>
                {suggestions.map((s, idx) => (
                  <button key={s.id} onClick={() => onPick(s)} style={{ width: "100%", textAlign: "left", padding: "6px 8px", border: "none", borderBottom: "1px solid #1a2a42", background: idx === cursor ? "#14304f" : "transparent", color: "#cde4ff", cursor: "pointer" }}>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13 }}>{s.nome}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 10, color: "#86add7" }}>{s.rank || "-"} · {s.essenciaAtribuida || "Nenhuma"}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <select value={fRank} onChange={(e) => setFRank(e.target.value)} style={inpStyle()}><option value="">Rank</option>{ARSENAL_RANKS.map((r) => <option key={r}>{r}</option>)}</select>
          <input value={fEssencia} onChange={(e) => setFEssencia(e.target.value)} placeholder="Essência" style={inpStyle()} />
          <input value={fTag} onChange={(e) => setFTag(e.target.value)} placeholder="Tag" style={inpStyle()} />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          {filtered.map((s) => (
            <div key={s.id} style={{ border: "1px solid #334863", borderRadius: 8, padding: 8, background: "#0d1728", display: "grid", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ color: "#d5e8ff", fontFamily: "'Cinzel',serif" }}>{s.nome}</div>
                <HoverButton onClick={() => onPick(s)} style={btnStyle({ padding: "4px 9px", borderColor: "#4f7dbc66", color: "#9ecfff" })}>Atribuir</HoverButton>
              </div>
              <div style={{ color: "#8fb5dd", fontSize: 11, fontFamily: "monospace" }}>{s.descricao || "Sem descrição"}</div>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ color: G.muted, fontFamily: "monospace" }}>Nenhuma skill encontrada.</div>}
        </div>
      </div>
    </div>
  );
}

export function TabSkills({ ficha, onUpdate, bibliotecaSkills = [], skillTags = [], onNotify }) {
  const [query, setQuery] = useState("");
  const [fRank, setFRank] = useState("");
  const [fTag, setFTag] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const tagsById = useMemo(() => Object.fromEntries((skillTags || []).map((t) => [t.id, t])), [skillTags]);
  const assigned = normalizeAssignedSkills(ficha);
  const assignedIds = new Set(assigned.map((s) => s.sourceSkillId).filter(Boolean));

  const filteredAssigned = useMemo(() => assigned.filter((entry) => {
    const s = entry.skill || {};
    const tgs = tagNames(s, tagsById).join(" ").toLowerCase();
    const full = `${s.nome || ""} ${s.descricao || ""} ${s.dono || ""} ${s.alcance || ""} ${s.rank || ""} ${s.essenciaAtribuida || ""} ${tgs}`.toLowerCase();
    if (query && !full.includes(query.toLowerCase())) return false;
    if (fRank && s.rank !== fRank) return false;
    if (fTag && !tgs.includes(fTag.toLowerCase())) return false;
    return true;
  }), [assigned, query, fRank, fTag, tagsById]);

  const assignablePool = useMemo(() => (bibliotecaSkills || []).filter((s) => !assignedIds.has(s.id)), [bibliotecaSkills, assignedIds]);

  useEffect(() => {
    if (!selectedId && filteredAssigned[0]) setSelectedId(filteredAssigned[0].id);
    if (selectedId && !assigned.some((s) => s.id === selectedId)) setSelectedId(filteredAssigned[0]?.id || null);
  }, [selectedId, assigned, filteredAssigned]);

  const selected = assigned.find((s) => s.id === selectedId) || filteredAssigned[0] || null;

  const persist = (next) => onUpdate({ skills: next });

  const assignFromLibrary = (skill) => {
    if (!skill?.id || assignedIds.has(skill.id)) return;
    const entry = { id: uid(), scope: "biblioteca", sourceSkillId: skill.id, skill: { ...skill, id: uid(), atualizado: Date.now() } };
    persist([...assigned, entry]);
    setSelectedId(entry.id);
    setAssignOpen(false);
    onNotify?.(`Skill atribuída: ${skill.nome}`, "success");
  };

  const openNewLocal = () => {
    const local = { id: uid(), scope: "local", sourceSkillId: "", skill: { ...novaSkill(), nome: "Nova Skill Local" } };
    persist([...assigned, local]);
    setEditingId(local.id);
    setSelectedId(local.id);
    setEditorOpen(true);
  };

  const unassign = (id) => {
    persist(assigned.filter((s) => s.id !== id));
    onNotify?.("Skill desatribuída.", "info");
  };

  const editingEntry = assigned.find((s) => s.id === editingId) || null;

  const saveSkill = (nextSkill) => {
    if (!editingEntry) return;
    persist(assigned.map((s) => (s.id === editingEntry.id ? { ...s, skill: { ...nextSkill, atualizado: Date.now() } } : s)));
    setEditorOpen(false);
    setEditingId(null);
  };

  const cloneAsLocal = () => {
    if (!selected) return;
    const clone = {
      id: uid(),
      scope: "local",
      sourceSkillId: "",
      skill: { ...selected.skill, id: uid(), nome: `${selected.skill?.nome || "Skill"} (local)` },
    };
    persist([...assigned, clone]);
    setSelectedId(clone.id);
    onNotify?.("Skill clonada localmente.", "success");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "430px 1fr", gap: 12, minHeight: "68vh" }}>
      <style>{`
        .ficha-skill-card { transition: all .18s ease; }
        .ficha-skill-card:hover { transform: translateY(-1px); border-color: #5d83b3; }
        .ficha-skill-card.active { box-shadow: 0 0 16px #69a9ff33; border-color: #77a7dd; }
      `}</style>
      <div style={{ border: "1px solid #2f435f", borderRadius: 12, background: "radial-gradient(circle at top left,#16253c,#0b1220 52%,#070b14)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: 10, borderBottom: "1px solid #2d3d57" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontFamily: "'Cinzel Decorative',serif", color: G.gold, letterSpacing: 2 }}>Mini Biblioteca</div>
            <HoverButton onClick={() => setAssignOpen(true)} style={btnStyle({ borderColor: "#4f7dbc66", color: "#9ecfff", padding: "4px 10px" })}>Atribuir</HoverButton>
          </div>
          <div style={{ color: "#8fb5dd", fontFamily: "monospace", fontSize: 10, marginBottom: 8 }}>A ficha começa sem skills. Crie localmente ou atribua da biblioteca.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 110px", gap: 6 }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar atribuídas..." style={inpStyle()} />
            <select value={fRank} onChange={(e) => setFRank(e.target.value)} style={inpStyle()}><option value="">Rank</option>{ARSENAL_RANKS.map((r) => <option key={r}>{r}</option>)}</select>
            <input value={fTag} onChange={(e) => setFTag(e.target.value)} placeholder="Tag" style={inpStyle()} />
          </div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#9bbad9", fontFamily: "monospace", fontSize: 11 }}>{filteredAssigned.length} skill(s)</span>
            <HoverButton onClick={openNewLocal} style={btnStyle({ padding: "4px 10px" })}>+ Criar local</HoverButton>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 8, display: "grid", gap: 6 }}>
          {filteredAssigned.map((entry) => {
            const badge = skillBadge(entry.scope);
            const active = selected?.id === entry.id;
            return (
              <button key={entry.id} className={`ficha-skill-card ${active ? "active" : ""}`} onClick={() => setSelectedId(entry.id)} style={{ border: "1px solid #365171", borderRadius: 10, background: "#0d1728", padding: 8, textAlign: "left", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ color: "#d5e7ff", fontFamily: "'Cinzel',serif", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.skill?.nome || "Skill"}</div>
                  <span style={{ color: badge.color, fontFamily: "monospace", fontSize: 10 }}>{badge.text}</span>
                </div>
                <div style={{ color: "#8fb5dd", fontFamily: "monospace", fontSize: 10 }}>{entry.skill?.rank || "-"} · {entry.skill?.essenciaAtribuida || "Nenhuma"}</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>{(entry.skill?.tagIds || []).slice(0, 3).map((tid) => tagsById[tid]).filter(Boolean).map((t) => <span key={t.id} style={{ padding: "1px 6px", borderRadius: 999, background: t.cor, color: "#fff", fontFamily: "monospace", fontSize: 9 }}>{t.nome}</span>)}</div>
              </button>
            );
          })}
          {filteredAssigned.length === 0 && <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 12 }}>Nenhuma skill atribuída para os filtros atuais.</div>}
        </div>
      </div>

      <div style={{ border: "1px solid #2f435f", borderRadius: 12, background: "radial-gradient(circle at top left,#132338,#0a1220 52%,#070b14)", padding: 12, display: "grid", gap: 10 }}>
        {selected ? (
          <>
            <SkillDetalhe
              skill={selected.skill}
              tagsById={tagsById}
              onEdit={() => { setEditingId(selected.id); setEditorOpen(true); }}
              onDup={cloneAsLocal}
              onDel={() => unassign(selected.id)}
            />
            <ResolvedCodePanel entry={selected} ficha={ficha} />
          </>
        ) : <div style={{ color: G.muted, fontFamily: "monospace" }}>Nenhuma skill selecionada.</div>}
      </div>

      <AssignModal open={assignOpen} onClose={() => setAssignOpen(false)} pool={assignablePool} onPick={assignFromLibrary} tagsById={tagsById} />

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
