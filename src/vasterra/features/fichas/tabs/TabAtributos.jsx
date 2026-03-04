import React, { useMemo, useState } from "react";
import { ATRIBUTOS, PERICIAS_GRUPOS, PERICIAS_DESC } from "../../../data/gameData";
import { aggregateModifiers, normalizePericiaKey, parseMechanicalEffects } from "../../../core/effects";
import { inventoryItemModifiers } from "../../../core/inventory";
import { getEffectivePrestigio, normalizePrestigioTree } from "../../../core/prestigio";
import { G, inpStyle, btnStyle } from "../../../ui/theme";
import { Modal } from "../../shared/components";
import { AstralHudCard, PrestigeBadgeStars, PrestigioTreeCanvas } from "../../prestigio/PrestigioTreeCanvas";

function PrestigioModal({ open, onClose, skillName, tree, ficha, unlockedIds, onToggle }) {
  const [detailNodeId, setDetailNodeId] = useState(null);
  const [flash, setFlash] = useState(false);
  if (!open) return null;
  const normalized = normalizePrestigioTree(tree, skillName);
  const effective = getEffectivePrestigio({ tree: normalized, ficha, unlockedIds, skillName });
  const detailNode = normalized.nodes.find((n) => n.id === detailNodeId) || null;

  return (
    <Modal title={`Prestígio · ${skillName}`} onClose={onClose} wide>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 10 }}>
        <PrestigioTreeCanvas
          tree={normalized}
          ficha={ficha}
          skillName={skillName}
          unlockedIds={unlockedIds}
          onToggleNode={() => {}}
          onSelectNode={setDetailNodeId}
          selectedNodeId={detailNodeId}
          showFooterHint
        />
        <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
          <AstralHudCard>
            <div style={{ fontFamily: "monospace", fontSize: 11 }}>Lista das estrelas já prestigiadas.</div>
          </AstralHudCard>
          {(effective.activeNodes || []).map((node) => (
            <AstralHudCard key={node.id}>
              <button onClick={() => setDetailNodeId(node.id)} style={{ background: "transparent", border: "none", color: "#f3d38a", fontFamily: "'Cinzel',serif", fontSize: 12, cursor: "pointer", padding: 0 }}>{node.nome}</button>
              <div style={{ fontSize: 10, color: "#c9dcff", marginTop: 4 }}>{node.efeitoNarrativo || "Sem efeito narrativo"}</div>
            </AstralHudCard>
          ))}
          {(effective.activeNodes || []).length === 0 && <AstralHudCard><div style={{ fontSize: 10, color: "#8fa1be" }}>Nenhuma estrela prestigiada ainda.</div></AstralHudCard>}
        </div>
      </div>

      {detailNode && (
        <Modal title={`✦ ${detailNode.nome}`} onClose={() => setDetailNodeId(null)}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ color: "#a5c7ef", fontSize: 11 }}>{detailNode.descricao || "Sem descrição"}</div>
            <div style={{ color: "#f4e2a8", fontStyle: "italic", fontSize: 12 }}>{detailNode.efeitoNarrativo || "Sem efeito narrativo"}</div>
            <button
              onClick={() => {
                setFlash(true);
                onToggle(detailNode.id);
                setTimeout(() => setFlash(false), 420);
              }}
              style={{
                ...btnStyle({ borderColor: "#ffd67a88", color: "#ffeebf" }),
                background: flash ? "radial-gradient(circle, #fff5cc, #c7931b)" : undefined,
                transform: flash ? "scale(1.04)" : "scale(1)",
                transition: "all .28s ease",
              }}
            >Prestigiar</button>
          </div>
        </Modal>
      )}
    </Modal>
  );
}

export function TabAtributos({ ficha, onUpdate, arsenal = [], prestigios = {} }) {
  const [grupoAtivo, setGrupoAtivo] = useState(PERICIAS_GRUPOS[0].g);
  const [openPrestigio, setOpenPrestigio] = useState(null);
  const grp = PERICIAS_GRUPOS.find((g) => g.g === grupoAtivo);

  const itemMods = useMemo(() => inventoryItemModifiers(ficha.inventario || [], arsenal), [ficha.inventario, arsenal]);
  const mergedMods = [...(ficha.modificadores?.efeitos || []), ...itemMods];
  const attrMods = aggregateModifiers(mergedMods, "atributos");

  const upA = (sigla, k, v) => onUpdate({ atributos: { ...ficha.atributos, [sigla]: { ...ficha.atributos[sigla], [k]: v } } });
  const upP = (nome, v) => onUpdate({ pericias: { ...ficha.pericias, [nome]: Math.max(0, Math.min(20, v)) } });

  const togglePrestigioNode = (skillName, nodeId) => {
    const current = Array.isArray(ficha.periciaPrestigios?.[skillName]) ? ficha.periciaPrestigios[skillName] : [];
    const next = current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId];
    onUpdate({ periciaPrestigios: { ...(ficha.periciaPrestigios || {}), [skillName]: next } });
  };

  const periciaDelta = (nome) => {
    const key = normalizePericiaKey(nome);
    return mergedMods.reduce((sum, m) => {
      if (m?.ativo === false) return sum;
      const parsedList = parseMechanicalEffects(m.efeitoMecanico || m.efeito || m.valor || "");
      return sum + parsedList.reduce((acc, parsed) => (!parsed || parsed.scope !== "pericias" || parsed.isPct ? acc : parsed.key === key ? acc + parsed.value : acc), 0);
    }, 0);
  };

  const getPrestigioInfo = (skill) => getEffectivePrestigio({ tree: prestigios?.[skill], ficha, unlockedIds: ficha.periciaPrestigios?.[skill] || [], skillName: skill });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
      <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid " + G.border }}><span>◈ ATRIBUTOS</span></div>
        {ATRIBUTOS.map((a) => {
          const av = ficha.atributos[a.sigla];
          const delta = attrMods[a.sigla] || 0;
          const final = av.val + delta;
          return <div key={a.sigla} style={{ background: G.bg3, border: "1px solid " + G.border, borderRadius: 8, padding: "8px 10px", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}><div style={{ flex: 1 }}><div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold }}>{a.sigla}</div><div style={{ fontSize: 10, color: delta ? (delta > 0 ? "#62e39e" : "#ff7a6e") : G.muted, fontFamily: "monospace" }}>Base {av.val} {delta ? `(${delta > 0 ? "+" : ""}${delta})` : ""} = {final}</div></div><input type="number" min={0} max={30} value={av.val} onChange={(e) => upA(a.sigla, "val", Number(e.target.value) || 0)} style={inpStyle({ width: 52, textAlign: "center", fontSize: 15, fontWeight: "bold", color: G.gold, padding: "4px" })} /><div style={{ display: "flex", flexDirection: "column", gap: 2 }}><button onClick={() => upA(a.sigla, "ae", !av.ae)} style={{ width: 24, height: 20, background: av.ae ? "#1a4a1a" : "#111", border: "1px solid " + (av.ae ? "#2d8a2d" : "#333"), borderRadius: 3, color: av.ae ? "#4eff4e" : "#555", fontSize: 9, cursor: "pointer", fontWeight: "bold" }}>AE</button><button onClick={() => upA(a.sigla, "ne", !av.ne)} style={{ width: 24, height: 20, background: av.ne ? "#4a1a1a" : "#111", border: "1px solid " + (av.ne ? "#8a2d2d" : "#333"), borderRadius: 3, color: av.ne ? "#ff4e4e" : "#555", fontSize: 9, cursor: "pointer", fontWeight: "bold" }}>NE</button></div></div>;
        })}
      </div>

      <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid " + G.border }}><span style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3 }}>◈ PERÍCIAS · PRESTÍGIOS</span></div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>{PERICIAS_GRUPOS.map((g) => <button key={g.g} onClick={() => setGrupoAtivo(g.g)} style={{ padding: "4px 10px", background: grupoAtivo === g.g ? g.cor + "22" : "transparent", border: "1px solid " + (grupoAtivo === g.g ? g.cor + "55" : G.border), borderRadius: 14, color: grupoAtivo === g.g ? g.cor : G.muted, fontFamily: "monospace", fontSize: 10, cursor: "pointer" }}>{g.g}</button>)}</div>
        {grp && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>{grp.list.map((p) => {
          const nivelBase = ficha.pericias[p] || 0;
          const delta = periciaDelta(p);
          const nivel = Math.max(0, Math.min(20, nivelBase + delta));
          const dt = Math.max(1, 20 - nivel);
          const desc = PERICIAS_DESC[p] || "Sem descrição.";
          const prestigio = getPrestigioInfo(p);
          return <div key={p} style={{ background: G.bg3, border: "1px solid " + G.border, borderRadius: 8, padding: "7px 10px", display: "grid", gap: 6 }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><button onClick={() => setOpenPrestigio(p)} style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid #9fceff", color: "#ecf7ff", background: "radial-gradient(circle, #ffffff, #6ca8db)", boxShadow: "0 0 8px #9fceff88", cursor: "pointer", animation: "v-star-btn 2.2s ease-in-out infinite" }} title="Abrir árvore de prestígio">✦</button><div style={{ flex: 1, fontFamily: "monospace", fontSize: 11, color: nivel > 0 ? G.gold2 : "#888" }}>{p}<div style={{ fontSize: 9, color: "#7a7a7a", marginTop: 1 }}>{desc}</div><div style={{ fontSize: 9, color: delta ? (delta > 0 ? "#62e39e" : "#ff7a6e") : "#666" }}>Base {nivelBase} {delta ? `(${delta > 0 ? "+" : ""}${delta})` : ""}</div></div><div style={{ width: 38, textAlign: "right", fontFamily: "monospace", fontSize: 11, color: nivel === 20 ? "#ffd700" : nivel > 0 ? grp.cor : G.muted }}>DT:{dt}</div></div><div style={{ display: "flex", alignItems: "center", gap: 6 }}><button onClick={() => upP(p, nivelBase - 1)} style={{ width: 20, height: 20, background: "transparent", border: "1px solid " + G.border, borderRadius: 3, color: G.muted, cursor: "pointer", fontSize: 12 }}>−</button><input type="number" min={0} max={20} value={nivelBase} onChange={(e) => upP(p, Number(e.target.value) || 0)} style={inpStyle({ width: 36, textAlign: "center", fontSize: 13, fontWeight: "bold", color: grp.cor, padding: "2px", borderColor: grp.cor + "33" })} /><button onClick={() => upP(p, nivelBase + 1)} style={{ width: 20, height: 20, background: "transparent", border: "1px solid " + G.border, borderRadius: 3, color: G.muted, cursor: "pointer", fontSize: 12 }}>+</button><div style={{ marginLeft: "auto" }}><PrestigeBadgeStars nodes={prestigio.activeNodes} /></div></div></div>;
        })}</div>}
      </div>

      <PrestigioModal open={!!openPrestigio} onClose={() => setOpenPrestigio(null)} skillName={openPrestigio} tree={prestigios?.[openPrestigio]} ficha={ficha} unlockedIds={ficha.periciaPrestigios?.[openPrestigio] || []} onToggle={(nodeId) => togglePrestigioNode(openPrestigio, nodeId)} />
      <style>{`@keyframes v-star-btn{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}`}</style>
    </div>
  );
}
