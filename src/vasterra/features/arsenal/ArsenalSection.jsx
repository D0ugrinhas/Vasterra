import React, { useMemo, useState } from "react";
import { uid } from "../../core/factories";
import { G, inpStyle, btnStyle } from "../../ui/theme";
import { ARSENAL_TIPOS, ARSENAL_RANKS, RANK_COR } from "../../data/gameData";
import { ItemIcon } from "../shared/components";
import { ItemEditor } from "./ItemEditor";
import { ArsenalDetalhe } from "./ArsenalDetalhe";

export function ArsenalSection({ arsenal, efeitosCaldeirao = [], onArsenal, onNotify, onConfirmAction, onOpenCaldeirao, onEditCaldeirao }) {
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState("");
  const [fTipo, setFTipo] = useState("");
  const [fRank, setFRank] = useState("");
  const [fEssencia, setFEssencia] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  const filtered = useMemo(
    () => arsenal.filter((it) => {
      if (fTipo && it.tipo !== fTipo) return false;
      if (fRank && it.rank !== fRank) return false;
      if (fEssencia && (it.essenciaAtribuida || "") !== fEssencia) return false;
      if (!search) return true;
      return `${it.nome} ${it.descricao || ""} ${it.tipo || ""} ${it.comentario || ""}`.toLowerCase().includes(search.toLowerCase());
    }),
    [arsenal, search, fTipo, fRank, fEssencia],
  );

  const saveItem = (d) => {
    const exists = arsenal.some((x) => x.id === d.id);
    onArsenal(exists ? arsenal.map((x) => (x.id === d.id ? { ...d } : x)) : [{ ...d }, ...arsenal]);
    setEditOpen(false);
    setSel(d.id);
    onNotify?.("Item salvo no Arsenal.", "success");
  };

  const selItem = arsenal.find((x) => x.id === sel) || null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "390px 1fr", height: "calc(100vh - 54px)", background: "radial-gradient(circle at top left,#111018,#080808 45%,#060606)" }}>
      <style>{`
        @keyframes arsenalGlow { 0% { opacity: .2; } 50% { opacity: .45; } 100% { opacity: .2; } }
        .arsenal-grid-bg {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(140,115,73,.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(140,115,73,.07) 1px, transparent 1px);
          background-size: 24px 24px;
          animation: arsenalGlow 5s ease-in-out infinite;
          pointer-events: none;
        }
        .arsenal-item-card {
          transition: transform .16s ease, border-color .18s ease, box-shadow .2s ease;
        }
        .arsenal-item-card:hover {
          transform: translateY(-1px) scale(1.005);
          box-shadow: 0 8px 16px rgba(0,0,0,.35);
        }
      `}</style>

      <div style={{ position: "relative", borderRight: "1px solid " + G.border, display: "flex", flexDirection: "column", overflow: "hidden", background: "#08080b" }}>
        <div className="arsenal-grid-bg" />
        <div style={{ position: "relative", padding: "12px 12px 10px", borderBottom: "1px solid " + G.border }}>
          <div style={{ fontFamily: "'Cinzel Decorative',serif", color: G.gold, letterSpacing: 3, marginBottom: 2 }}>ARSENAL</div>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: "#8d93a1", marginBottom: 10 }}>Catálogo técnico de itens, artefatos e equipamentos.</div>
          <button style={{ ...btnStyle(), width: "100%", marginBottom: 8 }} onClick={() => { setEditItem(null); setEditOpen(true); }}>+ Criar Item</button>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar item..." style={{ ...inpStyle(), marginBottom: 6 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
            <select value={fTipo} onChange={(e) => setFTipo(e.target.value)} style={inpStyle({ padding: "4px 6px", fontSize: 11 })}><option value="">Tipo: todos</option>{ARSENAL_TIPOS.map((t) => <option key={t}>{t}</option>)}</select>
            <select value={fRank} onChange={(e) => setFRank(e.target.value)} style={inpStyle({ padding: "4px 6px", fontSize: 11 })}><option value="">Rank: todos</option>{ARSENAL_RANKS.map((r) => <option key={r}>{r}</option>)}</select>
          </div>
          <input value={fEssencia} onChange={(e) => setFEssencia(e.target.value)} placeholder="Essência atribuída..." style={inpStyle({ padding: "4px 6px", fontSize: 11 })} />
        </div>

        <div style={{ position: "relative", flex: 1, overflowY: "auto", padding: 8 }}>
          {filtered.map((it) => {
            const cor = RANK_COR[it.rank] || "#7f8c8d";
            const active = sel === it.id;
            return (
              <div key={it.id} className="arsenal-item-card" onClick={() => setSel(it.id)} style={{ background: active ? cor + "20" : G.bg3, border: "1px solid " + (active ? cor + "88" : G.border), borderRadius: 10, padding: 10, marginBottom: 8, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ItemIcon item={it} size={20} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.nome}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 10, color: G.muted }}>{it.tipo} · {it.subtipo || "—"} · {Number(it.peso || 0)}kg</div>
                  </div>
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: cor }}>{it.rank}</span>
                </div>
                {it.comentario && <div style={{ marginTop: 6, fontSize: 10, color: "#c7b08a", fontStyle: "italic" }}>“{it.comentario}”</div>}
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ color: G.muted, textAlign: "center", fontFamily: "monospace", padding: 20 }}>Nenhum item encontrado.</div>}
        </div>

        <div style={{ position: "relative", padding: 8, borderTop: "1px solid " + G.border, fontSize: 10, color: G.muted, fontFamily: "monospace", textAlign: "center" }}>{arsenal.length} itens no Arsenal</div>
      </div>

      <div style={{ position: "relative", overflow: "auto", padding: 20 }}>
        <div className="arsenal-grid-bg" />
        <div style={{ position: "relative" }}>
          {!selItem && <div style={{ height: "100%", minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", color: G.muted, fontStyle: "italic" }}>Selecione um item do Arsenal para ver detalhes.</div>}
          {selItem && (
            <ArsenalDetalhe
              item={selItem}
              onEdit={() => { setEditItem(selItem); setEditOpen(true); }}
              onDup={() => {
                const n = { ...selItem, id: uid(), nome: `${selItem.nome} (cópia)`, criado: Date.now() };
                onArsenal([n, ...arsenal]);
                onNotify?.("Item duplicado.", "success");
              }}
              onDel={() => onConfirmAction?.({ title: "Apagar item", message: `Deseja apagar \"${selItem.nome}\"?`, onConfirm: () => { onArsenal(arsenal.filter((x) => x.id !== selItem.id)); setSel(null); } })}
            />
          )}
        </div>
      </div>

      {editOpen && <ItemEditor item={editItem} effectsLibrary={efeitosCaldeirao} onCreateEffect={onOpenCaldeirao} onEditEffect={onEditCaldeirao} onSave={saveItem} onClose={() => setEditOpen(false)} />}
    </div>
  );
}
