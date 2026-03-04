import React, { useState, useEffect } from "react";
import { stGet, stSet } from "./core/storage";
import { G } from "./ui/theme";
import { useFeedback } from "./hooks/useFeedback";
import { ToastViewport, ConfirmWindow } from "./components/feedback/FeedbackUI";
import { HoverButton } from "./components/primitives/Interactive";
import { BackgroundParticles, Modal } from "./features/shared/components";
import { FichasSection } from "./features/fichas/FichasSection";
import { ArsenalSection } from "./features/arsenal/ArsenalSection";
import { CaldeiraoSection } from "./features/caldeirao/CaldeiraoSection";
import { VastoSection } from "./features/vasto/VastoSection";
import { BibliotecaSection } from "./features/biblioteca/BibliotecaSection";
import { EffectForgeEditor, makeDefaultEffect } from "./features/caldeirao/EffectForgeEditor";
import { novaFicha, novoItem, novaSkill, novaSkillTag, uid } from "./core/factories";


const SETTINGS_KEY = "vasterra:settings";
const defaultSettings = { storageNamespace: "vasterra", controls: { createNodeHotkey: "a", linkModeHotkey: "l" } };

const scopedKey = (ns, key) => `${(ns || "vasterra").trim()}:${key}`;

function normalizeItem(item = {}) {
  const base = novoItem();
  return {
    ...base,
    ...item,
    id: item.id || base.id || uid(),
    bonus: Array.isArray(item.bonus) ? item.bonus : base.bonus,
    efeitos: Array.isArray(item.efeitos) ? item.efeitos : base.efeitos,
    vastos: { ...(base.vastos || {}), ...(item.vastos || {}) },
  };
}

function normalizeFicha(ficha = {}) {
  const base = novaFicha(ficha.nome || "Novo Personagem");
  return {
    ...base,
    ...ficha,
    id: ficha.id || base.id || uid(),
    classes: Array.isArray(ficha.classes) ? ficha.classes : base.classes,
    titulos: Array.isArray(ficha.titulos) && ficha.titulos.length ? ficha.titulos : base.titulos,
    racasExtras: Array.isArray(ficha.racasExtras) ? ficha.racasExtras : base.racasExtras,
    status: { ...base.status, ...(ficha.status || {}) },
    atributos: { ...base.atributos, ...(ficha.atributos || {}) },
    pericias: { ...base.pericias, ...(ficha.pericias || {}) },
    periciaPrestigios: ficha.periciaPrestigios && typeof ficha.periciaPrestigios === "object" ? ficha.periciaPrestigios : {},
    recursos: { ...base.recursos, ...(ficha.recursos || {}) },
    inventarioCfg: { ...base.inventarioCfg, ...(ficha.inventarioCfg || {}), vastos: { ...base.inventarioCfg.vastos, ...(ficha.inventarioCfg?.vastos || {}) } },
    modificadores: { ...base.modificadores, ...(ficha.modificadores || {}) },
    inventario: Array.isArray(ficha.inventario) ? ficha.inventario.map((entry) => ({
      ...entry,
      id: entry?.id || uid(),
      item: normalizeItem(entry?.item || {}),
    })) : [],
  };
}


function normalizeSkillTag(tag = {}) {
  const base = novaSkillTag();
  return { ...base, ...tag, id: tag.id || base.id || uid() };
}

function normalizeSkill(skill = {}) {
  const base = novaSkill();
  const custos = Array.isArray(skill.custos)
    ? skill.custos.map((c) => ({ id: c.id || uid(), quantidade: Number(c.quantidade ?? c.valor ?? 0) || 0, codigo: String(c.codigo || c.tipo || ""), operador: c.operador || "e" }))
    : (skill.custoValor ? [{ id: uid(), quantidade: 0, codigo: String(skill.custoValor), operador: "e" }] : base.custos);

  return {
    ...base,
    ...skill,
    id: skill.id || base.id || uid(),
    tagIds: Array.isArray(skill.tagIds) ? skill.tagIds : base.tagIds,
    custos,
    custoCatalogo: Array.isArray(skill.custoCatalogo) && skill.custoCatalogo.length ? skill.custoCatalogo.map((c) => ({ ...c, id: c.id || uid(), textoCor: c.textoCor || (String(c.nome || "").toUpperCase() === "EST" ? "#111111" : "#ffffff") })) : base.custoCatalogo,
    geracao: Number(skill.geracao || base.geracao) || 1,
    essenciaAtribuida: skill.essenciaAtribuida || "Nenhuma",
    dono: typeof skill.dono === "string" ? skill.dono : (skill.donoValor || ""),
    rolagemTipo: skill.rolagemTipo || "Padrão",
    rolagemPericia: skill.rolagemPericia || "",
    rolagemAcao: skill.rolagemAcao || "Ataque",
    rolagemInstrucao: skill.rolagemInstrucao || "",
  };
}
function normalizeEffect(effect = {}) {
  const base = makeDefaultEffect();
  return {
    ...base,
    ...effect,
    id: effect.id || base.id || uid(),
    condicionais: Array.isArray(effect.condicionais) ? effect.condicionais : base.condicionais,
  };
}

export default function VasterraApp() {
  const [section, setSection] = useState("menu");
  const { toasts, confirm, pushToast, closeToast, confirmAction, cancelConfirm, runConfirm } = useFeedback();
  const [fichas, setFichas] = useState([]);
  const [arsenal, setArsenal] = useState([]);
  const [efeitosCaldeirao, setEfeitosCaldeirao] = useState([]);
  const [prestigios, setPrestigios] = useState({});
  const [bibliotecaSkills, setBibliotecaSkills] = useState([]);
  const [skillsTags, setSkillsTags] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [effectEditorOpen, setEffectEditorOpen] = useState(false);
  const [effectEditorData, setEffectEditorData] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [settingsTab, setSettingsTab] = useState("dados");

  useEffect(() => {
    (async () => {
      const cfg = (await stGet(SETTINGS_KEY)) || defaultSettings;
      const ns = cfg.storageNamespace || "vasterra";
      setSettings({ ...defaultSettings, ...cfg });

      const f = await stGet(scopedKey(ns, "fichas"));
      const a = await stGet(scopedKey(ns, "arsenal"));
      const c = await stGet(scopedKey(ns, "caldeirao"));
      const p = await stGet(scopedKey(ns, "prestigios"));
      const b = await stGet(scopedKey(ns, "biblioteca"));
      const t = await stGet(scopedKey(ns, "skilltags"));

      const fLegacy = !f ? await stGet("vasterra:fichas") : null;
      const aLegacy = !a ? await stGet("vasterra:arsenal") : null;
      const cLegacy = !c ? await stGet("vasterra:caldeirao") : null;
      const pLegacy = !p ? await stGet("vasterra:prestigios") : null;
      const bLegacy = !b ? await stGet("vasterra:biblioteca") : null;
      const tLegacy = !t ? await stGet("vasterra:skilltags") : null;

      const fichasLoaded = (f || fLegacy || []).map(normalizeFicha);
      const arsenalLoaded = (a || aLegacy || []).map(normalizeItem);
      const efeitosLoaded = (c || cLegacy || []).map(normalizeEffect);
      const prestigiosLoaded = p || pLegacy || {};
      const bibliotecaLoaded = (b || bLegacy || []).map(normalizeSkill);
      const tagsLoaded = (t || tLegacy || []).map(normalizeSkillTag);

      setFichas(fichasLoaded);
      setArsenal(arsenalLoaded);
      setEfeitosCaldeirao(efeitosLoaded);
      setPrestigios(prestigiosLoaded);
      setBibliotecaSkills(bibliotecaLoaded);
      setSkillsTags(tagsLoaded);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) stSet(scopedKey(settings.storageNamespace, "fichas"), fichas); }, [fichas, loaded, settings.storageNamespace]);
  useEffect(() => { if (loaded) stSet(scopedKey(settings.storageNamespace, "arsenal"), arsenal); }, [arsenal, loaded, settings.storageNamespace]);
  useEffect(() => { if (loaded) stSet(scopedKey(settings.storageNamespace, "caldeirao"), efeitosCaldeirao); }, [efeitosCaldeirao, loaded, settings.storageNamespace]);
  useEffect(() => { if (loaded) stSet(scopedKey(settings.storageNamespace, "prestigios"), prestigios); }, [prestigios, loaded, settings.storageNamespace]);
  useEffect(() => { if (loaded) stSet(scopedKey(settings.storageNamespace, "biblioteca"), bibliotecaSkills); }, [bibliotecaSkills, loaded, settings.storageNamespace]);
  useEffect(() => { if (loaded) stSet(scopedKey(settings.storageNamespace, "skilltags"), skillsTags); }, [skillsTags, loaded, settings.storageNamespace]);
  useEffect(() => { if (loaded) stSet(SETTINGS_KEY, settings); }, [settings, loaded]);

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

  const exportBackup = () => {
    const payload = {
      version: 1,
      exportedAt: Date.now(),
      namespace: settings.storageNamespace,
      fichas,
      arsenal,
      efeitosCaldeirao,
      prestigios,
      bibliotecaSkills,
      skillsTags,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vasterra-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || "{}"));
        setFichas((data.fichas || []).map(normalizeFicha));
        setArsenal((data.arsenal || []).map(normalizeItem));
        setEfeitosCaldeirao((data.efeitosCaldeirao || []).map(normalizeEffect));
        setPrestigios(data.prestigios || {});
        setBibliotecaSkills((data.bibliotecaSkills || []).map(normalizeSkill));
        setSkillsTags((data.skillsTags || []).map(normalizeSkillTag));
        pushToast("Backup importado com sucesso.", "success");
      } catch {
        pushToast("Falha ao importar backup.", "error");
      }
    };
    reader.readAsText(file);
  };

  const applyNamespace = async (nsValue) => {
    const ns = (nsValue || "vasterra").trim() || "vasterra";
    const f = await stGet(scopedKey(ns, "fichas"));
    const a = await stGet(scopedKey(ns, "arsenal"));
    const c = await stGet(scopedKey(ns, "caldeirao"));
    const p = await stGet(scopedKey(ns, "prestigios"));
    const b = await stGet(scopedKey(ns, "biblioteca"));
    const t = await stGet(scopedKey(ns, "skilltags"));
    setSettings((p) => ({ ...p, storageNamespace: ns }));
    setFichas((f || []).map(normalizeFicha));
    setArsenal((a || []).map(normalizeItem));
    setEfeitosCaldeirao((c || []).map(normalizeEffect));
    setPrestigios(p || {});
    setBibliotecaSkills((b || []).map(normalizeSkill));
    setSkillsTags((t || []).map(normalizeSkillTag));
    pushToast(`Espaço de dados alterado para: ${ns}`, "success");
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
        {[{ id: "fichas", label: "FICHAS" }, { id: "arsenal", label: "ARSENAL" }, { id: "biblioteca", label: "BIBLIOTECA" }, { id: "caldeirao", label: "CALDEIRÃO" }, { id: "vasto", label: "VASTO" }].map((s) => (
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
          {fichas.length} fichas · {arsenal.length} itens · {bibliotecaSkills.length} skills · {efeitosCaldeirao.length} efeitos · {Object.keys(prestigios || {}).length} prestígios · {skillsTags.length} tags
        </div>
      </div>

      {section === "menu" && (
        <div onClick={() => setSection("fichas")} style={{ position: "relative", minHeight: "calc(100vh - 54px)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <BackgroundParticles />
          <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 56, color: G.gold, letterSpacing: 8, textShadow: "0 0 20px #c8a96e66", zIndex: 1 }}>VASTERRA</div>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color: "#7aa9d8", letterSpacing: 4, zIndex: 1 }}>Vasterra é Vasto</div>
          <div style={{ marginTop: 16, fontFamily: "monospace", color: "#777", zIndex: 1 }}>Clique em qualquer lugar para entrar</div>
          <button onClick={(ev) => { ev.stopPropagation(); setSettingsOpen(true); }} style={{ position: "absolute", top: 14, right: 14, width: 30, height: 30, borderRadius: 8, border: "1px solid #c8a96e33", background: "#0b0b0baa", color: "#c8a96e", cursor: "pointer", transition: "all .2s" }} title="Opções">⚙</button>
        </div>
      )}
      {section === "fichas" && <div className="v-fade"><FichasSection fichas={fichas} onFichas={setFichas} arsenal={arsenal} efeitosCaldeirao={efeitosCaldeirao} prestigios={prestigios} onArsenal={setArsenal} onNotify={pushToast} onConfirmAction={confirmAction} onOpenCaldeirao={openEffectForge} createNodeHotkey={settings.controls?.createNodeHotkey || "a"} /></div>}
      {section === "arsenal" && <div className="v-fade"><ArsenalSection arsenal={arsenal} efeitosCaldeirao={efeitosCaldeirao} onEfeitosCaldeirao={setEfeitosCaldeirao} onArsenal={setArsenal} onNotify={pushToast} onConfirmAction={confirmAction} onOpenCaldeirao={openEffectForge} onEditCaldeirao={openEffectForge} /></div>}
      {section === "biblioteca" && <div className="v-fade"><BibliotecaSection skills={bibliotecaSkills} tags={skillsTags} onSkills={setBibliotecaSkills} onNotify={pushToast} onConfirmAction={confirmAction} /></div>}
      {section === "caldeirao" && <div className="v-fade"><CaldeiraoSection efeitos={efeitosCaldeirao} onEfeitos={setEfeitosCaldeirao} onNotify={pushToast} onConfirmAction={confirmAction} /></div>}
      {section === "vasto" && <div className="v-fade"><VastoSection prestigios={prestigios} onPrestigios={setPrestigios} skillTags={skillsTags} onSkillTags={setSkillsTags} onNotify={pushToast} createNodeHotkey={settings.controls?.createNodeHotkey || "a"} linkModeHotkey={settings.controls?.linkModeHotkey || "l"} /></div>}

      <ToastViewport items={toasts} onClose={closeToast} />
      <ConfirmWindow data={confirm} onCancel={cancelConfirm} onConfirm={runConfirm} />
      {effectEditorOpen && <EffectForgeEditor effect={effectEditorData} onSave={saveEffectFromModal} onClose={() => setEffectEditorOpen(false)} />}
      {settingsOpen && (
        <Modal title="Opções" onClose={() => setSettingsOpen(false)} wide>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 6, borderBottom: "1px solid #252525", paddingBottom: 8 }}>
              <HoverButton onClick={() => setSettingsTab("dados")} style={{ borderColor: settingsTab === "dados" ? "#5dade266" : undefined, color: settingsTab === "dados" ? "#b6ddff" : undefined }}>Dados</HoverButton>
              <HoverButton onClick={() => setSettingsTab("controles")} style={{ borderColor: settingsTab === "controles" ? "#5dade266" : undefined, color: settingsTab === "controles" ? "#b6ddff" : undefined }}>Configurar Controles</HoverButton>
            </div>

            {settingsTab === "dados" && (
              <>
                <div style={{ fontFamily: "monospace", fontSize: 11, color: G.muted }}>
                  Dica: no navegador não há acesso direto a diretórios do sistema por segurança.
                  Em vez disso, use “espaço de dados” (namespace) + backup/importação JSON.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                  <input value={settings.storageNamespace || "vasterra"} onChange={(e) => setSettings((p) => ({ ...p, storageNamespace: e.target.value }))} placeholder="Namespace de dados" style={{ background: "#0a0a0a", border: "1px solid #333", color: G.text, borderRadius: 8, padding: "8px 10px" }} />
                  <HoverButton onClick={() => applyNamespace(settings.storageNamespace)}>Aplicar</HoverButton>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <HoverButton onClick={exportBackup}>Exportar backup (.json)</HoverButton>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid #3498db44", borderRadius: 8, padding: "6px 10px", color: "#73bfff", cursor: "pointer" }}>
                    Importar backup
                    <input type="file" accept="application/json" onChange={(e) => importBackup(e.target.files?.[0])} style={{ display: "none" }} />
                  </label>
                </div>
              </>
            )}

            {settingsTab === "controles" && (
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontFamily: "monospace", fontSize: 11, color: G.muted }}>Atalho para criar nós no canvas de combate</label>
                <input
                  value={settings.controls?.createNodeHotkey || "a"}
                  maxLength={1}
                  onChange={(e) => {
                    const val = String(e.target.value || "a").slice(-1).toLowerCase().replace(/[^a-z0-9]/g, "") || "a";
                    setSettings((p) => ({ ...p, controls: { ...(p.controls || {}), createNodeHotkey: val } }));
                  }}
                  placeholder="Ex: a"
                  style={{ background: "#0a0a0a", border: "1px solid #333", color: G.text, borderRadius: 8, padding: "8px 10px", width: 120, textTransform: "uppercase" }}
                />
                <div style={{ fontFamily: "monospace", fontSize: 11, color: G.muted }}>
                  Atalho atual: {String(settings.controls?.createNodeHotkey || "a").toUpperCase()}.
                </div>
                <label style={{ fontFamily: "monospace", fontSize: 11, color: G.muted }}>Atalho para entrar/sair do modo Link no Criador de Prestígios</label>
                <input
                  value={settings.controls?.linkModeHotkey || "l"}
                  maxLength={1}
                  onChange={(e) => {
                    const val = String(e.target.value || "l").slice(-1).toLowerCase().replace(/[^a-z0-9]/g, "") || "l";
                    setSettings((p) => ({ ...p, controls: { ...(p.controls || {}), linkModeHotkey: val } }));
                  }}
                  placeholder="Ex: l"
                  style={{ background: "#0a0a0a", border: "1px solid #333", color: G.text, borderRadius: 8, padding: "8px 10px", width: 120, textTransform: "uppercase" }}
                />
                <div style={{ fontFamily: "monospace", fontSize: 11, color: G.muted }}>
                  Atalho modo Link: {String(settings.controls?.linkModeHotkey || "l").toUpperCase()}.
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
