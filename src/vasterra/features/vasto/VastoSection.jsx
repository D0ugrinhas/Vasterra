import React, { useEffect, useMemo, useState } from "react";
import { ALL_PERICIAS, PERICIAS_GRUPOS } from "../../data/gameData";
import { defaultExtraCondition, defaultPrestigioNode, EXTRA_CONDITION_TYPES, normalizePrestigioTree } from "../../core/prestigio";
import { G, btnStyle, inpStyle } from "../../ui/theme";
import { HoverButton } from "../../components/primitives/Interactive";
import { AstralHudCard, LinkModeButton, PrestigioTreeCanvas } from "../prestigio/PrestigioTreeCanvas";
import { novaSkillTag, uid } from "../../core/factories";

const PERICIA_TAGS = Object.fromEntries(PERICIAS_GRUPOS.flatMap((g) => g.list.map((p) => [p, [g.g]])));

export function VastoSection({ prestigios = {}, onPrestigios, skillTags = [], onSkillTags, onNotify, createNodeHotkey = "a", linkModeHotkey = "l" }) {
  const [screen, setScreen] = useState("home");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("all");
  const [skill, setSkill] = useState(ALL_PERICIAS[0]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkFrom, setLinkFrom] = useState(null);

  const [tagSearch, setTagSearch] = useState("");
  const [tagDraft, setTagDraft] = useState(novaSkillTag());

  const tree = useMemo(() => normalizePrestigioTree(prestigios?.[skill], skill), [prestigios, skill]);
  const selectedNode = tree.nodes.find((n) => n.id === selectedNodeId) || null;

  const tags = ["all", ...new Set(PERICIAS_GRUPOS.map((g) => g.g))];
  const filteredSkills = ALL_PERICIAS.filter((p) => {
    if (query && !p.toLowerCase().includes(query.toLowerCase())) return false;
    if (tag !== "all" && !(PERICIA_TAGS[p] || []).includes(tag)) return false;
    return true;
  });

  const filteredTagList = (skillTags || []).filter((t) => t.nome.toLowerCase().includes(tagSearch.toLowerCase()) || (t.descricao || "").toLowerCase().includes(tagSearch.toLowerCase()));

  const saveTree = (nextTree) => onPrestigios({ ...prestigios, [skill]: normalizePrestigioTree(nextTree, skill) });
  const updateNode = (id, patch) => saveTree({ ...tree, nodes: tree.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) });
  const removeNode = (id) => saveTree({ ...tree, nodes: tree.nodes.filter((n) => n.id !== id), links: tree.links.filter((l) => l.from !== id && l.to !== id), centralNodeId: tree.centralNodeId === id ? "" : tree.centralNodeId });
  const moveNode = (id, pos) => updateNode(id, pos);

  const createLink = (from, to) => {
    if (!from || !to || from === to) return;
    if (tree.links.some((l) => (l.from === from && l.to === to) || (l.from === to && l.to === from))) return;
    saveTree({ ...tree, links: [...tree.links, { id: uid(), from, to }] });
    setLinkFrom(null);
  };

  const deleteLink = (id) => saveTree({ ...tree, links: tree.links.filter((l) => l.id !== id) });

  const toggleRequiredNode = (requiredId) => {
    if (!selectedNode || !requiredId || requiredId === selectedNode.id) return;
    const current = selectedNode.requires?.requiredNodeIds || [];
    const requiredNodeIds = current.includes(requiredId)
      ? current.filter((id) => id !== requiredId)
      : [...current, requiredId];
    updateNode(selectedNode.id, { requires: { ...(selectedNode.requires || {}), requiredNodeIds } });
  };

  const addNode = () => {
    const n = { ...defaultPrestigioNode(), x: 600 + (tree.nodes.length * 47) % 1200, y: 500 + (tree.nodes.length * 31) % 900 };
    saveTree({ ...tree, nodes: [...tree.nodes, n], centralNodeId: tree.centralNodeId || n.id });
    setSelectedNodeId(n.id);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
      if (screen !== "prestigios") return;
      const k = e.key.toLowerCase();
      if (k === String(createNodeHotkey || "a").toLowerCase()) { e.preventDefault(); addNode(); }
      if (k === String(linkModeHotkey || "l").toLowerCase()) { e.preventDefault(); setLinkMode((v) => !v); setLinkFrom(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, createNodeHotkey, linkModeHotkey, tree]);

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
          <HoverButton style={btnStyle({ borderColor: "#4a6088", color: "#9bc5ff" })} onClick={() => setScreen("tags")}>Criador de Tags</HoverButton>
          <HoverButton style={btnStyle({ borderColor: "#333", color: "#777" })}>Criador de Facções (em breve)</HoverButton>
        </div>
      </div>
    );
  }

  if (screen === "tags") {
    return (
      <div style={{ padding: 16, display: "grid", gap: 10 }}>
        <style>{`
          @keyframes tagGlow {0%{box-shadow:0 0 0 rgba(90,180,255,.08)}50%{box-shadow:0 0 16px rgba(90,180,255,.24)}100%{box-shadow:0 0 0 rgba(90,180,255,.08)}}
          .v-tag-card { transition: all .2s ease; }
          .v-tag-card:hover { transform: translateY(-1px); border-color:#4f83b6; }
          .v-tag-card.active { animation: tagGlow 2.4s infinite; }
        `}</style>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <HoverButton onClick={() => setScreen("home")} style={btnStyle({ padding: "4px 10px" })}>← Voltar</HoverButton>
          <span style={{ fontFamily: "'Cinzel',serif", color: G.gold }}>Criador de Tags para Skills</span>
        </div>
        <div style={{ border: "1px solid #233652", borderRadius: 12, padding: 12, background: "linear-gradient(180deg,#0a1118,#081019)", display: "grid", gap: 8 }}>
          <input value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} placeholder="Buscar tags por nome/descrição..." style={inpStyle()} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 90px 1fr auto", gap: 6 }}>
            <input value={tagDraft.nome} onChange={(e) => setTagDraft((p) => ({ ...p, nome: e.target.value }))} placeholder="Nome da tag" style={inpStyle()} />
            <input type="color" value={tagDraft.cor || "#7aa9d8"} onChange={(e) => setTagDraft((p) => ({ ...p, cor: e.target.value }))} style={{ ...inpStyle({ padding: 2 }), height: 36 }} />
            <input value={tagDraft.cor} onChange={(e) => setTagDraft((p) => ({ ...p, cor: e.target.value }))} placeholder="#hex" style={inpStyle()} />
            <input value={tagDraft.descricao || ""} onChange={(e) => setTagDraft((p) => ({ ...p, descricao: e.target.value }))} placeholder="Descrição" style={inpStyle()} />
            <HoverButton onClick={() => {
              if (!tagDraft.nome.trim()) return;
              const exists = (skillTags || []).some((x) => x.id === tagDraft.id);
              onSkillTags?.(exists ? skillTags.map((x) => (x.id === tagDraft.id ? tagDraft : x)) : [{ ...tagDraft, id: uid() }, ...skillTags]);
              setTagDraft(novaSkillTag());
              onNotify?.("Tag salva.", "success");
            }}>Salvar</HoverButton>
          </div>
          <div style={{ color: "#88a7c8", fontFamily: "monospace", fontSize: 11 }}>Crie tags com cor própria para uso na Biblioteca. Passe o mouse nos cards para feedback visual.</div>
        </div>

        <div style={{ display: "grid", gap: 6, maxHeight: "60vh", overflowY: "auto", paddingRight: 4 }}>
          {filteredTagList.map((t) => (
            <div key={t.id} className={`v-tag-card ${tagDraft.id === t.id ? "active" : ""}`} style={{ border: "1px solid #24364d", borderRadius: 12, padding: 10, background: "#08111a", display: "grid", gridTemplateColumns: "18px 1fr auto", gap: 8, alignItems: "center" }}>
              <span style={{ width: 18, height: 18, borderRadius: 99, background: t.cor, boxShadow: `0 0 12px ${t.cor}88` }} />
              <div>
                <div style={{ color: "#fff", fontFamily: "monospace", fontSize: 12 }}>{t.nome}</div>
                <div style={{ color: "#6f89a4", fontFamily: "monospace", fontSize: 11 }}>{t.descricao || "Sem descrição"}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <HoverButton onClick={() => setTagDraft(t)} style={btnStyle({ padding: "4px 8px" })}>Editar</HoverButton>
                <HoverButton onClick={() => onSkillTags?.([{ ...t, id: uid(), nome: `${t.nome} (cópia)` }, ...(skillTags || [])])} style={btnStyle({ borderColor: "#4f7dbc66", color: "#9ecfff", padding: "4px 8px" })}>Duplicar</HoverButton>
                <HoverButton onClick={() => onSkillTags?.((skillTags || []).filter((x) => x.id !== t.id))} style={btnStyle({ borderColor: "#e74c3c66", color: "#ff9087", padding: "4px 8px" })}>Apagar</HoverButton>
              </div>
            </div>
          ))}
          {filteredTagList.length === 0 && <div style={{ color: G.muted, fontFamily: "monospace" }}>Nenhuma tag encontrada.</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 10 }}>
      <style>{`
        @keyframes vastoNebulaFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @media (max-width: 980px) { .v-vasto-layout { grid-template-columns: 1fr !important; } }
      `}</style>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <HoverButton onClick={() => setScreen("home")} style={btnStyle({ padding: "4px 10px" })}>← Voltar</HoverButton>
        <span style={{ fontFamily: "'Cinzel',serif", color: G.gold, padding: "2px 10px", borderRadius: 999, background: "linear-gradient(90deg,#ffffff10,#7d4dff22,#ffffff10)", backgroundSize: "200% 200%", animation: "vastoNebulaFlow 7s ease-in-out infinite" }}>Criador de Prestígios</span>
      </div>
      <div className="v-vasto-layout" style={{ display: "grid", gridTemplateColumns: "290px 1fr 360px", gap: 10, minHeight: "calc(100vh - 120px)" }}>
        <AstralHudCard>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar perícia..." style={{ ...inpStyle(), marginBottom: 6 }} />
          <select value={tag} onChange={(e) => setTag(e.target.value)} style={{ ...inpStyle(), marginBottom: 8 }}>{tags.map((t) => <option key={t}>{t}</option>)}</select>
          <div style={{ maxHeight: "66vh", overflowY: "auto", display: "grid", gap: 4 }}>
            {filteredSkills.map((p) => <button key={p} onClick={() => { setSkill(p); setSelectedNodeId(null); }} style={{ ...btnStyle({ textAlign: "left", color: skill === p ? "#d7ecff" : "#9bb6d6", borderColor: skill === p ? "#5dade288" : "#2f455f", background: skill === p ? "#12304a" : "#0c1522" }) }}>{p}</button>)}
          </div>
        </AstralHudCard>

        <AstralHudCard>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#b6ddff", fontFamily: "monospace", fontSize: 11 }}>{skill}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <HoverButton onClick={addNode}>+ Nova Estrela</HoverButton>
              <LinkModeButton active={linkMode} onClick={() => { setLinkMode((v) => !v); setLinkFrom(null); }} />
              <HoverButton onClick={exportPrestigios} style={btnStyle({ borderColor: "#3498db55", color: "#8fc8ff" })}>Exportar</HoverButton>
              <label style={{ border: "1px solid #3498db55", color: "#8fc8ff", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>Importar<input type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => importPrestigios(e.target.files?.[0])} /></label>
            </div>
          </div>
          <PrestigioTreeCanvas
            tree={tree}
            editable
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onMoveNode={moveNode}
            linkMode={linkMode}
            linkFrom={linkFrom}
            onLinkFrom={setLinkFrom}
            onCreateLink={createLink}
            onDeleteLink={deleteLink}
            skillName={skill}
          />
        </AstralHudCard>

        <AstralHudCard>
          {selectedNode ? (
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontFamily: "'Cinzel',serif", color: G.gold2 }}>Editar Estrela Selecionada</div>
              <input value={selectedNode.nome || ""} onChange={(e) => updateNode(selectedNode.id, { nome: e.target.value })} style={inpStyle()} placeholder="Nome" />
              <textarea rows={2} value={selectedNode.descricao || ""} onChange={(e) => updateNode(selectedNode.id, { descricao: e.target.value })} style={inpStyle()} placeholder="Descrição" />
              <textarea rows={2} value={selectedNode.efeitoNarrativo || ""} onChange={(e) => updateNode(selectedNode.id, { efeitoNarrativo: e.target.value })} style={inpStyle()} placeholder="Efeito narrativo" />
              <input type="number" min={0} value={selectedNode.requires?.minSkillLevel || 0} onChange={(e) => updateNode(selectedNode.id, { requires: { ...(selectedNode.requires || {}), minSkillLevel: Math.max(0, Number(e.target.value) || 0) } })} style={inpStyle()} placeholder="Nível mínimo" />
              <div style={{ border: "1px solid #294164", borderRadius: 8, padding: 8, display: "grid", gap: 6 }}>
                <label style={{ display: "flex", gap: 6, alignItems: "center", color: "#b8d6ff", fontSize: 12, fontFamily: "monospace" }}>
                  <input type="checkbox" checked={tree.centralNodeId === selectedNode.id} onChange={(e) => saveTree({ ...tree, centralNodeId: e.target.checked ? selectedNode.id : "" })} />
                  Estrela central
                </label>
                <label style={{ display: "flex", gap: 6, alignItems: "center", color: "#b8d6ff", fontSize: 12, fontFamily: "monospace" }}>
                  <input type="checkbox" checked={!!selectedNode.isChoiceGate} onChange={(e) => updateNode(selectedNode.id, { isChoiceGate: e.target.checked })} />
                  Estrela de escolha (trava ramos alternativos)
                </label>
              </div>
              <div style={{ borderTop: "1px solid #233652", paddingTop: 6, display: "grid", gap: 6 }}>
                <div style={{ fontSize: 11, color: "#9eb8de" }}>Estrelas necessárias</div>
                <div style={{ maxHeight: 110, overflowY: "auto", display: "grid", gap: 4 }}>
                  {tree.nodes.filter((n) => n.id !== selectedNode.id).map((n) => (
                    <label key={n.id} style={{ display: "flex", alignItems: "center", gap: 6, color: "#b8d6ff", fontFamily: "monospace", fontSize: 11 }}>
                      <input
                        type="checkbox"
                        checked={(selectedNode.requires?.requiredNodeIds || []).includes(n.id)}
                        onChange={() => toggleRequiredNode(n.id)}
                      />
                      {n.nome}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ borderTop: "1px solid #233652", paddingTop: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 11, color: "#9eb8de" }}>Condições extras</span><HoverButton onClick={addExtraCondition} style={btnStyle({ padding: "3px 8px" })}>+ condição</HoverButton></div>
                <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
                  {(selectedNode.requires?.extra || []).map((c) => (
                    <div key={c.id} style={{ border: "1px solid #294164", borderRadius: 8, padding: 6, display: "grid", gap: 5 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}>
                        <select value={c.type} onChange={(e) => updateExtraCondition(c.id, { type: e.target.value })} style={inpStyle()}>{EXTRA_CONDITION_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
                        <button onClick={() => removeExtraCondition(c.id)} style={btnStyle({ borderColor: "#e74c3c66", color: "#ff9f95", padding: "2px 6px" })}>x</button>
                      </div>
                      {c.type !== "narrativo" ? <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 6 }}><input value={c.key || ""} onChange={(e) => updateExtraCondition(c.id, { key: e.target.value })} style={inpStyle()} /><input type="number" min={0} value={Number(c.min || 0)} onChange={(e) => updateExtraCondition(c.id, { min: Math.max(0, Number(e.target.value) || 0) })} style={inpStyle()} /></div> : <textarea rows={2} value={c.text || ""} onChange={(e) => updateExtraCondition(c.id, { text: e.target.value })} style={inpStyle()} />}
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
