import React, { useMemo, useState } from "react";
import { STATUS_CFG, ATRIBUTOS, ARSENAL_RANKS, RANK_COR } from "../../../data/gameData";
import { aggregateModifiers, aggregateStatusModifiers } from "../../../core/effects";
import { inventoryItemModifiers } from "../../../core/inventory";
import { G, inpStyle, btnStyle } from "../../../ui/theme";
import { HoverButton } from "../../../components/primitives/Interactive";
import { StatusBar } from "../../shared/components";

const defaultInfo = {
  peso: "",
  altura: "",
  genero: "",
  rank: "Comum",
  avatarModo: "fallback",
  avatarIcone: "?",
  avatarCor: "#1b2330",
  avatarUrl: "",
  avatarData: "",
};

function AvatarPreview({ info }) {
  const i = { ...defaultInfo, ...(info || {}) };
  const base = {
    width: 86,
    height: 86,
    borderRadius: 12,
    border: "1px solid #2d4057",
    background: i.avatarCor || "#1b2330",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    color: "#d7e8ff",
    fontSize: 32,
    fontFamily: "'Cinzel',serif",
  };

  if (i.avatarModo === "url" && i.avatarUrl) return <img src={i.avatarUrl} alt="Avatar" style={{ ...base, objectFit: "cover" }} />;
  if (i.avatarModo === "upload" && i.avatarData) return <img src={i.avatarData} alt="Avatar" style={{ ...base, objectFit: "cover" }} />;
  if (i.avatarModo === "icon") return <div style={base}>{i.avatarIcone || "?"}</div>;
  return <div style={base}>?</div>;
}

export function TabStatus({ ficha, onUpdate, arsenal = [] }) {
  const [c1, setC1] = useState("FOR");
  const [c2, setC2] = useState("FOR");
  const [cRes, setCRes] = useState(null);
  const [burstRes, setBurstRes] = useState(null);

  const info = { ...defaultInfo, ...(ficha.informacoes || {}) };

  const itemMods = useMemo(() => inventoryItemModifiers(ficha.inventario || [], arsenal), [ficha.inventario, arsenal]);
  const globalEffects = ficha.modificadores?.efeitos || [];
  const mergedMods = [...globalEffects, ...itemMods];

  const statusBonus = aggregateStatusModifiers(mergedMods);
  const attrBonus = aggregateModifiers(mergedMods, "atributos");

  const upStatus = (sigla, field, val) => onUpdate({ status: { ...ficha.status, [sigla]: { ...ficha.status[sigla], [field]: val } } });
  const upInfo = (patch) => onUpdate({ informacoes: { ...info, ...patch } });

  const onUploadAvatar = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => upInfo({ avatarData: String(reader.result || ""), avatarModo: "upload" });
    reader.readAsDataURL(file);
  };

  const rolarConfronto = () => {
    const v1 = (ficha.atributos[c1]?.val || 5) + (attrBonus[c1] || 0);
    const v2 = (ficha.atributos[c2]?.val || 5) + (attrBonus[c2] || 0);
    const diff = v1 - v2;
    setCRes({ r1: Math.max(1, Math.ceil(Math.random() * 20) + diff), r2: Math.ceil(Math.random() * 20) });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 16 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 14, paddingBottom: 8, borderBottom: "1px solid " + G.border }}>
          <span>◈ INFORMAÇÕES · STATUS VITAIS</span>
        </div>
        {STATUS_CFG.map((s) => {
          const delta = statusBonus[s.sigla] || { base: 0, current: 0, max: 0 };
          const val = (ficha.status[s.sigla].val || 0) + delta.base + delta.current;
          const max = (ficha.status[s.sigla].max || 1) + delta.base + delta.max;
          return (
            <StatusBar
              key={s.sigla}
              {...s}
              val={Math.max(0, Math.min(Math.max(1, max), val))}
              max={Math.max(1, max)}
              onVal={(v) => upStatus(s.sigla, "val", v - delta.base - delta.current)}
              onMax={(v) => upStatus(s.sigla, "max", v - delta.base - delta.max)}
            />
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14, display: "grid", gap: 10 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3 }}>Ficha técnica do personagem</div>
          <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: 10 }}>
            <AvatarPreview info={info} />
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <input value={info.peso || ""} onChange={(e) => upInfo({ peso: e.target.value })} placeholder="Peso (kg)" style={inpStyle()} />
                <input value={info.altura || ""} onChange={(e) => upInfo({ altura: e.target.value })} placeholder="Altura (m)" style={inpStyle()} />
                <input value={info.genero || ""} onChange={(e) => upInfo({ genero: e.target.value })} placeholder="Gênero" style={inpStyle()} />
                <select value={info.rank || "Comum"} onChange={(e) => upInfo({ rank: e.target.value })} style={inpStyle({ color: RANK_COR[info.rank || "Comum"] || G.text })}>
                  {ARSENAL_RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <select value={info.avatarModo || "fallback"} onChange={(e) => upInfo({ avatarModo: e.target.value })} style={inpStyle()}>
                  <option value="fallback">Fallback</option>
                  <option value="icon">Ícone + cor</option>
                  <option value="url">Imagem URL</option>
                  <option value="upload">Imagem local</option>
                </select>
                {(info.avatarModo === "icon" || info.avatarModo === "fallback") ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 56px", gap: 6 }}>
                    <input value={info.avatarIcone || ""} onChange={(e) => upInfo({ avatarIcone: e.target.value })} placeholder="Ícone" style={inpStyle()} />
                    <input type="color" value={info.avatarCor || "#1b2330"} onChange={(e) => upInfo({ avatarCor: e.target.value })} style={{ ...inpStyle(), height: 34, padding: 2 }} />
                  </div>
                ) : info.avatarModo === "url" ? (
                  <input value={info.avatarUrl || ""} onChange={(e) => upInfo({ avatarUrl: e.target.value })} placeholder="https://..." style={inpStyle()} />
                ) : (
                  <input type="file" accept="image/*" onChange={(e) => onUploadAvatar(e.target.files?.[0])} style={inpStyle()} />
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 10 }}>⚔ CONFRONTO (Atributo vs Atributo)</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <select value={c1} onChange={(e) => { setC1(e.target.value); setCRes(null); }}>{ATRIBUTOS.map((a) => <option key={a.sigla}>{a.sigla}</option>)}</select>
            <span style={{ color: G.gold, fontFamily: "'Cinzel',serif" }}>vs</span>
            <select value={c2} onChange={(e) => { setC2(e.target.value); setCRes(null); }}>{ATRIBUTOS.map((a) => <option key={a.sigla}>{a.sigla}</option>)}</select>
            <HoverButton style={btnStyle({ padding: "7px 12px" })} onClick={rolarConfronto}>🎲</HoverButton>
          </div>
          {cRes && <div style={{ display: "flex", gap: 8 }}>{[{ v: cRes.r1, lbl: c1, win: cRes.r1 > cRes.r2 }, { v: cRes.r2, lbl: c2, win: cRes.r2 > cRes.r1 }].map((x, i) => <div key={i} style={{ flex: 1, textAlign: "center", padding: "10px 6px", background: x.win ? "#0a2a0a" : "#1a0a0a", border: "1px solid " + (x.win ? "#2ecc7144" : "#e74c3c44"), borderRadius: 8 }}><div style={{ fontSize: 10, color: G.muted, fontFamily: "monospace", marginBottom: 2 }}>{x.lbl}</div><div style={{ fontFamily: "'Cinzel',serif", fontSize: 28, color: x.win ? "#2ecc71" : "#e74c3c" }}>{x.v}</div></div>)}</div>}
        </div>

        <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 8 }}>⚡ BURST</div>
          <HoverButton style={{ ...btnStyle({ borderColor: "#9b59b644", color: "#bf8fe8" }), width: "100%", padding: "10px", display: "block" }} onClick={() => setBurstRes(Math.ceil(Math.random() * 20))}>Tentar Burst (1D20)</HoverButton>
          {burstRes !== null && <div style={{ marginTop: 10, textAlign: "center", padding: 12, background: "#0a1a0a", border: "1px solid #2ecc7144", borderRadius: 8 }}><div style={{ fontFamily: "'Cinzel',serif", fontSize: 36, color: "#2ecc71" }}>{burstRes}</div></div>}
        </div>
      </div>
    </div>
  );
}
