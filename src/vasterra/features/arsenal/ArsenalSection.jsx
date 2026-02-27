import React, { useState } from "react";
import { uid } from "../../core/factories";
import { G, inpStyle, btnStyle } from "../../ui/theme";
import { ARSENAL_TIPOS, ARSENAL_RANKS, RANK_COR } from "../../data/gameData";
import { HoverButton } from "../../components/primitives/Interactive";
import { ItemIcon } from "../shared/components";
import { ItemEditor } from "./ItemEditor";
import { ArsenalDetalhe } from "./ArsenalDetalhe";

export function ArsenalSection({ arsenal, onArsenal, onNotify, onConfirmAction }) {
  const [sel, setSel]         = useState(null);
  const [search, setSearch]   = useState("");
  const [fTipo, setFTipo]     = useState("");
  const [fRank, setFRank]     = useState("");
  const [editItem, setEditItem] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [focus, setFocus] = useState(false);

  const filtered = arsenal.filter(it => {
    if (fTipo && it.tipo !== fTipo) return false;
    if (fRank && it.rank !== fRank) return false;
    if (!search) return true;
    return (it.nome + " " + it.descricao + " " + it.tipo).toLowerCase().includes(search.toLowerCase());
  });

  const saveItem = (d) => {
    const existe = arsenal.some(x => x.id === d.id);
    const novo   = existe ? arsenal.map(x => x.id === d.id ? Object.assign({}, d) : x) : [Object.assign({}, d), ...arsenal];
    onArsenal(novo);
    setEditOpen(false);
    setSel(d.id);
  };

  const dupItem = (it) => {
    const n = Object.assign({}, it, { id: uid(), nome: it.nome + " (cópia)", criado: Date.now() });
    onArsenal([n, ...arsenal]);
    onNotify?.(`Item duplicado: ${it.nome}`, "success");
  };

  const delItem = (id) => {
    onArsenal(arsenal.filter(x => x.id !== id));
    if (sel === id) setSel(null);
  };

  const selItem = arsenal.find(x => x.id === sel) || null;

  return (
    <div style={{ display: focus ? "block" : "grid", gridTemplateColumns: "300px 1fr", height: "calc(100vh - 54px)" }}>

      {/* SIDEBAR */}
      {!focus && <div style={{ borderRight: "1px solid " + G.border, display: "flex", flexDirection: "column", overflow: "hidden", background: G.bg2 }}>
        <div style={{ padding: "12px 10px 8px", borderBottom: "1px solid " + G.border }}>
          <button style={Object.assign({}, btnStyle(), { width: "100%", padding: "7px", marginBottom: 8, display: "block" })} onClick={() => { setEditItem(null); setEditOpen(true); }}>
            + Criar Item
          </button>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar..." style={Object.assign({}, inpStyle(), { marginBottom: 6 })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <select value={fTipo} onChange={e => setFTipo(e.target.value)} style={inpStyle({ padding: "4px 6px", fontSize: 11 })}>
              <option value="">Todos tipos</option>
              {ARSENAL_TIPOS.map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={fRank} onChange={e => setFRank(e.target.value)} style={inpStyle({ padding: "4px 6px", fontSize: 11 })}>
              <option value="">Todos ranks</option>
              {ARSENAL_RANKS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
          {filtered.length === 0 && (
            <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 12, textAlign: "center", padding: 20 }}>Nenhum item.</div>
          )}
          {filtered.map(it => {
            const cor = RANK_COR[it.rank] || "#7f8c8d";
            const isSel = sel === it.id;
            return (
              <div
                key={it.id}
                onClick={() => { setSel(isSel ? null : it.id); setFocus(true); }}
                style={{
                  background: isSel ? cor + "11" : G.bg3,
                  border: "1px solid " + (isSel ? cor + "44" : G.border),
                  borderRadius: 8, padding: "8px 10px", marginBottom: 6, cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}><ItemIcon item={it} size={18} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.nome}</div>
                    <div style={{ fontSize: 10, color: G.muted, fontFamily: "monospace" }}>{it.tipo}</div>
                  </div>
                  <span style={{ fontSize: 10, color: cor, fontFamily: "'Cinzel',serif", fontWeight: 700 }}>{it.rank}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: 8, borderTop: "1px solid " + G.border, fontSize: 10, color: G.muted, fontFamily: "monospace", textAlign: "center" }}>
          {arsenal.length} itens no Arsenal
        </div>
      </div>}

      {/* DETALHE */}
      <div style={{ overflow: "auto", padding: 20 }}>
        {focus && <div style={{ marginBottom: 10 }}><HoverButton onClick={() => setFocus(false)} style={btnStyle({ padding: "4px 10px" })}>← Voltar para lista</HoverButton></div>}
        {!selItem && (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: G.muted, fontFamily: "Georgia,serif", fontStyle: "italic", fontSize: 16 }}>
            Selecione um item para ver os detalhes
          </div>
        )}
        {selItem && (
          <ArsenalDetalhe
            item={selItem}
            onEdit={() => { setEditItem(selItem); setEditOpen(true); }}
            onDup={() => dupItem(selItem)}
            onDel={() => onConfirmAction?.({ title: "Apagar item", message: `Deseja apagar \"${selItem.nome}\"?`, onConfirm: () => { delItem(selItem.id); onNotify?.("Item apagado.", "info"); } })}
          />
        )}
      </div>

      {editOpen && <ItemEditor item={editItem} onSave={saveItem} onClose={() => setEditOpen(false)} />}
    </div>
  );
}
