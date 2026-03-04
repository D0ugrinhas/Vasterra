import React, { useMemo, useState } from "react";
import { uid } from "../../core/factories";
import { G, inpStyle, btnStyle } from "../../ui/theme";
import { HoverButton } from "../../components/primitives/Interactive";
import { SkillEditor } from "./SkillEditor";
import { SkillDetalhe } from "./SkillDetalhe";
import { ARSENAL_RANKS, RANK_COR } from "../../data/gameData";

export function BibliotecaSection({ skills = [], tags = [], onSkills, onNotify, onConfirmAction }) {
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState("");
  const [fRank, setFRank] = useState("");
  const [fEssencia, setFEssencia] = useState("");
  const [editSkill, setEditSkill] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  const tagsById = useMemo(() => Object.fromEntries((tags || []).map((t) => [t.id, t])), [tags]);
  const filtered = useMemo(() => (skills || []).filter((s) => {
    if (fRank && s.rank !== fRank) return false;
    if (fEssencia && (s.essenciaAtribuida || "Nenhuma") !== fEssencia) return false;
    if (!search) return true;
    return `${s.nome} ${s.descricao || ""} ${s.dono || ""}`.toLowerCase().includes(search.toLowerCase());
  }), [skills, search, fRank, fEssencia]);

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
      <style>{`
        @keyframes bPulse {0%{box-shadow:0 0 0 rgba(79,125,188,.1)}50%{box-shadow:0 0 18px rgba(79,125,188,.22)}100%{box-shadow:0 0 0 rgba(79,125,188,.1)}}
        .bib-card { transition: all .2s; }
        .bib-card:hover { transform: translateY(-1px); border-color:#4f7dbc99; }
        .bib-card.active { animation: bPulse 2.2s infinite ease-in-out; }
      `}</style>
      <div style={{ borderRight: `1px solid ${G.border}`, display: "flex", flexDirection: "column", overflow: "hidden", background: "#08080b" }}>
        <div style={{ padding: 12, borderBottom: `1px solid ${G.border}` }}>
          <div style={{ fontFamily: "'Cinzel Decorative',serif", color: G.gold, letterSpacing: 3, marginBottom: 2 }}>BIBLIOTECA</div>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: "#8d93a1", marginBottom: 10 }}>Catálogo visual de Skills, custos e rolagens.</div>
          <button style={{ ...btnStyle(), width: "100%", marginBottom: 8 }} onClick={() => { setEditSkill(null); setEditOpen(true); }}>+ Criar Skill</button>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar skill..." style={{ ...inpStyle(), marginBottom: 6 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <select value={fRank} onChange={(e) => setFRank(e.target.value)} style={inpStyle({ padding: "4px 6px", fontSize: 11 })}><option value="">Rank: todos</option>{ARSENAL_RANKS.map((r) => <option key={r}>{r}</option>)}</select>
            <input value={fEssencia} onChange={(e) => setFEssencia(e.target.value)} placeholder="Filtrar essência" style={inpStyle({ padding: "4px 6px", fontSize: 11 })} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {filtered.map((s) => {
            const active = sel === s.id;
            const cor = RANK_COR[s.rank] || s.cor || "#4a6088";
            return (
              <div key={s.id} className={`bib-card ${active ? "active" : ""}`} onClick={() => setSel(s.id)} style={{ background: active ? `${cor}22` : G.bg3, border: `1px solid ${active ? `${cor}99` : G.border}`, borderRadius: 10, padding: 10, marginBottom: 8, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontFamily: "'Cinzel',serif", color: G.gold2, fontSize: 12 }}>{s.nome}</div>
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: cor }}>{s.rank}</span>
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 10, color: G.muted }}>Dono: {s.dono || "—"}</div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: 8, borderTop: `1px solid ${G.border}`, fontSize: 10, color: G.muted, fontFamily: "monospace", textAlign: "center" }}>{skills.length} skills na Biblioteca</div>
      </div>

      <div style={{ overflow: "auto", padding: 20 }}>
        {!selSkill && <div style={{ height: "100%", minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", color: G.muted, fontStyle: "italic" }}>Selecione uma skill da Biblioteca para ver detalhes completos.</div>}
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
