import React, { useMemo, useState } from "react";
import { uid } from "../../core/factories";
import { ARSENAL_RANKS, ESSENCIAS_VIRTUDES, ESSENCIAS_PECADOS, PERICIAS_GRUPOS } from "../../data/gameData";
import { G, inpStyle, btnStyle } from "../../ui/theme";
import { Modal } from "../shared/components";
import { ImageAttachModal, ImageViewport } from "../../components/media/ImageAttachModal";

const allEssencias = [...ESSENCIAS_VIRTUDES, ...ESSENCIAS_PECADOS];
const RESIST_RESULTADOS = ["Evitar", "Reduzir pela metade", "Efeito Contrário", "Outro"];
const ALVOS_OPCOES = ["Portador", "Alvo", "Área", "Condição", "Todos"];
const allPericias = PERICIAS_GRUPOS.flatMap((g) => g.list);
const BODY_PART_OPTIONS = ["saude", "ossos", "musculos", "pele"];

const newConditional = () => ({ id: uid(), ativo: true, condicao: "", efeito: "" });

const normalizeConditional = (c) => {
  if (!c) return newConditional();
  if (typeof c.condicao === "string" || typeof c.efeito === "string") {
    return {
      id: c.id || uid(),
      ativo: c.ativo !== false,
      condicao: c.condicao || "",
      efeito: c.efeito || "",
    };
  }
  return {
    id: c.id || uid(),
    ativo: c.ativo !== false,
    condicao: "",
    efeito: c.texto || "",
  };
};

const newEffect = () => ({
  id: uid(),
  tipo: "Buff",
  nome: "",
  descricao: "",
  duracao: "",
  eterno: false,
  removivel: false,
  condicaoRemocao: "",
  essenciaAtribuida: "",
  rank: "Comum",
  efeitoMecanico: "",
  efeitosMecanicos: [],
  iconeModo: "emoji",
  icone: "⚗️",
  iconeUrl: "",
  iconeData: "",
  cor: "#7f8c8d",
  frase: "",
  alvo: "Portador",
  alvoCondicao: "",
  testeResistenciaPericia: "",
  testeResistenciaSucesso: "Evitar",
  testeResistenciaSucessoOutro: "",
  condicionais: [newConditional()],
  criado: Date.now(),
});

export function EffectForgeEditor({ effect, onSave, onClose }) {
  const [d, setD] = useState(() => effect ? { ...effect, condicionais: (effect.condicionais || []).map(normalizeConditional) } : newEffect());
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [novoMecanico, setNovoMecanico] = useState("");
  const [bodyBonusPart, setBodyBonusPart] = useState("saude");
  const [bodyBonusValue, setBodyBonusValue] = useState(1);
  const initialSnapshot = useMemo(() => JSON.stringify(effect ? { ...effect, condicionais: (effect.condicionais || []).map(normalizeConditional) } : newEffect()), [effect]);
  const up = (k, v) => setD((p) => ({ ...p, [k]: v }));
  const safeClose = () => {
    const isDirty = JSON.stringify(d) !== initialSnapshot;
    if (isDirty && !window.confirm("Descartar alterações do efeito?")) return;
    onClose();
  };

  const iconModeUI = (d.iconeModo === "url" || d.iconeModo === "upload") ? "image" : (d.iconeModo || "emoji");
  const efeitosMecanicos = Array.isArray(d.efeitosMecanicos)
    ? d.efeitosMecanicos
    : String(d.efeitoMecanico || "").split(",").map((x) => x.trim()).filter(Boolean);

  const syncMecanicos = (nextList) => {
    const clean = (nextList || []).map((x) => String(x || "").trim()).filter(Boolean);
    up("efeitosMecanicos", clean);
    up("efeitoMecanico", clean.join(", "));
  };

  const addMecanico = () => {
    const val = String(novoMecanico || "").trim();
    if (!val) return;
    syncMecanicos([...efeitosMecanicos, val]);
    setNovoMecanico("");
  };

  return (
    <Modal title={effect ? "Editar Efeito (Caldeirão)" : "Criar Efeito (Caldeirão)"} onClose={safeClose} wide>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
            <select value={d.tipo} onChange={(e) => up("tipo", e.target.value)} style={inpStyle()}><option>Buff</option><option>Debuff</option></select>
            <input value={d.nome} onChange={(e) => up("nome", e.target.value)} placeholder="Nome do efeito" style={inpStyle()} />
          </div>
          <textarea value={d.descricao} onChange={(e) => up("descricao", e.target.value)} rows={3} placeholder="Descrição completa" style={inpStyle({ resize: "vertical" })} />
          <input value={d.frase} onChange={(e) => up("frase", e.target.value)} placeholder="Frase curta / efeito dramático" style={inpStyle()} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input value={d.duracao} onChange={(e) => up("duracao", e.target.value)} placeholder="Tempo de duração (ex: 3 rodadas)" style={inpStyle()} />
            <select value={String(d.eterno)} onChange={(e) => up("eterno", e.target.value === "true" ? true : false)} style={inpStyle()}><option value="false">Não eterno</option><option value="true">Eterno</option></select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <select value={String(d.removivel)} onChange={(e) => up("removivel", e.target.value === "true")} style={inpStyle()}><option value="false">Não removível</option><option value="true">Removível</option></select>
            <input value={d.condicaoRemocao} onChange={(e) => up("condicaoRemocao", e.target.value)} placeholder="Condição de remoção" style={inpStyle()} disabled={!d.removivel} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <select value={d.essenciaAtribuida || ""} onChange={(e) => up("essenciaAtribuida", e.target.value)} style={inpStyle()}>
              <option value="">Sem essência</option>
              {allEssencias.map((es) => <option key={es.nome} value={es.nome}>{es.nome}</option>)}
            </select>
            <select value={d.rank} onChange={(e) => up("rank", e.target.value)} style={inpStyle()}>{ARSENAL_RANKS.map((r) => <option key={r}>{r}</option>)}</select>
            <input value={efeitosMecanicos.join(", ")} onChange={(e) => syncMecanicos(String(e.target.value || "").split(","))} placeholder="Efeito mecânico (lista)" style={inpStyle()} />
          </div>

          <div style={{ background: G.bg3, border: "1px solid " + G.border, borderRadius: 8, padding: 8 }}>
            <div style={{ fontFamily: "'Cinzel',serif", color: G.gold, marginBottom: 6 }}>Efeito mecânico (tags)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, marginBottom: 6 }}>
              <input value={novoMecanico} onChange={(e) => setNovoMecanico(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMecanico(); } }} placeholder="Ex: +2FOR, -1AGILIDADE, +2DET" style={inpStyle()} />
              <button onClick={addMecanico} style={btnStyle({ padding: "4px 10px" })}>+ Tag</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "120px 90px auto", gap: 6, marginBottom: 6 }}>
              <select value={bodyBonusPart} onChange={(e) => setBodyBonusPart(e.target.value)} style={inpStyle()}>
                {BODY_PART_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input type="number" value={Number(bodyBonusValue || 0)} onChange={(e) => setBodyBonusValue(Number(e.target.value) || 0)} style={inpStyle()} />
              <button onClick={() => syncMecanicos([...efeitosMecanicos, `${bodyBonusValue >= 0 ? "+" : ""}${Number(bodyBonusValue || 0)}${String(bodyBonusPart || "").toUpperCase()}`])} style={btnStyle({ padding: "4px 10px" })}>+ Parte do corpo</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {efeitosMecanicos.map((tag, idx) => (
                <button key={`${tag}-${idx}`} onClick={() => syncMecanicos(efeitosMecanicos.filter((_, i) => i !== idx))} style={btnStyle({ padding: "3px 8px", borderRadius: 999, borderColor: "#2f4f66", color: "#8fd2ff" })}>
                  {tag} ✕
                </button>
              ))}
              {efeitosMecanicos.length === 0 && <span style={{ fontFamily: "monospace", fontSize: 11, color: G.muted }}>Sem tags.</span>}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <select value={d.alvo || "Portador"} onChange={(e) => up("alvo", e.target.value)} style={inpStyle()}>
              {ALVOS_OPCOES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            {(d.alvo === "Condição") ? (
              <input value={d.alvoCondicao || ""} onChange={(e) => up("alvoCondicao", e.target.value)} placeholder="Condição para ser alvo" style={inpStyle()} />
            ) : <span />}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <select value={d.testeResistenciaPericia || ""} onChange={(e) => up("testeResistenciaPericia", e.target.value)} style={inpStyle()}>
              <option value="">Sem Teste de Resistência</option>
              {allPericias.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={d.testeResistenciaSucesso || "Evitar"} onChange={(e) => up("testeResistenciaSucesso", e.target.value)} style={inpStyle()} disabled={!d.testeResistenciaPericia}>
              {RESIST_RESULTADOS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {(d.testeResistenciaPericia && d.testeResistenciaSucesso === "Outro") && (
            <input value={d.testeResistenciaSucessoOutro || ""} onChange={(e) => up("testeResistenciaSucessoOutro", e.target.value)} placeholder="Explique o resultado de sucesso" style={inpStyle()} />
          )}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ background: G.bg3, border: "1px solid " + G.border, borderRadius: 8, padding: 8 }}>
            <div style={{ fontFamily: "'Cinzel',serif", color: G.gold, marginBottom: 6 }}>Ícone</div>
            <select
              value={iconModeUI}
              onChange={(e) => {
                if (e.target.value === "image") {
                  up("iconeModo", d.iconeModo === "url" || d.iconeModo === "upload" ? d.iconeModo : "upload");
                  setImageModalOpen(true);
                  return;
                }
                up("iconeModo", e.target.value);
              }}
              style={{ ...inpStyle(), marginBottom: 6 }}
            >
              <option value="emoji">Emoji</option>
              <option value="image">Imagem</option>
              <option value="cor">Cor</option>
            </select>
            {(d.iconeModo || "emoji") === "emoji" && <input value={d.icone || ""} onChange={(e) => up("icone", e.target.value)} placeholder="⚗️" style={inpStyle()} />}
            {iconModeUI === "image" && (
              <div style={{ display: "grid", gap: 6 }}>
                <button onClick={() => setImageModalOpen(true)} style={btnStyle({ width: "100%" })}>Anexar imagem</button>
                {(d.iconeData || d.iconeUrl) && <ImageViewport src={d.iconeData || d.iconeUrl} alt={d.nome || "Ícone"} size={46} adjust={d.iconeAjuste} />}
              </div>
            )}
            {(d.iconeModo || "emoji") === "cor" && <input type="color" value={d.cor || "#7f8c8d"} onChange={(e) => up("cor", e.target.value)} style={{ ...inpStyle(), height: 38 }} />}
          </div>

          <div style={{ background: G.bg3, border: "1px solid " + G.border, borderRadius: 8, padding: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: "'Cinzel',serif", color: G.gold }}>Efeitos condicionais</span>
              <button onClick={() => up("condicionais", [...(d.condicionais || []), newConditional()])} style={btnStyle({ padding: "3px 8px", fontSize: 11 })}>+ condição</button>
            </div>
            <div style={{ maxHeight: 220, overflowY: "auto", display: "grid", gap: 6 }}>
              {(d.condicionais || []).map((c) => (
                <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr 84px 1fr auto", gap: 6, alignItems: "center" }}>
                  <input value={c.condicao || ""} onChange={(e) => up("condicionais", d.condicionais.map((x) => x.id === c.id ? { ...x, condicao: e.target.value } : x))} placeholder="Condição" style={inpStyle()} />
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontFamily: "monospace", fontSize: 10, color: G.muted }}>
                    <input type="checkbox" checked={!!c.ativo} onChange={(e) => up("condicionais", d.condicionais.map((x) => x.id === c.id ? { ...x, ativo: e.target.checked } : x))} />
                    Ativo
                  </label>
                  <input value={c.efeito || ""} onChange={(e) => up("condicionais", d.condicionais.map((x) => x.id === c.id ? { ...x, efeito: e.target.value } : x))} placeholder="Efeito" style={inpStyle()} />
                  <button onClick={() => up("condicionais", d.condicionais.filter((x) => x.id !== c.id))} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c", padding: "3px 8px" })}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
        <button onClick={safeClose} style={btnStyle({ background: "transparent", borderColor: "#333", color: G.muted })}>Cancelar</button>
        <button onClick={() => onSave({ ...d, atualizado: Date.now() })} style={btnStyle()}>Salvar Efeito</button>
      </div>
      <ImageAttachModal
        open={imageModalOpen}
        title="Anexar imagem do efeito"
        initial={{ mode: d.iconeModo === "url" ? "url" : "upload", url: d.iconeUrl || "", data: d.iconeData || "", adjust: d.iconeAjuste }}
        onClose={() => setImageModalOpen(false)}
        onConfirm={(payload) => {
          up("iconeModo", payload.mode);
          up("iconeUrl", payload.url);
          up("iconeData", payload.data);
          up("iconeAjuste", payload.adjust);
          setImageModalOpen(false);
        }}
      />
    </Modal>
  );
}

export function makeDefaultEffect() {
  return newEffect();
}
