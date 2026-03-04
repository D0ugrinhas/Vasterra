import React, { useMemo, useState } from "react";
import { ALL_PERICIAS, ATRIBUTOS } from "../../data/gameData";
import { defaultPrestigioNode, normalizePrestigioTree } from "../../core/prestigio";
import { G, btnStyle, inpStyle } from "../../ui/theme";
import { HoverButton } from "../../components/primitives/Interactive";

export function VastoSection({ prestigios = {}, onPrestigios, onNotify }) {
  const [screen, setScreen] = useState("home");
  const [skill, setSkill] = useState(ALL_PERICIAS[0]);
  const [linkDraft, setLinkDraft] = useState({ from: "", to: "" });

  const tree = useMemo(() => normalizePrestigioTree(prestigios?.[skill], skill), [prestigios, skill]);

  const saveTree = (nextTree) => {
    onPrestigios({ ...prestigios, [skill]: normalizePrestigioTree(nextTree, skill) });
  };

  const updateNode = (id, patch) => {
    saveTree({ ...tree, nodes: tree.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) });
  };

  const removeNode = (id) => {
    saveTree({
      ...tree,
      nodes: tree.nodes.filter((n) => n.id !== id),
      links: tree.links.filter((l) => l.from !== id && l.to !== id),
    });
  };

  const exportPrestigios = () => {
    const blob = new Blob([JSON.stringify(prestigios, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Prestigios-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importPrestigios = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || "{}"));
        onPrestigios(data || {});
        onNotify?.("Prestígios importados.", "success");
      } catch {
        onNotify?.("Arquivo inválido para Prestígios.", "error");
      }
    };
    reader.readAsText(file);
  };

  if (screen === "home") {
    return (
      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 28, letterSpacing: 3, color: G.gold }}>VASTO</div>
        <div style={{ color: G.muted, fontFamily: "monospace" }}>Criadores Vasterra (em expansão).</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <HoverButton style={btnStyle({ borderColor: "#4a6088", color: "#9bc5ff" })} onClick={() => setScreen("prestigios")}>Criador de Prestígios</HoverButton>
          <HoverButton style={btnStyle({ borderColor: "#333", color: "#777" })}>Criador de Facções (em breve)</HoverButton>
          <HoverButton style={btnStyle({ borderColor: "#333", color: "#777" })}>Criador de Missões (em breve)</HoverButton>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 10 }}>
      <style>{`@keyframes v-vastoSpace{from{background-position:0 0,0 0}to{background-position:300px 180px,140px 80px}}`}</style>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <HoverButton onClick={() => setScreen("home")} style={btnStyle({ padding: "4px 10px" })}>← Voltar</HoverButton>
        <span style={{ fontFamily: "'Cinzel',serif", color: G.gold }}>Criador de Prestígios</span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={skill} onChange={(e) => setSkill(e.target.value)} style={inpStyle({ width: 260 })}>
          {ALL_PERICIAS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <label style={{ color: G.muted, fontSize: 11, fontFamily: "monospace" }}>Máx. Prestígios</label>
        <input type="number" min={0} value={tree.maxPrestigios || 0} onChange={(e) => saveTree({ ...tree, maxPrestigios: Math.max(0, Number(e.target.value) || 0) })} style={inpStyle({ width: 80 })} />
        <HoverButton onClick={() => saveTree({ ...tree, nodes: [...tree.nodes, { ...defaultPrestigioNode(), x: 80 + (tree.nodes.length * 42) % 420, y: 90 + (tree.nodes.length * 38) % 220 }] })}>+ Estrela</HoverButton>
        <HoverButton onClick={exportPrestigios} style={btnStyle({ borderColor: "#3498db55", color: "#8fc8ff" })}>Exportar Prestígios</HoverButton>
        <label style={{ border: "1px solid #3498db55", color: "#8fc8ff", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>
          Importar Prestígios
          <input type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => importPrestigios(e.target.files?.[0])} />
        </label>
      </div>

      <div style={{ border: "1px solid #2c364a", borderRadius: 12, minHeight: 340, position: "relative", overflow: "hidden", background: "radial-gradient(circle at 25% 20%, #171f38, #090d16 65%)" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.4, backgroundImage: "radial-gradient(#b8d6ff 1px, transparent 1px), radial-gradient(#f3d38a 1px, transparent 1px)", backgroundSize: "40px 40px, 88px 88px", animation: "v-vastoSpace 20s linear infinite" }} />
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          {tree.links.map((l, i) => {
            const from = tree.nodes.find((n) => n.id === l.from);
            const to = tree.nodes.find((n) => n.id === l.to);
            if (!from || !to) return null;
            return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#7f9ac6" strokeWidth="2" />;
          })}
        </svg>
        {tree.nodes.map((n) => (
          <div key={n.id} style={{ position: "absolute", left: n.x - 10, top: n.y - 10, color: "#f3d38a", filter: "drop-shadow(0 0 6px #f3d38a77)" }}>★</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 10 }}>
        <div style={{ border: "1px solid #273347", borderRadius: 10, padding: 10, background: "#0a0d15" }}>
          <div style={{ color: G.gold2, fontFamily: "'Cinzel',serif", marginBottom: 8 }}>Links</div>
          <div style={{ display: "grid", gap: 6 }}>
            <select value={linkDraft.from} onChange={(e) => setLinkDraft((p) => ({ ...p, from: e.target.value }))} style={inpStyle()}>
              <option value="">Origem</option>
              {tree.nodes.map((n) => <option key={n.id} value={n.id}>{n.nome}</option>)}
            </select>
            <select value={linkDraft.to} onChange={(e) => setLinkDraft((p) => ({ ...p, to: e.target.value }))} style={inpStyle()}>
              <option value="">Destino</option>
              {tree.nodes.map((n) => <option key={n.id} value={n.id}>{n.nome}</option>)}
            </select>
            <HoverButton onClick={() => {
              if (!linkDraft.from || !linkDraft.to || linkDraft.from === linkDraft.to) return;
              const exists = tree.links.some((l) => l.from === linkDraft.from && l.to === linkDraft.to);
              if (exists) return;
              saveTree({ ...tree, links: [...tree.links, linkDraft] });
            }}>Adicionar Link</HoverButton>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, maxHeight: 420, overflow: "auto", paddingRight: 4 }}>
          {tree.nodes.map((n) => (
            <div key={n.id} style={{ border: "1px solid #2a364a", borderRadius: 10, padding: 10, background: "#0a0f1a" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                <input value={n.nome || ""} onChange={(e) => updateNode(n.id, { nome: e.target.value })} placeholder="Nome" style={inpStyle()} />
                <HoverButton onClick={() => removeNode(n.id)} style={btnStyle({ borderColor: "#e74c3c55", color: "#ff8b7e" })}>Remover</HoverButton>
              </div>
              <textarea value={n.descricao || ""} onChange={(e) => updateNode(n.id, { descricao: e.target.value })} rows={2} placeholder="Descrição" style={inpStyle({ marginTop: 6 })} />
              <textarea value={n.efeitoNarrativo || ""} onChange={(e) => updateNode(n.id, { efeitoNarrativo: e.target.value })} rows={2} placeholder="Efeito narrativo" style={inpStyle({ marginTop: 6 })} />
              <div style={{ display: "grid", gridTemplateColumns: "80px 80px 1fr 1fr", gap: 6, marginTop: 6 }}>
                <input type="number" value={n.x || 0} onChange={(e) => updateNode(n.id, { x: Number(e.target.value) || 0 })} style={inpStyle()} placeholder="X" />
                <input type="number" value={n.y || 0} onChange={(e) => updateNode(n.id, { y: Number(e.target.value) || 0 })} style={inpStyle()} placeholder="Y" />
                <input type="number" min={0} value={n.requires?.minSkillLevel || 0} onChange={(e) => updateNode(n.id, { requires: { ...(n.requires || {}), minSkillLevel: Math.max(0, Number(e.target.value) || 0) } })} style={inpStyle()} placeholder="Nível da perícia" />
                <input value={(n.requires?.requiredNodeIds || []).join(",")} onChange={(e) => updateNode(n.id, { requires: { ...(n.requires || {}), requiredNodeIds: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) } })} style={inpStyle()} placeholder="IDs estrelas req (vírgula)" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "120px 120px auto", gap: 6, marginTop: 6 }}>
                <select onChange={(e) => updateNode(n.id, { requires: { ...(n.requires || {}), attributes: [{ attr: e.target.value, min: n.requires?.attributes?.[0]?.min || 0 }] } })} value={n.requires?.attributes?.[0]?.attr || "FOR"} style={inpStyle()}>
                  {ATRIBUTOS.map((a) => <option key={a.sigla}>{a.sigla}</option>)}
                </select>
                <input type="number" min={0} value={n.requires?.attributes?.[0]?.min || 0} onChange={(e) => updateNode(n.id, { requires: { ...(n.requires || {}), attributes: [{ attr: n.requires?.attributes?.[0]?.attr || "FOR", min: Math.max(0, Number(e.target.value) || 0) }] } })} style={inpStyle()} placeholder="Mín atributo" />
                <span style={{ fontFamily: "monospace", fontSize: 10, color: "#7a8ca8", alignSelf: "center" }}>Condição extra (atributo) opcional</span>
              </div>
            </div>
          ))}
          {tree.nodes.length === 0 && <div style={{ color: G.muted, fontFamily: "monospace" }}>Ainda sem estrelas. Clique em “+ Estrela”.</div>}
        </div>
      </div>
    </div>
  );
}
