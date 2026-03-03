import React, { useEffect, useMemo, useState } from "react";
import { G, inpStyle, btnStyle } from "../../ui/theme";

const defaultAdjust = { zoom: 1, offsetX: 0, offsetY: 0, fit: "contain" };

export function normalizeImageAdjust(adjust) {
  return {
    zoom: Number(adjust?.zoom) || 1,
    offsetX: Number(adjust?.offsetX) || 0,
    offsetY: Number(adjust?.offsetY) || 0,
    fit: adjust?.fit === "cover" ? "cover" : "contain",
  };
}

export function ImageViewport({ src, alt, size = 20, radius = 4, adjust }) {
  const a = normalizeImageAdjust(adjust);
  return (
    <div style={{ width: size, height: size, borderRadius: radius, overflow: "hidden", background: "#0a0a0a", border: "1px solid #2a2a2a" }}>
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
          transform: `translate(${a.offsetX}px, ${a.offsetY}px) scale(${a.zoom})`,
          transformOrigin: "center center",
          imageRendering: "auto",
        }}
      />
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

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,.75)", display: "grid", placeItems: "center" }}>
      <div style={{ width: 820, maxWidth: "95vw", maxHeight: "92vh", overflow: "auto", background: G.bg2, border: `1px solid ${G.border2}`, borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: "'Cinzel',serif", color: G.gold, letterSpacing: 1 }}>{title}</div>
          <button onClick={onClose} style={btnStyle({ background: "transparent", borderColor: "#333", color: G.muted })}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14 }}>
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
                Cole imagem (Ctrl+V) ou URL dentro desta área.
              </div>
            )}

            <div style={{ border: "1px solid #262626", borderRadius: 10, minHeight: 320, display: "grid", placeItems: "center", background: "#070707" }}>
              {src ? <ImageViewport src={src} alt="Prévia" size={280} radius={10} adjust={adjust} /> : <span style={{ color: G.muted }}>Sem imagem selecionada</span>}
            </div>
          </div>

          <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
            <label style={{ color: G.muted, fontSize: 11 }}>Modo de encaixe</label>
            <select value={adjust.fit} onChange={(e) => setAdjust((p) => ({ ...p, fit: e.target.value }))} style={inpStyle()}>
              <option value="contain">Sem recorte (contain)</option>
              <option value="cover">Preencher com recorte (cover)</option>
            </select>

            <label style={{ color: G.muted, fontSize: 11 }}>Zoom: {adjust.zoom.toFixed(2)}x</label>
            <input type="range" min={0.5} max={3} step={0.01} value={adjust.zoom} onChange={(e) => setAdjust((p) => ({ ...p, zoom: Number(e.target.value) }))} />

            <label style={{ color: G.muted, fontSize: 11 }}>Mover horizontal: {adjust.offsetX}px</label>
            <input type="range" min={-120} max={120} step={1} value={adjust.offsetX} onChange={(e) => setAdjust((p) => ({ ...p, offsetX: Number(e.target.value) }))} />

            <label style={{ color: G.muted, fontSize: 11 }}>Mover vertical: {adjust.offsetY}px</label>
            <input type="range" min={-120} max={120} step={1} value={adjust.offsetY} onChange={(e) => setAdjust((p) => ({ ...p, offsetY: Number(e.target.value) }))} />
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
