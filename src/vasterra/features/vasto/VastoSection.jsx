import React, { useEffect, useMemo, useState } from "react";
import { ALL_PERICIAS, PERICIAS_GRUPOS } from "../../data/gameData";
import { defaultExtraCondition, defaultPrestigioNode, EXTRA_CONDITION_TYPES, normalizePrestigioTree } from "../../core/prestigio";
import { G, btnStyle, inpStyle } from "../../ui/theme";
import { HoverButton } from "../../components/primitives/Interactive";
import { AstralHudCard, LinkModeButton, PrestigioTreeCanvas } from "../prestigio/PrestigioTreeCanvas";

const PERICIA_TAGS = Object.fromEntries(PERICIAS_GRUPOS.flatMap((g) => g.list.map((p) => [p, [g.g]])));

export function VastoSection({ prestigios = {}, onPrestigios, onNotify, createNodeHotkey = "a" }) {
  const [screen, setScreen] = useState("home");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("all");
  const [skill, setSkill] = useState(ALL_PERICIAS[0]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkFrom, setLinkFrom] = useState(null);

  const tree = useMemo(() => normalizePrestigioTree(prestigios?.[skill], skill), [prestigios, skill]);
  const selectedNode = tree.nodes.find((n) => n.id === selectedNodeId) || null;

  const tags = ["all", ...new Set(PERICIAS_GRUPOS.map((g) => g.g))];
  const filteredSkills = ALL_PERICIAS.filter((p) => {
    if (query && !p.toLowerCase().includes(query.toLowerCase())) return false;
    if (tag !== "all" && !(PERICIA_TAGS[p] || []).includes(tag)) return false;
    return true;
  });

  const saveTree = (nextTree) => onPrestigios({ ...prestigios, [skill]: normalizePrestigioTree(nextTree, skill) });
  const updateNode = (id, patch) => saveTree({ ...tree, nodes: tree.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) });
  const removeNode = (id) => saveTree({ ...tree, nodes: tree.nodes.filter((n) => n.id !== id), links: tree.links.filter((l) => l.from !== id && l.to !== id), centralNodeId: tree.centralNodeId === id ? "" : tree.centralNodeId });

  const addNode = () => {
    const n = { ...defaultPrestigioNode(), x: 600 + (tree.nodes.length * 47) % 1200, y: 500 + (tree.nodes.length * 31) % 900 };
    saveTree({ ...tree, nodes: [...tree.nodes, n], centralNodeId: tree.centralNodeId || n.id });
    setSelectedNodeId(n.id);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() !== String(createNodeHotkey || "a").toLowerCase()) return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
      if (screen !== "prestigios") return;
      e.preventDefault();
      addNode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, createNodeHotkey, tree]);

  const addExtraCondition = () => {
    if (!selectedNode) return;
    updateNode(selectedNode.id, { requires: { ...(selectedNode.requires || {}), extra: [...(selectedNode.requires?.extra || []), defaultExtraCondition()] } });
  };

  const updateExtraCondition = (id, patch) => {
    if (!selectedNode) return;
    updateNode(selectedNode.id, { requires: { ...(selectedNode.requires || {}), extra: (selectedNode.requires?.extra || []).map((c) => (c.id === id ? { ...c, ...patch } : c)) } });
  };

  const removeExtraCondition = (id) => {
    if (!selectedNode) return;
    updateNode(selectedNode.id, { requires: { ...(selectedNode.requires || {}), extra: (selectedNode.requires?.extra || []).filter((c) => c.id !== id) } });
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
      try { onPrestigios(JSON.parse(String(reader.result || "{}")) || {}); onNotify?.("Prestígios importados.", "success"); }
      catch { onNotify?.("Arquivo inválido para Prestígios.", "error"); }
    };
    reader.readAsText(file);
  };

  if (screen === "home") {
    return (
      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 28, letterSpacing: 3, color: G.gold }}>VASTO</div>
        <div style={{ color: G.muted, fontFamily: "monospace" }}>Criadores Vasterra (módulo astral unificado).</div>
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
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <HoverButton onClick={() => setScreen("home")} style={btnStyle({ padding: "4px 10px" })}>← Voltar</HoverButton>
        <span style={{ fontFamily: "'Cinzel',serif", color: G.gold }}>Criador de Prestígios</span>
        <span style={{ fontFamily: "monospace", color: "#89b5e8", fontSize: 11 }}>{`Atalho nova estrela: ${String(createNodeHotkey || "a").toUpperCase()}`}</span>
      </div>

      <PrestigioTreeCanvas
        tree={tree}
        ficha={null}
        skillName={skill}
        unlockedIds={[]}
        editable
        selectedNodeId={selectedNodeId}
        onSelectNode={setSelectedNodeId}
        onMoveNode={updateNode}
        linkMode={linkMode}
        linkFrom={linkFrom}
        onLinkFrom={setLinkFrom}
        onCreateLink={(from, to) => {
          if (!from || !to || from === to) return;
          if (tree.links.some((l) => l.from === from && l.to === to)) return;
          saveTree({ ...tree, links: [...tree.links, { from, to }] });
          setLinkFrom(null);
        }}
        onDeleteLink={(linkId) => saveTree({ ...tree, links: tree.links.filter((l) => l.id !== linkId) })}
        showFooterHint={false}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "start" }}>
        <AstralHudCard>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontFamily: "'Cinzel',serif", color: G.gold2 }}>Controles do Criador</div>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 6, alignItems: "center" }}>
              <label style={{ fontSize: 11 }}>Pesquisa:</label>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome da perícia" style={inpStyle()} />
              <label style={{ fontSize: 11 }}>Tag:</label>
              <select value={tag} onChange={(e) => setTag(e.target.value)} style={inpStyle()}>{tags.map((t) => <option key={t} value={t}>{t === "all" ? "Todas" : t}</option>)}</select>
              <label style={{ fontSize: 11 }}>Perícia:</label>
              <select value={skill} onChange={(e) => { setSkill(e.target.value); setSelectedNodeId(null); }} style={inpStyle()}>{filteredSkills.map((p) => <option key={p} value={p}>{p}</option>)}</select>
              <label style={{ fontSize: 11 }}>Máx Prestígios:</label>
              <input type="number" min={0} value={tree.maxPrestigios || 0} onChange={(e) => saveTree({ ...tree, maxPrestigios: Math.max(0, Number(e.target.value) || 0) })} style={inpStyle()} />
              <label style={{ fontSize: 11 }}>Tags árvore:</label>
              <input value={(tree.tags || []).join(", ")} onChange={(e) => saveTree({ ...tree, tags: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} style={inpStyle()} placeholder="Ex: Ofensiva, Inicial" />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <HoverButton onClick={addNode}>+ Nova Estrela</HoverButton>
              <LinkModeButton active={linkMode} onClick={() => { setLinkMode((v) => !v); setLinkFrom(null); }} />
              <HoverButton onClick={exportPrestigios} style={btnStyle({ borderColor: "#3498db55", color: "#8fc8ff" })}>Exportar Prestígios</HoverButton>
              <label style={{ border: "1px solid #3498db55", color: "#8fc8ff", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>Importar Prestígios<input type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => importPrestigios(e.target.files?.[0])} /></label>
            </div>
          </div>
        </AstralHudCard>

        <AstralHudCard>
          {selectedNode ? (
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontFamily: "'Cinzel',serif", color: G.gold2 }}>Editar Estrela Selecionada</div>
              <label style={{ fontSize: 11 }}>Nome:</label>
              <input value={selectedNode.nome || ""} onChange={(e) => updateNode(selectedNode.id, { nome: e.target.value })} style={inpStyle()} />
              <label style={{ fontSize: 11 }}>Descrição:</label>
              <textarea rows={2} value={selectedNode.descricao || ""} onChange={(e) => updateNode(selectedNode.id, { descricao: e.target.value })} style={inpStyle()} />
              <label style={{ fontSize: 11 }}>Efeito Narrativo:</label>
              <textarea rows={2} value={selectedNode.efeitoNarrativo || ""} onChange={(e) => updateNode(selectedNode.id, { efeitoNarrativo: e.target.value })} style={inpStyle()} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <div><label style={{ fontSize: 11 }}>Posição X:</label><input type="number" value={selectedNode.x || 0} onChange={(e) => updateNode(selectedNode.id, { x: Number(e.target.value) || 0 })} style={inpStyle()} /></div>
                <div><label style={{ fontSize: 11 }}>Posição Y:</label><input type="number" value={selectedNode.y || 0} onChange={(e) => updateNode(selectedNode.id, { y: Number(e.target.value) || 0 })} style={inpStyle()} /></div>
              </div>
              <label style={{ fontSize: 11 }}><input type="checkbox" checked={tree.centralNodeId === selectedNode.id} onChange={(e) => saveTree({ ...tree, centralNodeId: e.target.checked ? selectedNode.id : "" })} /> Definir como estrela central (câmera inicial)</label>
              <label style={{ fontSize: 11 }}><input type="checkbox" checked={!!selectedNode.isChoiceGate} onChange={(e) => updateNode(selectedNode.id, { isChoiceGate: e.target.checked })} /> Estrela de escolha (trava ramificações irmãs)</label>
              <label style={{ fontSize: 11 }}>Nível mínimo da perícia:</label>
              <input type="number" min={0} value={selectedNode.requires?.minSkillLevel || 0} onChange={(e) => updateNode(selectedNode.id, { requires: { ...(selectedNode.requires || {}), minSkillLevel: Math.max(0, Number(e.target.value) || 0) } })} style={inpStyle()} />
              <label style={{ fontSize: 11 }}>IDs obrigatórios (vírgula):</label>
              <input value={(selectedNode.requires?.requiredNodeIds || []).join(",")} onChange={(e) => updateNode(selectedNode.id, { requires: { ...(selectedNode.requires || {}), requiredNodeIds: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) } })} style={inpStyle()} />

              <div style={{ borderTop: "1px solid #233652", paddingTop: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#9eb8de" }}>Condições extras</span>
                  <HoverButton onClick={addExtraCondition} style={btnStyle({ padding: "3px 8px" })}>+ condição</HoverButton>
                </div>
                <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
                  {(selectedNode.requires?.extra || []).map((c) => (
                    <div key={c.id} style={{ border: "1px solid #294164", borderRadius: 8, padding: 6, display: "grid", gap: 5 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}>
                        <select value={c.type} onChange={(e) => updateExtraCondition(c.id, { type: e.target.value })} style={inpStyle()}>{EXTRA_CONDITION_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
                        <button onClick={() => removeExtraCondition(c.id)} style={btnStyle({ borderColor: "#e74c3c66", color: "#ff9f95", padding: "2px 6px" })}>x</button>
                      </div>
                      {c.type !== "narrativo" ? (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 6 }}>
                          <input value={c.key || ""} onChange={(e) => updateExtraCondition(c.id, { key: e.target.value })} placeholder={c.type === "atributo" ? "FOR" : c.type === "pericia" ? "Perícia" : c.type === "item" ? "Nome item" : "Nome efeito"} style={inpStyle()} />
                          <input type="number" min={0} value={Number(c.min || 0)} onChange={(e) => updateExtraCondition(c.id, { min: Math.max(0, Number(e.target.value) || 0) })} style={inpStyle()} />
                        </div>
                      ) : (
                        <textarea rows={2} value={c.text || ""} onChange={(e) => updateExtraCondition(c.id, { text: e.target.value })} placeholder="Condição narrativa (não validada pelo sistema)" style={inpStyle()} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <HoverButton onClick={() => removeNode(selectedNode.id)} style={btnStyle({ borderColor: "#e74c3c66", color: "#ff9087" })}>Remover estrela</HoverButton>
            </div>
          ) : <div style={{ fontFamily: "monospace", color: "#9eb8de" }}>Selecione uma estrela para editar seus detalhes.</div>}
        </AstralHudCard>
      </div>
    </div>
  );
}
