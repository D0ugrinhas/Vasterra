import React from "react";
import { G, btnStyle, inpStyle } from "../../ui/theme";
import { resolverNomeRaca } from "../../data/gameData";

const CARD_COLUMNS = "repeat(8, minmax(150px, 1fr))";

const CardTag = ({ children }) => (
  <span
    style={{
      padding: "2px 8px",
      borderRadius: 14,
      border: "1px solid #2a2a2a",
      background: "#0a0a0a",
      color: G.muted,
      fontFamily: "monospace",
      fontSize: 10,
    }}
  >
    {children}
  </span>
);

export const getFichaTitulos = (ficha) => {
  if (Array.isArray(ficha.titulos) && ficha.titulos.length > 0) return ficha.titulos;
  if (ficha.tituloSelecionado) return [ficha.tituloSelecionado];
  return [];
};

export function FichaCardInventory({
  fichas,
  selectedId,
  search,
  onSearch,
  filters,
  onFilter,
  deleteMode,
  selectedForDelete,
  onToggleDeleteMode,
  onToggleDeleteSelection,
  onCreate,
  onDuplicate,
  onDeleteSelected,
  onSelect,
}) {
  return (
    <div
      style={{
        position: "relative",
        height: "calc(100vh - 54px)",
        overflow: "hidden",
        background: "radial-gradient(circle at 20% 10%, #1a1208 0%, #060606 35%, #030303 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "linear-gradient(rgba(200,169,110,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(200,169,110,0.04) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", padding: 14, display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr repeat(4, minmax(140px, 1fr)) auto auto auto", gap: 8, marginBottom: 12 }}>
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Pesquisar cartas..."
            style={inpStyle()}
          />
          <select value={filters.tempo} onChange={(e) => onFilter("tempo", e.target.value)} style={inpStyle()}>
            <option value="all">Tempo: todos</option>
            <option value="recent">Atualizados recentemente</option>
            <option value="old">Mais antigos</option>
          </select>
          <select value={filters.essencia} onChange={(e) => onFilter("essencia", e.target.value)} style={inpStyle()}>
            <option value="all">Essência: todas</option>
            {filters.essenciasDisponiveis.map((ess) => <option key={ess} value={ess}>{ess}</option>)}
          </select>
          <select value={filters.classe} onChange={(e) => onFilter("classe", e.target.value)} style={inpStyle()}>
            <option value="all">Classe: todas</option>
            {filters.classesDisponiveis.map((classe) => <option key={classe} value={classe}>{classe}</option>)}
          </select>
          <select value={filters.raca} onChange={(e) => onFilter("raca", e.target.value)} style={inpStyle()}>
            <option value="all">Raça: todas</option>
            {filters.racasDisponiveis.map((raca) => <option key={raca} value={raca}>{raca}</option>)}
          </select>
          <button onClick={onCreate} style={btnStyle({ whiteSpace: "nowrap" })}>+ Nova Carta</button>
          <button onClick={onDuplicate} style={btnStyle({ whiteSpace: "nowrap", borderColor: "#3498db55", color: "#61b8ff" })}>Duplicar</button>
          <button
            onClick={deleteMode ? onToggleDeleteMode : onDeleteSelected}
            style={btnStyle({ whiteSpace: "nowrap", borderColor: "#e74c3c55", color: "#ff6b5f" })}
          >
            {deleteMode ? "Modo normal" : "Apagar"}
          </button>
        </div>

        {deleteMode && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ color: G.muted, fontFamily: "monospace", fontSize: 11 }}>{selectedForDelete.length} selecionada(s)</span>
            <button onClick={onDeleteSelected} style={btnStyle({ borderColor: "#e74c3c55", color: "#ff6b5f" })}>Confirmar exclusão</button>
          </div>
        )}

        <div style={{ overflow: "auto", paddingBottom: 8, flex: 1 }}>
          <div style={{ minWidth: 1280, display: "grid", gridTemplateColumns: CARD_COLUMNS, gap: 10 }}>
            {fichas.map((ficha) => {
              const selected = selectedId === ficha.id;
              const markedForDelete = selectedForDelete.includes(ficha.id);
              const titulo = ficha.tituloSelecionado || getFichaTitulos(ficha)[0] || "Sem título";
              const classes = ficha.classes || [];
              const raca = resolverNomeRaca(ficha.raca, ficha.racasExtras || []);
              return (
                <div
                  key={ficha.id}
                  onClick={() => deleteMode ? onToggleDeleteSelection(ficha.id) : onSelect(ficha.id)}
                  style={{
                    border: `1px solid ${markedForDelete ? "#e74c3c" : selected ? "#c8a96e" : "#2a2a2a"}`,
                    borderRadius: 10,
                    background: "var(--vasterra-card-bg, #070707)",
                    cursor: "pointer",
                    overflow: "hidden",
                    boxShadow: selected ? "0 0 14px #c8a96e55" : "none",
                  }}
                >
                  <div
                    style={{
                      height: 160,
                      background: "linear-gradient(135deg, #141414 0%, #0a0a0a 45%, #121212 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 46,
                      color: "#c8a96e66",
                      fontFamily: "'Cinzel', serif",
                    }}
                  >
                    ?
                  </div>
                  <div style={{ padding: 8, borderTop: "1px solid #1f1f1f" }}>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold2, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ficha.nome}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      <CardTag>{titulo}</CardTag>
                      {classes[0] && <CardTag>{classes[0]}</CardTag>}
                      <CardTag>{raca}</CardTag>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {fichas.length === 0 && <div style={{ textAlign: "center", color: G.muted, padding: 40 }}>Nenhuma carta encontrada com os filtros atuais.</div>}
        </div>
      </div>
    </div>
  );
}
