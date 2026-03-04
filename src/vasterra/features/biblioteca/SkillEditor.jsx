import React, { useMemo, useState } from "react";
import { Modal } from "../shared/components";
import { btnStyle, G, inpStyle } from "../../ui/theme";
import { HoverButton } from "../../components/primitives/Interactive";
import { novaSkill, uid } from "../../core/factories";
import { ESSENCIAS_PECADOS, ESSENCIAS_VIRTUDES, ALL_PERICIAS, ARSENAL_RANKS } from "../../data/gameData";
import { ImageAttachModal, ImageViewport } from "../../components/media/ImageAttachModal";

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

const ROLAGEM_TIPOS = ["Padrão", "Perícia", "Ação", "Instrução"];
const ACOES = ["Ataque", "Esquiva", "Bloqueio", "Contra-ataque"];
const ESSENCIAS = ["Nenhuma", ...ESSENCIAS_VIRTUDES.map((e) => e.nome), ...ESSENCIAS_PECADOS.map((e) => e.nome)];

function TagPicker({ tags, selectedIds, onToggle, onClose }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => (tags || []).filter((t) => t.nome.toLowerCase().includes(search.toLowerCase())), [tags, search]);

  return (
    <Modal title="Selecionar Tags" onClose={onClose}>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar tag..." style={{ ...inpStyle(), marginBottom: 8 }} />
      <div style={{ maxHeight: "52vh", overflowY: "auto", display: "grid", gap: 6 }}>
        {filtered.map((tag) => (
          <label key={tag.id} className="tag-picker-item" style={{ display: "flex", gap: 8, alignItems: "center", border: "1px solid #2a2a2a", background: "#0a0a0a", borderRadius: 10, padding: "8px 10px", transition: "all .2s", cursor: "pointer" }}>
            <input type="checkbox" checked={selectedIds.includes(tag.id)} onChange={() => onToggle(tag.id)} />
            <span style={{ width: 12, height: 12, borderRadius: 99, background: tag.cor, boxShadow: `0 0 10px ${tag.cor}88` }} />
            <span style={{ fontFamily: "monospace", color: "#fff", fontSize: 12 }}>{tag.nome}</span>
          </label>
        ))}
      </div>
      <div style={{ marginTop: 10, textAlign: "right" }}><HoverButton onClick={onClose}>Concluir</HoverButton></div>
    </Modal>
  );
}

function renderRolagemResumo(form) {
  if (form.rolagemTipo === "Perícia") return `Rolagem de ${form.rolagemPericia || "Perícia"}`;
  if (form.rolagemTipo === "Ação") return `Rolagem de ${form.rolagemAcao || "Ação"}`;
  if (form.rolagemTipo === "Instrução") return "Instrução (descrição da skill)";
  return "Rolagem de acerto (padrão)";
}

export function SkillEditor({ skill, tags = [], onSave, onClose }) {
  const [form, setForm] = useState({ ...novaSkill(), ...(skill || {}) });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [imgOpen, setImgOpen] = useState(false);

  const iconSrc = form.iconeModo === "url" ? form.iconeUrl : form.iconeModo === "upload" ? form.iconeData : "";

  const save = () => onSave({ ...form, atualizado: Date.now() });

  return (
    <Modal title={skill ? `Editar Skill: ${skill.nome}` : "Criar Skill"} onClose={onClose} wide>
      <style>{`
        .bib-editor-card { background: linear-gradient(180deg,#0d1117,#0a0c10); border:1px solid #28313d; border-radius:12px; padding:10px; }
        .bib-editor-card:hover { border-color:#416084; box-shadow: 0 0 18px rgba(90,140,200,.12); }
        .tag-picker-item:hover { border-color:#5177a1; transform: translateY(-1px); }
      `}</style>
      <div style={{ display: "grid", gap: 8 }}>
        <div className="bib-editor-card" style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 10 }}>
          <div style={{ border: "1px solid #2a3f57", borderRadius: 10, minHeight: 130, display: "grid", placeItems: "center", background: "#081019" }}>
            {iconSrc ? <ImageViewport src={iconSrc} alt={form.nome} size={92} radius={10} adjust={form.iconeAjuste} /> : <span style={{ fontSize: 40 }}>{form.icone || "?"}</span>}
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} placeholder="Nome da Skill" style={inpStyle()} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px auto", gap: 6 }}>
              <input value={form.icone || ""} onChange={(e) => setForm((p) => ({ ...p, icone: e.target.value.slice(0, 2), iconeModo: "fallback" }))} placeholder="Ícone fallback" style={inpStyle()} />
              <input type="color" value={form.cor || "#4a6088"} onChange={(e) => setForm((p) => ({ ...p, cor: e.target.value }))} style={{ ...inpStyle({ padding: 2 }), height: 36 }} />
              <HoverButton onClick={() => setImgOpen(true)} style={btnStyle({ borderColor: "#4f7dbc66", color: "#b4d9ff" })}>Anexar imagem</HoverButton>
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "#8aa2bd" }}>Use o anexo para URL/upload + ajuste fino (zoom/offset/filtro), reaproveitando o sistema nativo de imagem.</div>
          </div>
        </div>

        <div className="bib-editor-card" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 6 }}>
          <input value={form.dono || ""} onChange={(e) => setForm((p) => ({ ...p, dono: e.target.value }))} placeholder="Dono da skill (input livre)" style={inpStyle()} />
          <input value={form.alcance} onChange={(e) => setForm((p) => ({ ...p, alcance: e.target.value }))} placeholder="Alcance" style={inpStyle()} />
          <input type="number" min={1} value={Number(form.geracao || 1)} onChange={(e) => setForm((p) => ({ ...p, geracao: Math.max(1, Number(e.target.value) || 1) }))} placeholder="Geração" style={inpStyle()} />
        </div>

        <div className="bib-editor-card" style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "monospace", color: "#8db3dc", fontSize: 12 }}>Custo da Skill</span>
            <div style={{ display: "flex", gap: 6 }}>
              <HoverButton onClick={() => setForm((p) => ({ ...p, custos: [] }))} style={btnStyle({ padding: "4px 8px", borderColor: "#3b4f64", color: "#94b6d5" })}>N/A (sem custo)</HoverButton>
              <HoverButton onClick={() => setForm((p) => ({ ...p, custos: [...(p.custos || []), { id: uid(), tipo: "ACO", valor: 1 }] }))} style={btnStyle({ padding: "4px 8px" })}>+ custo</HoverButton>
            </div>
          </div>
          <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 11 }}>Exemplos: 1ACO e 5EST · 1ACO e 1MOV e 5MAN · 5EST · N/A.</div>
          <div style={{ display: "grid", gap: 6 }}>
            {(form.custos || []).map((c) => (
              <div key={c.id} style={{ display: "grid", gridTemplateColumns: "120px 1fr auto", gap: 6 }}>
                <select value={c.tipo} onChange={(e) => setForm((p) => ({ ...p, custos: p.custos.map((x) => (x.id === c.id ? { ...x, tipo: e.target.value } : x)) }))} style={inpStyle()}>
                  {Object.keys(CUSTO_CORES).map((k) => <option key={k}>{k}</option>)}
                </select>
                <input type="number" min={0} value={Number(c.valor || 0)} onChange={(e) => setForm((p) => ({ ...p, custos: p.custos.map((x) => (x.id === c.id ? { ...x, valor: Math.max(0, Number(e.target.value) || 0) } : x)) }))} style={inpStyle()} />
                <HoverButton onClick={() => setForm((p) => ({ ...p, custos: p.custos.filter((x) => x.id !== c.id) }))} style={btnStyle({ borderColor: "#a8453b66", color: "#ff9a90", padding: "4px 8px" })}>x</HoverButton>
              </div>
            ))}
            {(form.custos || []).length === 0 && <div style={{ color: "#99a7b5", fontSize: 12 }}>Sem custo (N/A)</div>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(form.custos || []).map((c) => (
              <span key={`preview-${c.id}`} style={{ padding: "4px 10px", borderRadius: 999, background: CUSTO_CORES[c.tipo] || "#666", color: c.tipo === "EST" ? "#151515" : "#fff", fontFamily: "monospace", fontSize: 11 }}>{Number(c.valor || 0)}{c.tipo}</span>
            ))}
            {(form.custos || []).length === 0 && <span style={{ padding: "4px 10px", borderRadius: 999, background: "#2a2a2a", color: "#fff", fontFamily: "monospace", fontSize: 11 }}>N/A</span>}
          </div>
        </div>

        <div className="bib-editor-card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          <select value={form.rolagemTipo || "Padrão"} onChange={(e) => setForm((p) => ({ ...p, rolagemTipo: e.target.value }))} style={inpStyle()}>{ROLAGEM_TIPOS.map((r) => <option key={r}>{r}</option>)}</select>
          {form.rolagemTipo === "Perícia" && <select value={form.rolagemPericia || ""} onChange={(e) => setForm((p) => ({ ...p, rolagemPericia: e.target.value }))} style={inpStyle()}><option value="">Selecione a perícia</option>{ALL_PERICIAS.map((p) => <option key={p}>{p}</option>)}</select>}
          {form.rolagemTipo === "Ação" && <select value={form.rolagemAcao || "Ataque"} onChange={(e) => setForm((p) => ({ ...p, rolagemAcao: e.target.value }))} style={inpStyle()}>{ACOES.map((a) => <option key={a}>{a}</option>)}</select>}
          {form.rolagemTipo === "Instrução" && <input value={form.rolagemInstrucao || ""} onChange={(e) => setForm((p) => ({ ...p, rolagemInstrucao: e.target.value }))} placeholder="Instrução da rolagem" style={inpStyle()} />}
          {form.rolagemTipo === "Padrão" && <div style={{ ...inpStyle({ display: "flex", alignItems: "center", color: "#8da8c5" }) }}>Padrão condizente com a skill</div>}
          <select value={form.rank} onChange={(e) => setForm((p) => ({ ...p, rank: e.target.value }))} style={inpStyle()}>{ARSENAL_RANKS.map((r) => <option key={r}>{r}</option>)}</select>
          <select value={form.essenciaAtribuida || "Nenhuma"} onChange={(e) => setForm((p) => ({ ...p, essenciaAtribuida: e.target.value }))} style={inpStyle()}>{ESSENCIAS.map((e) => <option key={e}>{e}</option>)}</select>
        </div>
        <div style={{ color: "#8fb0cf", fontFamily: "monospace", fontSize: 11 }}>Resumo da rolagem: {renderRolagemResumo(form)}</div>

        <div className="bib-editor-card" style={{ border: "1px solid #2a445e" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontFamily: "monospace", color: "#a9ccf0" }}>Tags ({(form.tagIds || []).length})</span>
            <HoverButton onClick={() => setPickerOpen(true)} style={btnStyle({ padding: "4px 10px" })}>Selecionar tags</HoverButton>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(form.tagIds || []).map((id) => {
              const tag = tags.find((x) => x.id === id);
              if (!tag) return null;
              return <span key={id} style={{ padding: "4px 10px", borderRadius: 999, border: "1px solid #ffffff22", color: "#fff", background: tag.cor, fontSize: 11, fontFamily: "monospace", textShadow: "0 1px 2px rgba(0,0,0,.5)" }}>{tag.nome}</span>;
            })}
            {(form.tagIds || []).length === 0 && <span style={{ color: G.muted, fontSize: 11, fontFamily: "monospace" }}>Sem tags</span>}
          </div>
        </div>

        <textarea rows={4} value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} placeholder="Descrição da Skill" style={inpStyle()} />
        <textarea rows={4} value={form.descricaoCode} onChange={(e) => setForm((p) => ({ ...p, descricaoCode: e.target.value }))} placeholder="Descrição CODE" style={inpStyle({ fontFamily: "monospace", color: "#9ed0ff", background: "#07101b" })} />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <HoverButton onClick={onClose} style={btnStyle({ borderColor: "#555", color: "#999" })}>Cancelar</HoverButton>
          <HoverButton onClick={save}>Salvar Skill</HoverButton>
        </div>
      </div>

      {pickerOpen && <TagPicker tags={tags} selectedIds={form.tagIds || []} onToggle={(id) => setForm((p) => ({ ...p, tagIds: (p.tagIds || []).includes(id) ? p.tagIds.filter((x) => x !== id) : [...(p.tagIds || []), id] }))} onClose={() => setPickerOpen(false)} />}
      <ImageAttachModal
        open={imgOpen}
        title="Anexar imagem da Skill"
        initial={{ mode: form.iconeModo === "url" ? "url" : "upload", url: form.iconeUrl, data: form.iconeData, adjust: form.iconeAjuste }}
        onClose={() => setImgOpen(false)}
        onConfirm={(img) => {
          setForm((p) => ({ ...p, iconeModo: img.mode, iconeUrl: img.url, iconeData: img.data, iconeAjuste: img.adjust }));
          setImgOpen(false);
        }}
      />
    </Modal>
  );
}
