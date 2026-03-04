import React from "react";
import { G, btnStyle } from "../../ui/theme";
import { HoverButton } from "../../components/primitives/Interactive";

function SkillTag({ tag }) {
  return (
    <span className="skill-tag-wrap" style={{ position: "relative", display: "inline-block" }}>
      <span style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${tag.cor}66`, color: tag.cor, background: `${tag.cor}22`, fontFamily: "monospace", fontSize: 11 }}>
        {tag.nome}
      </span>
      <span className="skill-tag-tip" style={{ position: "absolute", left: "50%", bottom: "calc(100% + 8px)", transform: "translateX(-50%)", minWidth: 180, maxWidth: 260, padding: "8px 10px", borderRadius: 8, border: "1px solid #41546b", background: "linear-gradient(180deg,#0d1722,#091018)", color: "#b9d9ff", fontFamily: "monospace", fontSize: 11, opacity: 0, pointerEvents: "none", transition: "all .2s", zIndex: 10 }}>
        <b style={{ color: "#e5f2ff" }}>{tag.nome}</b>
        <div style={{ marginTop: 4 }}>{tag.descricao || "Sem descrição para esta tag."}</div>
      </span>
    </span>
  );
}

export function SkillDetalhe({ skill, tagsById = {}, onEdit, onDup, onDel }) {
  return (
    <div>
      <style>{`.skill-tag-wrap:hover .skill-tag-tip { opacity: 1; transform: translateX(-50%) translateY(-4px); }`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontFamily: "'Cinzel Decorative',serif", color: G.gold, fontSize: 24 }}>{skill.nome}</div>
        <div style={{ display: "flex", gap: 6 }}>
          <HoverButton onClick={onEdit}>Editar</HoverButton>
          <HoverButton onClick={onDup} style={btnStyle({ borderColor: "#4f7dbc66", color: "#9ecfff" })}>Duplicar</HoverButton>
          <HoverButton onClick={onDel} style={btnStyle({ borderColor: "#b9483a66", color: "#ff9f92" })}>Apagar</HoverButton>
        </div>
      </div>
      <div style={{ color: G.muted, fontFamily: "monospace", marginBottom: 10 }}>{skill.donoTipo}: {skill.donoValor || "—"} · Alcance: {skill.alcance || "—"} · {skill.rank}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: 10, background: "#090909" }}>
          <div style={{ fontFamily: "monospace", color: "#8fb3d8", marginBottom: 4 }}>Mecânica</div>
          <div style={{ fontSize: 13 }}>Rolagem: <b>{skill.rolagemAcerto}</b></div>
          <div style={{ fontSize: 13 }}>Custo: <b style={{ color: skill.custoCor || "#8fd2ff" }}>{skill.custoTipo} · {skill.custoValor || "—"}</b></div>
          <div style={{ fontSize: 13 }}>Geração: <b>{skill.geracao}</b></div>
          <div style={{ fontSize: 13 }}>Essência: <b>{skill.essenciaAtribuida || "—"}</b></div>
        </div>
        <div style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: 10, background: "#090909" }}>
          <div style={{ fontFamily: "monospace", color: "#8fb3d8", marginBottom: 6 }}>Tags</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(skill.tagIds || []).map((id) => tagsById[id]).filter(Boolean).map((tag) => <SkillTag key={tag.id} tag={tag} />)}
            {(skill.tagIds || []).length === 0 && <span style={{ color: G.muted, fontFamily: "monospace", fontSize: 12 }}>Sem tags.</span>}
          </div>
        </div>
      </div>
      <div style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: 12, background: "#0a0a0a", marginBottom: 10, whiteSpace: "pre-wrap" }}>{skill.descricao || "Sem descrição."}</div>
      <pre style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: 12, background: "#070d15", color: "#8fc8ff", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>{skill.descricaoCode || "// sem descrição code"}</pre>
    </div>
  );
}
