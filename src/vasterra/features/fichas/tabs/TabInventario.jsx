import React, { useMemo, useState } from "react";
import { uid } from "../../../core/factories";
import { calcVastosTotal, getEntryItem } from "../../../core/inventory";
import { G, inpStyle, btnStyle } from "../../../ui/theme";
import { RANK_COR } from "../../../data/gameData";
import { Modal, ItemIcon } from "../../shared/components";
import { ItemEditor } from "../../arsenal/ItemEditor";
import { ArsenalDetalhe } from "../../arsenal/ArsenalDetalhe";

const blankAdj = () => ({ id: uid(), nome: "", tipo: "peso", valor: 0 });
const sumByType = (list, type) => (list || []).filter((x) => x.tipo === type).reduce((s, x) => s + (Number(x.valor) || 0), 0);

function VastosCalc({ vastos, onUpdate }) {
  const [preco, setPreco] = useState({ cobre: 0, prata: 0, ouro: 0, platina: 0 });
  const [pago, setPago] = useState({ cobre: 0, prata: 0, ouro: 0, platina: 0 });
  const troco = calcVastosTotal(pago) - calcVastosTotal(preco);

  const upCoin = (side, key, val) => {
    const next = { ...(side === "preco" ? preco : pago), [key]: Number(val) || 0 };
    side === "preco" ? setPreco(next) : setPago(next);
  };

  return (
    <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 10 }}>
      <div style={{ fontFamily: "'Cinzel',serif", color: G.gold, marginBottom: 8 }}>Vastos & Calculadora de Troco</div>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: G.muted, marginBottom: 8 }}>Carteira: C:{vastos.cobre || 0} · P:{vastos.prata || 0} · O:{vastos.ouro || 0} · Pl:{vastos.platina || 0}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[{ key: "preco", label: "Preço" }, { key: "pago", label: "Pago" }].map((side) => (
          <div key={side.key} style={{ border: "1px solid #222", borderRadius: 8, padding: 8 }}>
            <div style={{ fontFamily: "monospace", color: G.muted, fontSize: 11, marginBottom: 6 }}>{side.label}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>
              {["cobre", "prata", "ouro", "platina"].map((coin) => (
                <input key={coin} type="number" min={0} value={(side.key === "preco" ? preco : pago)[coin]} onChange={(e) => upCoin(side.key, coin, e.target.value)} placeholder={coin[0].toUpperCase()} style={inpStyle({ fontSize: 11, padding: "5px" })} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, fontFamily: "'Cinzel',serif", color: troco >= 0 ? "#5ee39a" : "#ff7a6e" }}>Troco: {troco}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, marginTop: 8 }}>
        {["cobre", "prata", "ouro", "platina"].map((coin) => <input key={coin} type="number" min={0} value={vastos?.[coin] || 0} onChange={(e) => onUpdate({ ...vastos, [coin]: Number(e.target.value) || 0 })} style={inpStyle({ fontSize: 11, padding: "5px" })} />)}
      </div>
    </div>
  );
}

export function TabInventario({ ficha, onUpdate, arsenal, onArsenal, onNotify, onConfirmAction }) {
  const [search, setSearch] = useState("");
  const [arsenalOpen, setArsenalOpen] = useState(false);
  const [localEdit, setLocalEdit] = useState(null);
  const [localOpen, setLocalOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const cfg = ficha.inventarioCfg || { slotsBase: 10, capacidadePorForca: 5, ajustes: [], vastos: { cobre: 0, prata: 0, ouro: 0, platina: 0 } };

  const addFromArsenal = (it) => {
    const idx = ficha.inventario.findIndex((x) => x.tipo === "arsenal" && x.itemId === it.id);
    if (idx >= 0) {
      const inv = ficha.inventario.map((x, i) => (i === idx ? { ...x, qtd: (x.qtd || 1) + 1 } : x));
      onUpdate({ inventario: inv });
    } else {
      onUpdate({ inventario: [...ficha.inventario, { id: uid(), tipo: "arsenal", itemId: it.id, qtd: 1 }] });
    }
    setArsenalOpen(false);
  };

  const saveLocal = (d) => {
    const idx = ficha.inventario.findIndex((x) => x.id === d.id);
    if (idx >= 0) onUpdate({ inventario: ficha.inventario.map((x, i) => (i === idx ? { ...x, item: d, tipo: "local" } : x)) });
    else onUpdate({ inventario: [...ficha.inventario, { id: d.id, tipo: "local", item: d, qtd: 1 }] });
    setLocalOpen(false);
  };

  const entries = ficha.inventario
    .map((entry) => ({ entry, item: getEntryItem(entry, arsenal) }))
    .filter(({ item }) => item && (!search || item.nome.toLowerCase().includes(search.toLowerCase())));

  const totals = useMemo(() => {
    const forca = Number(ficha.atributos?.FOR?.val || 0);
    const usedWeight = entries.reduce((sum, { entry, item }) => sum + (Number(item.peso || 0) * (entry.qtd || 1)), 0);
    const usedSlots = entries.reduce((sum, { entry, item }) => sum + (Number(item.slots || 1) * (entry.qtd || 1)), 0);
    const buffSlots = sumByType(cfg.ajustes, "slot");
    const buffCapFor = sumByType(cfg.ajustes, "capacidadePorForca");
    const buffCap = sumByType(cfg.ajustes, "capacidade");
    const capForca = Number(cfg.capacidadePorForca || 5) + buffCapFor;
    const maxWeight = Math.max(0, forca * capForca + buffCap);
    const maxSlots = Math.max(0, Number(cfg.slotsBase || 10) + buffSlots);
    return { usedWeight, usedSlots, maxWeight, maxSlots };
  }, [cfg, entries, ficha.atributos?.FOR?.val]);

  const removeInv = (id) => onUpdate({ inventario: ficha.inventario.filter((x) => x.id !== id) });
  const upQtd = (id, v) => onUpdate({ inventario: ficha.inventario.map((x) => (x.id === id ? { ...x, qtd: Math.max(0, v) } : x)).filter((x) => (x.qtd || 0) > 0) });

  const addAjuste = () => onUpdate({ inventarioCfg: { ...cfg, ajustes: [...(cfg.ajustes || []), blankAdj()] } });
  const upAjuste = (id, patch) => onUpdate({ inventarioCfg: { ...cfg, ajustes: (cfg.ajustes || []).map((a) => (a.id === id ? { ...a, ...patch } : a)) } });
  const delAjuste = (id) => onUpdate({ inventarioCfg: { ...cfg, ajustes: (cfg.ajustes || []).filter((a) => a.id !== id) } });

  const makeLocalFromArsenal = (entry, item) => {
    const local = { ...item, id: uid(), nome: `${item.nome} (local)` };
    onUpdate({ inventario: ficha.inventario.map((x) => (x.id === entry.id ? { ...x, tipo: "local", item: local, itemId: undefined } : x)) });
    onNotify?.("Item do arsenal convertido para edição local.", "success");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 12 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 10 }}>
          <div style={{ fontFamily: "'Cinzel',serif", color: G.gold, marginBottom: 8 }}>Capacidade do Inventário</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
            <input type="number" value={cfg.slotsBase || 10} onChange={(e) => onUpdate({ inventarioCfg: { ...cfg, slotsBase: Number(e.target.value) || 0 } })} placeholder="Slots base" style={inpStyle()} />
            <input type="number" value={cfg.capacidadePorForca || 5} onChange={(e) => onUpdate({ inventarioCfg: { ...cfg, capacidadePorForca: Number(e.target.value) || 0 } })} placeholder="Cap./FOR" style={inpStyle()} />
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: G.muted }}>Capacidade = FOR({ficha.atributos?.FOR?.val || 0}) × {cfg.capacidadePorForca || 5} + buffs/debuffs</div>
          <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontFamily: "monospace", fontSize: 11 }}>
            <div style={{ color: totals.usedWeight > totals.maxWeight ? "#ff7a6e" : "#7ee2a4" }}>Peso: {totals.usedWeight.toFixed(1)} / {totals.maxWeight.toFixed(1)}</div>
            <div style={{ color: totals.usedSlots > totals.maxSlots ? "#ff7a6e" : "#7ee2a4" }}>Slots: {totals.usedSlots} / {totals.maxSlots}</div>
          </div>
        </div>

        <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontFamily: "'Cinzel',serif", color: G.gold }}>Buffs/Debuffs</span><button onClick={addAjuste} style={btnStyle({ padding: "3px 8px" })}>+ Ajuste</button></div>
          <div style={{ maxHeight: 180, overflowY: "auto", display: "grid", gap: 6, paddingRight: 4 }}>
            {(cfg.ajustes || []).map((a) => (
              <div key={a.id} style={{ display: "grid", gridTemplateColumns: "1fr 130px 90px auto", gap: 5 }}>
                <input value={a.nome} onChange={(e) => upAjuste(a.id, { nome: e.target.value })} placeholder="Nome" style={inpStyle()} />
                <select value={a.tipo} onChange={(e) => upAjuste(a.id, { tipo: e.target.value })} style={inpStyle()}><option value="peso">peso</option><option value="slot">slot</option><option value="capacidadePorForca">capacidade por força</option><option value="capacidade">capacidade</option></select>
                <input type="number" value={a.valor} onChange={(e) => upAjuste(a.id, { valor: Number(e.target.value) || 0 })} style={inpStyle()} />
                <button onClick={() => delAjuste(a.id)} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c", padding: "4px" })}>✕</button>
              </div>
            ))}
          </div>
        </div>

        <VastosCalc vastos={cfg.vastos || {}} onUpdate={(vastos) => onUpdate({ inventarioCfg: { ...cfg, vastos } })} />
      </div>

      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar item..." style={{ ...inpStyle(), flex: 1 }} />
          <button style={btnStyle()} onClick={() => setArsenalOpen(true)}>+ Puxar Arsenal</button>
          <button style={btnStyle({ borderColor: "#2ecc7144", color: "#2ecc71" })} onClick={() => { setLocalEdit(null); setLocalOpen(true); }}>+ Criar Local</button>
        </div>

        <div style={{ display: "grid", gap: 8, maxHeight: "70vh", overflowY: "auto", paddingRight: 4 }}>
          {entries.map(({ entry, item }) => {
            const isA = entry.tipo === "arsenal";
            const cor = RANK_COR[item.rank] || "#7f8c8d";
            return (
              <div key={entry.id} style={{ background: G.bg2, border: "1px solid " + cor + "33", borderRadius: 10, padding: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ItemIcon item={item} size={24} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Cinzel',serif", color: G.gold }}>{item.nome}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 11, color: G.muted }}>{item.tipo} · {item.rank} · Peso {item.peso || 0} · Slots {item.slots || 1}</div>
                  </div>
                  <button onClick={() => upQtd(entry.id, (entry.qtd || 1) - 1)} style={btnStyle({ padding: "2px 8px" })}>−</button>
                  <span style={{ fontFamily: "monospace", width: 24, textAlign: "center" }}>{entry.qtd || 1}</span>
                  <button onClick={() => upQtd(entry.id, (entry.qtd || 1) + 1)} style={btnStyle({ padding: "2px 8px" })}>+</button>
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={() => setDetail(item)} style={btnStyle({ padding: "3px 8px", borderColor: "#7f8cff44", color: "#91a0ff" })}>Detalhes</button>
                  {!isA && <button onClick={() => { setLocalEdit(item); setLocalOpen(true); }} style={btnStyle({ padding: "3px 8px", borderColor: "#3498db44", color: "#3498db" })}>Editar</button>}
                  {isA && <button onClick={() => makeLocalFromArsenal(entry, item)} style={btnStyle({ padding: "3px 8px", borderColor: "#2ecc7144", color: "#2ecc71" })}>Editar Local</button>}
                  {!isA && <button onClick={() => onArsenal([{ ...item, id: uid(), nome: item.nome + " (cópia arsenal)" }, ...arsenal])} style={btnStyle({ padding: "3px 8px", borderColor: "#9b59b644", color: "#bf8fe8" })}>Copiar p/ Arsenal</button>}
                  {!isA && <button onClick={() => onArsenal(arsenal.some((a) => a.nome === item.nome) ? arsenal.map((a) => (a.nome === item.nome ? { ...item, id: a.id } : a)) : arsenal)} style={btnStyle({ padding: "3px 8px", borderColor: "#f39c1244", color: "#f39c12" })}>Substituir mesmo nome</button>}
                  <button onClick={() => onConfirmAction?.({ title: "Remover item", message: `Remover ${item.nome}?`, onConfirm: () => removeInv(entry.id) })} style={btnStyle({ marginLeft: "auto", padding: "3px 8px", borderColor: "#e74c3c44", color: "#e74c3c" })}>Apagar</button>
                </div>
                <div style={{ marginTop: 6, fontFamily: "monospace", fontSize: 11, color: "#8ea0b8" }}>{item.descricao || "Sem descrição"}</div>
              </div>
            );
          })}
          {entries.length === 0 && <div style={{ textAlign: "center", color: G.muted, padding: 40, background: G.bg2, border: "1px solid " + G.border, borderRadius: 10 }}>Inventário vazio.</div>}
        </div>
      </div>

      {arsenalOpen && (
        <Modal title="Puxar item do Arsenal" onClose={() => setArsenalOpen(false)} wide>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, maxHeight: "70vh", overflowY: "auto" }}>
            {arsenal.map((it) => <button key={it.id} onClick={() => addFromArsenal(it)} style={{ textAlign: "left", background: G.bg2, border: "1px solid " + (RANK_COR[it.rank] || "#888") + "44", borderRadius: 8, padding: 10 }}><div style={{ fontFamily: "'Cinzel',serif", color: G.gold }}>{it.nome}</div><div style={{ fontFamily: "monospace", color: G.muted, fontSize: 11 }}>{it.tipo} · {it.rank}</div></button>)}
          </div>
        </Modal>
      )}

      {localOpen && <ItemEditor item={localEdit} onSave={saveLocal} onClose={() => setLocalOpen(false)} />}
      {detail && <Modal title={`Detalhes: ${detail.nome}`} onClose={() => setDetail(null)} wide><ArsenalDetalhe item={detail} onEdit={() => { setLocalEdit(detail); setLocalOpen(true); setDetail(null); }} onDup={() => {}} onDel={() => {}} /></Modal>}
    </div>
  );
}
