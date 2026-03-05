import React, { useEffect, useMemo, useState } from "react";
import { HoverButton } from "../../../components/primitives/Interactive";
import { uid, novaSkill } from "../../../core/factories";
import { btnStyle, G, inpStyle } from "../../../ui/theme";
import { SkillEditor } from "../../biblioteca/SkillEditor";
import { SkillDetalhe } from "../../biblioteca/SkillDetalhe";
import { resolveSkillCode } from "./skillCodeResolver";
import { ARSENAL_RANKS } from "../../../data/gameData";
import { ImageViewport } from "../../../components/media/ImageAttachModal";

function skillBadge(scope) {
  return scope === "local" ? { text: "LOCAL", color: "#b07cff" } : { text: "BIBLIOTECA", color: "#69c2ff" };
}

function skillIconSrc(skill) {
  if (skill?.iconeModo === "url" && skill?.iconeUrl) return skill.iconeUrl;
  if (skill?.iconeModo === "upload" && skill?.iconeData) return skill.iconeData;
  return "";
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
  const [fDono, setFDono] = useState("");
  const [fRank, setFRank] = useState("");
  const [fEssencia, setFEssencia] = useState("");
  const [fAlcance, setFAlcance] = useState("");
  const [fTag, setFTag] = useState("");
  const [cursor, setCursor] = useState(0);

  const filtered = useMemo(() => pool.filter((s) => {
    const tg = tagNames(s, tagsById).join(" ").toLowerCase();
    const full = `${s.nome || ""} ${s.descricao || ""} ${s.dono || ""} ${s.alcance || ""} ${tg}`.toLowerCase();
    if (query && !full.includes(query.toLowerCase())) return false;
    if (fDono && !(s.dono || "").toLowerCase().includes(fDono.toLowerCase())) return false;
    if (fRank && s.rank !== fRank) return false;
    if (fEssencia && (s.essenciaAtribuida || "Nenhuma") !== fEssencia) return false;
    if (fAlcance && !(s.alcance || "").toLowerCase().includes(fAlcance.toLowerCase())) return false;
    if (fTag && !tg.includes(fTag.toLowerCase())) return false;
    return true;
  }), [pool, query, fDono, fRank, fEssencia, fAlcance, fTag, tagsById]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return filtered.filter((s) => (`${s.nome || ""} ${s.descricao || ""}`).toLowerCase().includes(q)).slice(0, 8);
  }, [filtered, query]);

  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(0, suggestions.length - 1)));
  }, [suggestions.length]);

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", zIndex: 80, display: "grid", placeItems: "center" }}>
      <div style={{ width: "min(980px, 92vw)", maxHeight: "86vh", overflow: "auto", border: "1px solid #5a431f", borderRadius: 12, background: "linear-gradient(180deg,#171108,#0f0b06)", padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontFamily: "'Cinzel Decorative',serif", color: G.gold, letterSpacing: 2 }}>Atribuir Skill da Biblioteca</div>
          <HoverButton onClick={onClose} style={btnStyle({ borderColor: "#6c5531", color: "#d5bc8f", padding: "4px 10px" })}>Fechar</HoverButton>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 120px 120px 120px 120px", gap: 6, marginBottom: 8 }}>
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
              style={inpStyle({ border: "1px solid #5a431f", background: "#0f0b07" })}
              autoFocus
            />
            {!!suggestions.length && (
              <div style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 2px)", border: "1px solid #5a431f", borderRadius: 8, background: "#0f0b07", zIndex: 2, maxHeight: 220, overflowY: "auto" }}>
                {suggestions.map((s, idx) => (
                  <button key={s.id} onClick={() => onPick(s)} style={{ width: "100%", textAlign: "left", padding: "6px 8px", border: "none", borderBottom: "1px solid #2a1f10", background: idx === cursor ? "#2a1d0f" : "transparent", color: "#f0dfbe", cursor: "pointer" }}>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13 }}>{s.nome}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 10, color: "#c0a06a" }}>{s.rank || "-"} · {s.essenciaAtribuida || "Nenhuma"}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input value={fDono} onChange={(e) => setFDono(e.target.value)} placeholder="Dono" style={inpStyle({ border: "1px solid #5a431f", background: "#0f0b07" })} />
          <select value={fRank} onChange={(e) => setFRank(e.target.value)} style={inpStyle({ border: "1px solid #5a431f", background: "#0f0b07" })}><option value="">Rank</option>{ARSENAL_RANKS.map((r) => <option key={r}>{r}</option>)}</select>
          <input value={fEssencia} onChange={(e) => setFEssencia(e.target.value)} placeholder="Essência" style={inpStyle({ border: "1px solid #5a431f", background: "#0f0b07" })} />
          <input value={fAlcance} onChange={(e) => setFAlcance(e.target.value)} placeholder="Alcance" style={inpStyle({ border: "1px solid #5a431f", background: "#0f0b07" })} />
          <input value={fTag} onChange={(e) => setFTag(e.target.value)} placeholder="Tag" style={inpStyle({ border: "1px solid #5a431f", background: "#0f0b07" })} />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          {filtered.map((s) => (
            <div key={s.id} style={{ border: "1px solid #5c4a2c", borderRadius: 8, padding: 8, background: "#161008", display: "grid", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ color: "#f1dfbe", fontFamily: "'Cinzel',serif" }}>{s.nome}</div>
                <HoverButton onClick={() => onPick(s)} style={btnStyle({ padding: "4px 9px", borderColor: "#c5a16966", color: "#f3d79f" })}>Atribuir</HoverButton>
              </div>
              <div style={{ color: "#b89d6f", fontSize: 11, fontFamily: "monospace" }}>{s.descricao || "Sem descrição"}</div>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ color: G.muted, fontFamily: "monospace" }}>Nenhuma skill encontrada.</div>}
        </div>
      </div>
    </div>
  );
}

export function TabSkills({ ficha, onUpdate, bibliotecaSkills = [], skillTags = [], onNotify, onExportToBiblioteca }) {
  const [query, setQuery] = useState("");
  const [fDono, setFDono] = useState("");
  const [fRank, setFRank] = useState("");
  const [fEssencia, setFEssencia] = useState("");
  const [fAlcance, setFAlcance] = useState("");
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
    if (fDono && !(s.dono || "").toLowerCase().includes(fDono.toLowerCase())) return false;
    if (fRank && s.rank !== fRank) return false;
    if (fEssencia && (s.essenciaAtribuida || "Nenhuma") !== fEssencia) return false;
    if (fAlcance && !(s.alcance || "").toLowerCase().includes(fAlcance.toLowerCase())) return false;
    if (fTag && !tgs.includes(fTag.toLowerCase())) return false;
    return true;
  }), [assigned, query, fDono, fRank, fEssencia, fAlcance, fTag, tagsById]);

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
    const clone = { id: uid(), scope: "local", sourceSkillId: "", skill: { ...selected.skill, id: uid(), nome: `${selected.skill?.nome || "Skill"} (local)` } };
    persist([...assigned, clone]);
    setSelectedId(clone.id);
    onNotify?.("Skill clonada localmente.", "success");
  };

  const exportSelectedToBiblioteca = () => {
    if (!selected?.skill) return;
    onExportToBiblioteca?.({ ...selected.skill, id: uid(), nome: `${selected.skill.nome || "Skill"} (exportada)` });
    onNotify?.("Skill exportada para Biblioteca.", "success");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "430px 1fr", gap: 12, minHeight: "68vh", background: "radial-gradient(circle at top left,#2a2210,#140f08 45%,#0a0805)", borderRadius: 12, padding: 8 }}>
      <style>{`
        .ficha-skill-card { transition: all .18s ease; }
        .ficha-skill-card:hover { transform: translateY(-1px); border-color: #b99345a6; }
        .ficha-skill-card.active { box-shadow: 0 0 16px rgba(201,163,74,.28); border-color: #b99345a6; }
      `}</style>
      <div style={{ border: "1px solid #4b3a19", borderRadius: 12, background: "#0b0906", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: 10, borderBottom: "1px solid #4b3a19" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontFamily: "'Cinzel Decorative',serif", color: G.gold, letterSpacing: 2 }}>Habilidades</div>
            <HoverButton onClick={() => setAssignOpen(true)} style={btnStyle({ borderColor: "#c5a16966", color: "#f3d79f", padding: "4px 10px" })}>Atribuir</HoverButton>
          </div>
          <div style={{ color: "#b89d6f", fontFamily: "monospace", fontSize: 10, marginBottom: 8 }}>A ficha começa sem skills. Crie localmente ou atribua da biblioteca.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 110px", gap: 6, marginBottom: 6 }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar..." style={inpStyle({ border: "1px solid #4b3a19", background: "#0f0b07" })} />
            <select value={fRank} onChange={(e) => setFRank(e.target.value)} style={inpStyle({ border: "1px solid #4b3a19", background: "#0f0b07" })}><option value="">Rank</option>{ARSENAL_RANKS.map((r) => <option key={r}>{r}</option>)}</select>
            <input value={fTag} onChange={(e) => setFTag(e.target.value)} placeholder="Tag" style={inpStyle({ border: "1px solid #4b3a19", background: "#0f0b07" })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            <input value={fDono} onChange={(e) => setFDono(e.target.value)} placeholder="Dono" style={inpStyle({ border: "1px solid #4b3a19", background: "#0f0b07" })} />
            <input value={fEssencia} onChange={(e) => setFEssencia(e.target.value)} placeholder="Essência" style={inpStyle({ border: "1px solid #4b3a19", background: "#0f0b07" })} />
            <input value={fAlcance} onChange={(e) => setFAlcance(e.target.value)} placeholder="Alcance" style={inpStyle({ border: "1px solid #4b3a19", background: "#0f0b07" })} />
          </div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#c9ab75", fontFamily: "monospace", fontSize: 11 }}>{filteredAssigned.length} skill(s)</span>
            <HoverButton onClick={openNewLocal} style={btnStyle({ padding: "4px 10px", borderColor: "#c5a16966", color: "#f3d79f" })}>+ Criar local</HoverButton>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 8, display: "grid", gap: 6 }}>
          {filteredAssigned.map((entry) => {
            const badge = skillBadge(entry.scope);
            const active = selected?.id === entry.id;
            const iconSrc = skillIconSrc(entry.skill || {});
            return (
              <button key={entry.id} className={`ficha-skill-card ${active ? "active" : ""}`} onClick={() => setSelectedId(entry.id)} style={{ border: "1px solid #5c4a2c", borderRadius: 10, background: "#161008", padding: 8, textAlign: "left", cursor: "pointer", display: "grid", gridTemplateColumns: "42px 1fr", gap: 8, alignItems: "center" }}>
                <div style={{ width: 42, height: 42, borderRadius: 8, border: "1px solid #6b5431", display: "grid", placeItems: "center", background: "#1d1409", overflow: "hidden" }}>
                  {iconSrc ? <ImageViewport src={iconSrc} alt={entry.skill?.nome || "skill"} size={40} radius={6} adjust={entry.skill?.iconeAjuste} /> : <span style={{ fontSize: 20 }}>{entry.skill?.icone || "?"}</span>}
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ color: "#f1dfbe", fontFamily: "'Cinzel',serif", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.skill?.nome || "Skill"}</div>
                    <span style={{ color: badge.color, fontFamily: "monospace", fontSize: 10 }}>{badge.text}</span>
                  </div>
                  <div style={{ color: "#c9ab75", fontFamily: "monospace", fontSize: 10 }}>{entry.skill?.rank || "-"} · {entry.skill?.essenciaAtribuida || "Nenhuma"}</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>{(entry.skill?.tagIds || []).slice(0, 3).map((tid) => tagsById[tid]).filter(Boolean).map((t) => <span key={t.id} style={{ padding: "1px 6px", borderRadius: 999, background: t.cor, color: "#fff", fontFamily: "monospace", fontSize: 9 }}>{t.nome}</span>)}</div>
                </div>
              </button>
            );
          })}
          {filteredAssigned.length === 0 && <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 12 }}>Nenhuma skill atribuída para os filtros atuais.</div>}
        </div>
      </div>

      <div style={{ border: "1px solid #4b3a19", borderRadius: 12, background: "#0b0906", padding: 12, display: "grid", gap: 10 }}>
        {selected ? (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <HoverButton onClick={exportSelectedToBiblioteca} style={btnStyle({ borderColor: "#c5a16966", color: "#f3d79f", padding: "4px 10px" })}>Exportar para Biblioteca</HoverButton>
            </div>
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
