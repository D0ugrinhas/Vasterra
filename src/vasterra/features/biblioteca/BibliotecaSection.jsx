import React, { useMemo, useState } from "react";
import { uid } from "../../core/factories";
import { G, inpStyle, btnStyle } from "../../ui/theme";
import { HoverButton } from "../../components/primitives/Interactive";
import { SkillEditor } from "./SkillEditor";
import { SkillDetalhe } from "./SkillDetalhe";

export function BibliotecaSection({ skills = [], tags = [], onSkills, onNotify, onConfirmAction }) {
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState("");
  const [fRank, setFRank] = useState("");
  const [fDono, setFDono] = useState("");
  const [editSkill, setEditSkill] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  const tagsById = useMemo(() => Object.fromEntries((tags || []).map((t) => [t.id, t])), [tags]);
  const filtered = useMemo(() => (skills || []).filter((s) => {
    if (fRank && s.rank !== fRank) return false;
    if (fDono && s.donoTipo !== fDono) return false;
    if (!search) return true;
    return `${s.nome} ${s.descricao || ""} ${s.donoValor || ""}`.toLowerCase().includes(search.toLowerCase());
  }), [skills, search, fRank, fDono]);

  const selSkill = (skills || []).find((s) => s.id === sel) || null;

  const saveSkill = (d) => {
    const exists = skills.some((x) => x.id === d.id);
    onSkills(exists ? skills.map((x) => (x.id === d.id ? d : x)) : [d, ...skills]);
    setSel(d.id);
    setEditOpen(false);
    onNotify?.("Skill salva na Biblioteca.", "success");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "390px 1fr", height: "calc(100vh - 54px)", background: "radial-gradient(circle at top left,#111018,#080808 45%,#060606)" }}>
      <div style={{ borderRight: `1px solid ${G.border}`, display: "flex", flexDirection: "column", overflow: "hidden", background: "#08080b" }}>
        <div style={{ padding: 12, borderBottom: `1px solid ${G.border}` }}>
          <div style={{ fontFamily: "'Cinzel Decorative',serif", color: G.gold, letterSpacing: 3, marginBottom: 2 }}>BIBLIOTECA</div>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: "#8d93a1", marginBottom: 10 }}>Catalogação de Skills e técnicas especiais.</div>
          <button style={{ ...btnStyle(), width: "100%", marginBottom: 8 }} onClick={() => { setEditSkill(null); setEditOpen(true); }}>+ Criar Skill</button>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar skill..." style={{ ...inpStyle(), marginBottom: 6 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <select value={fRank} onChange={(e) => setFRank(e.target.value)} style={inpStyle({ padding: "4px 6px", fontSize: 11 })}><option value="">Rank: todos</option>{[...new Set((skills || []).map((s) => s.rank).filter(Boolean))].map((r) => <option key={r}>{r}</option>)}</select>
            <select value={fDono} onChange={(e) => setFDono(e.target.value)} style={inpStyle({ padding: "4px 6px", fontSize: 11 })}><option value="">Dono: todos</option>{[...new Set((skills || []).map((s) => s.donoTipo).filter(Boolean))].map((r) => <option key={r}>{r}</option>)}</select>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {filtered.map((s) => (
            <div key={s.id} onClick={() => setSel(s.id)} style={{ background: sel === s.id ? `${s.cor || "#4a6088"}22` : G.bg3, border: `1px solid ${sel === s.id ? `${s.cor || "#4a6088"}88` : G.border}`, borderRadius: 10, padding: 10, marginBottom: 8, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontFamily: "'Cinzel',serif", color: G.gold2, fontSize: 12 }}>{s.nome}</div>
                <span style={{ fontFamily: "monospace", fontSize: 10, color: s.cor || "#7aa9d8" }}>{s.rank}</span>
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: G.muted }}>{s.donoTipo} · {s.donoValor || "—"}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: 8, borderTop: `1px solid ${G.border}`, fontSize: 10, color: G.muted, fontFamily: "monospace", textAlign: "center" }}>{skills.length} skills na Biblioteca</div>
      </div>

      <div style={{ overflow: "auto", padding: 20 }}>
        {!selSkill && <div style={{ height: "100%", minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", color: G.muted, fontStyle: "italic" }}>Selecione uma skill da Biblioteca para ver detalhes.</div>}
        {selSkill && (
          <SkillDetalhe
            skill={selSkill}
            tagsById={tagsById}
            onEdit={() => { setEditSkill(selSkill); setEditOpen(true); }}
            onDup={() => {
              const n = { ...selSkill, id: uid(), nome: `${selSkill.nome} (cópia)`, criado: Date.now(), atualizado: Date.now() };
              onSkills([n, ...skills]);
              onNotify?.("Skill duplicada.", "success");
            }}
            onDel={() => onConfirmAction?.({ title: "Apagar skill", message: `Deseja apagar \"${selSkill.nome}\"?`, onConfirm: () => { onSkills(skills.filter((x) => x.id !== selSkill.id)); setSel(null); } })}
          />
        )}
      </div>

      {editOpen && <SkillEditor skill={editSkill} tags={tags} onSave={saveSkill} onClose={() => setEditOpen(false)} />}
    </div>
  );
}
