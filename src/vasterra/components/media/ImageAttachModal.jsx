import React, { useEffect, useMemo, useRef, useState } from "react";
import { G, inpStyle, btnStyle } from "../../ui/theme";

const defaultAdjust = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  rotate: 0,
  fit: "contain",
  filterPreset: "none",
  ornament: "none",
};

const FILTER_PRESETS = {
  none: "none",
  soft: "saturate(1.08) contrast(1.04) brightness(1.03)",
  dramatic: "contrast(1.2) saturate(1.2) brightness(0.95)",
  eter: "hue-rotate(12deg) saturate(1.22) contrast(1.08)",
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeImageAdjust(adjust) {
  return {
    zoom: clamp(toNum(adjust?.zoom, 1), 0.5, 4),
    offsetX: clamp(toNum(adjust?.offsetX, 0), -50, 50),
    offsetY: clamp(toNum(adjust?.offsetY, 0), -50, 50),
    rotate: clamp(toNum(adjust?.rotate, 0), -180, 180),
    fit: adjust?.fit === "cover" ? "cover" : "contain",
    filterPreset: Object.keys(FILTER_PRESETS).includes(adjust?.filterPreset) ? adjust.filterPreset : "none",
    ornament: adjust?.ornament === "vignette" || adjust?.ornament === "glow" ? adjust.ornament : "none",
  };
}

function ornamentStyle(ornament) {
  if (ornament === "vignette") return { boxShadow: "inset 0 0 24px rgba(0,0,0,.55)" };
  if (ornament === "glow") return { boxShadow: "inset 0 0 14px rgba(200,169,110,.35), 0 0 12px rgba(200,169,110,.2)" };
  return null;
}

export function ImageViewport({ src, alt, size = 20, radius = 4, adjust }) {
  const a = normalizeImageAdjust(adjust);
  return (
    <div style={{ width: size, height: size, borderRadius: radius, overflow: "hidden", background: "#0a0a0a", border: "1px solid #2a2a2a", position: "relative" }}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        style={{
          width: "100%",
          height: "100%",
          objectFit: a.fit,
          objectPosition: "center",
          transform: `translate(${a.offsetX}%, ${a.offsetY}%) scale(${a.zoom}) rotate(${a.rotate}deg)`,
          transformOrigin: "center center",
          imageRendering: "auto",
          filter: FILTER_PRESETS[a.filterPreset],
          willChange: "transform",
        }}
      />
      {a.ornament !== "none" && <div style={{ position: "absolute", inset: 0, pointerEvents: "none", ...ornamentStyle(a.ornament) }} />}
    </div>
  );
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ImageAttachModal({ open, title = "Anexar imagem", initial, onClose, onConfirm }) {
  const [mode, setMode] = useState(initial?.mode || "upload");
  const [url, setUrl] = useState(initial?.url || "");
  const [data, setData] = useState(initial?.data || "");
  const [adjust, setAdjust] = useState(() => normalizeImageAdjust(initial?.adjust));
  const [dragging, setDragging] = useState(false);
  const dragStateRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setMode(initial?.mode || "upload");
    setUrl(initial?.url || "");
    setData(initial?.data || "");
    setAdjust(normalizeImageAdjust(initial?.adjust));
  }, [open, initial]);

  const src = useMemo(() => (mode === "url" ? url : data), [mode, url, data]);

  if (!open) return null;

  const applyFile = async (file) => {
    if (!file) return;
    const next = await readAsDataUrl(file);
    setData(next);
    setMode("upload");
  };

  const canConfirm = !!src;

  const startDrag = (ev) => {
    if (!src) return;
    dragStateRef.current = { x: ev.clientX, y: ev.clientY, baseX: adjust.offsetX, baseY: adjust.offsetY };
    setDragging(true);
  };
  const onDrag = (ev) => {
    if (!dragStateRef.current) return;
    const deltaX = ev.clientX - dragStateRef.current.x;
    const deltaY = ev.clientY - dragStateRef.current.y;
    setAdjust((p) => ({
      ...p,
      offsetX: clamp(dragStateRef.current.baseX + (deltaX / 280) * 100, -50, 50),
      offsetY: clamp(dragStateRef.current.baseY + (deltaY / 280) * 100, -50, 50),
    }));
  };
  const stopDrag = () => {
    dragStateRef.current = null;
    setDragging(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,.75)", display: "grid", placeItems: "center" }}>
      <div style={{ width: 900, maxWidth: "95vw", maxHeight: "92vh", overflow: "auto", background: G.bg2, border: `1px solid ${G.border2}`, borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: "'Cinzel',serif", color: G.gold, letterSpacing: 1 }}>{title}</div>
          <button onClick={onClose} style={btnStyle({ background: "transparent", borderColor: "#333", color: G.muted })}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 14 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}>
              <select value={mode} onChange={(e) => setMode(e.target.value)} style={inpStyle()}>
                <option value="upload">Arquivo local / Colar</option>
                <option value="url">URL</option>
              </select>
              <button onClick={() => setAdjust(defaultAdjust)} style={btnStyle({ padding: "6px 10px", fontSize: 11 })}>Reset ajuste</button>
            </div>

            {mode === "url" ? (
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." style={inpStyle()} />
            ) : (
              <div
                onPaste={async (e) => {
                  const items = Array.from(e.clipboardData?.items || []);
                  const imgItem = items.find((it) => it.type?.startsWith("image/"));
                  if (imgItem) {
                    const file = imgItem.getAsFile();
                    await applyFile(file);
                    return;
                  }
                  const text = e.clipboardData?.getData("text") || "";
                  if (text.startsWith("http")) {
                    setMode("url");
                    setUrl(text.trim());
                  }
                }}
                style={{ border: "1px dashed #3a3a3a", borderRadius: 10, padding: 10, color: G.muted, fontSize: 12 }}
              >
                <input type="file" accept="image/*" onChange={(e) => applyFile(e.target.files?.[0])} style={inpStyle({ marginBottom: 8 })} />
                Cole imagem (Ctrl+V), arraste no preview para precisão, ou cole URL.
              </div>
            )}

            <div style={{ border: "1px solid #262626", borderRadius: 10, minHeight: 360, background: "#070707", display: "grid", placeItems: "center", position: "relative" }}>
              {src ? (
                <div
                  onPointerDown={startDrag}
                  onPointerMove={onDrag}
                  onPointerUp={stopDrag}
                  onPointerLeave={stopDrag}
                  style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
                >
                  <ImageViewport src={src} alt="Prévia" size={280} radius={10} adjust={adjust} />
                </div>
              ) : <span style={{ color: G.muted }}>Sem imagem selecionada</span>}

              <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "grid", gap: 4, alignItems: "center" }}>
                <span style={{ color: G.muted, fontSize: 10, textAlign: "center" }}>Y</span>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  step={0.1}
                  value={adjust.offsetY}
                  onChange={(e) => setAdjust((p) => ({ ...p, offsetY: Number(e.target.value) }))}
                  style={{ writingMode: "vertical-lr", direction: "rtl", height: 220 }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gap: 4 }}>
              <label style={{ color: G.muted, fontSize: 11 }}>Mover horizontal (X): {adjust.offsetX.toFixed(1)}%</label>
              <input type="range" min={-50} max={50} step={0.1} value={adjust.offsetX} onChange={(e) => setAdjust((p) => ({ ...p, offsetX: Number(e.target.value) }))} />
            </div>
          </div>

          <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
            <label style={{ color: G.muted, fontSize: 11 }}>Modo de encaixe</label>
            <select value={adjust.fit} onChange={(e) => setAdjust((p) => ({ ...p, fit: e.target.value }))} style={inpStyle()}>
              <option value="contain">Sem recorte (contain)</option>
              <option value="cover">Preencher com recorte (cover)</option>
            </select>

            <label style={{ color: G.muted, fontSize: 11 }}>Zoom: {adjust.zoom.toFixed(2)}x</label>
            <input type="range" min={0.5} max={4} step={0.01} value={adjust.zoom} onChange={(e) => setAdjust((p) => ({ ...p, zoom: Number(e.target.value) }))} />

            <label style={{ color: G.muted, fontSize: 11 }}>Rotação: {adjust.rotate.toFixed(0)}°</label>
            <input type="range" min={-180} max={180} step={1} value={adjust.rotate} onChange={(e) => setAdjust((p) => ({ ...p, rotate: Number(e.target.value) }))} />

            <label style={{ color: G.muted, fontSize: 11 }}>Filtro / distorção leve</label>
            <select value={adjust.filterPreset} onChange={(e) => setAdjust((p) => ({ ...p, filterPreset: e.target.value }))} style={inpStyle()}>
              <option value="none">Sem filtro</option>
              <option value="soft">Suave</option>
              <option value="dramatic">Dramático</option>
              <option value="eter">Éter</option>
            </select>

            <label style={{ color: G.muted, fontSize: 11 }}>Enfeite</label>
            <select value={adjust.ornament} onChange={(e) => setAdjust((p) => ({ ...p, ornament: e.target.value }))} style={inpStyle()}>
              <option value="none">Nenhum</option>
              <option value="vignette">Vinheta</option>
              <option value="glow">Brilho dourado</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button onClick={onClose} style={btnStyle({ background: "transparent", borderColor: "#333", color: G.muted })}>Cancelar</button>
          <button disabled={!canConfirm} onClick={() => canConfirm && onConfirm?.({ mode, url: mode === "url" ? url : "", data: mode === "upload" ? data : "", adjust: normalizeImageAdjust(adjust) })} style={btnStyle({ opacity: canConfirm ? 1 : 0.6, cursor: canConfirm ? "pointer" : "not-allowed" })}>Confirmar imagem</button>
        </div>
      </div>
    </div>
  );
}
