import React, { useMemo, useState } from "react";
import { uid } from "../../../core/factories";
import { G, inpStyle, btnStyle } from "../../../ui/theme";
import { EffectDetailsModal } from "../../shared/components";

export function TabEfeitos({ ficha, onUpdate, efeitosCaldeirao = [], onOpenCaldeirao, onConfirmAction }) {
  const [search, setSearch] = useState("");
  const [selectedLibraryId, setSelectedLibraryId] = useState("");
  const [previewEffect, setPreviewEffect] = useState(null);

  const efeitosLocais = ficha.modificadores?.efeitos || [];

  const filteredLibrary = useMemo(() => {
    if (!search) return efeitosCaldeirao;
    const query = search.toLowerCase();
    return (efeitosCaldeirao || []).filter((ef) => `${ef.nome || ""} ${ef.descricao || ""} ${ef.efeitoMecanico || ""} ${ef.frase || ""}`.toLowerCase().includes(query));
  }, [efeitosCaldeirao, search]);

  const setEfeitosLocais = (next) => onUpdate({ modificadores: { ...(ficha.modificadores || {}), efeitos: next } });

  const anexarDoCaldeirao = () => {
    const tpl = (efeitosCaldeirao || []).find((x) => x.id === selectedLibraryId);
    if (!tpl) return;
    setEfeitosLocais([
      { id: uid(), tipo: tpl.tipo || "Buff", nome: tpl.nome || "Efeito", efeito: tpl.efeitoMecanico || "", origem: "Efeito", origemDetalhe: tpl.nome || "Caldeirão" },
      ...efeitosLocais,
    ]);
  };

  const duplicar = (id) => {
    const alvo = efeitosLocais.find((x) => x.id === id);
    if (!alvo) return;
    setEfeitosLocais([{ ...alvo, id: uid(), nome: `${alvo.nome || "Mod"} (cópia)` }, ...efeitosLocais]);
  };

  const apagar = (id) => {
    const alvo = efeitosLocais.find((x) => x.id === id);
    onConfirmAction?.({
      title: "Apagar efeito anexado",
      message: `Deseja apagar ${alvo?.nome || "este efeito"}?`,
      onConfirm: () => setEfeitosLocais(efeitosLocais.filter((x) => x.id !== id)),
    });
  };

  const updateLocal = (id, patch) => setEfeitosLocais(efeitosLocais.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
      <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 10 }}>◈ BIBLIOTECA DE EFEITOS</div>
        <button onClick={() => onOpenCaldeirao?.()} style={{ ...btnStyle({ borderColor: "#9b59b644", color: "#d7a9ff" }), width: "100%", marginBottom: 8 }}>+ Criar no Caldeirão</button>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar no caldeirão..." style={{ ...inpStyle(), marginBottom: 8 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 6, marginBottom: 10 }}>
          <select value={selectedLibraryId} onChange={(e) => setSelectedLibraryId(e.target.value)} style={inpStyle()}>
            <option value="">Selecionar efeito...</option>
            {filteredLibrary.map((x) => <option key={x.id} value={x.id}>{x.nome} · {x.efeitoMecanico || "—"}</option>)}
          </select>
          <button onClick={anexarDoCaldeirao} disabled={!selectedLibraryId} style={btnStyle({ padding: "4px 8px" })}>Anexar</button>
          <button onClick={() => setPreviewEffect((efeitosCaldeirao || []).find((x) => x.id === selectedLibraryId) || null)} disabled={!selectedLibraryId} style={btnStyle({ borderColor: "#3498db44", color: "#73bfff", padding: "4px 8px" })}>🔍</button>
        </div>
        <div style={{ maxHeight: "56vh", overflowY: "auto", display: "grid", gap: 6 }}>
          {filteredLibrary.map((ef) => (
            <div key={ef.id} onClick={() => setSelectedLibraryId(ef.id)} style={{ border: "1px solid " + (selectedLibraryId === ef.id ? "#9b59b6aa" : G.border), background: selectedLibraryId === ef.id ? "#211225" : G.bg3, borderRadius: 8, padding: 8, cursor: "pointer" }}>
              <div style={{ fontFamily: "'Cinzel',serif", color: "#e6c6ff", fontSize: 12 }}>{ef.nome || "Sem nome"}</div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: G.muted }}>{ef.tipo} · {ef.efeitoMecanico || "—"}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3 }}>◈ EFEITOS ANEXADOS AO PERSONAGEM</div>
          <button onClick={() => setEfeitosLocais([{ id: uid(), tipo: "Buff", nome: "", efeito: "", origem: "Efeito", origemDetalhe: "" }, ...efeitosLocais])} style={btnStyle({ padding: "4px 8px" })}>+ Manual</button>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {efeitosLocais.map((m) => (
            <div key={m.id} style={{ border: "1px solid #222", borderRadius: 8, padding: 8, background: "#0b0b0b", display: "grid", gridTemplateColumns: "90px 1fr 1fr 120px 1fr auto auto", gap: 6 }}>
              <select value={m.tipo} onChange={(e) => updateLocal(m.id, { tipo: e.target.value })} style={inpStyle()}><option>Buff</option><option>Debuff</option></select>
              <input value={m.nome || ""} onChange={(e) => updateLocal(m.id, { nome: e.target.value })} placeholder="Nome" style={inpStyle()} />
              <input value={m.efeito || ""} onChange={(e) => updateLocal(m.id, { efeito: e.target.value })} placeholder="+4FOR" style={inpStyle()} />
              <input value={m.origem || "Efeito"} onChange={(e) => updateLocal(m.id, { origem: e.target.value })} placeholder="Origem" style={inpStyle()} />
              <input value={m.origemDetalhe || ""} onChange={(e) => updateLocal(m.id, { origemDetalhe: e.target.value })} placeholder="Detalhe" style={inpStyle()} />
              <button onClick={() => duplicar(m.id)} style={btnStyle({ borderColor: "#3498db44", color: "#73bfff", padding: "4px 8px" })}>⎘</button>
              <button onClick={() => apagar(m.id)} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c", padding: "4px 8px" })}>✕</button>
            </div>
          ))}
          {efeitosLocais.length === 0 && <div style={{ color: G.muted, fontFamily: "monospace", textAlign: "center", padding: 20 }}>Sem efeitos anexados.</div>}
        </div>
      </div>

      {previewEffect && <EffectDetailsModal effect={previewEffect} onClose={() => setPreviewEffect(null)} />}
    </div>
  );
}
