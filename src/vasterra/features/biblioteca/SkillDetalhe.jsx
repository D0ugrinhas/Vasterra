import React from "react";
import { G, btnStyle } from "../../ui/theme";
import { HoverButton } from "../../components/primitives/Interactive";
import { RANK_COR } from "../../data/gameData";
import { ImageViewport } from "../../components/media/ImageAttachModal";

const CUSTO_CORES = {
  ACO: "#22ee5f",
  MOV: "#227de6",
  REA: "#d31515",
  ESF: "#290404",
  VIT: "#f1250e",
  EST: "#f9f100",
  MAN: "#0077ff",
  SAN: "#ff4dc4",
  CONS: "#1abc9c",
};

function SkillTag({ tag }) {
  return (
    <span className="skill-tag-wrap" style={{ position: "relative", display: "inline-block" }}>
      <span style={{ padding: "5px 11px", borderRadius: 999, color: "#fff", background: tag.cor, fontFamily: "monospace", fontSize: 11, boxShadow: `0 4px 14px ${tag.cor}66` }}>
        {tag.nome}
      </span>
      <span className="skill-tag-tip" style={{ position: "absolute", left: "50%", bottom: "calc(100% + 8px)", transform: "translateX(-50%)", minWidth: 180, maxWidth: 260, padding: "8px 10px", borderRadius: 8, border: "1px solid #41546b", background: "linear-gradient(180deg,#0d1722,#091018)", color: "#b9d9ff", fontFamily: "monospace", fontSize: 11, opacity: 0, pointerEvents: "none", transition: "all .2s", zIndex: 10 }}>
        <b style={{ color: "#e5f2ff" }}>{tag.nome}</b>
        <div style={{ marginTop: 4 }}>{tag.descricao || "Sem descrição para esta tag."}</div>
      </span>
    </span>
  );
}

function rolagemLabel(skill) {
  if (skill.rolagemTipo === "Perícia") return `Rolagem de ${skill.rolagemPericia || "Perícia"}`;
  if (skill.rolagemTipo === "Ação") return `Rolagem de ${skill.rolagemAcao || "Ação"}`;
  if (skill.rolagemTipo === "Instrução") return `Instrução: ${skill.rolagemInstrucao || "ver descrição"}`;
  return "Rolagem de acerto (padrão)";
}

export function SkillDetalhe({ skill, tagsById = {}, onEdit, onDup, onDel }) {
  const iconSrc = skill.iconeModo === "url" ? skill.iconeUrl : skill.iconeModo === "upload" ? skill.iconeData : "";
  const rankCor = RANK_COR[skill.rank] || skill.cor || "#7aa9d8";

  return (
    <div>
      <style>{`
        .skill-tag-wrap:hover .skill-tag-tip { opacity: 1; transform: translateX(-50%) translateY(-4px); }
        .skill-panel { border:1px solid #2a2a2a; border-radius:12px; padding:12px; background:linear-gradient(180deg,#0b0e13,#090b0e); transition:all .2s; }
        .skill-panel:hover { border-color:#476389; box-shadow:0 0 18px rgba(76,110,160,.2); }
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 54, height: 54, borderRadius: 10, border: "1px solid #2f3c4d", display: "grid", placeItems: "center", background: "#09111b" }}>
            {iconSrc ? <ImageViewport src={iconSrc} alt={skill.nome} size={46} radius={8} adjust={skill.iconeAjuste} /> : <span style={{ fontSize: 24 }}>{skill.icone || "?"}</span>}
          </div>
          <div>
            <div style={{ fontFamily: "'Cinzel Decorative',serif", color: G.gold, fontSize: 24 }}>{skill.nome}</div>
            <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, background: `${rankCor}33`, border: `1px solid ${rankCor}66`, color: rankCor, fontFamily: "monospace", fontSize: 11 }}>{skill.rank}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <HoverButton onClick={onEdit}>Editar</HoverButton>
          <HoverButton onClick={onDup} style={btnStyle({ borderColor: "#4f7dbc66", color: "#9ecfff" })}>Duplicar</HoverButton>
          <HoverButton onClick={onDel} style={btnStyle({ borderColor: "#b9483a66", color: "#ff9f92" })}>Apagar</HoverButton>
        </div>
      </div>
      <div style={{ color: G.muted, fontFamily: "monospace", marginBottom: 10 }}>Dono: {skill.dono || "—"} · Alcance: {skill.alcance || "—"} · Geração {Number(skill.geracao || 1)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div className="skill-panel">
          <div style={{ fontFamily: "monospace", color: "#8fb3d8", marginBottom: 4 }}>Mecânica</div>
          <div style={{ fontSize: 13 }}>Rolagem: <b>{rolagemLabel(skill)}</b></div>
          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(skill.custos || []).map((c) => <span key={c.id} style={{ padding: "4px 10px", borderRadius: 999, background: CUSTO_CORES[c.tipo] || "#666", color: c.tipo === "EST" ? "#151515" : "#fff", fontFamily: "monospace", fontSize: 11 }}>{Number(c.valor || 0)}{c.tipo}</span>)}
            {(skill.custos || []).length === 0 && <span style={{ padding: "4px 10px", borderRadius: 999, background: "#2a2a2a", color: "#fff", fontFamily: "monospace", fontSize: 11 }}>N/A</span>}
          </div>
          <div style={{ fontSize: 13, marginTop: 8 }}>Essência: <b>{skill.essenciaAtribuida || "Nenhuma"}</b></div>
        </div>
        <div className="skill-panel">
          <div style={{ fontFamily: "monospace", color: "#8fb3d8", marginBottom: 6 }}>Tags</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(skill.tagIds || []).map((id) => tagsById[id]).filter(Boolean).map((tag) => <SkillTag key={tag.id} tag={tag} />)}
            {(skill.tagIds || []).length === 0 && <span style={{ color: G.muted, fontFamily: "monospace", fontSize: 12 }}>Sem tags.</span>}
          </div>
        </div>
      </div>
      <div className="skill-panel" style={{ marginBottom: 10, whiteSpace: "pre-wrap" }}>{skill.descricao || "Sem descrição."}</div>
      <pre className="skill-panel" style={{ background: "#070d15", color: "#8fc8ff", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>{skill.descricaoCode || "// sem descrição code"}</pre>
    </div>
  );
}
