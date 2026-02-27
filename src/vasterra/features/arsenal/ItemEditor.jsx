import React, { useState } from "react";
import { ARSENAL_TIPOS, ARSENAL_RANKS, RANK_COR } from "../../data/gameData";
import { novoItem } from "../../core/factories";
import { G, inpStyle, btnStyle } from "../../ui/theme";
import { HoverButton } from "../../components/primitives/Interactive";
import { Modal } from "../shared/components";

export function ItemEditor({ item, onSave, onClose }) {
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
