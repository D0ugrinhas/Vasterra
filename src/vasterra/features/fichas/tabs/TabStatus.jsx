import React, { useCallback, useMemo, useState } from "react";
import { STATUS_CFG, ARSENAL_RANKS, RANK_COR } from "../../../data/gameData";
import { aggregateStatusModifiers } from "../../../core/effects";
import { inventoryItemModifiers } from "../../../core/inventory";
import { uid } from "../../../core/factories";
import { evaluateMathExpression } from "../../../core/mathExpression";
import { buildFichaExpressionVars } from "../../../core/fichaFormula";
import { G, inpStyle, btnStyle } from "../../../ui/theme";
import { HoverButton } from "../../../components/primitives/Interactive";
import { ConfiguradorFichaModal, StatusBar } from "../../shared/components";
import { ImageAttachModal, ImageViewport } from "../../../components/media/ImageAttachModal";

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
    width: 110,
    height: 110,
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
  const avatarSrc = i.avatarModo === "url"
    ? i.avatarUrl
    : i.avatarModo === "upload"
      ? i.avatarData
      : i.avatarModo === "image"
        ? (i.avatarData || i.avatarUrl)
        : "";
  if (avatarSrc) return <ImageViewport src={avatarSrc} alt="Avatar" size={110} radius={12} adjust={i.avatarAjuste} />;
  if (i.avatarModo === "icon") return <div style={base}>{i.avatarIcone || "?"}</div>;
  return <div style={base}>?</div>;
}

export function TabStatus({ ficha, onUpdate, arsenal = [] }) {
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [burstRes, setBurstRes] = useState(null);

  const info = { ...defaultInfo, ...(ficha.informacoes || {}) };
  const avatarModeUI = (info.avatarModo === "url" || info.avatarModo === "upload") ? "image" : (info.avatarModo || "fallback");

  const itemMods = useMemo(() => inventoryItemModifiers(ficha.inventario || [], arsenal), [ficha.inventario, arsenal]);
  const globalEffects = ficha.modificadores?.efeitos || [];
  const mergedMods = [...globalEffects, ...itemMods];

  const statusBonus = aggregateStatusModifiers(mergedMods);

  const normalizeStatusCode = (raw) => {
    const up = String(raw || "").trim().toUpperCase();
    return up === "CONSC" ? "CONS" : up;
  };

  const baseStatusDefs = useMemo(() => STATUS_CFG.map((s) => ({ ...s, sigla: normalizeStatusCode(s.sigla) })), []);
  const statusCodes = useMemo(() => Array.from(new Set([
    ...baseStatusDefs.map((s) => s.sigla),
    ...Object.keys(ficha?.status || {}).map((k) => normalizeStatusCode(k)),
    ...Object.keys(ficha?.combate?.statusMeta || {}).map((k) => normalizeStatusCode(k)),
  ])).filter(Boolean), [baseStatusDefs, ficha?.status, ficha?.combate?.statusMeta]);
  const statusExpressionVars = useMemo(() => buildFichaExpressionVars(ficha), [ficha?.atributos, ficha?.pericias, ficha?.status, ficha?.recursos, ficha?.combate?.recursos]);
  const variableSuggestions = useMemo(() => Object.keys(statusExpressionVars).filter((v) => /[A-Za-z]/.test(v)).sort((a, b) => a.localeCompare(b)), [statusExpressionVars]);

  const computedStatusBase = useMemo(() => {
    const statusEntries = Object.entries(ficha?.status || {});
    return Object.fromEntries(statusCodes.map((code) => {
      const found = statusEntries.find(([k]) => normalizeStatusCode(k) === code)?.[1] || {};
      const rawVal = Number(found?.val || 0);
      const rawMax = Math.max(1, Number(found?.max || 1));
      const resolvedMax = evaluateMathExpression(found?.maxExpr, { fallback: rawMax, min: 1, variables: statusExpressionVars }).value;
      const resolvedVal = evaluateMathExpression(found?.valExpr, { fallback: rawVal, min: 0, max: resolvedMax, variables: statusExpressionVars }).value;
      return [code, {
        val: resolvedVal,
        max: resolvedMax,
        valExpr: typeof found?.valExpr === "string" ? found.valExpr : "",
        maxExpr: typeof found?.maxExpr === "string" ? found.maxExpr : "",
      }];
    }));
  }, [ficha, statusCodes, statusExpressionVars]);

  const upStatus = useCallback((sigla, field, val) => {
    const code = normalizeStatusCode(sigla);
    const key = Object.keys(ficha.status || {}).find((k) => normalizeStatusCode(k) === code) || code;
    onUpdate({ status: { ...ficha.status, [key]: { ...(ficha.status?.[key] || {}), [field]: val } } });
  }, [ficha.status, onUpdate]);
  const upInfo = useCallback((patch) => onUpdate({ informacoes: { ...info, ...patch } }), [info, onUpdate]);
  const upStatusExpr = useCallback((sigla, field, expr, constraints = {}) => {
    const code = normalizeStatusCode(sigla);
    const key = Object.keys(ficha.status || {}).find((k) => normalizeStatusCode(k) === code) || code;
    const current = ficha.status?.[key] || {};
    const numericFallback = Number(current?.[field] || (field === "max" ? 1 : 0));
    const expressionKey = `${field}Expr`;
    const maxBase = field === "max"
      ? evaluateMathExpression(expr, { fallback: numericFallback, min: 1, variables: statusExpressionVars }).value
      : evaluateMathExpression(current?.maxExpr, { fallback: Number(current?.max || 1), min: 1, variables: statusExpressionVars }).value;
    const resolved = evaluateMathExpression(expr, {
      fallback: numericFallback,
      min: field === "max" ? 1 : 0,
      max: field === "max" ? Infinity : maxBase,
      ...constraints,
      variables: statusExpressionVars,
    });
    const patch = { ...current, [expressionKey]: expr, [field]: resolved.value };
    if (field === "max") patch.val = Math.min(Math.max(0, Number(current?.val || 0)), patch.max);
    onUpdate({ status: { ...ficha.status, [key]: patch } });
  }, [ficha.status, onUpdate, statusExpressionVars]);


  const saveStatusExpressions = useCallback((sigla, valExpr, maxExpr) => {
    const code = normalizeStatusCode(sigla);
    const key = Object.keys(ficha.status || {}).find((k) => normalizeStatusCode(k) === code) || code;
    const current = ficha.status?.[key] || {};

    const rawMax = Number(current?.max || 1);
    const nextMax = evaluateMathExpression(maxExpr, { fallback: rawMax, min: 1, variables: statusExpressionVars }).value;

    const rawVal = Number(current?.val || 0);
    const nextVal = evaluateMathExpression(valExpr, { fallback: rawVal, min: 0, max: nextMax, variables: statusExpressionVars }).value;

    onUpdate({
      status: {
        ...ficha.status,
        [key]: {
          ...current,
          maxExpr,
          valExpr,
          max: nextMax,
          val: nextVal,
        },
      },
    });
  }, [ficha.status, onUpdate, statusExpressionVars]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 14, paddingBottom: 8, borderBottom: "1px solid " + G.border }}><span>◈ INFORMAÇÕES · STATUS VITAIS</span><HoverButton style={btnStyle({ padding: "4px 8px", fontSize: 11 })} onClick={() => setConfigOpen(true)}>Configurador de Ficha</HoverButton></div>
        {statusCodes.map((code) => {
          const baseCfg = baseStatusDefs.find((x) => x.sigla === code) || {};
          const meta = ficha?.combate?.statusMeta?.[code] || (code === "CONS" ? ficha?.combate?.statusMeta?.CONSC : null) || {};
          const s = { sigla: code, nome: meta.label || baseCfg.nome || code, cor: meta.cor || baseCfg.cor || "#9ca3af", msg: baseCfg.msg };
          const delta = statusBonus[code] || (code === "CONS" ? statusBonus.CONSC : null) || { base: 0, current: 0, max: 0 };
          const val = Number(computedStatusBase?.[code]?.val || 0) + delta.base + delta.current;
          const max = Number(computedStatusBase?.[code]?.max || 1) + delta.base + delta.max;
          return (
            <StatusBar
              key={s.sigla}
              {...s}
              val={Math.max(0, Math.min(Math.max(1, max), val))}
              max={Math.max(1, max)}
              valExpr={computedStatusBase?.[code]?.valExpr || ""}
              maxExpr={computedStatusBase?.[code]?.maxExpr || ""}
              onVal={(v) => upStatus(s.sigla, "val", v - delta.base - delta.current)}
              onMax={(v) => upStatus(s.sigla, "max", v - delta.base - delta.max)}
              onValExpr={(expr) => upStatusExpr(s.sigla, "val", expr)}
              onMaxExpr={(expr) => upStatusExpr(s.sigla, "max", expr)}
              onSaveExpressions={(valExpr, maxExpr) => saveStatusExpressions(s.sigla, valExpr, maxExpr)}
              expressionVariables={statusExpressionVars}
              variableSuggestions={variableSuggestions}
            />
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14, display: "grid", gap: 10 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3 }}>Ficha técnica do personagem</div>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
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
                <select
                  value={avatarModeUI}
                  onChange={(e) => {
                    if (e.target.value === "image") {
                      upInfo({ avatarModo: info.avatarModo === "url" || info.avatarModo === "upload" ? info.avatarModo : "upload" });
                      setImageModalOpen(true);
                      return;
                    }
                    upInfo({ avatarModo: e.target.value });
                  }}
                  style={inpStyle()}
                >
                  <option value="fallback">Fallback</option>
                  <option value="icon">Ícone + cor</option>
                  <option value="image">Imagem</option>
                </select>
                {(info.avatarModo === "icon" || info.avatarModo === "fallback") ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 56px", gap: 6 }}>
                    <input value={info.avatarIcone || ""} onChange={(e) => upInfo({ avatarIcone: e.target.value })} placeholder="Ícone" style={inpStyle()} />
                    <input type="color" value={info.avatarCor || "#1b2330"} onChange={(e) => upInfo({ avatarCor: e.target.value })} style={{ ...inpStyle(), height: 34, padding: 2 }} />
                  </div>
                ) : (
                  <button onClick={() => setImageModalOpen(true)} style={btnStyle({ width: "100%" })}>Anexar imagem</button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 10 }}>◉ RECURSOS DA FICHA</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
            {(Array.isArray(ficha?.combate?.recursos) ? ficha.combate.recursos : Object.entries(ficha?.recursos || {}).map(([codigo, payload]) => ({ id: codigo, codigo, nome: codigo, cor: "#6e7d91", total: Number(payload?.total || 0), atual: Math.max(0, Number(payload?.total || 0) - Number(payload?.usado || 0)) }))).map((r) => {
              const totalResolved = evaluateMathExpression(r.totalExpr, { fallback: Number(r.total || 0), min: 0, variables: statusExpressionVars }).value;
              const atualResolved = evaluateMathExpression(r.atualExpr, { fallback: Number(r.atual || totalResolved), min: 0, max: totalResolved, variables: statusExpressionVars }).value;
              return (
              <div key={r.id || r.codigo} style={{ border: "1px solid #2b3d52", borderRadius: 8, padding: 8, background: "#0b1118" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 11, color: r.cor || "#9fb3c8" }}>
                  <span>{r.codigo || r.nome}</span>
                  <span style={{ color: G.muted }}>{Number(atualResolved || 0)}/{Number(totalResolved || 0)}</span>
                </div>
                <div style={{ height: 6, borderRadius: 6, background: "#13202d", marginTop: 6, overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(0, Math.min(100, (Number(atualResolved || 0) / Math.max(1, Number(totalResolved || 1))) * 100))}%`, height: "100%", background: r.cor || "#6e7d91" }} />
                </div>
              </div>
            );})}
          </div>
        </div>

        <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 8 }}>⚡ BURST</div>
          <HoverButton style={{ ...btnStyle({ borderColor: "#9b59b644", color: "#bf8fe8" }), width: "100%", padding: "10px", display: "block" }} onClick={() => setBurstRes(Math.ceil(Math.random() * 20))}>Tentar Burst (1D20)</HoverButton>
          {burstRes !== null && <div style={{ marginTop: 10, textAlign: "center", padding: 12, background: "#0a1a0a", border: "1px solid #2ecc7144", borderRadius: 8 }}><div style={{ fontFamily: "'Cinzel',serif", fontSize: 36, color: "#2ecc71" }}>{burstRes}</div></div>}
        </div>
      </div>
      <ConfiguradorFichaModal
        open={configOpen}
        ficha={ficha}
        onClose={() => setConfigOpen(false)}
        onApply={(payload) => {
          if (payload.tipo === "status") {
            const code = payload.codigo;
            onUpdate({
              status: { ...(ficha.status || {}), [code]: { ...(ficha.status?.[code] || {}), val: payload.max, max: payload.max, maxExpr: payload.maxFormula || "" } },
              combate: { ...(ficha.combate || {}), statusMeta: { ...(ficha.combate?.statusMeta || {}), [code]: { label: payload.nome || code, cor: payload.cor } } },
            });
            return;
          }
          const exists = (ficha?.combate?.recursos || []).some((r) => String(r.codigo || "").toUpperCase() === payload.codigo);
          if (exists) return;
          onUpdate({
            combate: {
              ...(ficha.combate || {}),
              recursos: [
                ...((ficha.combate?.recursos || [])),
                { id: uid(), codigo: payload.codigo, nome: payload.nome, cor: payload.cor, shape: payload.shape || "square", total: payload.max, atual: payload.max, custom: true, totalExpr: payload.maxFormula || "" },
              ],
            },
            recursos: { ...(ficha.recursos || {}), [payload.codigo]: { total: payload.max, usado: 0, totalExpr: payload.maxFormula || "" } },
          });
        }}
      />
      <ImageAttachModal
        open={imageModalOpen}
        title="Anexar Avatar"
        initial={{ mode: info.avatarModo === "url" ? "url" : "upload", url: info.avatarUrl || "", data: info.avatarData || "", adjust: info.avatarAjuste }}
        onClose={() => setImageModalOpen(false)}
        onConfirm={(payload) => {
          upInfo({
            avatarModo: payload.mode,
            avatarUrl: payload.url,
            avatarData: payload.data,
            avatarAjuste: payload.adjust,
          });
          setImageModalOpen(false);
        }}
      />
    </div>
  );
}
