import React, { useState } from "react";
import { uid } from "../../../core/factories";
import { G, inpStyle, btnStyle } from "../../../ui/theme";
import { RANK_COR } from "../../../data/gameData";
import { Modal, ItemIcon } from "../../shared/components";
import { ItemEditor } from "../../arsenal/ItemEditor";

export function TabInventario({ ficha, onUpdate, arsenal, onArsenal, onNotify, onConfirmAction }) {
  const [search, setSearch] = useState("");
  const [arsenalOpen, setArsenalOpen] = useState(false);
  const [localEdit, setLocalEdit] = useState(null);
  const [localOpen, setLocalOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState("");

  const addFromArsenal = (it) => {
    const idx = ficha.inventario.findIndex(x => x.tipo === "arsenal" && x.itemId === it.id);
    if (idx >= 0) {
      const inv = ficha.inventario.map((x, i) => i === idx ? Object.assign({}, x, { qtd: (x.qtd || 1) + 1 }) : x);
      onUpdate({ inventario: inv });
    } else {
      onUpdate({ inventario: [...ficha.inventario, { id: uid(), tipo: "arsenal", itemId: it.id, qtd: 1 }] });
    }
    setArsenalOpen(false);
  };

  const saveLocal = (d) => {
    const idx = ficha.inventario.findIndex(x => x.id === d.id);
    if (idx >= 0) {
      const inv = ficha.inventario.map((x, i) => i === idx ? Object.assign({}, x, { item: d }) : x);
      onUpdate({ inventario: inv });
    } else {
      onUpdate({ inventario: [...ficha.inventario, { id: d.id, tipo: "local", item: d, qtd: 1 }] });
    }
    setLocalOpen(false);
  };


  const exportToArsenal = (entry) => {
    onConfirmAction?.({
      title: "Exportar para Arsenal",
      message: `Exportar "${entry.item.nome}" para o Arsenal global?`,
      onConfirm: () => {
        const item = Object.assign({}, entry.item, { id: uid(), criado: Date.now() });
        onArsenal([item, ...arsenal]);
        onNotify?.("Item exportado para o Arsenal.", "success");
      },
    });
  };

  const removeInv = (id) => onUpdate({ inventario: ficha.inventario.filter(x => x.id !== id) });
  const upQtd = (id, v) => onUpdate({ inventario: ficha.inventario.map(x => x.id === id ? Object.assign({}, x, { qtd: Math.max(0, v) }) : x) });

  const entries = ficha.inventario.filter(x => {
    const n = x.tipo === "arsenal" ? arsenal.find(a => a.id === x.itemId)?.nome : x.item?.nome;
    return !search || (n || "").toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar no inventário..." style={Object.assign({}, inpStyle(), { flex: 1 })} />
        <button style={btnStyle()} onClick={() => setArsenalOpen(true)}>+ Do Arsenal</button>
        <button style={btnStyle({ borderColor: "#2ecc7144", color: "#2ecc71" })} onClick={() => { setLocalEdit(null); setLocalOpen(true); }}>+ Item Local</button>
      </div>

      {entries.length === 0 && <div style={{ textAlign: "center", color: G.muted, fontStyle: "italic", padding: 40, background: G.bg2, borderRadius: 10, border: "1px solid " + G.border }}>Inventário vazio — adicione itens do Arsenal ou crie itens locais.</div>}

      <div style={{ display: "grid", gap: 8 }}>
        {entries.map(entry => {
          const isA = entry.tipo === "arsenal";
          const item = isA ? arsenal.find(a => a.id === entry.itemId) : entry.item;
          if (!item) return <div key={entry.id} style={{ color: G.muted, fontFamily: "monospace", fontSize: 11, padding: "8px 12px", background: G.bg2, borderRadius: 8 }}>Item não encontrado <button onClick={() => removeInv(entry.id)} style={{ marginLeft: 8, background: "transparent", border: "none", color: "#e74c3c", cursor: "pointer" }}>✕</button></div>;

          const cor = RANK_COR[item.rank] || "#7f8c8d";
          return (
            <div key={entry.id} style={{ background: G.bg2, border: "1px solid " + (isA ? cor + "33" : G.border), borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}><ItemIcon item={item} size={22} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold2 }}>{item.nome}</span>
                  {isA && <span style={{ fontSize: 9, color: cor, fontFamily: "monospace", padding: "1px 5px", background: cor + "22", borderRadius: 8 }}>Arsenal</span>}
                  {!isA && <span style={{ fontSize: 9, color: "#2ecc71", fontFamily: "monospace", padding: "1px 5px", background: "#2ecc7122", borderRadius: 8 }}>Local</span>}
                </div>
                <div style={{ fontSize: 10, color: G.muted, fontFamily: "monospace" }}>{item.tipo}{item.dano ? " · Dano: " + item.dano : ""}{item.rank ? " · " + item.rank : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                <button onClick={() => upQtd(entry.id, (entry.qtd || 1) - 1)} style={btnStyle({ padding: "3px 8px", fontSize: 12 })}>−</button>
                <span style={{ fontFamily: "monospace", fontSize: 13, color: G.gold, width: 28, textAlign: "center" }}>{entry.qtd || 1}</span>
                <button onClick={() => upQtd(entry.id, (entry.qtd || 1) + 1)} style={btnStyle({ padding: "3px 8px", fontSize: 12 })}>+</button>
                {!isA && <button onClick={() => { setLocalEdit(entry.item); setReplaceTarget(arsenal.find(a => a.nome === entry.item.nome)?.id || ""); setLocalOpen(true); }} style={btnStyle({ padding: "3px 8px", fontSize: 11, borderColor: "#3498db44", color: "#3498db" })}>✎</button>}
                {!isA && <button onClick={() => { const alvo = arsenal.find(a => a.nome === entry.item.nome)?.id || replaceTarget; if (!alvo) { onNotify?.("Nenhum item do Arsenal com nome correspondente.", "info"); return; } onArsenal(arsenal.map((a) => a.id === alvo ? { ...entry.item, id: alvo } : a)); onNotify?.("Substituição no Arsenal aplicada.", "success"); }} style={btnStyle({ padding: "3px 8px", fontSize: 11, borderColor: "#9b59b644", color: "#bf8fe8" })}>⇄</button>}
                {!isA && <button onClick={() => exportToArsenal(entry)} style={btnStyle({ padding: "3px 8px", fontSize: 11, borderColor: "#f39c1244", color: "#f39c12" })}>↑</button>}
                <button onClick={() => removeInv(entry.id)} style={btnStyle({ padding: "3px 8px", fontSize: 11, borderColor: "#e74c3c44", color: "#e74c3c" })}>✕</button>
              </div>
            </div>
          );
        })}
      </div>

      {arsenalOpen && (
        <Modal title="Adicionar do Arsenal" onClose={() => setArsenalOpen(false)} wide={true}>
          {arsenal.length === 0 && <div style={{ textAlign: "center", color: G.muted, fontFamily: "monospace", padding: 20 }}>Arsenal vazio. Crie itens na aba Arsenal.</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, maxHeight: "60vh", overflow: "auto" }}>
            {arsenal.map(it => {
              const cor = RANK_COR[it.rank] || "#7f8c8d";
              return <div key={it.id} onClick={() => addFromArsenal(it)} style={{ background: G.bg2, border: "1px solid " + cor + "33", borderRadius: 8, padding: 10, cursor: "pointer" }}><div style={{ fontSize: 20, marginBottom: 4 }}><ItemIcon item={it} size={20} /></div><div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: G.gold2, marginBottom: 2 }}>{it.nome}</div><div style={{ fontSize: 9, color: cor, fontFamily: "monospace" }}>{it.tipo} · {it.rank}</div></div>;
            })}
          </div>
        </Modal>
      )}

      {localOpen && <ItemEditor item={localEdit} onSave={saveLocal} onClose={() => setLocalOpen(false)} />}
    </div>
  );
}
