import React, { useState, useEffect } from "react";
import { stGet, stSet } from "./core/storage";
import { G } from "./ui/theme";
import { useFeedback } from "./hooks/useFeedback";
import { ToastViewport, ConfirmWindow } from "./components/feedback/FeedbackUI";
import { HoverButton } from "./components/primitives/Interactive";
import { BackgroundParticles } from "./features/shared/components";
import { FichasSection } from "./features/fichas/FichasSection";
import { ArsenalSection } from "./features/arsenal/ArsenalSection";
import { CaldeiraoSection } from "./features/caldeirao/CaldeiraoSection";
import { EffectForgeEditor, makeDefaultEffect } from "./features/caldeirao/EffectForgeEditor";

export default function VasterraApp() {
  const [section, setSection] = useState("menu");
  const { toasts, confirm, pushToast, closeToast, confirmAction, cancelConfirm, runConfirm } = useFeedback();
  const [fichas, setFichas] = useState([]);
  const [arsenal, setArsenal] = useState([]);
  const [efeitosCaldeirao, setEfeitosCaldeirao] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [effectEditorOpen, setEffectEditorOpen] = useState(false);
  const [effectEditorData, setEffectEditorData] = useState(null);

  useEffect(() => {
    (async () => {
      const f = await stGet("vasterra:fichas");
      const a = await stGet("vasterra:arsenal");
      const c = await stGet("vasterra:caldeirao");
      if (f) setFichas(f);
      if (a) setArsenal(a);
      if (c) setEfeitosCaldeirao(c);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) stSet("vasterra:fichas", fichas); }, [fichas, loaded]);
  useEffect(() => { if (loaded) stSet("vasterra:arsenal", arsenal); }, [arsenal, loaded]);
  useEffect(() => { if (loaded) stSet("vasterra:caldeirao", efeitosCaldeirao); }, [efeitosCaldeirao, loaded]);

  const openEffectForge = (effect = null) => {
    setEffectEditorData(effect ? { ...effect } : makeDefaultEffect());
    setEffectEditorOpen(true);
  };

  const saveEffectFromModal = (effect) => {
    const next = { ...effect, id: effect.id || Math.random().toString(36).slice(2, 9), criado: effect.criado || Date.now(), atualizado: Date.now() };
    const exists = (efeitosCaldeirao || []).some((x) => x.id === next.id);
    setEfeitosCaldeirao(exists ? efeitosCaldeirao.map((x) => (x.id === next.id ? next : x)) : [next, ...efeitosCaldeirao]);
    setEffectEditorOpen(false);
    pushToast("Efeito salvo no Caldeirão.", "success");
  };

  if (!loaded) {
    return (
      <div style={{ background: G.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: G.gold, fontFamily: "'Cinzel Decorative',serif", fontSize: 18, letterSpacing: 4 }}>
        VASTERRA
      </div>
    );
  }

  return (
    <div style={{ background: G.bg, minHeight: "100vh", color: G.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;900&family=Cinzel+Decorative:wght@400;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #050505; }
        @keyframes vFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .v-fade { animation: vFadeIn .22s ease; }
        .v-tab-btn { transition: transform .16s ease, color .2s ease, text-shadow .2s ease; }
        .v-tab-btn:hover { transform: translateY(-1px) scale(1.02); text-shadow: 0 0 10px rgba(200,169,110,.2); }
        .v-nav-btn { transition: transform .16s ease, color .2s ease; }
        .v-nav-btn:hover { transform: translateY(-1px); }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.3; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: rgba(200,169,110,.25); border-radius: 2px; }
        select option { background: #0a0a0a; color: #e8d5b0; }
      `}</style>

      <div style={{ height: 54, borderBottom: "1px solid " + G.border, background: "#060606", display: "flex", alignItems: "center", padding: "0 20px", gap: 24, position: "sticky", top: 0, zIndex: 50 }}>
        <button onClick={() => setSection("menu")} style={{ marginRight: 8, display: "flex", flexDirection: "column", lineHeight: 1, background: "transparent", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}><div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 16, color: G.gold, letterSpacing: 4 }}>VASTERRA</div><div style={{ fontFamily: "'Cinzel',serif", fontSize: 9, color: "#7aa9d8", letterSpacing: 2, marginTop: 3 }}>Vasterra é Vasto</div></button>
        {[{ id: "fichas", label: "FICHAS" }, { id: "arsenal", label: "ARSENAL" }, { id: "caldeirao", label: "CALDEIRÃO" }].map((s) => (
          <HoverButton
            className="v-nav-btn"
            key={s.id}
            onClick={() => setSection(s.id)}
            style={{
              background: "transparent", border: "none",
              borderBottom: section === s.id ? "2px solid #c8a96e" : "2px solid transparent",
              color: section === s.id ? G.gold : G.muted,
              fontFamily: "'Cinzel',serif", fontSize: 12, letterSpacing: 3,
              cursor: "pointer", padding: "0 4px", height: 54,
            }}
          >{s.label}</HoverButton>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 10, color: G.muted, fontFamily: "monospace" }}>
          {fichas.length} fichas · {arsenal.length} itens · {efeitosCaldeirao.length} efeitos
        </div>
      </div>

      {section === "menu" && (
        <div onClick={() => setSection("fichas")} style={{ position: "relative", minHeight: "calc(100vh - 54px)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <BackgroundParticles />
          <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 56, color: G.gold, letterSpacing: 8, textShadow: "0 0 20px #c8a96e66", zIndex: 1 }}>VASTERRA</div>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color: "#7aa9d8", letterSpacing: 4, zIndex: 1 }}>Vasterra é Vasto</div>
          <div style={{ marginTop: 16, fontFamily: "monospace", color: "#777", zIndex: 1 }}>Clique em qualquer lugar para entrar</div>
        </div>
      )}
      {section === "fichas" && <div className="v-fade"><FichasSection fichas={fichas} onFichas={setFichas} arsenal={arsenal} efeitosCaldeirao={efeitosCaldeirao} onArsenal={setArsenal} onNotify={pushToast} onConfirmAction={confirmAction} onOpenCaldeirao={openEffectForge} /></div>}
      {section === "arsenal" && <div className="v-fade"><ArsenalSection arsenal={arsenal} efeitosCaldeirao={efeitosCaldeirao} onEfeitosCaldeirao={setEfeitosCaldeirao} onArsenal={setArsenal} onNotify={pushToast} onConfirmAction={confirmAction} onOpenCaldeirao={openEffectForge} onEditCaldeirao={openEffectForge} /></div>}
      {section === "caldeirao" && <div className="v-fade"><CaldeiraoSection efeitos={efeitosCaldeirao} onEfeitos={setEfeitosCaldeirao} onNotify={pushToast} onConfirmAction={confirmAction} /></div>}

      <ToastViewport items={toasts} onClose={closeToast} />
      <ConfirmWindow data={confirm} onCancel={cancelConfirm} onConfirm={runConfirm} />
      {effectEditorOpen && <EffectForgeEditor effect={effectEditorData} onSave={saveEffectFromModal} onClose={() => setEffectEditorOpen(false)} />}
    </div>
  );
}
