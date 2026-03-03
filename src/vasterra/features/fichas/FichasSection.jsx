import React, { useState } from "react";
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

export const FICHA_TABS = [
  { id: "status",     label: "Informações" },
  { id: "combate",    label: "Combate" },
  { id: "corpo",      label: "Corpo" },
  { id: "atributos",  label: "Atributos & Perícias" },
  { id: "identidade", label: "Identidade" },
  { id: "essencia",   label: "Essência" },
  { id: "inventario", label: "Inventário" },
];

export function FichasSection({ fichas, onFichas, arsenal, efeitosCaldeirao = [], onArsenal, onNotify, onConfirmAction, onOpenCaldeirao }) {
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("status");
  const [createOpen, setCreate] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [focusFicha, setFocusFicha] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState([]);
  const [filters, setFilters] = useState({ tempo: "all", essencia: "all", classe: "all", raca: "all" });

  const classesDisponiveis = [...new Set(fichas.flatMap((f) => f.classes || []))].sort();
  const essenciasDisponiveis = [...new Set(fichas.map((f) => f.essencia?.nome).filter(Boolean))].sort();
  const racasDisponiveis = [...new Set(fichas.map((f) => resolverNomeRaca(f.raca, f.racasExtras || [])))].sort();

  const ficha = fichas.find((f) => f.id === sel) || null;

  const updateFicha = (partial) => {
    onFichas(fichas.map((f) => (f.id === sel ? Object.assign({}, f, partial, { atualizado: Date.now() }) : f)));
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
        <>
          <div style={{ padding: "10px 20px", borderBottom: "1px solid " + G.border, background: G.bg2, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div style={{ flex: 1 }}>
              <input
                value={ficha.nome}
                onChange={(e) => updateFicha({ nome: e.target.value })}
                style={{ background: "transparent", border: "none", outline: "none", fontFamily: "'Cinzel',serif", fontSize: 20, color: G.gold2, width: "100%" }}
              />
              <div style={{ fontSize: 11, color: G.muted, fontFamily: "monospace" }}>
                {resolverNomeRaca(ficha.raca, ficha.racasExtras || [])}
                {ficha.classes.length > 0 ? " · " + ficha.classes.join(" / ") : ""}
                {ficha.essencia ? " · " + ficha.essencia.nome : ""}
              </div>
            </div>
            <button onClick={() => duplicarFicha(ficha)} style={btnStyle({ borderColor: "#3498db55", color: "#61b8ff" })}>Duplicar</button>
            <button
              onClick={() => onConfirmAction?.({ title: "Apagar ficha", message: `Deseja apagar "${ficha.nome}"?`, onConfirm: () => apagar(ficha.id) })}
              style={btnStyle({ borderColor: "#e74c3c55", color: "#ff6b5f" })}
            >Apagar</button>
            {ficha.essencia && (
              <div style={{ padding: "5px 12px", borderRadius: 6, background: ficha.essencia.cor + "22", border: "1px solid " + ficha.essencia.cor + "55", color: ficha.essencia.cor, fontFamily: "'Cinzel',serif", fontSize: 10, letterSpacing: 1 }}>
                ⬡ {ficha.essencia.nome}
              </div>
            )}
          </div>

          <div style={{ display: "flex", borderBottom: "1px solid " + G.border, background: G.bg2, flexShrink: 0, overflowX: "auto" }}>
            {FICHA_TABS.map((t) => (
              <button
                className="v-tab-btn"
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "10px 16px",
                  background: "transparent",
                  border: "none",
                  borderBottom: tab === t.id ? "2px solid #c8a96e" : "2px solid transparent",
                  color: tab === t.id ? G.gold : G.muted,
                  fontFamily: "'Cinzel',serif",
                  fontSize: 11,
                  letterSpacing: 1,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="v-fade" style={{ flex: 1, overflow: "auto", padding: 16 }}>
            {tab === "status" && <TabStatus ficha={ficha} onUpdate={updateFicha} arsenal={arsenal} />}
            {tab === "combate" && <TabCombate ficha={ficha} onUpdate={updateFicha} efeitosCaldeirao={efeitosCaldeirao} onOpenCaldeirao={onOpenCaldeirao} onNotify={onNotify} />}
            {tab === "corpo" && <TabCorpo ficha={ficha} onUpdate={updateFicha} onNotify={onNotify} />}
            {tab === "atributos" && <TabAtributos ficha={ficha} onUpdate={updateFicha} arsenal={arsenal} efeitosCaldeirao={efeitosCaldeirao} onOpenCaldeirao={onOpenCaldeirao} inventarioNomes={(ficha.inventario || []).map((e) => e.item?.nome).filter(Boolean)} />}
            {tab === "identidade" && <TabIdentidade ficha={ficha} onUpdate={updateFicha} />}
            {tab === "essencia" && <TabEssencia ficha={ficha} onUpdate={updateFicha} />}
            {tab === "inventario" && <TabInventario ficha={ficha} onUpdate={updateFicha} arsenal={arsenal} efeitosCaldeirao={efeitosCaldeirao} onArsenal={onArsenal} onNotify={onNotify} onConfirmAction={onConfirmAction} onOpenCaldeirao={onOpenCaldeirao} />}
          </div>
        </>
      )}
    </div>
  );
}
