import React, { useEffect, useState } from "react";
import { resolverNomeRaca } from "../../data/gameData";
import { uid, novaFicha } from "../../core/factories";
import { G, inpStyle, btnStyle } from "../../ui/theme";
import { HoverButton } from "../../components/primitives/Interactive";
import { FichaCardInventory, getFichaTitulos } from "../../components/fichas/FichaCardInventory";
import { Modal } from "../shared/components";
import { TabStatus } from "./tabs/TabStatus";
import { TabAtributos } from "./tabs/TabAtributos";
import { TabIdentidade } from "./tabs/TabIdentidade";
import { TabEssencia } from "./tabs/TabEssencia";
import { TabInventario } from "./tabs/TabInventario";
import { TabCombate } from "./tabs/TabCombate";
import { TabCorpo } from "./tabs/TabCorpo";
import { TabSkills } from "./tabs/TabSkills";

export const FICHA_TABS = [
  { id: "status",     label: "Informações" },
  { id: "combate",    label: "Combate" },
  { id: "corpo",      label: "Corpo" },
  { id: "atributos",  label: "Atributos & Perícias" },
  { id: "identidade", label: "Identidade" },
  { id: "essencia",   label: "Essência" },
  { id: "inventario", label: "Inventário" },
  { id: "skills", label: "Skills" },
];

export function FichasSection({ fichas, onFichas, arsenal, efeitosCaldeirao = [], prestigios = {}, bibliotecaSkills = [], skillTags = [], onBibliotecaSkills, onArsenal, onNotify, onConfirmAction, onOpenCaldeirao, createNodeHotkey = "a" }) {
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("status");
  const [createOpen, setCreate] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [focusFicha, setFocusFicha] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState([]);
  const [filters, setFilters] = useState({ tempo: "all", essencia: "all", classe: "all", raca: "all" });
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 768 : false));
  const [tabsCollapsed, setTabsCollapsed] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("vasterra_mobile_tabs_collapsed") !== "false";
  });

  useEffect(() => {
    const updateMobile = () => setIsMobile(window.innerWidth <= 768);
    updateMobile();
    window.addEventListener("resize", updateMobile);
    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setTabsCollapsed(false);
      return;
    }
    const saved = window.localStorage.getItem("vasterra_mobile_tabs_collapsed");
    if (saved == null) return;
    setTabsCollapsed(saved !== "false");
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    window.localStorage.setItem("vasterra_mobile_tabs_collapsed", String(tabsCollapsed));
  }, [isMobile, tabsCollapsed]);

  const classesDisponiveis = [...new Set(fichas.flatMap((f) => f.classes || []))].sort();
  const essenciasDisponiveis = [...new Set(fichas.map((f) => f.essencia?.nome).filter(Boolean))].sort();
  const racasDisponiveis = [...new Set(fichas.map((f) => resolverNomeRaca(f.raca, f.racasExtras || [])))].sort();

  const ficha = fichas.find((f) => f.id === sel) || null;

  const updateFicha = (partial) => {
    onFichas((prev) => (prev || []).map((f) => (f.id === sel ? Object.assign({}, f, partial, { atualizado: Date.now() }) : f)));
  };

  const criar = () => {
    const f = novaFicha(newNome || "Novo Personagem");
    f.titulos = ["Aventureiro"];
    f.tituloSelecionado = "Aventureiro";
    onFichas([f, ...fichas]);
    setSel(f.id);
    setFocusFicha(true);
    setCreate(false);
    setNewNome("");
    onNotify?.(`Ficha criada: ${f.nome}`, "success");
  };

  const duplicarFicha = (f) => {
    const titulos = getFichaTitulos(f);
    const n = Object.assign({}, f, {
      id: uid(),
      nome: f.nome + " (cópia)",
      titulos,
      tituloSelecionado: f.tituloSelecionado || titulos[0] || "",
      criado: Date.now(),
      atualizado: Date.now(),
    });
    onFichas([n, ...fichas]);
    onNotify?.(`Ficha duplicada: ${f.nome}`, "success");
  };

  const apagar = (ids) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    onFichas(fichas.filter((x) => !idList.includes(x.id)));
    if (idList.includes(sel)) setSel(null);
    setSelectedForDelete([]);
    setDeleteMode(false);
    onNotify?.(idList.length > 1 ? `${idList.length} fichas apagadas.` : "Ficha apagada.", "info");
  };

  const filtered = fichas
    .filter((f) => {
      if (search) {
        const pool = [
          f.nome,
          resolverNomeRaca(f.raca, f.racasExtras || []),
          ...(f.classes || []),
          ...(getFichaTitulos(f)),
          f.tituloSelecionado || "",
          f.essencia?.nome || "",
        ]
          .join(" ")
          .toLowerCase();
        if (!pool.includes(search.toLowerCase())) return false;
      }
      if (filters.essencia !== "all" && (f.essencia?.nome || "") !== filters.essencia) return false;
      if (filters.classe !== "all" && !(f.classes || []).includes(filters.classe)) return false;
      if (filters.raca !== "all" && resolverNomeRaca(f.raca, f.racasExtras || []) !== filters.raca) return false;
      return true;
    })
    .sort((a, b) => {
      if (filters.tempo === "recent") return (b.atualizado || 0) - (a.atualizado || 0);
      if (filters.tempo === "old") return (a.atualizado || 0) - (b.atualizado || 0);
      return (b.atualizado || 0) - (a.atualizado || 0);
    });

  if (!focusFicha) {
    return (
      <>
        <FichaCardInventory
          fichas={filtered}
          selectedId={sel}
          search={search}
          onSearch={setSearch}
          filters={{ ...filters, classesDisponiveis, essenciasDisponiveis, racasDisponiveis }}
          onFilter={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
          deleteMode={deleteMode}
          selectedForDelete={selectedForDelete}
          onToggleDeleteMode={() => {
            setDeleteMode((d) => !d);
            setSelectedForDelete([]);
          }}
          onToggleDeleteSelection={(id) => setSelectedForDelete((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))}
          onCreate={() => setCreate(true)}
          onDuplicate={() => {
            if (!sel) {
              onNotify?.("Selecione uma carta para duplicar.", "info");
              return;
            }
            const alvo = fichas.find((f) => f.id === sel);
            if (alvo) duplicarFicha(alvo);
          }}
          onDeleteSelected={() => {
            if (!deleteMode) {
              setDeleteMode(true);
              return;
            }
            if (selectedForDelete.length === 0) {
              onNotify?.("Selecione ao menos uma carta para apagar.", "info");
              return;
            }
            onConfirmAction?.({
              title: "Apagar cartas",
              message: `Deseja apagar ${selectedForDelete.length} ficha(s)?`,
              onConfirm: () => apagar(selectedForDelete),
            });
          }}
          onSelect={(id) => {
            setSel(id);
            setFocusFicha(true);
          }}
        />
        {createOpen && (
          <Modal title="◈ Nova Ficha de Personagem" onClose={() => { if (newNome.trim() && !window.confirm("Descartar criação da ficha?")) return; setCreate(false); }}>
            <label style={{ color: G.muted, fontFamily: "monospace", fontSize: 12, display: "block", marginBottom: 6 }}>Nome do personagem</label>
            <input
              value={newNome}
              onChange={(e) => setNewNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && criar()}
              placeholder="Ex: Alaric von Grave..."
              style={Object.assign({}, inpStyle(), { fontSize: 16, marginBottom: 16 })}
              autoFocus
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={btnStyle({ background: "transparent", border: "1px solid #333", color: G.muted })} onClick={() => { if (newNome.trim() && !window.confirm("Descartar criação da ficha?")) return; setCreate(false); }}>Cancelar</button>
              <button style={btnStyle()} onClick={criar}>Criar Personagem</button>
            </div>
          </Modal>
        )}
      </>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 54px)" }}>
      <div style={{ padding: "10px 16px 0" }}>
        <HoverButton style={btnStyle({ padding: "4px 10px" })} onClick={() => { setFocusFicha(false); setDeleteMode(false); setSelectedForDelete([]); }}>
          ← Voltar para fichas
        </HoverButton>
      </div>
      {!ficha && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: G.muted, fontStyle: "italic", fontSize: 16 }}>
          Selecione ou crie uma ficha
        </div>
      )}
      {ficha && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: isMobile ? "auto" : "hidden" }}>
          <div style={{ padding: isMobile ? "8px 10px" : "10px 20px", borderBottom: "1px solid " + G.border, background: G.bg2, display: "flex", alignItems: "center", gap: isMobile ? 6 : 12, flexShrink: 0 }}>
            <div style={{ flex: 1 }}>
              <input
                value={ficha.nome}
                onChange={(e) => updateFicha({ nome: e.target.value })}
                style={{ background: "transparent", border: "none", outline: "none", fontFamily: "'Cinzel',serif", fontSize: isMobile ? 16 : 20, color: G.gold2, width: "100%" }}
              />
              <div style={{ fontSize: isMobile ? 10 : 11, color: G.muted, fontFamily: "monospace" }}>
                {resolverNomeRaca(ficha.raca, ficha.racasExtras || [])}
                {ficha.classes.length > 0 ? " · " + ficha.classes.join(" / ") : ""}
                {ficha.essencia ? " · " + ficha.essencia.nome : ""}
              </div>
            </div>
            <button onClick={() => duplicarFicha(ficha)} style={btnStyle({ borderColor: "#3498db55", color: "#61b8ff", padding: isMobile ? "4px 8px" : undefined, fontSize: isMobile ? 10 : undefined })}>{isMobile ? "Dup" : "Duplicar"}</button>
            <button
              onClick={() => onConfirmAction?.({ title: "Apagar ficha", message: `Deseja apagar "${ficha.nome}"?`, onConfirm: () => apagar(ficha.id) })}
              style={btnStyle({ borderColor: "#e74c3c55", color: "#ff6b5f", padding: isMobile ? "4px 8px" : undefined, fontSize: isMobile ? 10 : undefined })}
            >{isMobile ? "Del" : "Apagar"}</button>
            {ficha.essencia && (
              <div style={{ padding: isMobile ? "3px 8px" : "5px 12px", borderRadius: 6, background: ficha.essencia.cor + "22", border: "1px solid " + ficha.essencia.cor + "55", color: ficha.essencia.cor, fontFamily: "'Cinzel',serif", fontSize: isMobile ? 9 : 10, letterSpacing: 1 }}>
                ⬡ {ficha.essencia.nome}
              </div>
            )}
          </div>

          <div style={{ borderBottom: "1px solid " + G.border, background: G.bg2, flexShrink: 0 }}>
            {isMobile && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px" }}>
                <span style={{ color: G.muted, fontFamily: "monospace", fontSize: 11 }}>Aba ativa: {FICHA_TABS.find((t) => t.id === tab)?.label || tab}</span>
                <HoverButton onClick={() => setTabsCollapsed((prev) => !prev)} style={btnStyle({ padding: "3px 8px", fontSize: 10 })}>
                  {tabsCollapsed ? "Mostrar abas" : "Ocultar abas"}
                </HoverButton>
              </div>
            )}
            {!tabsCollapsed && (
              <div style={isMobile ? { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 4, padding: "0 8px 8px" } : { display: "flex", overflowX: "auto" }}>
                {FICHA_TABS.map((t) => (
                  <button
                    className="v-tab-btn"
                    key={t.id}
                    onClick={() => {
                      setTab(t.id);
                    }}
                    style={{
                      padding: isMobile ? "8px 6px" : "10px 16px",
                      background: "transparent",
                      borderBottom: tab === t.id ? "2px solid #c8a96e" : "2px solid transparent",
                      color: tab === t.id ? G.gold : G.muted,
                      fontFamily: "'Cinzel',serif",
                      fontSize: isMobile ? 10 : 11,
                      letterSpacing: 1,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      textAlign: "center",
                      borderRadius: isMobile ? 6 : 0,
                      border: isMobile ? `1px solid ${tab === t.id ? "#c8a96e88" : "#2a2a2a"}` : "none",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="v-fade" style={{ flex: 1, overflow: isMobile ? "visible" : "auto", padding: isMobile ? 10 : 16 }}>
            {tab === "status" && <TabStatus ficha={ficha} onUpdate={updateFicha} arsenal={arsenal} />}
            {tab === "combate" && <TabCombate ficha={ficha} onUpdate={updateFicha} efeitosCaldeirao={efeitosCaldeirao} skillTags={skillTags} onOpenCaldeirao={onOpenCaldeirao} onNotify={onNotify} createNodeHotkey={createNodeHotkey} />}
            {tab === "corpo" && <TabCorpo ficha={ficha} onUpdate={updateFicha} onNotify={onNotify} />}
            {tab === "atributos" && <TabAtributos ficha={ficha} onUpdate={updateFicha} arsenal={arsenal} prestigios={prestigios} efeitosCaldeirao={efeitosCaldeirao} onOpenCaldeirao={onOpenCaldeirao} inventarioNomes={(ficha.inventario || []).map((e) => e.item?.nome).filter(Boolean)} />}
            {tab === "identidade" && <TabIdentidade ficha={ficha} onUpdate={updateFicha} />}
            {tab === "essencia" && <TabEssencia ficha={ficha} onUpdate={updateFicha} />}
            {tab === "inventario" && <TabInventario ficha={ficha} onUpdate={updateFicha} arsenal={arsenal} efeitosCaldeirao={efeitosCaldeirao} onArsenal={onArsenal} onNotify={onNotify} onConfirmAction={onConfirmAction} onOpenCaldeirao={onOpenCaldeirao} />}
            {tab === "skills" && <TabSkills
              ficha={ficha}
              onUpdate={updateFicha}
              bibliotecaSkills={bibliotecaSkills}
              skillTags={skillTags}
              onNotify={onNotify}
              onConfirmAction={onConfirmAction}
              onExportToBiblioteca={(skill) => onBibliotecaSkills?.([skill, ...(bibliotecaSkills || [])])}
              onLinkBibliotecaChange={(entry) => {
                if (!entry?.sourceSkillId) return;
                onBibliotecaSkills?.((bibliotecaSkills || []).map((s) => (s.id === entry.sourceSkillId ? { ...(entry.effectiveSkill || entry.skill), id: s.id, atualizado: Date.now() } : s)));
              }}
            />}
          </div>
        </div>
      )}
    </div>
  );
}
