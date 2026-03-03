import React, { useMemo, useState } from "react";
import { ARSENAL_TIPOS, ARSENAL_RANKS, RANK_COR, ESSENCIAS_VIRTUDES, ESSENCIAS_PECADOS } from "../../data/gameData";
import { novoItem, uid } from "../../core/factories";
import { parseMechanicalEffects, instantiateEffectFromTemplate } from "../../core/effects";
import { G, inpStyle, btnStyle } from "../../ui/theme";
import { Modal, EffectDetailsModal } from "../shared/components";
import { EffectForgeEditor, makeDefaultEffect } from "../caldeirao/EffectForgeEditor";

const blankEffect = () => ({ id: uid(), nome: "", descricao: "", valor: "", ativo: true });

const WEAPON_TYPES = ["Espada Longa", "Espada Pesada", "Arco", "Cajado", "Glaive", "Polearm", "Machado", "Adaga", "Lança", "Martelo", "Outros"];

function VastosInput({ value = {}, onChange }) {
  const set = (k, v) => onChange({ ...(value || {}), [k]: Math.max(0, Number(v) || 0) });
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
      {["cobre", "prata", "ouro", "platina"].map((k) => (
        <div key={k}>
          <label style={{ display: "block", fontSize: 10, color: G.muted, marginBottom: 2 }}>{k}</label>
          <input type="number" min={0} value={Number(value?.[k] || 0)} onChange={(e) => set(k, e.target.value)} style={inpStyle()} />
        </div>
      ))}
    </div>
  );
}

function EffectListEditor({ title, list, onChange, onEditAttached }) {
  const up = (id, patch) => onChange((list || []).map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const del = (id) => onChange((list || []).filter((x) => x.id !== id));

  return (
    <div style={{ background: G.bg3, border: "1px solid " + G.border, borderRadius: 10, padding: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: "'Cinzel',serif", color: G.gold }}>{title}</span>
        <button onClick={() => onChange([...(list || []), blankEffect()])} style={btnStyle({ padding: "3px 8px", fontSize: 11 })}>+ Add</button>
      </div>
      <div style={{ display: "grid", gap: 8, maxHeight: 220, overflowY: "auto", paddingRight: 4 }}>
        {(list || []).map((ef) => {
          const parsedList = parseMechanicalEffects(ef.valor || "");
          const parsed = parsedList[0] || null;
          return (
            <div key={ef.id} style={{ border: "1px solid #2a2a2a", borderRadius: 8, padding: 8, display: "grid", gap: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 140px auto auto", gap: 6 }}>
                <input value={ef.nome} onChange={(e) => up(ef.id, { nome: e.target.value })} placeholder="Nome" style={inpStyle()} />
                <input value={ef.descricao} onChange={(e) => up(ef.id, { descricao: e.target.value })} placeholder="Descrição" style={inpStyle()} />
                <input value={ef.valor} onChange={(e) => up(ef.id, { valor: e.target.value })} placeholder="+4FOR / +5%ÉTER" style={inpStyle()} />
                {ef.origemEffectId ? (
                  <button onClick={() => onEditAttached?.(ef)} style={btnStyle({ borderColor: "#9b59b644", color: "#d7a9ff", padding: "4px 8px" })}>✎</button>
                ) : <span />}
                <button onClick={() => del(ef.id)} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c", padding: "4px 8px" })}>✕</button>
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: parsed ? "#6fe39b" : "#777" }}>{parsed ? `Aplica ${parsed.raw || `${parsed.value >= 0 ? "+" : ""}${parsed.value}${parsed.key}`}` : "Aceita: +4FOR, -2VIT, +5%SABEDORIA, +5%ÉTER"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function ItemEffectsEditor({ list = [], onChange, onEditSource, onEditLocal }) {
  const del = (id) => onChange((list || []).filter((x) => x.id !== id));
  return (
    <div style={{ background: G.bg3, border: "1px solid " + G.border, borderRadius: 10, padding: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: "'Cinzel',serif", color: G.gold }}>Efeitos (modelo Caldeirão)</span>
      </div>
      <div style={{ display: "grid", gap: 8, maxHeight: 220, overflowY: "auto", paddingRight: 4 }}>
        {(list || []).map((ef) => {
          const parsed = parseMechanicalEffects(ef.efeitoMecanico || ef.valor || "")[0] || null;
          return (
            <div key={ef.id} style={{ border: "1px solid #2a2a2a", borderRadius: 8, padding: 8, display: "grid", gap: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 1fr auto auto auto auto", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={ef.ativo !== false} onChange={(e) => onChange((list || []).map((x) => x.id === ef.id ? { ...x, ativo: e.target.checked } : x))} />
                <input value={ef.nome || ""} onChange={(e) => onChange((list || []).map((x) => x.id === ef.id ? { ...x, nome: e.target.value } : x))} placeholder="Nome" style={inpStyle()} />
                <input value={ef.efeitoMecanico || ""} onChange={(e) => onChange((list || []).map((x) => x.id === ef.id ? { ...x, efeitoMecanico: e.target.value } : x))} placeholder="+4FOR" style={inpStyle()} />
                <button onClick={() => onEditLocal?.(ef)} style={btnStyle({ borderColor: "#9b59b644", color: "#d7a9ff", padding: "4px 8px" })}>✎</button>
                <button onClick={() => onChange([...(list || []), instantiateEffectFromTemplate(ef, { id: uid(), nome: `${ef.nome || "Efeito"} (cópia)` })])} style={btnStyle({ borderColor: "#3498db44", color: "#73bfff", padding: "4px 8px" })}>⎘</button>
                {ef.origemEffectId ? <button onClick={() => onEditSource?.(ef)} style={btnStyle({ borderColor: "#f39c1244", color: "#f7c96b", padding: "4px 8px" })}>🧪</button> : <span />}
                <button onClick={() => del(ef.id)} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c", padding: "4px 8px" })}>✕</button>
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: parsed ? "#6fe39b" : "#777" }}>{parsed ? `Aplica ${parsed.raw}` : "Aceita: +4FOR, -2VIT, +5%ÉTER"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const allEssencias = [...ESSENCIAS_VIRTUDES, ...ESSENCIAS_PECADOS];

export function ItemEditor({ item, onSave, onClose, effectsLibrary = [], onCreateEffect, onEditEffect, bodyRegionOptions = [] }) {
  const [d, setD] = useState(() => {
    const base = item ? { ...item } : novoItem();
    return {
      ...base,
      bonus: (base.bonus || []).length ? base.bonus.map((b) => ({ id: b.id || uid(), nome: b.nome || b.texto || "", descricao: b.descricao || "", valor: b.valor || b.efeito || "", ativo: b.ativo !== false })) : [blankEffect()],
      efeitos: (base.efeitos || []).map((e) => instantiateEffectFromTemplate(e, { id: e.id || uid(), ativo: e.ativo !== false, origem: "Item", origemDetalhe: base.nome || "Item" })),
      slots: Number(base.slots || 1),
      vastos: base.vastos || { cobre: 0, prata: 0, ouro: 0, platina: 0 },
      iconeModo: base.iconeModo || "emoji",
      subtipo: base.subtipo || "",
      comentario: base.comentario || "",
      regioesDefesa: Array.isArray(base.regioesDefesa)
        ? base.regioesDefesa
        : [base.regiaoEfeito, base.regiaoEfeitoOutro].filter(Boolean),
      empilhavel: base.empilhavel ?? true,
      quantidadeMax: Number(base.quantidadeMax || 1),
      gastoPorUso: Number(base.gastoPorUso || 1),
      consumoTipo: base.consumoTipo || "quantidade",
      essenciaAtribuida: base.essenciaAtribuida || "",
    };
  });

  const initialSnapshot = useMemo(() => JSON.stringify(item ? { ...item } : novoItem()), [item]);
  const [selectedEffectId, setSelectedEffectId] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [effectEditorOpen, setEffectEditorOpen] = useState(false);
  const [effectEditorData, setEffectEditorData] = useState(null);
  const selectedEffect = (effectsLibrary || []).find((x) => x.id === selectedEffectId) || null;

  const defenseRegionOptions = useMemo(() => {
    const base = Array.isArray(bodyRegionOptions) ? bodyRegionOptions : [];
    const unique = [];
    const seen = new Set();
    base.forEach((x) => {
      const v = String(x || "").trim();
      if (!v || seen.has(v)) return;
      seen.add(v);
      unique.push(v);
    });
    return unique;
  }, [bodyRegionOptions]);

  const toggleDefenseRegion = (region) => {
    const current = Array.isArray(d.regioesDefesa) ? d.regioesDefesa : [];
    if (current.includes(region)) up("regioesDefesa", current.filter((x) => x !== region));
    else up("regioesDefesa", [...current, region]);
  };

  const up = (k, v) => setD((p) => ({ ...p, [k]: v }));
  const isArma = d.tipo === "Arma";
  const isArmaduraLike = ["Armadura", "Vestimenta", "Acessório", "Marcas"].includes(d.tipo);
  const isConsumivel = d.tipo === "Consumível";

  const parsedCount = useMemo(() => [...d.bonus, ...d.efeitos].reduce((sum, e) => sum + parseMechanicalEffects(e.efeitoMecanico || e.valor || "").length, 0), [d]);


  const editAttachedEffect = (ef) => {
    const ref = (effectsLibrary || []).find((x) => x.id === ef.origemEffectId);
    if (!ref) return;
    onEditEffect?.(ref);
  };


  const safeClose = () => {
    const isDirty = JSON.stringify(d) !== initialSnapshot;
    if (isDirty && !window.confirm("Descartar alterações do item?")) return;
    onClose();
  };

  const onUploadIcon = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => up("iconeData", String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  return (
    <Modal title={item ? "Editar Item" : "Criar Item"} onClose={safeClose} wide>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div>
            <label style={{ display: "block", color: G.muted, fontSize: 11, marginBottom: 4 }}>Nome do item</label>
            <input value={d.nome} onChange={(e) => up("nome", e.target.value)} placeholder="Nome do item" style={inpStyle()} />
          </div>
          <div>
            <label style={{ display: "block", color: G.muted, fontSize: 11, marginBottom: 4 }}>Comentário de Rank (frase de efeito)</label>
            <input value={d.comentario} onChange={(e) => up("comentario", e.target.value)} placeholder="Ex: Forjada para reis caídos." style={inpStyle()} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <select value={d.tipo} onChange={(e) => up("tipo", e.target.value)} style={inpStyle()}>{ARSENAL_TIPOS.map((t) => <option key={t}>{t}</option>)}</select>
            <select value={d.rank} onChange={(e) => up("rank", e.target.value)} style={inpStyle({ color: RANK_COR[d.rank] || G.text })}>{ARSENAL_RANKS.map((r) => <option key={r}>{r}</option>)}</select>
          </div>

          {isArma && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <select value={d.subtipo || ""} onChange={(e) => up("subtipo", e.target.value)} style={inpStyle()}>
                <option value="">Tipo de arma</option>
                {WEAPON_TYPES.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
              {d.subtipo === "Outros" && <input value={d.subtipoOutro || ""} onChange={(e) => up("subtipoOutro", e.target.value)} placeholder="Nome próprio" style={inpStyle()} />}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={{ display: "block", color: G.muted, fontSize: 10, marginBottom: 3 }}>Peso (kg) — usado no limite de carga do Inventário</label>
              <input type="number" min={0} step={0.1} value={Number(d.peso || 0)} onChange={(e) => up("peso", Number(e.target.value) || 0)} placeholder="Peso em kg" style={inpStyle()} />
            </div>
            <div>
              <label style={{ display: "block", color: G.muted, fontSize: 10, marginBottom: 3 }}>Slots — quantos espaços ocupa no Inventário</label>
              <input type="number" min={1} value={Number(d.slots || 1)} onChange={(e) => up("slots", Math.max(1, Number(e.target.value) || 1))} placeholder="Slots" style={inpStyle()} />
            </div>
          </div>

          {isArma && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><div><label style={{ display: "block", color: G.muted, fontSize: 10, marginBottom: 3 }}>Dano base da arma</label><input value={d.dano || ""} onChange={(e) => up("dano", e.target.value)} placeholder="Ex: 1d8+2" style={inpStyle()} /></div><div><label style={{ display: "block", color: G.muted, fontSize: 10, marginBottom: 3 }}>Crítico</label><input value={d.critico || ""} onChange={(e) => up("critico", e.target.value)} placeholder="Ex: 19-20/x2" style={inpStyle()} /></div></div>}
          
          {isArma && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><div><label style={{ display: "block", color: G.muted, fontSize: 10, marginBottom: 3 }}>Alcance — distância efetiva</label><input value={d.alcance || ""} onChange={(e) => up("alcance", e.target.value)} placeholder="Ex: corpo a corpo / 12m" style={inpStyle()} /></div><div><label style={{ display: "block", color: G.muted, fontSize: 10, marginBottom: 3 }}>Tamanho — dimensão física da arma</label><input value={d.tamanho || ""} onChange={(e) => up("tamanho", e.target.value)} placeholder="Ex: 1.2m" style={inpStyle()} /></div></div>}

          {isArmaduraLike && (
            <div style={{ border: "1px solid #243248", borderRadius: 8, padding: 8, display: "grid", gap: 6 }}>
              <div style={{ color: G.muted, fontSize: 11 }}>Região de Defesa (múltiplas partes do Corpo)</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 120, overflowY: "auto", paddingRight: 4 }}>
                {defenseRegionOptions.length === 0 && <span style={{ color: G.muted, fontSize: 11 }}>Sem partes/subpartes disponíveis nesta ficha.</span>}
                {defenseRegionOptions.map((r) => {
                  const on = (d.regioesDefesa || []).includes(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggleDefenseRegion(r)}
                      style={btnStyle({ padding: "3px 8px", borderRadius: 999, borderColor: on ? "#49c1ff66" : "#2b3f56", color: on ? "#9ed8ff" : G.muted, background: on ? "#49c1ff22" : "transparent" })}
                    >
                      {on ? "☑" : "☐"} {r}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isConsumivel && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <select value={String(d.empilhavel)} onChange={(e) => up("empilhavel", e.target.value === "true")} style={inpStyle()}><option value="true">Empilhável</option><option value="false">Não empilhável</option></select>
              <input type="number" min={1} value={Number(d.quantidadeMax || 1)} onChange={(e) => up("quantidadeMax", Math.max(1, Number(e.target.value) || 1))} placeholder="Qtd Máx." style={inpStyle()} />
              <select value={d.consumoTipo || "quantidade"} onChange={(e) => up("consumoTipo", e.target.value)} style={inpStyle()}><option value="quantidade">Consumo por quantidade</option><option value="desgaste">Consumo por desgaste</option></select>
              <input type="number" min={1} value={Number(d.gastoPorUso || 1)} onChange={(e) => up("gastoPorUso", Math.max(1, Number(e.target.value) || 1))} placeholder="Gasto por uso" style={inpStyle()} />
            </div>
          )}

          <div>
            <label style={{ display: "block", color: G.muted, fontSize: 11, marginBottom: 4 }}>Descrição</label>
            <textarea value={d.descricao || ""} onChange={(e) => up("descricao", e.target.value)} rows={4} placeholder="Descrição narrativa e técnica do item..." style={inpStyle({ resize: "vertical" })} />
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ background: G.bg3, border: "1px solid " + G.border, borderRadius: 10, padding: 10 }}>
            <div style={{ fontSize: 11, color: G.gold, marginBottom: 5 }}>Imagem / Ícone</div>
            <select value={d.iconeModo || "emoji"} onChange={(e) => up("iconeModo", e.target.value)} style={{ ...inpStyle(), marginBottom: 6 }}>
              <option value="emoji">Ícone (emoji)</option>
              <option value="url">Imagem por URL</option>
              <option value="upload">Imagem local</option>
            </select>
            {(d.iconeModo || "emoji") === "emoji" && <input value={d.icone || ""} onChange={(e) => up("icone", e.target.value)} placeholder="⚔️" style={inpStyle()} />}
            {(d.iconeModo || "emoji") === "url" && <input value={d.iconeUrl || ""} onChange={(e) => up("iconeUrl", e.target.value)} placeholder="https://..." style={inpStyle()} />}
            {(d.iconeModo || "emoji") === "upload" && <input type="file" accept="image/*" onChange={(e) => onUploadIcon(e.target.files?.[0])} style={inpStyle()} />}
          </div>

          <div>
            <div style={{ fontSize: 11, color: G.gold, marginBottom: 5 }}>Preço em Vastos</div>
            <VastosInput value={d.vastos} onChange={(v) => up("vastos", v)} />
          </div>

          <div>
            <div style={{ fontSize: 11, color: G.gold, marginBottom: 5 }}>Atribuir Essência</div>
            <select value={d.essenciaAtribuida || ""} onChange={(e) => up("essenciaAtribuida", e.target.value)} style={inpStyle()}>
              <option value="">Sem essência</option>
              {allEssencias.map((es) => <option key={es.nome} value={es.nome}>{es.nome}</option>)}
            </select>
          </div>

          <div style={{ background: G.bg3, border: "1px solid " + G.border, borderRadius: 10, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontFamily: "'Cinzel',serif", color: G.gold }}>Anexar efeito do Caldeirão</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => onCreateEffect?.()} style={btnStyle({ padding: "3px 8px", fontSize: 11, borderColor: "#9b59b644", color: "#d8a6ff" })}>Criar no Caldeirão</button>
                <button onClick={() => { setEffectEditorData(makeDefaultEffect()); setEffectEditorOpen(true); }} style={btnStyle({ padding: "3px 8px", fontSize: 11, borderColor: "#8e44ad55", color: "#dcb3ff" })}>Criar local</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 6 }}>
              <select value={selectedEffectId} onChange={(e) => setSelectedEffectId(e.target.value)} style={inpStyle()}>
                <option value="">Selecionar efeito do Caldeirão...</option>
                {effectsLibrary.map((x) => <option key={x.id} value={x.id}>{x.nome} · {x.efeitoMecanico || "—"}</option>)}
              </select>
              <button onClick={() => selectedEffectId && up("efeitos", [...(d.efeitos || []), instantiateEffectFromTemplate(selectedEffect, { origemEffectId: selectedEffect.id, ativo: true, origem: "Item", origemDetalhe: d.nome || "Item" })])} disabled={!selectedEffectId} style={btnStyle({ padding: "3px 8px", fontSize: 11 })}>Anexar</button>
              <button onClick={() => setPreviewOpen(true)} disabled={!selectedEffectId} style={btnStyle({ padding: "3px 8px", fontSize: 11, borderColor: "#3498db44", color: "#73bfff" })}>🔍</button>
            </div>
          </div>

          <EffectListEditor title="Bônus" list={d.bonus} onChange={(next) => up("bonus", next)} />
          <ItemEffectsEditor list={d.efeitos} onChange={(next) => up("efeitos", next)} onEditSource={editAttachedEffect} onEditLocal={(ef) => { setEffectEditorData(ef); setEffectEditorOpen(true); }} />
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "#7fb3ff" }}>Efeitos válidos para cálculo: {parsedCount}</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <button style={btnStyle({ background: "transparent", borderColor: "#333", color: G.muted })} onClick={safeClose}>Cancelar</button>
        <button style={btnStyle()} onClick={() => onSave({ ...d, regiaoEfeito: (d.regioesDefesa || [])[0] || "", regiaoEfeitoOutro: "", regioesDefesa: d.regioesDefesa || [] })}>Salvar Item</button>
      </div>
      {previewOpen && <EffectDetailsModal effect={selectedEffect} onClose={() => setPreviewOpen(false)} />}
      {effectEditorOpen && <EffectForgeEditor effect={effectEditorData} onSave={(ef) => {
        const next = instantiateEffectFromTemplate(ef, { id: ef.id || uid(), origem: "Item", origemDetalhe: d.nome || "Item", ativo: ef.ativo ?? true });
        const exists = (d.efeitos || []).some((x) => x.id === next.id);
        up("efeitos", exists ? d.efeitos.map((x) => x.id === next.id ? next : x) : [next, ...(d.efeitos || [])]);
        setEffectEditorOpen(false);
      }} onClose={() => setEffectEditorOpen(false)} />}
    </Modal>
  );
}
