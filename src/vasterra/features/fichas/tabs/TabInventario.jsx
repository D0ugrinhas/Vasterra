import React, { useEffect, useMemo, useRef, useState } from "react";
import { uid } from "../../../core/factories";
import { calcVastosTotal, getEntryItem } from "../../../core/inventory";
import {
  GRID_TEMPLATES,
  buildGridOccupancy,
  canPlaceGridItem,
  autoPlaceGridItem,
  getShape,
  normalizeGridState,
  makeGridItemFromTemplate,
} from "../../../core/inventoryGrid";
import { G, inpStyle, btnStyle } from "../../../ui/theme";
import { RANK_COR } from "../../../data/gameData";
import { Modal, ItemIcon } from "../../shared/components";
import { ItemEditor } from "../../arsenal/ItemEditor";
import { ArsenalDetalhe } from "../../arsenal/ArsenalDetalhe";

const blankAdj = () => ({ id: uid(), nome: "", tipo: "peso", valor: 0 });
const sumByType = (list, type) => (list || []).filter((x) => x.tipo === type).reduce((s, x) => s + (Number(x.valor) || 0), 0);

function listCorpoPartes(corpo) {
  const out = [];
  const walk = (node, path = "") => {
    const partes = Array.isArray(node?.partes) ? node.partes : [];
    partes.forEach((p) => {
      const nome = String(p?.nome || "Parte").trim();
      const full = path ? `${path} › ${nome}` : nome;
      out.push(full);
      walk(p?.interno, full);
    });
  };
  walk(corpo || {});
  return Array.from(new Set(out));
}

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

export function TabInventario({ ficha, onUpdate, arsenal, efeitosCaldeirao = [], onArsenal, onNotify, onConfirmAction, onOpenCaldeirao }) {
  const [search, setSearch] = useState("");
  const [arsenalOpen, setArsenalOpen] = useState(false);
  const [localEdit, setLocalEdit] = useState(null);
  const [localOpen, setLocalOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [gridTemplateOpen, setGridTemplateOpen] = useState(false);
  const [gridCreateOpen, setGridCreateOpen] = useState(false);
  const [selectedGridId, setSelectedGridId] = useState(null);
  const [customDraft, setCustomDraft] = useState({ nome: "Novo Item", categoria: "tool", shapeKey: "1x1", cor: "#8b7a5f", peso: 1, valor: 10, partes: "" });
  const [innerTab, setInnerTab] = useState("inventory");
  const [dragState, setDragState] = useState(null);
  const [dragAnchor, setDragAnchor] = useState(null);
  const gridRef = useRef(null);
  const cfg = ficha.inventarioCfg || { slotsBase: 10, capacidadePorForca: 5, ajustes: [], vastos: { cobre: 0, prata: 0, ouro: 0, platina: 0 } };
  const gridState = useMemo(() => normalizeGridState(ficha.inventarioGrid || {}), [ficha.inventarioGrid]);
  const gridOcc = useMemo(() => buildGridOccupancy(gridState.items || []), [gridState.items]);
  const corpoPartes = useMemo(() => listCorpoPartes(ficha.corpo), [ficha.corpo]);
  const selectedGrid = useMemo(() => (gridState.items || []).find((it) => it.id === selectedGridId) || null, [gridState.items, selectedGridId]);
  const dragValid = useMemo(() => {
    if (!dragState || !dragAnchor) return false;
    const it = (gridState.items || []).find((x) => x.id === dragState.id);
    if (!it) return false;
    return canPlaceGridItem(it, dragAnchor.row, dragAnchor.col, gridOcc, gridState.rows, gridState.cols, it.id);
  }, [dragState, dragAnchor, gridState.items, gridOcc, gridState.rows, gridState.cols]);

  useEffect(() => {
    if ((gridState.items || []).length > 0) return;
    const legacy = (ficha.inventario || []).map((entry) => ({ entry, item: getEntryItem(entry, arsenal) })).filter((x) => x.item);
    if (!legacy.length) return;
    const seeded = [];
    legacy.forEach(({ entry, item }) => {
      const fromTemplate = makeGridItemFromTemplate({
        id: item.id || uid(),
        nome: item.nome || "Item",
        categoria: String(item.tipo || "item").toLowerCase(),
        shapeKey: item.shapeKey || "1x1",
        cor: item.cor || "#8b7a5f",
        peso: Number(item.peso || 0),
        valor: Number(item.valorTotal || item.valor || 0),
        partes: Array.isArray(item.regioesDefesa) ? item.regioesDefesa : [],
        maxQtd: Number(item.quantidadeMax || 0) || null,
      }, {
        descricao: item.descricao || "",
        rank: item.rank || "Comum",
        tipo: item.tipo || "Item",
        dano: item.dano || "",
        danoCritico: item.critico || "",
        margemCritico: item.critico || "",
        alcance: item.alcance || "",
        tamanho: item.tamanho || "",
        efeitoCaldeirao: item.efeitosCaldeirao || [],
        bonusOnus: item.efeitosMecanicos || item.bonus || "",
        qtd: Number(entry?.qtd || 1),
      });
      const anchor = autoPlaceGridItem(fromTemplate, seeded, gridState.rows, gridState.cols);
      if (!anchor) return;
      fromTemplate.anchor = anchor;
      seeded.push(fromTemplate);
    });
    if (seeded.length) onUpdate({ inventarioGrid: { ...gridState, items: seeded } });
  }, [ficha.inventario, arsenal]);

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

  const saveGrid = (items) => onUpdate({ inventarioGrid: { ...gridState, items } });

  const addGridFromTemplate = (template) => {
    const item = makeGridItemFromTemplate(template);
    const anchor = autoPlaceGridItem(item, gridState.items, gridState.rows, gridState.cols);
    if (!anchor) {
      onNotify?.("Sem espaço no grid para este item.", "error");
      return;
    }
    item.anchor = anchor;
    saveGrid([...(gridState.items || []), item]);
    setSelectedGridId(item.id);
    setGridTemplateOpen(false);
  };

  const rotateGridItem = () => {
    if (!selectedGrid) return;
    const updated = { ...selectedGrid, rotation: (Number(selectedGrid.rotation || 0) + 1) % 4 };
    const allowed = canPlaceGridItem(updated, selectedGrid.anchor?.row || 0, selectedGrid.anchor?.col || 0, gridOcc, gridState.rows, gridState.cols, selectedGrid.id);
    if (!allowed) {
      onNotify?.("Não cabe girar nessa posição.", "info");
      return;
    }
    saveGrid(gridState.items.map((it) => (it.id === selectedGrid.id ? updated : it)));
  };

  const equipGridItem = (partName) => {
    if (!selectedGrid) return;
    saveGrid(gridState.items.map((it) => (it.id === selectedGrid.id ? { ...it, equipadoEm: partName || null } : it)));
  };

  const createCustomGridItem = () => {
    const item = makeGridItemFromTemplate({
      id: `custom_${uid()}`,
      nome: customDraft.nome,
      categoria: customDraft.categoria,
      shapeKey: customDraft.shapeKey,
      cor: customDraft.cor,
      peso: customDraft.peso,
      valor: customDraft.valor,
      partes: customDraft.partes.split(",").map((x) => x.trim()).filter(Boolean),
    });
    const anchor = autoPlaceGridItem(item, gridState.items, gridState.rows, gridState.cols);
    if (!anchor) {
      onNotify?.("Sem espaço para item customizado.", "error");
      return;
    }
    item.anchor = anchor;
    saveGrid([...(gridState.items || []), item]);
    setGridCreateOpen(false);
  };

  const resolveCellFromClient = (clientX, clientY) => {
    const el = gridRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const col = Math.floor((clientX - rect.left) / 28);
    const row = Math.floor((clientY - rect.top) / 28);
    if (row < 0 || col < 0 || row >= gridState.rows || col >= gridState.cols) return null;
    return { row, col };
  };

  useEffect(() => {
    if (!dragState) return undefined;
    const onMove = (e) => {
      const cell = resolveCellFromClient(e.clientX, e.clientY);
      if (!cell) {
        setDragAnchor(null);
        return;
      }
      setDragAnchor({ row: cell.row - dragState.dr, col: cell.col - dragState.dc });
    };
    const onUp = () => {
      if (dragState && dragAnchor && dragValid) {
        saveGrid(gridState.items.map((it) => (it.id === dragState.id ? { ...it, anchor: dragAnchor } : it)));
      }
      setDragState(null);
      setDragAnchor(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragState, dragAnchor, dragValid, gridState.items]);

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

        <div style={{ marginTop: 14, border: "1px solid #3b2f1e", borderRadius: 10, padding: 10, background: "#0a0907" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <button onClick={() => setInnerTab("inventory")} style={btnStyle({ padding: "4px 8px", borderColor: innerTab === "inventory" ? "#c8a96e" : "#3c2e1a", color: innerTab === "inventory" ? G.gold : G.muted })}>Inventário</button>
            <button onClick={() => setInnerTab("equip")} style={btnStyle({ padding: "4px 8px", borderColor: innerTab === "equip" ? "#c8a96e" : "#3c2e1a", color: innerTab === "equip" ? G.gold : G.muted })}>Equipamentos</button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontFamily: "'Cinzel',serif", color: G.gold }}>Inventário Grid (novo caminho)</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={btnStyle({ padding: "4px 8px" })} onClick={() => setGridTemplateOpen(true)}>+ Arsenal Grid</button>
              <button style={btnStyle({ padding: "4px 8px", borderColor: "#2ecc7144", color: "#9be8b7" })} onClick={() => setGridCreateOpen(true)}>+ Criar item</button>
            </div>
          </div>
          {innerTab === "inventory" && <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 8 }}>
            <div ref={gridRef} style={{ position: "relative", border: "1px solid #4a3b21", borderRadius: 8, overflow: "hidden", background: "#090805", width: "fit-content" }}>
              {Array.from({ length: gridState.rows * gridState.cols }).map((_, idx) => {
                const row = Math.floor(idx / gridState.cols);
                const col = idx % gridState.cols;
                return (
                  <button
                    key={`c-${idx}`}
                    onClick={() => setSelectedGridId(gridOcc[`${row},${col}`] || null)}
                    style={{
                      position: "absolute",
                      left: col * 28,
                      top: row * 28,
                      width: 28,
                      height: 28,
                      border: "1px solid #2e2516",
                      background: "#120f0a",
                      cursor: "pointer",
                    }}
                  />
                );
              })}
              {(gridState.items || []).map((it) => {
                const shape = getShape(it.shapeKey, it.rotation || 0);
                return shape.map(([dr, dc], idx) => (
                  <div
                    key={`${it.id}-${idx}`}
                    onClick={() => setSelectedGridId(it.id)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSelectedGridId(it.id);
                      setDragState({ id: it.id, dr, dc });
                      setDragAnchor(it.anchor || null);
                    }}
                    style={{
                      position: "absolute",
                      left: ((dragState?.id === it.id && dragAnchor ? Number(dragAnchor.col || 0) : Number(it.anchor?.col || 0)) + dc) * 28,
                      top: ((dragState?.id === it.id && dragAnchor ? Number(dragAnchor.row || 0) : Number(it.anchor?.row || 0)) + dr) * 28,
                      width: 28,
                      height: 28,
                      border: `1px solid ${selectedGridId === it.id ? "#f5d18a" : "#00000066"}`,
                      background: `${it.cor || "#888"}${dragState?.id === it.id ? "88" : "cc"}`,
                      cursor: dragState?.id === it.id ? "grabbing" : "grab",
                    }}
                    title={it.nome}
                  />
                ));
              })}
              {dragState && dragAnchor && (
                <div style={{ position: "absolute", left: dragAnchor.col * 28, top: dragAnchor.row * 28, color: dragValid ? "#79e1a0" : "#ff8a8a", fontSize: 10, fontFamily: "monospace", pointerEvents: "none" }}>
                  {dragValid ? "OK" : "BLOQ"}
                </div>
              )}
              <div style={{ width: gridState.cols * 28, height: gridState.rows * 28, pointerEvents: "none" }} />
            </div>

            <div style={{ border: "1px solid #3a2e1a", borderRadius: 8, padding: 8, background: "#0e0b08" }}>
              {!selectedGrid && <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 11 }}>Selecione um item do grid.</div>}
              {selectedGrid && (
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ color: G.gold, fontFamily: "'Cinzel',serif" }}>{selectedGrid.nome}</div>
                  <div style={{ color: G.muted, fontSize: 11, fontFamily: "monospace" }}>{selectedGrid.categoria} · Formato {selectedGrid.shapeKey}</div>
                  <div style={{ color: "#9fb2ca", fontSize: 11, fontFamily: "monospace" }}>Descrição: {selectedGrid.descricao || "—"}</div>
                  <div style={{ color: "#9fb2ca", fontSize: 11, fontFamily: "monospace" }}>Tamanho: {selectedGrid.tamanho || "—"}m · Alcance: {selectedGrid.alcance || "—"}m</div>
                  <div style={{ color: "#9fb2ca", fontSize: 11, fontFamily: "monospace" }}>Peso: {selectedGrid.peso || 0}kg · Rank: {selectedGrid.rank || "Comum"}</div>
                  <div style={{ color: "#9fb2ca", fontSize: 11, fontFamily: "monospace" }}>Tipo: {selectedGrid.tipo || selectedGrid.categoria || "Item"}</div>
                  <div style={{ color: "#9fb2ca", fontSize: 11, fontFamily: "monospace" }}>Dano: {selectedGrid.dano || "—"}</div>
                  <div style={{ color: "#9fb2ca", fontSize: 11, fontFamily: "monospace" }}>Dano crítico: {selectedGrid.danoCritico || "—"}</div>
                  <div style={{ color: "#9fb2ca", fontSize: 11, fontFamily: "monospace" }}>Margem crítica: {selectedGrid.margemCritico || "—"}</div>
                  <div style={{ color: "#9fb2ca", fontSize: 11, fontFamily: "monospace" }}>Valor em vastos: {selectedGrid.valor || 0}</div>
                  <div style={{ color: "#9fb2ca", fontSize: 11, fontFamily: "monospace" }}>Efeito (Caldeirão): {Array.isArray(selectedGrid.efeitoCaldeirao) ? selectedGrid.efeitoCaldeirao.length : 0} vínculo(s)</div>
                  <div style={{ color: "#9fb2ca", fontSize: 11, fontFamily: "monospace" }}>Bônus/ônus: {selectedGrid.bonusOnus || "—"}</div>
                  <select value={selectedGrid.equipadoEm || ""} onChange={(e) => equipGridItem(e.target.value)} style={inpStyle()}>
                    <option value="">Não equipado</option>
                    {corpoPartes.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={btnStyle({ padding: "4px 8px" })} onClick={rotateGridItem}>Girar</button>
                    <button style={btnStyle({ padding: "4px 8px", borderColor: "#e74c3c44", color: "#ff8d7d" })} onClick={() => saveGrid(gridState.items.filter((it) => it.id !== selectedGrid.id))}>Remover</button>
                  </div>
                </div>
              )}
            </div>
          </div>}

          {innerTab === "equip" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
              {corpoPartes.map((p) => {
                const list = (gridState.items || []).filter((it) => it.equipadoEm === p);
                return (
                  <div key={p} style={{ border: "1px solid #3a2e1a", borderRadius: 8, padding: 8, background: "#0e0b08" }}>
                    <div style={{ color: G.gold, fontFamily: "'Cinzel',serif", fontSize: 12 }}>{p}</div>
                    {list.length === 0 && <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 11 }}>— vazio —</div>}
                    {list.map((it) => <button key={it.id} onClick={() => { setSelectedGridId(it.id); setInnerTab("inventory"); }} style={{ display: "block", width: "100%", textAlign: "left", marginTop: 4, ...btnStyle({ padding: "4px 8px", borderColor: `${it.cor || "#888"}66`, color: it.cor || G.gold }) }}>{it.nome}</button>)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {arsenalOpen && (
        <Modal title="Puxar item do Arsenal" onClose={() => setArsenalOpen(false)} wide>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, maxHeight: "70vh", overflowY: "auto" }}>
            {arsenal.map((it) => <button key={it.id} onClick={() => addFromArsenal(it)} style={{ textAlign: "left", background: G.bg2, border: "1px solid " + (RANK_COR[it.rank] || "#888") + "44", borderRadius: 8, padding: 10 }}><div style={{ fontFamily: "'Cinzel',serif", color: G.gold }}>{it.nome}</div><div style={{ fontFamily: "monospace", color: G.muted, fontSize: 11 }}>{it.tipo} · {it.rank}</div></button>)}
          </div>
        </Modal>
      )}

      {localOpen && <ItemEditor item={localEdit} effectsLibrary={efeitosCaldeirao} bodyRegionOptions={corpoPartes} onCreateEffect={onOpenCaldeirao} onEditEffect={onOpenCaldeirao} onSave={saveLocal} onClose={() => setLocalOpen(false)} />}
      {detail && <Modal title={`Detalhes: ${detail.nome}`} onClose={() => setDetail(null)} wide><ArsenalDetalhe item={detail} onEdit={() => { setLocalEdit(detail); setLocalOpen(true); setDetail(null); }} onDup={() => {}} onDel={() => {}} /></Modal>}
      {gridTemplateOpen && (
        <Modal title="Arsenal Grid" onClose={() => setGridTemplateOpen(false)}>
          <div style={{ display: "grid", gap: 6 }}>
            {GRID_TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => addGridFromTemplate(t)} style={{ textAlign: "left", ...btnStyle({ padding: "6px 8px", borderColor: `${t.cor}66`, color: t.cor }) }}>
                {t.nome} · {t.shapeKey} · {t.categoria}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {gridCreateOpen && (
        <Modal title="Criar item (grid)" onClose={() => setGridCreateOpen(false)}>
          <div style={{ display: "grid", gap: 6 }}>
            <input value={customDraft.nome} onChange={(e) => setCustomDraft((p) => ({ ...p, nome: e.target.value }))} style={inpStyle()} placeholder="Nome" />
            <input value={customDraft.categoria} onChange={(e) => setCustomDraft((p) => ({ ...p, categoria: e.target.value }))} style={inpStyle()} placeholder="Categoria" />
            <select value={customDraft.shapeKey} onChange={(e) => setCustomDraft((p) => ({ ...p, shapeKey: e.target.value }))} style={inpStyle()}>
              {Object.keys({ "1x1": 1, "1x2": 1, "2x1": 1, "1x3": 1, "3x1": 1, "2x2": 1, "2x3": 1, L: 1, T: 1, Z: 1 }).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <input type="color" value={customDraft.cor} onChange={(e) => setCustomDraft((p) => ({ ...p, cor: e.target.value }))} style={inpStyle({ padding: 2 })} />
            <input type="number" value={customDraft.peso} onChange={(e) => setCustomDraft((p) => ({ ...p, peso: Number(e.target.value) || 0 }))} style={inpStyle()} placeholder="Peso" />
            <input type="number" value={customDraft.valor} onChange={(e) => setCustomDraft((p) => ({ ...p, valor: Number(e.target.value) || 0 }))} style={inpStyle()} placeholder="Valor" />
            <input value={customDraft.partes} onChange={(e) => setCustomDraft((p) => ({ ...p, partes: e.target.value }))} style={inpStyle()} placeholder="Partes equipáveis (csv)" />
            <button style={btnStyle()} onClick={createCustomGridItem}>Criar e adicionar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
