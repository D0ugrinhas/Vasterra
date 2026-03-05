import React, { useMemo, useState } from "react";
import { uid } from "../../core/factories";
import { G, inpStyle, btnStyle } from "../../ui/theme";
import { HoverButton } from "../../components/primitives/Interactive";
import { SkillEditor } from "./SkillEditor";
import { SkillDetalhe } from "./SkillDetalhe";
import { ARSENAL_RANKS, RANK_COR } from "../../data/gameData";
import { ImageViewport } from "../../components/media/ImageAttachModal";

function skillIcon(skill) {
  if (skill.iconeModo === "url" && skill.iconeUrl) return skill.iconeUrl;
  if (skill.iconeModo === "upload" && skill.iconeData) return skill.iconeData;
  return "";
}

export function BibliotecaSection({ skills = [], tags = [], onSkills, onNotify, onConfirmAction }) {
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState("");
  const [fDono, setFDono] = useState("");
  const [fAlcance, setFAlcance] = useState("");
  const [fGeracao, setFGeracao] = useState("");
  const [fRank, setFRank] = useState("");
  const [fEssencia, setFEssencia] = useState("");
  const [fTag, setFTag] = useState("");
  const [editSkill, setEditSkill] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  const tagsById = useMemo(() => Object.fromEntries((tags || []).map((t) => [t.id, t])), [tags]);
  const filtered = useMemo(() => (skills || []).filter((s) => {
    const tagNames = (s.tagIds || []).map((id) => tagsById[id]?.nome || "").join(" ");
    const fullText = `${s.nome} ${s.descricao || ""} ${s.dono || ""} ${s.alcance || ""} ${s.rank || ""} ${s.essenciaAtribuida || ""} ${s.geracao || ""} ${tagNames}`.toLowerCase();
    if (search && !fullText.includes(search.toLowerCase())) return false;
    if (fDono && !(s.dono || "").toLowerCase().includes(fDono.toLowerCase())) return false;
    if (fAlcance && !(s.alcance || "").toLowerCase().includes(fAlcance.toLowerCase())) return false;
    if (fGeracao && String(s.geracao || "").trim() !== String(fGeracao).trim()) return false;
    if (fRank && s.rank !== fRank) return false;
    if (fEssencia && (s.essenciaAtribuida || "Nenhuma") !== fEssencia) return false;
    if (fTag && !tagNames.toLowerCase().includes(fTag.toLowerCase())) return false;
    return true;
  }), [skills, search, fDono, fAlcance, fGeracao, fRank, fEssencia, fTag, tagsById]);

  const selSkill = (skills || []).find((s) => s.id === sel) || null;

  const saveSkill = (d) => {
    const exists = skills.some((x) => x.id === d.id);
    onSkills(exists ? skills.map((x) => (x.id === d.id ? d : x)) : [d, ...skills]);
    setSel(d.id);
    setEditOpen(false);
    onNotify?.("Skill salva na Biblioteca.", "success");
  };

  return (
    <div className="v-bib-layout" style={{ display: "grid", gridTemplateColumns: "420px 1fr", height: "calc(100vh - 54px)", background: "radial-gradient(circle at top left,#2a2210,#140f08 45%,#0a0805)" }}>
      <style>{`
        @keyframes bPulse {0%{box-shadow:0 0 0 rgba(201,163,74,.1)}50%{box-shadow:0 0 18px rgba(201,163,74,.26)}100%{box-shadow:0 0 0 rgba(201,163,74,.1)}}
        @keyframes bParticles { from { transform: translateX(-12vw) translateY(0); opacity:.12; } to { transform: translateX(112vw) translateY(-8px); opacity:.32; } }
        .bib-card { transition: all .2s; }
        .bib-card:hover { transform: translateY(-1px); border-color:#b99345a6; }
        .bib-card.active { animation: bPulse 2.2s infinite ease-in-out; }
        .b-scroll::-webkit-scrollbar-thumb { background: rgba(201,163,74,.35); }
        @media (max-width: 900px) { .v-bib-layout { grid-template-columns: 1fr !important; height: auto !important; } }
      `}</style>
      <div style={{ position: "relative", borderRight: `1px solid #4b3a19`, display: "flex", flexDirection: "column", overflow: "hidden", background: "#0b0906" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          {Array.from({ length: 28 }).map((_, i) => (
            <span key={i} style={{ position: "absolute", left: `${(i * 17) % 100}%`, top: `${(i * 29) % 100}%`, width: 2 + (i % 3), height: 2 + (i % 3), borderRadius: "50%", background: i % 2 ? "#d2aa57" : "#f3d18a", animation: `bParticles ${8 + (i % 7)}s linear infinite` }} />
          ))}
        </div>

        <div style={{ position: "relative", padding: 12, borderBottom: "1px solid #4b3a19" }}>
          <div style={{ fontFamily: "'Cinzel Decorative',serif", color: "#d3b06f", letterSpacing: 3, marginBottom: 2 }}>BIBLIOTECA</div>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: "#b49867", marginBottom: 10 }}>Arquivo de skills com identidade dourada de Vasterra.</div>
          <button style={{ ...btnStyle({ borderColor: "#d3b06f55", color: "#f0d7a8" }), width: "100%", marginBottom: 8 }} onClick={() => { setEditSkill(null); setEditOpen(true); }}>+ Criar Skill</button>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisa geral: dono, alcance, geração, rank, essência, tags..." style={{ ...inpStyle({ border: "1px solid #4b3a19", background: "#0f0b07" }), marginBottom: 6 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <input value={fDono} onChange={(e) => setFDono(e.target.value)} placeholder="Dono" style={inpStyle({ padding: "4px 6px", fontSize: 11, border: "1px solid #4b3a19", background: "#0f0b07" })} />
            <input value={fAlcance} onChange={(e) => setFAlcance(e.target.value)} placeholder="Alcance" style={inpStyle({ padding: "4px 6px", fontSize: 11, border: "1px solid #4b3a19", background: "#0f0b07" })} />
            <input value={fGeracao} onChange={(e) => setFGeracao(e.target.value)} placeholder="Geração" style={inpStyle({ padding: "4px 6px", fontSize: 11, border: "1px solid #4b3a19", background: "#0f0b07" })} />
            <select value={fRank} onChange={(e) => setFRank(e.target.value)} style={inpStyle({ padding: "4px 6px", fontSize: 11, border: "1px solid #4b3a19", background: "#0f0b07" })}><option value="">Rank: todos</option>{ARSENAL_RANKS.map((r) => <option key={r}>{r}</option>)}</select>
            <input value={fEssencia} onChange={(e) => setFEssencia(e.target.value)} placeholder="Essência" style={inpStyle({ padding: "4px 6px", fontSize: 11, border: "1px solid #4b3a19", background: "#0f0b07" })} />
            <input value={fTag} onChange={(e) => setFTag(e.target.value)} placeholder="Tags (principal)" style={inpStyle({ padding: "4px 6px", fontSize: 11, border: "1px solid #4b3a19", background: "#0f0b07" })} />
          </div>
        </div>

        <div className="b-scroll" style={{ position: "relative", flex: 1, overflowY: "auto", padding: 8 }}>
          {filtered.map((s) => {
            const active = sel === s.id;
            const cor = RANK_COR[s.rank] || s.cor || "#4a6088";
            const src = skillIcon(s);
            return (
              <div key={s.id} className={`bib-card ${active ? "active" : ""}`} onClick={() => setSel(s.id)} style={{ background: active ? `${cor}22` : "#0f0d0b", border: `1px solid ${active ? `${cor}99` : "#3e3020"}`, borderRadius: 10, padding: 10, marginBottom: 8, cursor: "pointer" }}>
                <div style={{ display: "grid", gridTemplateColumns: "44px 1fr auto", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 8, display: "grid", placeItems: "center", border: "1px solid #4b3a19", background: "#151009" }}>
                    {src ? <ImageViewport src={src} alt={s.nome} size={36} radius={8} adjust={s.iconeAjuste} /> : <span style={{ fontSize: 20 }}>{s.icone || "?"}</span>}
                  </div>
                  <div style={{ fontFamily: "'Cinzel',serif", color: "#f3debb", fontSize: 12 }}>{s.nome}</div>
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: cor }}>{s.rank}</span>
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 10, color: "#b59f77", marginTop: 4 }}>Dono: {s.dono || "—"} · G{Number(s.geracao || 1)} · {s.alcance || "—"}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                  {(s.tagIds || []).slice(0, 4).map((id) => tagsById[id]).filter(Boolean).map((t) => <span key={`${s.id}-${t.id}`} style={{ padding: "2px 7px", borderRadius: 999, color: "#fff", fontSize: 10, fontFamily: "monospace", background: t.cor }}>{t.nome}</span>)}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ color: "#a58f69", textAlign: "center", fontFamily: "monospace", padding: 20 }}>Nenhuma skill encontrada.</div>}
        </div>
        <div style={{ position: "relative", padding: 8, borderTop: "1px solid #4b3a19", fontSize: 10, color: "#b89f74", fontFamily: "monospace", textAlign: "center" }}>{skills.length} skills na Biblioteca</div>
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
