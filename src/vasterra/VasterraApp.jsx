import React, { useState, useEffect } from "react";
import {
  RACAS,
  CLASSES,
  ATRIBUTOS,
  PERICIAS_GRUPOS,
  ESSENCIAS_VIRTUDES,
  ESSENCIAS_PECADOS,
  STATUS_CFG,
  RECURSOS_CFG,
  ARSENAL_TIPOS,
  ARSENAL_RANKS,
  RANK_COR,
  MOD_ORIGENS,
  resolverNomeRaca,
} from "./data/gameData";
import { uid, novaFicha, novoItem } from "./core/factories";
import { stGet, stSet } from "./core/storage";
import { G, inpStyle, btnStyle } from "./ui/theme";
import { useFeedback } from "./hooks/useFeedback";
import { ToastViewport, ConfirmWindow } from "./components/feedback/FeedbackUI";
import { HoverButton } from "./components/primitives/Interactive";
import { FichaCardInventory, getFichaTitulos } from "./components/fichas/FichaCardInventory";

function Pill({ label, cor, small }) {
  return (
    <span style={{
      padding: small ? "2px 7px" : "3px 10px",
      background: cor + "22", border: "1px solid " + cor + "55",
      borderRadius: 20, color: cor, fontFamily: "'Cinzel',serif",
      fontSize: small ? 9 : 10, letterSpacing: 1,
    }}>
      {label}
    </span>
  );
}

function Modal({ title, children, onClose, wide }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.75)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
    >
      <div style={{
        background: "#080808", border: "1px solid #2a2a2a", borderRadius: 12,
        padding: 20, width: wide ? 860 : 480, maxWidth: "95vw",
        maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontFamily: "'Cinzel',serif", color: G.gold, letterSpacing: 2, fontSize: 14 }}>{title}</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: G.muted, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatusBar({ sigla, nome, cor, val, max, onVal, onMax }) {
  const pct = max > 0 ? Math.min(100, (val / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: cor, letterSpacing: 2 }}>
          {sigla} <span style={{ color: G.muted, fontSize: 10 }}>— {nome}</span>
        </span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <input
            type="number" min={0} max={max} value={val}
            onChange={e => onVal(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
            style={inpStyle({ width: 44, textAlign: "center", padding: "2px 4px", fontSize: 13, color: cor })}
          />
          <span style={{ color: G.muted }}>/</span>
          <input
            type="number" min={1} value={max}
            onChange={e => onMax(Math.max(1, Number(e.target.value) || 1))}
            style={inpStyle({ width: 44, textAlign: "center", padding: "2px 4px", fontSize: 13 })}
          />
        </div>
      </div>
      <div style={{ height: 6, background: "#111", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: pct + "%",
          background: "linear-gradient(90deg," + cor + "88," + cor + ")",
          transition: "width .3s", boxShadow: "0 0 8px " + cor + "66",
        }} />
      </div>
      {val === 0 && (
        <div style={{ fontSize: 10, color: "#ff4444", fontFamily: "monospace", marginTop: 2 }}>
          ⚠ {STATUS_CFG.find(s => s.sigla === sigla)?.msg}
        </div>
      )}
    </div>
  );
}

function ModificadoresEditor({ title, list, onChange, inventarioItens }) {
  const add = () => onChange([...(list || []), { id: uid(), tipo: "Buff", nome: "", efeito: "", origem: "Efeito", origemDetalhe: "" }]);
  const up = (id, patch) => onChange((list || []).map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const del = (id) => onChange((list || []).filter((m) => m.id !== id));

  return (
    <Modal title={title} onClose={() => onChange(list || [])} wide>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <HoverButton onClick={add}>+ Modificador</HoverButton>
      </div>
      {(list || []).map((m) => (
        <div key={m.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 130px 1fr 36px", gap: 6, marginBottom: 6 }}>
          <select value={m.tipo} onChange={(e) => up(m.id, { tipo: e.target.value })} style={inpStyle()}><option>Buff</option><option>Debuff</option></select>
          <input value={m.nome} onChange={(e) => up(m.id, { nome: e.target.value })} placeholder="Nome" style={inpStyle()} />
          <input value={m.efeito} onChange={(e) => up(m.id, { efeito: e.target.value })} placeholder="Efeito mecânico" style={inpStyle()} />
          <select value={m.origem || "Efeito"} onChange={(e) => up(m.id, { origem: e.target.value, origemDetalhe: "" })} style={inpStyle()}>
            {MOD_ORIGENS.map((o) => <option key={o}>{o}</option>)}
          </select>
          {(m.origem === "Item") ? (
            <select value={m.origemDetalhe || ""} onChange={(e) => up(m.id, { origemDetalhe: e.target.value })} style={inpStyle()}>
              <option value="">Selecione item</option>
              {inventarioItens.map((it) => <option key={it}>{it}</option>)}
            </select>
          ) : (
            <input value={m.origemDetalhe || ""} onChange={(e) => up(m.id, { origemDetalhe: e.target.value })} placeholder={m.origem === "Outro" ? "Descreva origem" : "Detalhe"} style={inpStyle()} />
          )}
          <HoverButton onClick={() => del(m.id)} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c", padding: "4px" })}>✕</HoverButton>
        </div>
      ))}
    </Modal>
  );
}

function ItemIcon({ item, size = 20 }) {
  if (item.iconeModo === "url" && item.iconeUrl) {
    return <img src={item.iconeUrl} alt={item.nome} style={{ width: size, height: size, objectFit: "cover", borderRadius: 4 }} />;
  }
  if (item.iconeModo === "upload" && item.iconeData) {
    return <img src={item.iconeData} alt={item.nome} style={{ width: size, height: size, objectFit: "cover", borderRadius: 4 }} />;
  }
  return <span style={{ fontSize: size }}>{item.icone || "📦"}</span>;
}

function BackgroundParticles() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <style>{`@keyframes vasterraFloat { from { transform: translateX(-10vw) translateY(0); opacity: .15; } to { transform: translateX(110vw) translateY(-12px); opacity: .35; } }`}</style>
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${(i * 13) % 100}%`,
            top: `${(i * 17) % 100}%`,
            width: 2 + (i % 3),
            height: 2 + (i % 3),
            borderRadius: "50%",
            background: i % 2 ? "#c8a96e66" : "#e8d5b055",
            animation: `vasterraFloat ${8 + (i % 7)}s linear infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// ITEM EDITOR (ARSENAL)
// ─────────────────────────────────────────────
function ItemEditor({ item, onSave, onClose }) {
  const [d, setD] = useState(() => item
    ? { ...item, bonus: [...item.bonus], efeitos: [...item.efeitos] }
    : novoItem()
  );

  const onUploadIcon = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => up("iconeData", String(reader.result || ""));
    reader.readAsDataURL(file);
  };
  const up = (k, v) => setD(p => Object.assign({}, p, { [k]: v }));

  const isArma     = d.tipo === "Arma";
  const isArmadura = d.tipo === "Armadura";
  const isConsumivel = d.tipo === "Consumível";
  const hasRegiao  = ["Armadura","Vestimenta","Acessório","Marcas"].includes(d.tipo);
  const hasEfeito  = ["Vestimenta","Acessório","Marcas"].includes(d.tipo);

  const addBonus  = () => up("bonus",  [...d.bonus,  { tipo: "Bônus", texto: "", ativo: true }]);
  const addEfeito = () => up("efeitos",[...d.efeitos, { titulo: "", desc: "", ativo: true }]);

  const setBonus = (i, patch) => {
    const nb = d.bonus.map((b, j) => j === i ? Object.assign({}, b, patch) : b);
    up("bonus", nb);
  };
  const setEfeito = (i, patch) => {
    const ne = d.efeitos.map((e, j) => j === i ? Object.assign({}, e, patch) : e);
    up("efeitos", ne);
  };

  return (
    <Modal title={item ? "Editar Item" : "Criar Item"} onClose={onClose} wide={true}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* COLUNA ESQUERDA */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ color: G.gold, fontFamily: "'Cinzel',serif", fontSize: 11, letterSpacing: 1, display: "block", marginBottom: 4 }}>Nome</label>
            <input value={d.nome} onChange={e => up("nome", e.target.value)} style={inpStyle()} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={{ color: G.gold, fontFamily: "'Cinzel',serif", fontSize: 10, display: "block", marginBottom: 4 }}>Tipo</label>
              <select value={d.tipo} onChange={e => up("tipo", e.target.value)} style={inpStyle()}>
                {ARSENAL_TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: G.gold, fontFamily: "'Cinzel',serif", fontSize: 10, display: "block", marginBottom: 4 }}>Rank</label>
              <select
                value={d.rank}
                onChange={e => up("rank", e.target.value)}
                style={inpStyle({ color: RANK_COR[d.rank] || G.text, borderColor: (RANK_COR[d.rank] || "#444") + "55" })}
              >
                {ARSENAL_RANKS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {isArma && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={{ color: "#fad24b", fontFamily: "'Cinzel',serif", fontSize: 10, display: "block", marginBottom: 4 }}>Dano</label>
                <input value={d.dano} onChange={e => up("dano", e.target.value)} placeholder="ex: 1d6+2" style={inpStyle({ borderColor: "#fad24b44" })} />
              </div>
              <div>
                <label style={{ color: "#ff9640", fontFamily: "'Cinzel',serif", fontSize: 10, display: "block", marginBottom: 4 }}>Crítico</label>
                <input value={d.critico} onChange={e => up("critico", e.target.value)} placeholder="ex: 19-20/x2" style={inpStyle({ borderColor: "#ff964044" })} />
              </div>
            </div>
          )}

          {isArma && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={{ color: G.muted, fontFamily: "'Cinzel',serif", fontSize: 10, display: "block", marginBottom: 4 }}>Alcance</label>
                <input value={d.alcance} onChange={e => up("alcance", e.target.value)} placeholder="ex: 5m" style={inpStyle()} />
              </div>
              <div>
                <label style={{ color: G.muted, fontFamily: "'Cinzel',serif", fontSize: 10, display: "block", marginBottom: 4 }}>Tamanho</label>
                <input value={d.tamanho} onChange={e => up("tamanho", e.target.value)} placeholder="ex: 0.8m" style={inpStyle()} />
              </div>
            </div>
          )}

          {isArmadura && (
            <div>
              <label style={{ color: G.gold, fontFamily: "'Cinzel',serif", fontSize: 10, display: "block", marginBottom: 4 }}>Defesa</label>
              <input value={d.defesa} onChange={e => up("defesa", e.target.value)} style={inpStyle()} />
            </div>
          )}

          {hasRegiao && (
            <div>
              <label style={{ color: G.muted, fontFamily: "'Cinzel',serif", fontSize: 10, display: "block", marginBottom: 4 }}>Região do Corpo</label>
              <input value={d.regiao} onChange={e => up("regiao", e.target.value)} placeholder="ex: Torso, Mãos..." style={inpStyle()} />
            </div>
          )}

          {hasEfeito && (
            <div>
              <label style={{ color: G.gold, fontFamily: "'Cinzel',serif", fontSize: 10, display: "block", marginBottom: 4 }}>Efeito no corpo</label>
              <textarea value={d.efeitoCorpo} onChange={e => up("efeitoCorpo", e.target.value)} rows={2} style={inpStyle({ resize: "vertical" })} />
            </div>
          )}

          {isConsumivel && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={{ color: G.gold, fontFamily: "'Cinzel',serif", fontSize: 10, display: "block", marginBottom: 4 }}>Quantidade</label>
                <input type="number" min={0} value={d.quantidade} onChange={e => up("quantidade", Number(e.target.value) || 0)} style={inpStyle()} />
              </div>
              <div>
                <label style={{ color: G.muted, fontFamily: "'Cinzel',serif", fontSize: 10, display: "block", marginBottom: 4 }}>Consumo/uso</label>
                <input type="number" min={1} value={d.consumo} onChange={e => up("consumo", Number(e.target.value) || 1)} style={inpStyle()} />
              </div>
            </div>
          )}

          <div>
            <label style={{ color: G.muted, fontFamily: "'Cinzel',serif", fontSize: 10, display: "block", marginBottom: 4 }}>Descrição</label>
            <textarea value={d.descricao} onChange={e => up("descricao", e.target.value)} rows={3} style={inpStyle({ resize: "vertical" })} />
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={{ color: G.muted, fontFamily: "'Cinzel',serif", fontSize: 10, display: "block", marginBottom: 4 }}>Ícone</label>
              <select value={d.iconeModo || "emoji"} onChange={e => up("iconeModo", e.target.value)} style={Object.assign({}, inpStyle(), { marginBottom: 4 })}>
                <option value="emoji">Emoji</option>
                <option value="url">Imagem por URL</option>
                <option value="upload">Imagem local</option>
              </select>
              {(d.iconeModo || "emoji") === "emoji" && <input value={d.icone} onChange={e => up("icone", e.target.value)} style={inpStyle()} />}
              {(d.iconeModo || "emoji") === "url" && <input value={d.iconeUrl || ""} onChange={e => up("iconeUrl", e.target.value)} placeholder="https://..." style={inpStyle()} />}
              {(d.iconeModo || "emoji") === "upload" && <input type="file" accept="image/*" onChange={e => onUploadIcon(e.target.files?.[0])} style={inpStyle()} />}
            </div>
            <div>
              <label style={{ color: G.muted, fontFamily: "'Cinzel',serif", fontSize: 10, display: "block", marginBottom: 4 }}>Peso (kg)</label>
              <input type="number" min={0} step={0.1} value={d.peso} onChange={e => up("peso", Number(e.target.value))} style={inpStyle()} />
            </div>
          </div>

          <div>
            <label style={{ color: G.muted, fontFamily: "'Cinzel',serif", fontSize: 10, display: "block", marginBottom: 4 }}>Valor (moeda)</label>
            <input value={d.valor} onChange={e => up("valor", e.target.value)} style={inpStyle()} />
          </div>

          {/* BONUS */}
          <div style={{ background: G.bg3, border: "1px solid " + G.border, borderRadius: 8, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: G.gold, letterSpacing: 1 }}>Bônus / Ônus</span>
              <button style={btnStyle({ padding: "3px 8px", fontSize: 10 })} onClick={addBonus}>+ Add</button>
            </div>
            {d.bonus.map((b, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                <select
                  value={b.tipo}
                  onChange={e => setBonus(i, { tipo: e.target.value })}
                  style={inpStyle({ width: 80, color: b.tipo === "Bônus" ? "#2ecc71" : "#e74c3c", padding: "4px 6px", fontSize: 11 })}
                >
                  <option>Bônus</option>
                  <option>Ônus</option>
                </select>
                <input
                  value={b.texto}
                  onChange={e => setBonus(i, { texto: e.target.value })}
                  placeholder="Nome"
                  style={inpStyle({ flex: 1, padding: "4px 6px", fontSize: 12 })}
                />
                <button onClick={() => up("bonus", d.bonus.filter((_, j) => j !== i))} style={{ background: "transparent", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
            ))}
          </div>

          {/* EFEITOS */}
          <div style={{ background: G.bg3, border: "1px solid " + G.border, borderRadius: 8, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: G.gold, letterSpacing: 1 }}>Efeitos</span>
              <button style={btnStyle({ padding: "3px 8px", fontSize: 10 })} onClick={addEfeito}>+ Add</button>
            </div>
            {d.efeitos.map((ef, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input
                  value={ef.titulo}
                  onChange={e => setEfeito(i, { titulo: e.target.value })}
                  placeholder="Título do efeito"
                  style={inpStyle({ flex: 1, padding: "4px 6px", fontSize: 12 })}
                />
                <button onClick={() => up("efeitos", d.efeitos.filter((_, j) => j !== i))} style={{ background: "transparent", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button style={btnStyle({ background: "transparent", border: "1px solid #333", color: G.muted })} onClick={onClose}>Cancelar</button>
        <button style={btnStyle()} onClick={() => onSave(d)}>Salvar Item</button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// ARSENAL SECTION
// ─────────────────────────────────────────────
function ArsenalSection({ arsenal, onArsenal, onNotify, onConfirmAction }) {
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

function ArsenalDetalhe({ item, onEdit, onDup, onDel }) {
  const cor = RANK_COR[item.rank] || "#7f8c8d";
  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <div style={{ width: 72, height: 72, background: cor + "11", border: "1px solid " + cor + "33", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0 }}>
          <ItemIcon item={item} size={32} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 20, color: G.gold2, marginBottom: 6 }}>{item.nome}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Pill label={item.tipo} cor="#888" />
            <Pill label={item.rank} cor={cor} />
            {item.dano    && <Pill label={"Dano: " + item.dano} cor="#fad24b" />}
            {item.critico && <Pill label={"Crit: " + item.critico} cor="#ff9640" />}
            {item.defesa  && <Pill label={"DEF: " + item.defesa} cor="#3498db" />}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button style={btnStyle()} onClick={onEdit}>✎ Editar</button>
        <button style={btnStyle({ borderColor: "#3498db44", color: "#3498db" })} onClick={onDup}>⊕ Duplicar</button>
        <button style={Object.assign({}, btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c" }), { marginLeft: "auto" })} onClick={onDel}>✕ Apagar</button>
      </div>

      {item.descricao && (
        <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 8, padding: 12, marginBottom: 12, fontStyle: "italic", fontSize: 13, color: "#aaa", lineHeight: 1.7 }}>
          {item.descricao}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, fontFamily: "monospace", color: "#888", marginBottom: 12 }}>
        {item.peso > 0 && <span>Peso: <span style={{ color: G.gold }}>{item.peso}kg</span></span>}
        {item.valor    && <span>Valor: <span style={{ color: G.gold }}>{item.valor}</span></span>}
        {item.alcance  && <span>Alcance: <span style={{ color: G.gold }}>{item.alcance}</span></span>}
        {item.tamanho  && <span>Tamanho: <span style={{ color: G.gold }}>{item.tamanho}</span></span>}
        {item.regiao   && <span>Região: <span style={{ color: G.gold }}>{item.regiao}</span></span>}
      </div>

      {item.bonus.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: G.gold, letterSpacing: 2, marginBottom: 6 }}>BÔNUS / ÔNUS</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {item.bonus.map((b, i) => <Pill key={i} label={b.texto} cor={b.tipo === "Bônus" ? "#2ecc71" : "#e74c3c"} />)}
          </div>
        </div>
      )}

      {item.efeitos.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: G.gold, letterSpacing: 2, marginBottom: 6 }}>EFEITOS</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {item.efeitos.map((ef, i) => <Pill key={i} label={ef.titulo} cor="#3498db" />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// FICHAS — ABA STATUS
// ─────────────────────────────────────────────
function TabStatus({ ficha, onUpdate, inventarioNomes = [] }) {
  const [c1, setC1] = useState("FOR");
  const [c2, setC2] = useState("FOR");
  const [cRes, setCRes] = useState(null);
  const [burstRes, setBurstRes] = useState(null);
  const [modsOpen, setModsOpen] = useState(false);

  const upStatus  = (sigla, field, val) => onUpdate({ status:   Object.assign({}, ficha.status,   { [sigla]: Object.assign({}, ficha.status[sigla], { [field]: val }) }) });
  const upRecurso = (sigla, field, val) => onUpdate({ recursos: Object.assign({}, ficha.recursos, { [sigla]: Object.assign({}, ficha.recursos[sigla], { [field]: val }) }) });

  const novaRodada = () => {
    const r = {};
    RECURSOS_CFG.forEach(rc => { r[rc.sigla] = Object.assign({}, ficha.recursos[rc.sigla], { usado: 0 }); });
    onUpdate({ recursos: r });
  };

  const rolarConfronto = () => {
    const v1 = ficha.atributos[c1]?.val || 5;
    const v2 = ficha.atributos[c2]?.val || 5;
    const diff = v1 - v2;
    setCRes({ r1: Math.max(1, Math.ceil(Math.random() * 20) + diff), r2: Math.ceil(Math.random() * 20) });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 16 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 14, paddingBottom: 8, borderBottom: "1px solid " + G.border, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>◈ STATUS</span>
          <HoverButton onClick={() => setModsOpen(true)} style={btnStyle({ padding: "2px 8px" })}>⚙</HoverButton>
        </div>
        {STATUS_CFG.map(s => (
          <StatusBar key={s.sigla} {...s} val={ficha.status[s.sigla].val} max={ficha.status[s.sigla].max} onVal={v => upStatus(s.sigla, "val", v)} onMax={v => upStatus(s.sigla, "max", v)} />
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3 }}>◈ RECURSOS/RODADA</span>
            <HoverButton style={btnStyle({ padding: "3px 10px", fontSize: 10 })} onClick={novaRodada}>Nova Rodada</HoverButton>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {RECURSOS_CFG.map(rc => {
              const rec = ficha.recursos[rc.sigla];
              const disp = rec.total - rec.usado;
              return <div key={rc.sigla} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 10, color: rc.cor, letterSpacing: 1, marginBottom: 5 }}>{rc.sigla}</div>
                <div style={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap", marginBottom: 5 }}>{Array.from({ length: rec.total }).map((_, i) => <div key={i} style={{ width: 16, height: 16, borderRadius: 3, background: i < disp ? rc.cor : "#1a1a1a", border: "1px solid " + (i < disp ? rc.cor : "#333") }} />)}</div>
                <div style={{ display: "flex", gap: 3, justifyContent: "center", marginBottom: 4 }}>
                  <HoverButton onClick={() => upRecurso(rc.sigla, "usado", Math.min(rec.total, rec.usado + 1))} disabled={rec.usado >= rec.total} style={btnStyle({ padding: "1px 7px", fontSize: 11, color: rc.cor })}>−</HoverButton>
                  <HoverButton onClick={() => upRecurso(rc.sigla, "usado", 0)} style={btnStyle({ padding: "1px 7px", fontSize: 10 })}>↺</HoverButton>
                </div>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: disp === 0 ? "#ff4444" : G.gold }}>{disp}/{rec.total}</div>
                <input type="number" min={1} max={10} value={rec.total} onChange={e => upRecurso(rc.sigla, "total", Math.max(1, Number(e.target.value) || 1))} style={inpStyle({ textAlign: "center", fontSize: 11, padding: "2px", color: rc.cor, borderColor: rc.cor + "33", marginTop: 4 })} />
              </div>;
            })}
          </div>
        </div>

        <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 10 }}>⚔ CONFRONTO</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <select value={c1} onChange={e => { setC1(e.target.value); setCRes(null); }} style={inpStyle({ flex: 1, padding: "6px", fontSize: 12 })}>{ATRIBUTOS.map(a => <option key={a.sigla}>{a.sigla}</option>)}</select>
            <span style={{ color: G.gold, fontFamily: "'Cinzel',serif" }}>vs</span>
            <select value={c2} onChange={e => { setC2(e.target.value); setCRes(null); }} style={inpStyle({ flex: 1, padding: "6px", fontSize: 12 })}>{ATRIBUTOS.map(a => <option key={a.sigla}>{a.sigla}</option>)}</select>
            <HoverButton style={btnStyle({ padding: "7px 12px" })} onClick={rolarConfronto}>🎲</HoverButton>
          </div>
          {cRes && <div style={{ display: "flex", gap: 8 }}>{[{ v: cRes.r1, lbl: c1, win: cRes.r1 > cRes.r2 }, { v: cRes.r2, lbl: c2, win: cRes.r2 > cRes.r1 }].map((x, i) => <div key={i} style={{ flex: 1, textAlign: "center", padding: "10px 6px", background: x.win ? "#0a2a0a" : "#1a0a0a", border: "1px solid " + (x.win ? "#2ecc7144" : "#e74c3c44"), borderRadius: 8 }}><div style={{ fontSize: 10, color: G.muted, fontFamily: "monospace", marginBottom: 2 }}>{x.lbl}</div><div style={{ fontFamily: "'Cinzel',serif", fontSize: 28, color: x.win ? "#2ecc71" : "#e74c3c" }}>{x.v}</div>{cRes.r1 === cRes.r2 && <div style={{ fontSize: 9, color: "#e67e22", fontFamily: "monospace" }}>EMPATE</div>}</div>)}</div>}
        </div>

        <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 8 }}>⚡ BURST</div>
          <HoverButton style={Object.assign({}, btnStyle({ borderColor: "#9b59b644", color: "#bf8fe8" }), { width: "100%", padding: "10px", display: "block" })} onClick={() => setBurstRes(Math.ceil(Math.random() * 20))}>Tentar Burst (1D20)</HoverButton>
          {burstRes !== null && <div style={{ marginTop: 10, textAlign: "center", padding: 12, background: burstRes >= 1 ? "#0a1a0a" : "#1a0a0a", border: "1px solid " + (burstRes >= 1 ? "#2ecc7144" : "#e74c3c44"), borderRadius: 8 }}><div style={{ fontFamily: "'Cinzel',serif", fontSize: 36, color: burstRes >= 1 ? "#2ecc71" : "#e74c3c" }}>{burstRes}</div><div style={{ fontSize: 10, color: burstRes >= 1 ? "#2ecc71" : "#e74c3c", fontFamily: "monospace" }}>{burstRes === 20 ? "🔥 CRÍTICO PERFEITO" : burstRes >= 1 ? "✓ BURST ATIVADO" : "✗ FALHOU"}</div></div>}
        </div>
      </div>

      {modsOpen && <ModificadoresEditor title="Modificadores de Status" list={ficha.modificadores?.status || []} inventarioItens={inventarioNomes} onChange={(next) => onUpdate({ modificadores: { ...(ficha.modificadores || {}), status: next } })} />}
    </div>
  );
}

// ─────────────────────────────────────────────
// FICHAS — ABA ATRIBUTOS & PERÍCIAS
// ─────────────────────────────────────────────
function TabAtributos({ ficha, onUpdate, inventarioNomes = [] }) {
  const [grupoAtivo, setGrupoAtivo] = useState(PERICIAS_GRUPOS[0].g);
  const [modsOpen, setModsOpen] = useState(null);
  const grp = PERICIAS_GRUPOS.find(g => g.g === grupoAtivo);

  const upA = (sigla, k, v) => onUpdate({ atributos: Object.assign({}, ficha.atributos, { [sigla]: Object.assign({}, ficha.atributos[sigla], { [k]: v }) }) });
  const upP = (nome, v) => onUpdate({ pericias: Object.assign({}, ficha.pericias, { [nome]: Math.max(0, Math.min(20, v)) }) });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
      <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid " + G.border, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>◈ ATRIBUTOS</span><HoverButton onClick={() => setModsOpen("atributos")} style={btnStyle({ padding: "2px 8px" })}>⚙</HoverButton></div>
        <div style={{ fontSize: 10, color: G.muted, fontFamily: "monospace", marginBottom: 10, background: "#050505", padding: "6px 10px", borderRadius: 6, border: "1px solid " + G.border }}><span style={{ color: "#4eff4e" }}>AE</span> = Especializado (+ATRIB) &nbsp;|&nbsp; <span style={{ color: "#ff4e4e" }}>NE</span> = Não Especializado (−ATRIB)</div>
        {ATRIBUTOS.map(a => {
          const av = ficha.atributos[a.sigla];
          return <div key={a.sigla} style={{ background: G.bg3, border: "1px solid " + G.border, borderRadius: 8, padding: "8px 10px", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}><div style={{ flex: 1 }}><div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 1 }}>{a.sigla}</div>{a.bonus && <div style={{ fontSize: 9, color: "#2ecc71", fontFamily: "monospace" }}>{a.bonus}</div>}</div><input type="number" min={0} max={30} value={av.val} onChange={e => upA(a.sigla, "val", Number(e.target.value) || 0)} style={inpStyle({ width: 52, textAlign: "center", fontSize: 15, fontWeight: "bold", color: G.gold, padding: "4px" })} /><div style={{ display: "flex", flexDirection: "column", gap: 2 }}><button onClick={() => upA(a.sigla, "ae", !av.ae)} style={{ width: 24, height: 20, background: av.ae ? "#1a4a1a" : "#111", border: "1px solid " + (av.ae ? "#2d8a2d" : "#333"), borderRadius: 3, color: av.ae ? "#4eff4e" : "#555", fontSize: 9, cursor: "pointer", fontWeight: "bold" }}>AE</button><button onClick={() => upA(a.sigla, "ne", !av.ne)} style={{ width: 24, height: 20, background: av.ne ? "#4a1a1a" : "#111", border: "1px solid " + (av.ne ? "#8a2d2d" : "#333"), borderRadius: 3, color: av.ne ? "#ff4e4e" : "#555", fontSize: 9, cursor: "pointer", fontWeight: "bold" }}>NE</button></div></div>;
        })}
      </div>

      <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid " + G.border }}><span style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3 }}>◈ PERÍCIAS</span><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 10, color: G.muted, fontFamily: "monospace" }}>DT = 20 − Nível</span><HoverButton onClick={() => setModsOpen("pericias")} style={btnStyle({ padding: "2px 8px" })}>⚙</HoverButton></div></div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>{PERICIAS_GRUPOS.map(g => <button key={g.g} onClick={() => setGrupoAtivo(g.g)} style={{ padding: "4px 10px", background: grupoAtivo === g.g ? g.cor + "22" : "transparent", border: "1px solid " + (grupoAtivo === g.g ? g.cor + "55" : G.border), borderRadius: 14, color: grupoAtivo === g.g ? g.cor : G.muted, fontFamily: "monospace", fontSize: 10, cursor: "pointer" }}>{g.g}</button>)}</div>
        {grp && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>{grp.list.map(p => {
          const nivel = ficha.pericias[p] || 0;
          const dt = Math.max(1, 20 - nivel);
          return <div key={p} style={{ background: G.bg3, border: "1px solid " + G.border, borderRadius: 8, padding: "7px 10px", display: "flex", alignItems: "center", gap: 6 }}><div style={{ flex: 1, fontFamily: "monospace", fontSize: 11, color: nivel > 0 ? G.gold2 : "#888" }}>{p}</div><button onClick={() => upP(p, nivel - 1)} style={{ width: 20, height: 20, background: "transparent", border: "1px solid " + G.border, borderRadius: 3, color: G.muted, cursor: "pointer", fontSize: 12 }}>−</button><input type="number" min={0} max={20} value={nivel} onChange={e => upP(p, Number(e.target.value) || 0)} style={inpStyle({ width: 36, textAlign: "center", fontSize: 13, fontWeight: "bold", color: grp.cor, padding: "2px", borderColor: grp.cor + "33" })} /><button onClick={() => upP(p, nivel + 1)} style={{ width: 20, height: 20, background: "transparent", border: "1px solid " + G.border, borderRadius: 3, color: G.muted, cursor: "pointer", fontSize: 12 }}>+</button><div style={{ width: 38, textAlign: "right", fontFamily: "monospace", fontSize: 11, color: nivel === 20 ? "#ffd700" : nivel > 0 ? grp.cor : G.muted }}>DT:{dt}</div></div>;
        })}</div>}
      </div>

      {modsOpen === "atributos" && <ModificadoresEditor title="Modificadores de Atributos" list={ficha.modificadores?.atributos || []} inventarioItens={inventarioNomes} onChange={(next) => onUpdate({ modificadores: { ...(ficha.modificadores || {}), atributos: next } })} />}
      {modsOpen === "pericias" && <ModificadoresEditor title="Modificadores de Perícias" list={ficha.modificadores?.pericias || []} inventarioItens={inventarioNomes} onChange={(next) => onUpdate({ modificadores: { ...(ficha.modificadores || {}), pericias: next } })} />}
    </div>
  );
}

// ─────────────────────────────────────────────
// FICHAS — ABA IDENTIDADE
// ─────────────────────────────────────────────
function TabIdentidade({ ficha, onUpdate }) {
  const [filtro, setFiltro] = useState("");
  const [novoTitulo, setNovoTitulo] = useState("");

  const titulos = getFichaTitulos(ficha);
  const tituloSelecionado = ficha.tituloSelecionado || titulos[0] || "";

  const toggleClasse = (c) => {
    if (ficha.classes.includes(c)) onUpdate({ classes: ficha.classes.filter(x => x !== c) });
    else if (ficha.classes.length < 3) onUpdate({ classes: [...ficha.classes, c] });
  };

  const racasExtras = ficha.racasExtras || [];
  const racaResolvida = resolverNomeRaca(ficha.raca, racasExtras);

  const toggleRacaExtra = (r) => {
    if (r === ficha.raca) return;
    if (racasExtras.includes(r)) onUpdate({ racasExtras: racasExtras.filter((x) => x !== r) });
    else onUpdate({ racasExtras: [...racasExtras, r] });
  };

  const addTitulo = () => {
    const titulo = novoTitulo.trim();
    if (!titulo) return;
    if (titulos.includes(titulo)) return;
    onUpdate({ titulos: [...titulos, titulo], tituloSelecionado: titulo });
    setNovoTitulo("");
  };

  const removeTitulo = (titulo) => {
    const next = titulos.filter((t) => t !== titulo);
    onUpdate({ titulos: next, tituloSelecionado: (ficha.tituloSelecionado === titulo ? (next[0] || "") : ficha.tituloSelecionado) });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 10 }}>◈ RAÇA</div>
          <div style={{ fontSize: 11, color: G.muted, fontFamily: "monospace", marginBottom: 8 }}>Resultado atual: <span style={{ color: G.gold }}>{racaResolvida}</span>{racasExtras.length > 0 && <span> · ({racasExtras.join(" + ")})</span>}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
            {RACAS.map(r => <button key={r} onClick={() => onUpdate({ raca: r, racasExtras: (ficha.racasExtras || []).filter(x => x !== r) })} style={{ padding: "5px 12px", background: ficha.raca === r ? "#1a1208" : "#080808", border: "1px solid " + (ficha.raca === r ? "#c8a96e88" : "#1a1a1a"), borderRadius: 6, color: ficha.raca === r ? G.gold : "#666", fontFamily: "'Cinzel',serif", fontSize: 11, cursor: "pointer" }}>{r}</button>)}
          </div>
          <div style={{ fontSize: 10, color: G.muted, fontFamily: "monospace", marginBottom: 5 }}>Raças adicionais (mestiço)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {RACAS.map(r => <button key={r + "_extra"} onClick={() => toggleRacaExtra(r)} style={{ padding: "4px 10px", background: racasExtras.includes(r) ? "#1b1420" : "#0a0a0a", border: "1px solid " + (racasExtras.includes(r) ? "#9b59b688" : "#222"), borderRadius: 14, color: racasExtras.includes(r) ? "#bf8fe8" : "#666", fontFamily: "monospace", fontSize: 10, cursor: "pointer" }}>{r}</button>)}
          </div>
        </div>

        <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 10 }}>◈ PERFIL</div>

          <label style={{ color: G.muted, fontFamily: "monospace", fontSize: 11, display: "block", marginBottom: 4 }}>Títulos</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, marginBottom: 6 }}>
            <select
              value={tituloSelecionado}
              onChange={(e) => onUpdate({ tituloSelecionado: e.target.value, titulos })}
              style={inpStyle()}
            >
              <option value="">Sem título</option>
              {titulos.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={addTitulo} style={btnStyle({ padding: "6px 10px" })}>Adicionar</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, marginBottom: 10 }}>
            <input
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTitulo()}
              placeholder="Novo título..."
              style={inpStyle()}
            />
            <button
              onClick={() => tituloSelecionado && removeTitulo(tituloSelecionado)}
              style={btnStyle({ padding: "6px 10px", borderColor: "#e74c3c44", color: "#ff6b5f" })}
            >
              Remover
            </button>
          </div>

          <label style={{ color: G.muted, fontFamily: "monospace", fontSize: 11, display: "block", marginBottom: 4 }}>Aparência física</label>
          <textarea value={ficha.aparencia} onChange={e => onUpdate({ aparencia: e.target.value })} rows={3} style={Object.assign({}, inpStyle(), { resize: "vertical", marginBottom: 8 })} />
          <label style={{ color: G.muted, fontFamily: "monospace", fontSize: 11, display: "block", marginBottom: 4 }}>Histórico / Background</label>
          <textarea value={ficha.historico} onChange={e => onUpdate({ historico: e.target.value })} rows={4} style={Object.assign({}, inpStyle(), { resize: "vertical", marginBottom: 8 })} />
          <label style={{ color: G.muted, fontFamily: "monospace", fontSize: 11, display: "block", marginBottom: 4 }}>Notas da sessão</label>
          <textarea value={ficha.notas} onChange={e => onUpdate({ notas: e.target.value })} rows={3} style={Object.assign({}, inpStyle(), { resize: "vertical" })} />
        </div>
      </div>

      <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><span style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3 }}>◈ CLASSES</span><span style={{ fontSize: 10, color: G.muted, fontFamily: "monospace" }}>{ficha.classes.length}/3</span></div>
        {ficha.classes.length > 0 && <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid " + G.border }}>{ficha.classes.map(c => <span key={c} style={{ padding: "3px 10px", background: "#1a1208", border: "1px solid #c8a96e55", borderRadius: 20, fontSize: 11, color: G.gold, fontFamily: "'Cinzel',serif" }}>{c}</span>)}</div>}
        <div style={{ display: "flex", gap: 5, marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid " + G.border }}>{["", "Estrutural", "Funcional", "Dominante"].map(t => <button key={t || "all"} onClick={() => setFiltro(t)} style={{ flex: 1, padding: "5px", background: filtro === t ? "#1a1208" : "transparent", border: "1px solid " + (filtro === t ? "#c8a96e44" : G.border), borderRadius: 6, color: filtro === t ? G.gold : G.muted, fontFamily: "'Cinzel',serif", fontSize: 10, cursor: "pointer" }}>{t || "Todas"}</button>)}</div>
        {Object.entries(CLASSES).map(([tipo, lista]) => {
          if (filtro && filtro !== tipo) return null;
          const cor = tipo === "Estrutural" ? "#3498db" : tipo === "Funcional" ? "#2ecc71" : "#e74c3c";
          return <div key={tipo}><div style={{ fontSize: 9, color: G.muted, fontFamily: "'Cinzel',serif", letterSpacing: 2, marginBottom: 6, marginTop: 8 }}>{tipo.toUpperCase()}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>{lista.map(c => <button key={c} onClick={() => toggleClasse(c)} style={{ padding: "4px 9px", background: ficha.classes.includes(c) ? cor + "22" : "#0a0a0a", border: "1px solid " + (ficha.classes.includes(c) ? cor + "55" : "#222"), borderRadius: 16, color: ficha.classes.includes(c) ? cor : "#555", fontFamily: "monospace", fontSize: 10, cursor: "pointer" }}>{c}</button>)}</div></div>;
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FICHAS — ABA ESSÊNCIA
// ─────────────────────────────────────────────
const EXP_LABELS = ["Sem Mutação", "Sutil", "Moderada", "Total"];
const EXP_CORES  = ["#555", "#c8a96e", "#e67e22", "#e74c3c"];

function EssenciaBtn({ es, sel, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", textAlign: "left", padding: "6px 10px", marginBottom: 4,
        background: sel ? es.cor + "22" : "#080808",
        border: "1px solid " + (sel ? es.cor + "66" : "#1a1a1a"),
        borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
      }}
    >
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: es.cor, boxShadow: sel ? "0 0 8px " + es.cor : "none", flexShrink: 0 }} />
      <span style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: sel ? es.cor : "#666", flex: 1 }}>{es.nome}</span>
      {es.tag && <span style={{ fontSize: 9, color: sel ? es.cor + "99" : "#444", fontFamily: "monospace" }}>{es.tag}</span>}
      {es.coringa && <span style={{ fontSize: 10, color: "#ffd70099" }}>🃏</span>}
    </button>
  );
}

function TabEssencia({ ficha, onUpdate }) {
  const e = ficha.essencia;

  const selectEssencia = (es) => {
    onUpdate({ essencia: e && e.nome === es.nome ? null : es });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16 }}>

      {/* SELETOR */}
      <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 12 }}>◈ ESSÊNCIA</div>
        <div style={{ fontSize: 10, color: "#c8a96e88", fontFamily: "monospace", marginBottom: 6, letterSpacing: 2 }}>✨ VIRTUDES</div>
        {ESSENCIAS_VIRTUDES.map(es => <EssenciaBtn key={es.nome} es={es} sel={!!e && e.nome === es.nome} onClick={() => selectEssencia(es)} />)}
        <div style={{ fontSize: 10, color: "#c8a96e88", fontFamily: "monospace", marginTop: 10, marginBottom: 6, letterSpacing: 2 }}>💀 PECADOS</div>
        {ESSENCIAS_PECADOS.map(es => <EssenciaBtn key={es.nome} es={es} sel={!!e && e.nome === es.nome} onClick={() => selectEssencia(es)} />)}
      </div>

      {/* DETALHE */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {!e && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: G.muted, fontStyle: "italic", fontSize: 15 }}>
            Nenhuma essência selecionada
          </div>
        )}
        {e && (
          <>
            <div style={{ background: e.cor + "0d", border: "1px solid " + e.cor + "44", borderRadius: 10, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 52, height: 52, borderRadius: 8, background: e.cor + "22", border: "1px solid " + e.cor + "55", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px " + e.cor + "44" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: e.cor, boxShadow: "0 0 12px " + e.cor }} />
                </div>
                <div>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: 20, color: e.cor }}>{e.nome}</div>
                  <div style={{ fontSize: 11, color: e.cor + "99", fontStyle: "italic" }}>
                    {e.tag}{e.coringa ? " · 🃏 Coringa" : ""}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#888", fontStyle: "italic", background: "#050505", borderRadius: 6, padding: "8px 12px" }}>{e.forma}</div>
            </div>

            {/* EXPOSIÇÃO */}
            <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 10 }}>◈ EXPOSIÇÃO DE ESSÊNCIA</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {EXP_LABELS.map((l, i) => (
                  <button
                    key={l}
                    onClick={() => onUpdate({ exposicao: i })}
                    style={{
                      flex: 1, padding: "8px 4px",
                      background: ficha.exposicao === i ? EXP_CORES[i] + "22" : "#0d0d0d",
                      border: "1px solid " + (ficha.exposicao === i ? EXP_CORES[i] : G.border),
                      borderRadius: 7,
                      color: ficha.exposicao === i ? EXP_CORES[i] : G.muted,
                      fontFamily: "'Cinzel',serif", fontSize: 10, cursor: "pointer", letterSpacing: 1,
                    }}
                  >{l}</button>
                ))}
              </div>
              {ficha.exposicao > 0 && (
                <div style={{ padding: "10px 14px", background: "#050505", borderRadius: 8, border: "1px solid " + EXP_CORES[ficha.exposicao] + "33", fontSize: 12, color: EXP_CORES[ficha.exposicao], fontStyle: "italic", lineHeight: 1.7 }}>
                  {ficha.exposicao === 1 && "Primeiras marcas físicas — sutis, quase imperceptíveis. O poder começa a moldar o corpo."}
                  {ficha.exposicao === 2 && "O corpo muda visivelmente. Bênçãos e maldições se equilibram. O retorno ainda é possível."}
                  {ficha.exposicao === 3 && "⚠ Mutação total — beira o ponto de não-retorno. O poder é imenso. O controle, uma ilusão."}
                </div>
              )}
            </div>

            {/* SUPERIORES */}
            <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: G.gold, letterSpacing: 2, marginBottom: 8 }}>◈ ESSÊNCIAS SUPERIORES</div>
              <div style={{ fontSize: 10, color: G.muted, fontFamily: "monospace", marginBottom: 5 }}>PRIMORDIAIS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                {["Sabedoria","Inexistência","Perfeição","Vida","Morte","Espaço","Tempo"].map(s => (
                  <span key={s} style={{ padding: "3px 9px", background: G.bg3, border: "1px solid #333", borderRadius: 12, fontSize: 10, color: "#888", fontFamily: "monospace" }}>{s}</span>
                ))}
              </div>
              <div style={{ fontSize: 10, color: G.muted, fontFamily: "monospace", marginBottom: 5 }}>DO OUTRO LADO</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {["Inexistência","Caótica","Nulo","???"].map(s => (
                  <span key={s} style={{ padding: "3px 9px", background: G.bg3, border: "1px solid #333", borderRadius: 12, fontSize: 10, color: "#555", fontFamily: "monospace" }}>{s}</span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FICHAS — ABA INVENTÁRIO
// ─────────────────────────────────────────────
function TabInventario({ ficha, onUpdate, arsenal, onArsenal, onNotify, onConfirmAction }) {
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

// ─────────────────────────────────────────────
// FICHAS SECTION
// ─────────────────────────────────────────────
const FICHA_TABS = [
  { id: "status",     label: "Status" },
  { id: "atributos",  label: "Atributos & Perícias" },
  { id: "identidade", label: "Identidade" },
  { id: "essencia",   label: "Essência" },
  { id: "inventario", label: "Inventário" },
];

function FichasSection({ fichas, onFichas, arsenal, onArsenal, onNotify, onConfirmAction }) {
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("status");
  const [createOpen, setCreate] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [focusFicha, setFocusFicha] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState([]);
  const [filters, setFilters] = useState({ tempo: "all", essencia: "all", classe: "all", raca: "all" });

  const classesDisponiveis = [...new Set(fichas.flatMap((f) => f.classes || []))].sort();
  const essenciasDisponiveis = [...new Set(fichas.map((f) => f.essencia?.nome).filter(Boolean))].sort();
  const racasDisponiveis = [...new Set(fichas.map((f) => resolverNomeRaca(f.raca, f.racasExtras || [])))].sort();

  const ficha = fichas.find((f) => f.id === sel) || null;

  const updateFicha = (partial) => {
    onFichas(fichas.map((f) => (f.id === sel ? Object.assign({}, f, partial, { atualizado: Date.now() }) : f)));
  };

  const criar = () => {
    const f = novaFicha(newNome || "Novo Personagem");
    f.titulos = ["Aventureiro"];
    f.tituloSelecionado = "Aventureiro";
    onFichas([f, ...fichas]);
    setSel(f.id);
    setFocusFicha(true);
    setCreate(false);
    setNewNome("");
    onNotify?.(`Ficha criada: ${f.nome}`, "success");
  };

  const duplicarFicha = (f) => {
    const titulos = getFichaTitulos(f);
    const n = Object.assign({}, f, {
      id: uid(),
      nome: f.nome + " (cópia)",
      titulos,
      tituloSelecionado: f.tituloSelecionado || titulos[0] || "",
      criado: Date.now(),
      atualizado: Date.now(),
    });
    onFichas([n, ...fichas]);
    onNotify?.(`Ficha duplicada: ${f.nome}`, "success");
  };

  const apagar = (ids) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    onFichas(fichas.filter((x) => !idList.includes(x.id)));
    if (idList.includes(sel)) setSel(null);
    setSelectedForDelete([]);
    setDeleteMode(false);
    onNotify?.(idList.length > 1 ? `${idList.length} fichas apagadas.` : "Ficha apagada.", "info");
  };

  const filtered = fichas
    .filter((f) => {
      if (search) {
        const pool = [
          f.nome,
          resolverNomeRaca(f.raca, f.racasExtras || []),
          ...(f.classes || []),
          ...(getFichaTitulos(f)),
          f.tituloSelecionado || "",
          f.essencia?.nome || "",
        ]
          .join(" ")
          .toLowerCase();
        if (!pool.includes(search.toLowerCase())) return false;
      }
      if (filters.essencia !== "all" && (f.essencia?.nome || "") !== filters.essencia) return false;
      if (filters.classe !== "all" && !(f.classes || []).includes(filters.classe)) return false;
      if (filters.raca !== "all" && resolverNomeRaca(f.raca, f.racasExtras || []) !== filters.raca) return false;
      return true;
    })
    .sort((a, b) => {
      if (filters.tempo === "recent") return (b.atualizado || 0) - (a.atualizado || 0);
      if (filters.tempo === "old") return (a.atualizado || 0) - (b.atualizado || 0);
      return (b.atualizado || 0) - (a.atualizado || 0);
    });

  if (!focusFicha) {
    return (
      <FichaCardInventory
        fichas={filtered}
        selectedId={sel}
        search={search}
        onSearch={setSearch}
        filters={{ ...filters, classesDisponiveis, essenciasDisponiveis, racasDisponiveis }}
        onFilter={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        deleteMode={deleteMode}
        selectedForDelete={selectedForDelete}
        onToggleDeleteMode={() => {
          setDeleteMode((d) => !d);
          setSelectedForDelete([]);
        }}
        onToggleDeleteSelection={(id) => setSelectedForDelete((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))}
        onCreate={() => setCreate(true)}
        onDuplicate={() => {
          if (!sel) {
            onNotify?.("Selecione uma carta para duplicar.", "info");
            return;
          }
          const alvo = fichas.find((f) => f.id === sel);
          if (alvo) duplicarFicha(alvo);
        }}
        onDeleteSelected={() => {
          if (!deleteMode) {
            setDeleteMode(true);
            return;
          }
          if (selectedForDelete.length === 0) {
            onNotify?.("Selecione ao menos uma carta para apagar.", "info");
            return;
          }
          onConfirmAction?.({
            title: "Apagar cartas",
            message: `Deseja apagar ${selectedForDelete.length} ficha(s)?`,
            onConfirm: () => apagar(selectedForDelete),
          });
        }}
        onSelect={(id) => {
          setSel(id);
          setFocusFicha(true);
        }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 54px)" }}>
      <div style={{ padding: "10px 16px 0" }}>
        <HoverButton style={btnStyle({ padding: "4px 10px" })} onClick={() => { setFocusFicha(false); setDeleteMode(false); setSelectedForDelete([]); }}>
          ← Voltar para fichas
        </HoverButton>
      </div>
      {!ficha && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: G.muted, fontStyle: "italic", fontSize: 16 }}>
          Selecione ou crie uma ficha
        </div>
      )}
      {ficha && (
        <>
          <div style={{ padding: "10px 20px", borderBottom: "1px solid " + G.border, background: G.bg2, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div style={{ flex: 1 }}>
              <input
                value={ficha.nome}
                onChange={(e) => updateFicha({ nome: e.target.value })}
                style={{ background: "transparent", border: "none", outline: "none", fontFamily: "'Cinzel',serif", fontSize: 20, color: G.gold2, width: "100%" }}
              />
              <div style={{ fontSize: 11, color: G.muted, fontFamily: "monospace" }}>
                {resolverNomeRaca(ficha.raca, ficha.racasExtras || [])}
                {ficha.classes.length > 0 ? " · " + ficha.classes.join(" / ") : ""}
                {ficha.essencia ? " · " + ficha.essencia.nome : ""}
              </div>
            </div>
            <button onClick={() => duplicarFicha(ficha)} style={btnStyle({ borderColor: "#3498db55", color: "#61b8ff" })}>Duplicar</button>
            <button
              onClick={() => onConfirmAction?.({ title: "Apagar ficha", message: `Deseja apagar "${ficha.nome}"?`, onConfirm: () => apagar(ficha.id) })}
              style={btnStyle({ borderColor: "#e74c3c55", color: "#ff6b5f" })}
            >Apagar</button>
            {ficha.essencia && (
              <div style={{ padding: "5px 12px", borderRadius: 6, background: ficha.essencia.cor + "22", border: "1px solid " + ficha.essencia.cor + "55", color: ficha.essencia.cor, fontFamily: "'Cinzel',serif", fontSize: 10, letterSpacing: 1 }}>
                ⬡ {ficha.essencia.nome}
              </div>
            )}
          </div>

          <div style={{ display: "flex", borderBottom: "1px solid " + G.border, background: G.bg2, flexShrink: 0, overflowX: "auto" }}>
            {FICHA_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "10px 16px",
                  background: "transparent",
                  border: "none",
                  borderBottom: tab === t.id ? "2px solid #c8a96e" : "2px solid transparent",
                  color: tab === t.id ? G.gold : G.muted,
                  fontFamily: "'Cinzel',serif",
                  fontSize: 11,
                  letterSpacing: 1,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
            {tab === "status" && <TabStatus ficha={ficha} onUpdate={updateFicha} inventarioNomes={(ficha.inventario || []).map((e) => e.item?.nome).filter(Boolean)} />}
            {tab === "atributos" && <TabAtributos ficha={ficha} onUpdate={updateFicha} inventarioNomes={(ficha.inventario || []).map((e) => e.item?.nome).filter(Boolean)} />}
            {tab === "identidade" && <TabIdentidade ficha={ficha} onUpdate={updateFicha} />}
            {tab === "essencia" && <TabEssencia ficha={ficha} onUpdate={updateFicha} />}
            {tab === "inventario" && <TabInventario ficha={ficha} onUpdate={updateFicha} arsenal={arsenal} onArsenal={onArsenal} onNotify={onNotify} onConfirmAction={onConfirmAction} />}
          </div>
        </>
      )}

      {createOpen && (
        <Modal title="◈ Nova Ficha de Personagem" onClose={() => setCreate(false)}>
          <label style={{ color: G.muted, fontFamily: "monospace", fontSize: 12, display: "block", marginBottom: 6 }}>Nome do personagem</label>
          <input
            value={newNome}
            onChange={(e) => setNewNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criar()}
            placeholder="Ex: Alaric von Grave..."
            style={Object.assign({}, inpStyle(), { fontSize: 16, marginBottom: 16 })}
            autoFocus
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button style={btnStyle({ background: "transparent", border: "1px solid #333", color: G.muted })} onClick={() => setCreate(false)}>Cancelar</button>
            <button style={btnStyle()} onClick={criar}>Criar Personagem</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function VasterraApp() {
  const [section, setSection] = useState("menu");
  const { toasts, confirm, pushToast, closeToast, confirmAction, cancelConfirm, runConfirm } = useFeedback();
  const [fichas,  setFichas]  = useState([]);
  const [arsenal, setArsenal] = useState([]);
  const [loaded,  setLoaded]  = useState(false);

  useEffect(() => {
    (async () => {
      const f = await stGet("vasterra:fichas");
      const a = await stGet("vasterra:arsenal");
      if (f) setFichas(f);
      if (a) setArsenal(a);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) stSet("vasterra:fichas", fichas); }, [fichas, loaded]);
  useEffect(() => { if (loaded) stSet("vasterra:arsenal", arsenal); }, [arsenal, loaded]);

  if (!loaded) {
    return (
      <div style={{ background: G.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: G.gold, fontFamily: "'Cinzel Decorative',serif", fontSize: 18, letterSpacing: 4 }}>
        VASTERRA
      </div>
    );
  }

  return (
    <div style={{ background: G.bg, minHeight: "100vh", color: G.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;900&family=Cinzel+Decorative:wght@400;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #050505; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.3; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: rgba(200,169,110,.25); border-radius: 2px; }
        select option { background: #0a0a0a; color: #e8d5b0; }
      `}</style>

      {/* NAV */}
      <div style={{ height: 54, borderBottom: "1px solid " + G.border, background: "#060606", display: "flex", alignItems: "center", padding: "0 20px", gap: 24, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ marginRight: 8, display: "flex", flexDirection: "column", lineHeight: 1 }}><div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 16, color: G.gold, letterSpacing: 4 }}>VASTERRA</div><div style={{ fontFamily: "'Cinzel',serif", fontSize: 9, color: "#7aa9d8", letterSpacing: 2, marginTop: 3 }}>Vasterra é Vasto</div></div>
        {[{ id: "menu", label: "MENU" }, { id: "fichas", label: "FICHAS" }, { id: "arsenal", label: "ARSENAL" }].map(s => (
          <HoverButton
            key={s.id}
            onClick={() => setSection(s.id)}
            style={{
              background: "transparent", border: "none",
              borderBottom: section === s.id ? "2px solid #c8a96e" : "2px solid transparent",
              color: section === s.id ? G.gold : G.muted,
              fontFamily: "'Cinzel',serif", fontSize: 12, letterSpacing: 3,
              cursor: "pointer", padding: "0 4px", height: 54,
            }}
          >{s.label}</HoverButton>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 10, color: G.muted, fontFamily: "monospace" }}>
          {fichas.length} fichas · {arsenal.length} itens
        </div>
      </div>

      {section === "menu" && (
        <div onClick={() => setSection("fichas")} style={{ position: "relative", minHeight: "calc(100vh - 54px)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <BackgroundParticles />
          <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 56, color: G.gold, letterSpacing: 8, textShadow: "0 0 20px #c8a96e66", zIndex: 1 }}>VASTERRA</div>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color: "#7aa9d8", letterSpacing: 4, zIndex: 1 }}>Vasterra é Vasto</div>
          <div style={{ marginTop: 16, fontFamily: "monospace", color: "#777", zIndex: 1 }}>Clique em qualquer lugar para entrar</div>
        </div>
      )}
      {section === "fichas"  && <FichasSection  fichas={fichas}  onFichas={setFichas}  arsenal={arsenal} onArsenal={setArsenal} onNotify={pushToast} onConfirmAction={confirmAction} />}
      {section === "arsenal" && <ArsenalSection arsenal={arsenal} onArsenal={setArsenal} onNotify={pushToast} onConfirmAction={confirmAction} />}

      <ToastViewport items={toasts} onClose={closeToast} />
      <ConfirmWindow data={confirm} onCancel={cancelConfirm} onConfirm={runConfirm} />
    </div>
  );
}
