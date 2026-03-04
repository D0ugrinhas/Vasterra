import React, { useState } from "react";
import { G, btnStyle } from "../../ui/theme";
import { HoverButton } from "../../components/primitives/Interactive";
import { RANK_COR } from "../../data/gameData";
import { ImageViewport } from "../../components/media/ImageAttachModal";

function SkillTag({ tag }) {
  const [open, setOpen] = useState(false);
  return (
    <button type="button" onClick={() => setOpen((v) => !v)} className="skill-tag-wrap" style={{ position: "relative", display: "inline-block", border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
      <span style={{ padding: "5px 11px", borderRadius: 999, color: "#fff", background: tag.cor, fontFamily: "monospace", fontSize: 11, boxShadow: `0 4px 14px ${tag.cor}66`, textShadow: "0 1px 2px rgba(0,0,0,.65)" }}>
        {tag.nome}
      </span>
      <span className={`skill-tag-tip ${open ? "open" : ""}`} style={{ position: "absolute", left: "50%", bottom: "calc(100% + 8px)", transform: "translateX(-50%)", minWidth: 180, maxWidth: 260, padding: "8px 10px", borderRadius: 8, border: "1px solid #41546b", background: "linear-gradient(180deg,#0d1722,#091018)", color: "#b9d9ff", fontFamily: "monospace", fontSize: 11, opacity: open ? 1 : 0, pointerEvents: "none", transition: "all .2s", zIndex: 10 }}>
        <b style={{ color: "#e5f2ff" }}>{tag.nome}</b>
        <div style={{ marginTop: 4 }}>{tag.descricao || "Sem descrição para esta tag."}</div>
      </span>
    </button>
  );
}

function custoStyle(skill, codigo) {
  const found = (skill.custoCatalogo || []).find((x) => String(x.nome || "").toUpperCase() === String(codigo || "").toUpperCase());
  return { bg: found?.cor || "#3b4756", fg: found?.textoCor || "#ffffff" };
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
        .skill-tag-tip.open { opacity: 1 !important; transform: translateX(-50%) translateY(-4px); }
        .skill-panel { border:1px solid #5c4a2c; border-radius:12px; padding:12px; background:linear-gradient(180deg,#171108,#0f0b06); transition:all .2s; }
        .skill-panel:hover { border-color:#a6864a; box-shadow:0 0 18px rgba(171,133,62,.2); }
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 90, height: 90, borderRadius: 12, border: "1px solid #82673b", display: "grid", placeItems: "center", background: "#1a1309" }}>
            {iconSrc ? <ImageViewport src={iconSrc} alt={skill.nome} size={78} radius={10} adjust={skill.iconeAjuste} /> : <span style={{ fontSize: 38 }}>{skill.icone || "?"}</span>}
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div className="skill-panel">
          <div style={{ fontFamily: "monospace", color: "#d7bf91", marginBottom: 4 }}>Mecânica</div>
          <div style={{ fontSize: 13 }}>Rolagem: <b>{rolagemLabel(skill)}</b></div>
          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(skill.custos || []).map((c, idx) => {
              const st = custoStyle(skill, c.codigo);
              return (
                <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ padding: "4px 10px", borderRadius: 999, background: st.bg, color: st.fg, fontFamily: "monospace", fontSize: 11, textShadow: "0 1px 2px rgba(0,0,0,.65)" }}>{Number(c.quantidade || 0)}{c.codigo}</span>
                  {idx < (skill.custos || []).length - 1 && <span style={{ color: "#dcc89f", fontFamily: "monospace", fontSize: 11 }}>{c.operador || "e"}</span>}
                </span>
              );
            })}
            {(skill.custos || []).length === 0 && <span style={{ padding: "4px 10px", borderRadius: 999, background: "#2a2a2a", color: "#fff", fontFamily: "monospace", fontSize: 11 }}>N/A</span>}
          </div>
          <div style={{ fontSize: 13, marginTop: 8 }}>Essência: <b>{skill.essenciaAtribuida || "Nenhuma"}</b></div>
        </div>

        <div className="skill-panel">
          <div style={{ fontFamily: "monospace", color: "#d7bf91", marginBottom: 8 }}>Informações</div>
          <div style={{ display: "grid", gap: 5, fontFamily: "monospace", fontSize: 12, color: "#e8d7b8" }}>
            <div><b>Dono:</b> {skill.dono || "—"}</div>
            <div><b>Alcance:</b> {skill.alcance || "—"}</div>
            <div><b>Geração:</b> {Number(skill.geracao || 1)}</div>
          </div>
        </div>
      </div>

      <div className="skill-panel" style={{ marginBottom: 10 }}>
        <div style={{ fontFamily: "monospace", color: "#d7bf91", marginBottom: 6 }}>Tags</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(skill.tagIds || []).map((id) => tagsById[id]).filter(Boolean).map((tag) => <SkillTag key={tag.id} tag={tag} />)}
          {(skill.tagIds || []).length === 0 && <span style={{ color: G.muted, fontFamily: "monospace", fontSize: 12 }}>Sem tags.</span>}
        </div>
      </div>

      <div className="skill-panel" style={{ marginBottom: 10, whiteSpace: "pre-wrap" }}>{skill.descricao || "Sem descrição."}</div>
      <pre className="skill-panel" style={{ background: "#101827", color: "#8fc8ff", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>{skill.descricaoCode || "// sem descrição code"}</pre>
    </div>
  );
}
