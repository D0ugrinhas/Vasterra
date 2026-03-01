import React, { useState } from "react";
import { uid } from "../../core/factories";
import { ARSENAL_RANKS, ESSENCIAS_VIRTUDES, ESSENCIAS_PECADOS } from "../../data/gameData";
import { G, inpStyle, btnStyle } from "../../ui/theme";
import { Modal } from "../shared/components";

const allEssencias = [...ESSENCIAS_VIRTUDES, ...ESSENCIAS_PECADOS];

const newConditional = () => ({ id: uid(), ativo: true, texto: "" });

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
  iconeModo: "emoji",
  icone: "⚗️",
  iconeUrl: "",
  iconeData: "",
  cor: "#7f8c8d",
  frase: "",
  condicionais: [newConditional()],
  criado: Date.now(),
});

export function EffectForgeEditor({ effect, onSave, onClose }) {
  const [d, setD] = useState(() => effect ? { ...effect, condicionais: (effect.condicionais || []).map((x) => ({ ...x, id: x.id || uid() })) } : newEffect());
  const up = (k, v) => setD((p) => ({ ...p, [k]: v }));

  const onUploadIcon = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => up("iconeData", String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  return (
    <Modal title={effect ? "Editar Efeito (Caldeirão)" : "Criar Efeito (Caldeirão)"} onClose={onClose} wide>
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
            <select value={String(d.eterno)} onChange={(e) => up("eterno", e.target.value === "true")} style={inpStyle()}><option value="false">Não eterno</option><option value="true">Eterno</option></select>
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
            <input value={d.efeitoMecanico} onChange={(e) => up("efeitoMecanico", e.target.value)} placeholder="Efeito mecânico" style={inpStyle()} />
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ background: G.bg3, border: "1px solid " + G.border, borderRadius: 8, padding: 8 }}>
            <div style={{ fontFamily: "'Cinzel',serif", color: G.gold, marginBottom: 6 }}>Ícone</div>
            <select value={d.iconeModo || "emoji"} onChange={(e) => up("iconeModo", e.target.value)} style={{ ...inpStyle(), marginBottom: 6 }}>
              <option value="emoji">Emoji</option>
              <option value="url">URL</option>
              <option value="upload">Imagem local</option>
              <option value="cor">Cor</option>
            </select>
            {(d.iconeModo || "emoji") === "emoji" && <input value={d.icone || ""} onChange={(e) => up("icone", e.target.value)} placeholder="⚗️" style={inpStyle()} />}
            {(d.iconeModo || "emoji") === "url" && <input value={d.iconeUrl || ""} onChange={(e) => up("iconeUrl", e.target.value)} placeholder="https://" style={inpStyle()} />}
            {(d.iconeModo || "emoji") === "upload" && <input type="file" accept="image/*" onChange={(e) => onUploadIcon(e.target.files?.[0])} style={inpStyle()} />}
            {(d.iconeModo || "emoji") === "cor" && <input type="color" value={d.cor || "#7f8c8d"} onChange={(e) => up("cor", e.target.value)} style={{ ...inpStyle(), height: 38 }} />}
          </div>

          <div style={{ background: G.bg3, border: "1px solid " + G.border, borderRadius: 8, padding: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: "'Cinzel',serif", color: G.gold }}>Efeitos condicionais</span>
              <button onClick={() => up("condicionais", [...(d.condicionais || []), newConditional()])} style={btnStyle({ padding: "3px 8px", fontSize: 11 })}>+ condição</button>
            </div>
            <div style={{ maxHeight: 180, overflowY: "auto", display: "grid", gap: 6 }}>
              {(d.condicionais || []).map((c) => (
                <div key={c.id} style={{ display: "grid", gridTemplateColumns: "26px 1fr auto", gap: 6 }}>
                  <input type="checkbox" checked={!!c.ativo} onChange={(e) => up("condicionais", d.condicionais.map((x) => x.id === c.id ? { ...x, ativo: e.target.checked } : x))} />
                  <input value={c.texto} onChange={(e) => up("condicionais", d.condicionais.map((x) => x.id === c.id ? { ...x, texto: e.target.value } : x))} placeholder="Se X ocorrer, Y acontece..." style={inpStyle()} />
                  <button onClick={() => up("condicionais", d.condicionais.filter((x) => x.id !== c.id))} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c", padding: "3px 8px" })}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
        <button onClick={onClose} style={btnStyle({ background: "transparent", borderColor: "#333", color: G.muted })}>Cancelar</button>
        <button onClick={() => onSave({ ...d, atualizado: Date.now() })} style={btnStyle()}>Salvar Efeito</button>
      </div>
    </Modal>
  );
}

export function makeDefaultEffect() {
  return newEffect();
}
