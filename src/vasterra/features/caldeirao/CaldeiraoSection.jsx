import React, { useMemo, useState } from "react";
import { uid } from "../../core/factories";
import { G, inpStyle, btnStyle } from "../../ui/theme";
import { ARSENAL_RANKS, RANK_COR } from "../../data/gameData";
import { EffectForgeEditor, makeDefaultEffect } from "./EffectForgeEditor";

function EffectIcon({ ef, size = 20 }) {
  if (ef.iconeModo === "url" && ef.iconeUrl) return <img src={ef.iconeUrl} alt={ef.nome} style={{ width: size, height: size, objectFit: "cover", borderRadius: 4 }} />;
  if (ef.iconeModo === "upload" && ef.iconeData) return <img src={ef.iconeData} alt={ef.nome} style={{ width: size, height: size, objectFit: "cover", borderRadius: 4 }} />;
  if (ef.iconeModo === "cor") return <span style={{ width: size, height: size, display: "inline-block", borderRadius: 5, background: ef.cor || "#7f8c8d", border: "1px solid #333" }} />;
  return <span style={{ fontSize: size }}>{ef.icone || "⚗️"}</span>;
}

export function CaldeiraoSection({ efeitos, onEfeitos, onNotify, onConfirmAction, onUseEffect }) {
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState("");
  const [fTipo, setFTipo] = useState("");
  const [fRank, setFRank] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  const filtered = useMemo(() => (efeitos || []).filter((x) => {
    if (fTipo && x.tipo !== fTipo) return false;
    if (fRank && x.rank !== fRank) return false;
    if (!search) return true;
    return `${x.nome || ""} ${x.descricao || ""} ${x.efeitoMecanico || ""} ${x.frase || ""}`.toLowerCase().includes(search.toLowerCase());
  }), [efeitos, search, fTipo, fRank]);

  const selEffect = (efeitos || []).find((x) => x.id === sel) || null;

  const saveEffect = (e) => {
    const exists = (efeitos || []).some((x) => x.id === e.id);
    onEfeitos(exists ? efeitos.map((x) => x.id === e.id ? { ...e } : x) : [{ ...e, id: e.id || uid(), criado: Date.now() }, ...(efeitos || [])]);
    setEditorOpen(false);
    setSel(e.id);
    onNotify?.("Efeito salvo no Caldeirão.", "success");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", height: "calc(100vh - 54px)", background: "radial-gradient(circle at 20% 0%, #12060c 0, #070708 45%, #050505 100%)" }}>
      <style>{`
        @keyframes caldeiraoMist { 0% { opacity: .08; } 50% { opacity: .2; } 100% { opacity: .08; } }
        .caldeirao-mist { position:absolute; inset:0; background: radial-gradient(circle at 30% 20%, rgba(155,89,182,.2), transparent 35%), radial-gradient(circle at 80% 70%, rgba(231,76,60,.15), transparent 30%); animation: caldeiraoMist 6s ease-in-out infinite; pointer-events:none; }
      `}</style>

      <div style={{ position: "relative", borderRight: "1px solid " + G.border, background: "#08060a", display: "flex", flexDirection: "column" }}>
        <div className="caldeirao-mist" />
        <div style={{ position: "relative", padding: 12, borderBottom: "1px solid " + G.border }}>
          <div style={{ fontFamily: "'Cinzel Decorative',serif", color: "#c06fd6", letterSpacing: 2 }}>CALDEIRÃO</div>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: "#8a7f92", marginBottom: 8 }}>Alquimia Negra de Buffs & Debuffs.</div>
          <button onClick={() => { setEditData(makeDefaultEffect()); setEditorOpen(true); }} style={{ ...btnStyle({ borderColor: "#9b59b644", color: "#d7a9ff" }), width: "100%", marginBottom: 6 }}>+ Criar Efeito</button>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar efeito..." style={{ ...inpStyle(), marginBottom: 6 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <select value={fTipo} onChange={(e) => setFTipo(e.target.value)} style={inpStyle({ padding: "4px 6px", fontSize: 11 })}><option value="">Tipo: todos</option><option>Buff</option><option>Debuff</option></select>
            <select value={fRank} onChange={(e) => setFRank(e.target.value)} style={inpStyle({ padding: "4px 6px", fontSize: 11 })}><option value="">Rank: todos</option>{ARSENAL_RANKS.map((r) => <option key={r}>{r}</option>)}</select>
          </div>
        </div>

        <div style={{ position: "relative", flex: 1, overflowY: "auto", padding: 8 }}>
          {filtered.map((ef) => {
            const cor = RANK_COR[ef.rank] || "#7f8c8d";
            const active = ef.id === sel;
            return (
              <div key={ef.id} onClick={() => setSel(ef.id)} style={{ background: active ? "#221127" : G.bg3, border: "1px solid " + (active ? "#9b59b6aa" : G.border), borderRadius: 10, padding: 9, marginBottom: 8, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <EffectIcon ef={ef} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Cinzel',serif", color: "#e6c6ff", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ef.nome || "Sem nome"}</div>
                    <div style={{ fontFamily: "monospace", color: G.muted, fontSize: 10 }}>{ef.tipo} · {ef.efeitoMecanico || "—"}</div>
                  </div>
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: cor }}>{ef.rank}</span>
                </div>
                {ef.frase && <div style={{ marginTop: 5, fontSize: 10, color: "#ba9cc8", fontStyle: "italic" }}>“{ef.frase}”</div>}
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ color: G.muted, fontFamily: "monospace", textAlign: "center", padding: 20 }}>Nenhum efeito encontrado.</div>}
        </div>
      </div>

      <div style={{ padding: 20, overflow: "auto" }}>
        {!selEffect && <div style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", color: G.muted, fontStyle: "italic" }}>Selecione um efeito para ver detalhes.</div>}
        {selEffect && (
          <div style={{ maxWidth: 860 }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "center" }}>
              <EffectIcon ef={selEffect} size={30} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Cinzel',serif", color: "#e6c6ff", fontSize: 24 }}>{selEffect.nome}</div>
                <div style={{ fontFamily: "monospace", fontSize: 11, color: G.muted }}>{selEffect.tipo} · {selEffect.rank} · {selEffect.efeitoMecanico || "—"}</div>
              </div>
              <button onClick={() => onUseEffect?.(selEffect)} style={btnStyle({ borderColor: "#2ecc7144", color: "#7cf0b3" })}>Usar efeito</button>
              <button onClick={() => { setEditData(selEffect); setEditorOpen(true); }} style={btnStyle()}>Editar</button>
              <button onClick={() => onEfeitos([{ ...selEffect, id: uid(), nome: `${selEffect.nome} (cópia)` }, ...efeitos])} style={btnStyle({ borderColor: "#3498db44", color: "#73bfff" })}>Duplicar</button>
              <button onClick={() => onConfirmAction?.({ title: "Apagar efeito", message: `Apagar ${selEffect.nome}?`, onConfirm: () => { onEfeitos(efeitos.filter((x) => x.id !== selEffect.id)); setSel(null); } })} style={btnStyle({ borderColor: "#e74c3c44", color: "#ff7e6f" })}>Apagar</button>
            </div>

            <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: G.muted, marginBottom: 6 }}>Duração: {selEffect.eterno ? "Eterno" : (selEffect.duracao || "Não definido")} · Removível: {selEffect.removivel ? "Sim" : "Não"}</div>
              {selEffect.removivel && <div style={{ fontFamily: "monospace", fontSize: 11, color: "#d0b4e0", marginBottom: 6 }}>Condição de remoção: {selEffect.condicaoRemocao || "—"}</div>}
              {selEffect.essenciaAtribuida && <div style={{ fontFamily: "monospace", fontSize: 11, color: "#8fd2ff", marginBottom: 6 }}>Essência atribuída: {selEffect.essenciaAtribuida}</div>}
              <div style={{ color: G.text }}>{selEffect.descricao || "Sem descrição."}</div>
              {selEffect.frase && <div style={{ marginTop: 6, color: "#ba9cc8", fontStyle: "italic" }}>“{selEffect.frase}”</div>}
            </div>

            <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 12 }}>
              <div style={{ fontFamily: "'Cinzel',serif", color: G.gold, marginBottom: 8 }}>Condicionais</div>
              <div style={{ display: "grid", gap: 6 }}>
                {(selEffect.condicionais || []).map((c) => <div key={c.id} style={{ border: "1px solid #222", borderRadius: 8, padding: 8, fontFamily: "monospace", fontSize: 11, color: c.ativo ? G.text : "#666" }}>{c.ativo ? "☑" : "☐"} {c.texto || "(sem texto)"}</div>)}
                {(selEffect.condicionais || []).length === 0 && <div style={{ fontFamily: "monospace", color: "#666", fontSize: 11 }}>Sem condicionais.</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      {editorOpen && <EffectForgeEditor effect={editData} onSave={saveEffect} onClose={() => setEditorOpen(false)} />}
    </div>
  );
}
