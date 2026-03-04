import React, { useMemo, useState } from "react";
import { Modal } from "../shared/components";
import { btnStyle, G, inpStyle } from "../../ui/theme";
import { HoverButton } from "../../components/primitives/Interactive";
import { novaSkill } from "../../core/factories";

const DONO_TIPOS = ["Ficha", "Classe", "Raça", "Nome próprio"];
const CUSTO_TIPOS = ["Status", "Recursos"];
const ROLAGENS = ["Destreza + Pontaria", "Força + Lâminas", "Mentalidade + Vontade", "Inteligência + Conhecimento", "Especial"];
const GERACOES = ["Comum", "Avançada", "Lendária", "Relíquia"];
const RANKS = ["Comum", "Incomum", "Raro", "Épico", "Lendário", "Mítico"];

function TagPicker({ tags, selectedIds, onToggle, onClose }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => (tags || []).filter((t) => t.nome.toLowerCase().includes(search.toLowerCase())), [tags, search]);

  return (
    <Modal title="Selecionar Tags" onClose={onClose}>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar tag..." style={{ ...inpStyle(), marginBottom: 8 }} />
      <div style={{ maxHeight: "52vh", overflowY: "auto", display: "grid", gap: 6 }}>
        {filtered.map((tag) => (
          <label key={tag.id} style={{ display: "flex", gap: 8, alignItems: "center", border: "1px solid #2a2a2a", background: "#0a0a0a", borderRadius: 8, padding: "8px 10px" }}>
            <input type="checkbox" checked={selectedIds.includes(tag.id)} onChange={() => onToggle(tag.id)} />
            <span style={{ width: 10, height: 10, borderRadius: 99, background: tag.cor }} />
            <span style={{ fontFamily: "monospace", color: G.text }}>{tag.nome}</span>
          </label>
        ))}
      </div>
      <div style={{ marginTop: 10, textAlign: "right" }}><HoverButton onClick={onClose}>Concluir</HoverButton></div>
    </Modal>
  );
}

export function SkillEditor({ skill, tags = [], onSave, onClose }) {
  const [form, setForm] = useState({ ...novaSkill(), ...(skill || {}) });
  const [pickerOpen, setPickerOpen] = useState(false);

  const iconSrc = form.iconeModo === "url" ? form.iconeUrl : form.iconeModo === "upload" ? form.iconeData : "";

  const save = () => onSave({ ...form, atualizado: Date.now() });

  return (
    <Modal title={skill ? `Editar Skill: ${skill.nome}` : "Criar Skill"} onClose={onClose} wide>
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
          <div style={{ border: "1px solid #2a2a2a", borderRadius: 10, background: "#0b0b0b", minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {iconSrc ? <img src={iconSrc} alt={form.nome} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }} /> : <span style={{ fontSize: 34 }}>{form.icone || "?"}</span>}
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} placeholder="Nome da Skill" style={inpStyle()} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <select value={form.iconeModo} onChange={(e) => setForm((p) => ({ ...p, iconeModo: e.target.value }))} style={inpStyle()}><option value="fallback">Fallback</option><option value="url">URL</option><option value="upload">Upload(base64)</option></select>
              <input value={form.cor} onChange={(e) => setForm((p) => ({ ...p, cor: e.target.value }))} placeholder="Cor (#hex)" style={inpStyle()} />
            </div>
            {form.iconeModo === "fallback" && <input value={form.icone || ""} onChange={(e) => setForm((p) => ({ ...p, icone: e.target.value.slice(0, 2) }))} placeholder="Ícone fallback" style={inpStyle()} />}
            {form.iconeModo === "url" && <input value={form.iconeUrl || ""} onChange={(e) => setForm((p) => ({ ...p, iconeUrl: e.target.value }))} placeholder="URL da imagem" style={inpStyle()} />}
            {form.iconeModo === "upload" && <textarea rows={2} value={form.iconeData || ""} onChange={(e) => setForm((p) => ({ ...p, iconeData: e.target.value }))} placeholder="Cole base64 data:image/..." style={inpStyle()} />}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          <select value={form.donoTipo} onChange={(e) => setForm((p) => ({ ...p, donoTipo: e.target.value }))} style={inpStyle()}>{DONO_TIPOS.map((d) => <option key={d}>{d}</option>)}</select>
          <input value={form.donoValor} onChange={(e) => setForm((p) => ({ ...p, donoValor: e.target.value }))} placeholder="Dono (valor)" style={inpStyle()} />
          <input value={form.alcance} onChange={(e) => setForm((p) => ({ ...p, alcance: e.target.value }))} placeholder="Alcance" style={inpStyle()} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 6 }}>
          <select value={form.custoTipo} onChange={(e) => setForm((p) => ({ ...p, custoTipo: e.target.value }))} style={inpStyle()}>{CUSTO_TIPOS.map((c) => <option key={c}>{c}</option>)}</select>
          <input value={form.custoValor} onChange={(e) => setForm((p) => ({ ...p, custoValor: e.target.value }))} placeholder="Custo" style={inpStyle()} />
          <input value={form.custoCor} onChange={(e) => setForm((p) => ({ ...p, custoCor: e.target.value }))} placeholder="Cor custo" style={inpStyle()} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
          <select value={form.rolagemAcerto} onChange={(e) => setForm((p) => ({ ...p, rolagemAcerto: e.target.value }))} style={inpStyle()}>{ROLAGENS.map((r) => <option key={r}>{r}</option>)}</select>
          <select value={form.geracao} onChange={(e) => setForm((p) => ({ ...p, geracao: e.target.value }))} style={inpStyle()}>{GERACOES.map((r) => <option key={r}>{r}</option>)}</select>
          <select value={form.rank} onChange={(e) => setForm((p) => ({ ...p, rank: e.target.value }))} style={inpStyle()}>{RANKS.map((r) => <option key={r}>{r}</option>)}</select>
          <input value={form.essenciaAtribuida} onChange={(e) => setForm((p) => ({ ...p, essenciaAtribuida: e.target.value }))} placeholder="Essência atribuída" style={inpStyle()} />
        </div>

        <div style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: 8, background: "#0a0a0a" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontFamily: "monospace", color: G.muted }}>Tags ({(form.tagIds || []).length})</span>
            <HoverButton onClick={() => setPickerOpen(true)} style={btnStyle({ padding: "4px 10px" })}>Selecionar tags</HoverButton>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(form.tagIds || []).map((id) => {
              const tag = tags.find((x) => x.id === id);
              if (!tag) return null;
              return <span key={id} style={{ padding: "3px 8px", borderRadius: 999, border: `1px solid ${tag.cor}55`, color: tag.cor, fontSize: 11, fontFamily: "monospace" }}>{tag.nome}</span>;
            })}
            {(form.tagIds || []).length === 0 && <span style={{ color: G.muted, fontSize: 11, fontFamily: "monospace" }}>Sem tags</span>}
          </div>
        </div>

        <textarea rows={4} value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} placeholder="Descrição da Skill" style={inpStyle()} />
        <textarea rows={4} value={form.descricaoCode} onChange={(e) => setForm((p) => ({ ...p, descricaoCode: e.target.value }))} placeholder="Descrição CODE" style={inpStyle({ fontFamily: "monospace", color: "#9ed0ff" })} />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <HoverButton onClick={onClose} style={btnStyle({ borderColor: "#555", color: "#999" })}>Cancelar</HoverButton>
          <HoverButton onClick={save}>Salvar Skill</HoverButton>
        </div>
      </div>

      {pickerOpen && (
        <TagPicker
          tags={tags}
          selectedIds={form.tagIds || []}
          onToggle={(id) => setForm((p) => ({ ...p, tagIds: (p.tagIds || []).includes(id) ? p.tagIds.filter((x) => x !== id) : [...(p.tagIds || []), id] }))}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </Modal>
  );
}
