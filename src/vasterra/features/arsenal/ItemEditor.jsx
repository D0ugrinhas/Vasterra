import React, { useMemo, useState } from "react";
import { ARSENAL_TIPOS, ARSENAL_RANKS, RANK_COR } from "../../data/gameData";
import { novoItem, uid } from "../../core/factories";
import { parseMechanicalEffect } from "../../core/effects";
import { G, inpStyle, btnStyle } from "../../ui/theme";
import { Modal } from "../shared/components";

const blankEffect = () => ({ id: uid(), nome: "", descricao: "", valor: "", ativo: true });

function VastosInput({ value = {}, onChange }) {
  const set = (k, v) => onChange({ ...(value || {}), [k]: Math.max(0, Number(v) || 0) });
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
      {["cobre", "prata", "ouro", "platina"].map((k) => (
        <input key={k} type="number" min={0} value={Number(value?.[k] || 0)} onChange={(e) => set(k, e.target.value)} placeholder={k} style={inpStyle({ textTransform: "capitalize" })} />
      ))}
    </div>
  );
}

function EffectListEditor({ title, list, onChange }) {
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
          const parsed = parseMechanicalEffect(ef.valor || "");
          return (
            <div key={ef.id} style={{ border: "1px solid #2a2a2a", borderRadius: 8, padding: 8, display: "grid", gap: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px auto", gap: 6 }}>
                <input value={ef.nome} onChange={(e) => up(ef.id, { nome: e.target.value })} placeholder="Nome" style={inpStyle()} />
                <input value={ef.descricao} onChange={(e) => up(ef.id, { descricao: e.target.value })} placeholder="Descrição" style={inpStyle()} />
                <input value={ef.valor} onChange={(e) => up(ef.id, { valor: e.target.value })} placeholder="+4FOR" style={inpStyle()} />
                <button onClick={() => del(ef.id)} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c", padding: "4px 8px" })}>✕</button>
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: parsed ? "#6fe39b" : "#777" }}>{parsed ? `Aplica ${parsed.value >= 0 ? "+" : ""}${parsed.value} em ${parsed.key} (${parsed.scope}).` : "Formato sugerido: +4FOR, -2VIT, +3AGILIDADE"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ItemEditor({ item, onSave, onClose }) {
  const [d, setD] = useState(() => {
    const base = item ? { ...item } : novoItem();
    return {
      ...base,
      bonus: (base.bonus || []).length ? base.bonus.map((b) => ({ id: b.id || uid(), nome: b.nome || b.texto || "", descricao: b.descricao || "", valor: b.valor || b.efeito || "", ativo: b.ativo !== false })) : [blankEffect()],
      efeitos: (base.efeitos || []).map((e) => ({ id: e.id || uid(), nome: e.nome || e.titulo || "", descricao: e.descricao || e.desc || "", valor: e.valor || "", ativo: e.ativo !== false })),
      slots: Number(base.slots || 1),
      vastos: base.vastos || { cobre: 0, prata: 0, ouro: 0, platina: 0 },
    };
  });

  const up = (k, v) => setD((p) => ({ ...p, [k]: v }));
  const isArma = d.tipo === "Arma";
  const isArmadura = d.tipo === "Armadura";

  const parsedCount = useMemo(() => [...d.bonus, ...d.efeitos].filter((e) => parseMechanicalEffect(e.valor || "")).length, [d]);

  return (
    <Modal title={item ? "Editar Item" : "Criar Item"} onClose={onClose} wide>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <input value={d.nome} onChange={(e) => up("nome", e.target.value)} placeholder="Nome do item" style={inpStyle()} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <select value={d.tipo} onChange={(e) => up("tipo", e.target.value)} style={inpStyle()}>{ARSENAL_TIPOS.map((t) => <option key={t}>{t}</option>)}</select>
            <select value={d.rank} onChange={(e) => up("rank", e.target.value)} style={inpStyle({ color: RANK_COR[d.rank] || G.text })}>{ARSENAL_RANKS.map((r) => <option key={r}>{r}</option>)}</select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input type="number" min={0} step={0.1} value={Number(d.peso || 0)} onChange={(e) => up("peso", Number(e.target.value) || 0)} placeholder="Peso" style={inpStyle()} />
            <input type="number" min={1} value={Number(d.slots || 1)} onChange={(e) => up("slots", Math.max(1, Number(e.target.value) || 1))} placeholder="Slots" style={inpStyle()} />
          </div>
          {isArma && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><input value={d.dano || ""} onChange={(e) => up("dano", e.target.value)} placeholder="Dano" style={inpStyle()} /><input value={d.critico || ""} onChange={(e) => up("critico", e.target.value)} placeholder="Crítico" style={inpStyle()} /></div>}
          {isArmadura && <input value={d.defesa || ""} onChange={(e) => up("defesa", e.target.value)} placeholder="Defesa" style={inpStyle()} />}
          <input value={d.regiao || ""} onChange={(e) => up("regiao", e.target.value)} placeholder="Região" style={inpStyle()} />
          <textarea value={d.descricao || ""} onChange={(e) => up("descricao", e.target.value)} rows={4} placeholder="Descrição" style={inpStyle({ resize: "vertical" })} />
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: G.gold, marginBottom: 5 }}>Preço em Vastos</div>
            <VastosInput value={d.vastos} onChange={(v) => up("vastos", v)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: G.gold, marginBottom: 5 }}>Ícone</div>
            <input value={d.icone || ""} onChange={(e) => up("icone", e.target.value)} placeholder="Emoji (ex: ⚔️)" style={inpStyle()} />
          </div>

          <EffectListEditor title="Bônus" list={d.bonus} onChange={(next) => up("bonus", next)} />
          <EffectListEditor title="Efeitos" list={d.efeitos} onChange={(next) => up("efeitos", next)} />
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "#7fb3ff" }}>Efeitos válidos para cálculo: {parsedCount}</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <button style={btnStyle({ background: "transparent", borderColor: "#333", color: G.muted })} onClick={onClose}>Cancelar</button>
        <button style={btnStyle()} onClick={() => onSave(d)}>Salvar Item</button>
      </div>
    </Modal>
  );
}
