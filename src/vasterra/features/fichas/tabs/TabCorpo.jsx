import React, { useMemo, useRef, useState } from "react";
import { uid } from "../../../core/factories";
import { G, inpStyle, btnStyle } from "../../../ui/theme";
import { HoverButton } from "../../../components/primitives/Interactive";

const defaultCorpo = () => ({ pontosTotal: 1000, partes: [] });

const clampNum = (v, min = 0) => Math.max(min, Number(v) || 0);

function depthOf(partes, part) {
  let d = 0;
  let p = part;
  while (p?.parentId) {
    p = partes.find((x) => x.id === p.parentId);
    d += 1;
    if (d > 20) break;
  }
  return d;
}

export function TabCorpo({ ficha, onUpdate, onNotify }) {
  const state = useMemo(() => ({ ...defaultCorpo(), ...(ficha.corpo || {}) }), [ficha.corpo]);
  const fileRef = useRef(null);
  const [newPart, setNewPart] = useState({ nome: "", parentId: "", saude: 0, ossos: 0, pele: 0, musculos: 0, bonus: 0, vida: 10 });

  const saveCorpo = (next) => onUpdate({ corpo: { ...state, ...next } });
  const partes = state.partes || [];
  const spent = partes.reduce((acc, p) => acc + clampNum(p.saude) + clampNum(p.ossos) + clampNum(p.pele) + clampNum(p.musculos) + clampNum(p.bonus), 0);
  const pointsLeft = Math.max(0, clampNum(state.pontosTotal, 1) - spent);

  const inventarioOptions = (ficha.inventario || [])
    .map((entry) => entry.item)
    .filter(Boolean)
    .map((it) => ({ id: it.id, nome: it.nome || "Item", regiao: (it.regiao || it.regiaoEfeito || "").toLowerCase() }));

  const sorted = [...partes].sort((a, b) => depthOf(partes, a) - depthOf(partes, b));

  const createPart = () => {
    const nome = String(newPart.nome || "").trim();
    if (!nome) {
      onNotify?.("Dê um nome para a parte do corpo.", "info");
      return;
    }
    const p = {
      id: uid(),
      nome,
      parentId: newPart.parentId || null,
      vida: clampNum(newPart.vida, 1),
      saude: clampNum(newPart.saude),
      ossos: clampNum(newPart.ossos),
      pele: clampNum(newPart.pele),
      musculos: clampNum(newPart.musculos),
      bonus: Number(newPart.bonus) || 0,
      equipamentos: [],
    };
    saveCorpo({ partes: [...partes, p] });
    setNewPart({ nome: "", parentId: "", saude: 0, ossos: 0, pele: 0, musculos: 0, bonus: 0, vida: 10 });
  };

  const updatePart = (id, patch) => saveCorpo({ partes: partes.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  const removePart = (id) => {
    const ids = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      partes.forEach((p) => {
        if (p.parentId && ids.has(p.parentId) && !ids.has(p.id)) {
          ids.add(p.id);
          changed = true;
        }
      });
    }
    saveCorpo({ partes: partes.filter((p) => !ids.has(p.id)) });
  };

  const exportJson = () => {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(ficha.nome || "ficha").replace(/\s+/g, "_")}_corpo.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file) => {
    try {
      const txt = await file.text();
      const data = JSON.parse(txt);
      if (!Array.isArray(data.partes)) throw new Error("Formato inválido");
      saveCorpo({ pontosTotal: clampNum(data.pontosTotal, 1), partes: data.partes });
      onNotify?.("Corpo importado com sucesso.", "success");
    } catch {
      onNotify?.("Arquivo de corpo inválido.", "error");
    }
  };

  return (
    <div style={{ border: "1px solid " + G.border, borderRadius: 12, background: G.bg2, padding: 12, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "'Cinzel',serif", color: G.gold, letterSpacing: 1 }}>◈ CORPO · Sistema de Desmembramento</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ color: G.muted, fontSize: 11 }}>Pontos</label>
          <input type="number" value={clampNum(state.pontosTotal, 1)} onChange={(e) => saveCorpo({ pontosTotal: clampNum(e.target.value, 1) })} style={{ ...inpStyle(), width: 90 }} />
          <span style={{ color: pointsLeft > 0 ? "#7cf0b3" : "#ff8a8a", fontFamily: "monospace", fontSize: 12 }}>Livre: {pointsLeft}</span>
          <HoverButton onClick={exportJson}>Exportar</HoverButton>
          <HoverButton onClick={() => fileRef.current?.click()}>Importar</HoverButton>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        </div>
      </div>

      <div style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: 10, background: "#090b10", display: "grid", gap: 8 }}>
        <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 11 }}>Criar parte</div>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr auto", gap: 6 }}>
          <input value={newPart.nome} onChange={(e) => setNewPart((p) => ({ ...p, nome: e.target.value }))} placeholder="Nome da parte (ex: Cabeça)" style={inpStyle()} />
          <select value={newPart.parentId || ""} onChange={(e) => setNewPart((p) => ({ ...p, parentId: e.target.value }))} style={inpStyle()}><option value="">Sem vínculo</option>{partes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
          <input type="number" value={newPart.vida} onChange={(e) => setNewPart((p) => ({ ...p, vida: clampNum(e.target.value, 1) }))} placeholder="Vida" style={inpStyle()} />
          <input type="number" value={newPart.saude} onChange={(e) => setNewPart((p) => ({ ...p, saude: clampNum(e.target.value) }))} placeholder="Saúde" style={inpStyle()} />
          <input type="number" value={newPart.ossos} onChange={(e) => setNewPart((p) => ({ ...p, ossos: clampNum(e.target.value) }))} placeholder="Ossos" style={inpStyle()} />
          <input type="number" value={newPart.pele} onChange={(e) => setNewPart((p) => ({ ...p, pele: clampNum(e.target.value) }))} placeholder="Pele" style={inpStyle()} />
          <input type="number" value={newPart.musculos} onChange={(e) => setNewPart((p) => ({ ...p, musculos: clampNum(e.target.value) }))} placeholder="Músculos" style={inpStyle()} />
          <input type="number" value={newPart.bonus} onChange={(e) => setNewPart((p) => ({ ...p, bonus: Number(e.target.value) || 0 }))} placeholder="Bônus" style={inpStyle()} />
          <button onClick={createPart} style={btnStyle()}>+ Parte</button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {sorted.length === 0 && <div style={{ color: G.muted, fontFamily: "monospace" }}>Corpo vazio. Adicione partes para montar sua estrutura (ex.: cabeça, pescoço, tronco, asas, cauda...).</div>}
        {sorted.map((p) => {
          const depth = depthOf(partes, p);
          const sugestoes = inventarioOptions.filter((it) => it.regiao && p.nome.toLowerCase().includes(it.regiao));
          return (
            <div key={p.id} style={{ marginLeft: depth * 16, border: "1px solid #2a2a2a", borderRadius: 10, padding: 8, background: "#0a0c12", display: "grid", gap: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr auto", gap: 6, alignItems: "center" }}>
                <input value={p.nome || ""} onChange={(e) => updatePart(p.id, { nome: e.target.value })} style={inpStyle()} />
                <select value={p.parentId || ""} onChange={(e) => updatePart(p.id, { parentId: e.target.value || null })} style={inpStyle()}><option value="">Raiz</option>{partes.filter((x) => x.id !== p.id).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select>
                <input type="number" value={clampNum(p.vida, 1)} onChange={(e) => updatePart(p.id, { vida: clampNum(e.target.value, 1) })} style={inpStyle()} />
                <input type="number" value={clampNum(p.saude)} onChange={(e) => updatePart(p.id, { saude: clampNum(e.target.value) })} style={inpStyle()} />
                <input type="number" value={clampNum(p.ossos)} onChange={(e) => updatePart(p.id, { ossos: clampNum(e.target.value) })} style={inpStyle()} />
                <input type="number" value={clampNum(p.pele)} onChange={(e) => updatePart(p.id, { pele: clampNum(e.target.value) })} style={inpStyle()} />
                <input type="number" value={clampNum(p.musculos)} onChange={(e) => updatePart(p.id, { musculos: clampNum(e.target.value) })} style={inpStyle()} />
                <input type="number" value={Number(p.bonus) || 0} onChange={(e) => updatePart(p.id, { bonus: Number(e.target.value) || 0 })} style={inpStyle()} />
                <button onClick={() => removePart(p.id)} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c" })}>✕</button>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ color: G.muted, fontSize: 11 }}>Equipamentos anexados:</span>
                {(p.equipamentos || []).length === 0 && <span style={{ color: "#657286", fontSize: 11 }}>nenhum</span>}
                {(p.equipamentos || []).map((eq) => (
                  <span key={eq.itemId} style={{ border: "1px solid #334", borderRadius: 999, padding: "2px 8px", fontSize: 11, color: "#b9d7ff" }}>
                    {eq.nome}
                    <button onClick={() => updatePart(p.id, { equipamentos: (p.equipamentos || []).filter((x) => x.itemId !== eq.itemId) })} style={{ marginLeft: 6, background: "transparent", border: "none", color: "#ff7777", cursor: "pointer" }}>×</button>
                  </span>
                ))}
                <select onChange={(e) => {
                  const item = inventarioOptions.find((x) => x.id === e.target.value);
                  if (!item) return;
                  const exists = (p.equipamentos || []).some((x) => x.itemId === item.id);
                  if (exists) return;
                  updatePart(p.id, { equipamentos: [...(p.equipamentos || []), { itemId: item.id, nome: item.nome }] });
                  e.target.value = "";
                }} style={{ ...inpStyle(), minWidth: 200 }} defaultValue="">
                  <option value="">Anexar equipamento...</option>
                  {inventarioOptions.map((it) => <option key={it.id} value={it.id}>{it.nome}</option>)}
                </select>
                {sugestoes.length > 0 && <span style={{ color: "#7db7ff", fontSize: 11 }}>Sugestões por região: {sugestoes.map((s) => s.nome).join(", ")}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
