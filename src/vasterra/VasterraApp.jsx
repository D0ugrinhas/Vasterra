import React, { useEffect, useMemo, useState } from "react";
import { CLASSES, RACAS, STATUS_CFG, RECURSOS_CFG, ARSENAL_RANKS, ARSENAL_TIPOS, RANK_COR } from "./data/gameData";
import { novaFicha, novoItem } from "./core/factories";
import { stGet, stSet } from "./core/storage";
import { btnStyle, G, inpStyle } from "./ui/theme";
import { Card, Field } from "./components/LayoutBits";

function FichasPanel({ fichas, setFichas }) {
  const [selecionada, setSelecionada] = useState(null);
  const ficha = useMemo(() => fichas.find((f) => f.id === selecionada) ?? null, [fichas, selecionada]);

  const updateFicha = (patch) => {
    setFichas((prev) => prev.map((f) => (f.id === selecionada ? { ...f, ...patch, atualizado: Date.now() } : f)));
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
      <Card
        title="Fichas"
        right={<button style={btnStyle({ padding: "4px 8px" })} onClick={() => {
          const f = novaFicha();
          setFichas((prev) => [f, ...prev]);
          setSelecionada(f.id);
        }}>+ Nova</button>}
      >
        <div style={{ display: "grid", gap: 6 }}>
          {fichas.map((f) => (
            <button key={f.id} onClick={() => setSelecionada(f.id)} style={{
              textAlign: "left",
              background: selecionada === f.id ? "#1a1208" : G.bg3,
              border: `1px solid ${selecionada === f.id ? "#c8a96e55" : G.border}`,
              borderRadius: 8,
              color: G.gold2,
              padding: "8px 10px",
              cursor: "pointer",
            }}>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12 }}>{f.nome}</div>
              <div style={{ color: G.muted, fontSize: 10, fontFamily: "monospace" }}>{f.raca}</div>
            </button>
          ))}
          {fichas.length === 0 && <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 12 }}>Nenhuma ficha criada.</div>}
        </div>
      </Card>

      <Card title="Editor de Ficha">
        {!ficha && <div style={{ color: G.muted, fontStyle: "italic" }}>Selecione uma ficha para editar.</div>}
        {ficha && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <Field label="Nome">
                <input value={ficha.nome} onChange={(e) => updateFicha({ nome: e.target.value })} style={inpStyle()} />
              </Field>
              <Field label="Raça">
                <select value={ficha.raca} onChange={(e) => updateFicha({ raca: e.target.value })} style={inpStyle()}>
                  {RACAS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Classes (selecione até 3)">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {Object.values(CLASSES).flat().map((classe) => {
                    const active = ficha.classes.includes(classe);
                    return (
                      <button
                        key={classe}
                        onClick={() => {
                          if (active) {
                            updateFicha({ classes: ficha.classes.filter((c) => c !== classe) });
                            return;
                          }
                          if (ficha.classes.length < 3) {
                            updateFicha({ classes: [...ficha.classes, classe] });
                          }
                        }}
                        style={btnStyle({
                          padding: "3px 8px",
                          fontSize: 10,
                          color: active ? G.gold : G.muted,
                          borderColor: active ? "#c8a96e55" : "#333",
                          background: active ? "#1a1208" : "transparent",
                        })}
                      >
                        {classe}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>

            <div>
              <Field label="Aparência">
                <textarea value={ficha.aparencia} onChange={(e) => updateFicha({ aparencia: e.target.value })} rows={3} style={inpStyle({ resize: "vertical" })} />
              </Field>
              <Field label="Histórico">
                <textarea value={ficha.historico} onChange={(e) => updateFicha({ historico: e.target.value })} rows={4} style={inpStyle({ resize: "vertical" })} />
              </Field>
              <Field label="Notas">
                <textarea value={ficha.notas} onChange={(e) => updateFicha({ notas: e.target.value })} rows={3} style={inpStyle({ resize: "vertical" })} />
              </Field>
            </div>

            <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Card title="Status">
                {STATUS_CFG.map((s) => (
                  <div key={s.sigla} style={{ display: "grid", gridTemplateColumns: "48px 1fr 1fr", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <strong style={{ color: s.cor, fontSize: 11 }}>{s.sigla}</strong>
                    <input
                      type="number"
                      value={ficha.status[s.sigla]?.val ?? 0}
                      onChange={(e) => updateFicha({
                        status: {
                          ...ficha.status,
                          [s.sigla]: { ...ficha.status[s.sigla], val: Number(e.target.value) || 0 },
                        },
                      })}
                      style={inpStyle({ padding: "4px 8px" })}
                    />
                    <input
                      type="number"
                      value={ficha.status[s.sigla]?.max ?? 0}
                      onChange={(e) => updateFicha({
                        status: {
                          ...ficha.status,
                          [s.sigla]: { ...ficha.status[s.sigla], max: Number(e.target.value) || 0 },
                        },
                      })}
                      style={inpStyle({ padding: "4px 8px" })}
                    />
                  </div>
                ))}
              </Card>

              <Card title="Recursos / rodada">
                {RECURSOS_CFG.map((r) => (
                  <div key={r.sigla} style={{ display: "grid", gridTemplateColumns: "48px 1fr 1fr", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <strong style={{ color: r.cor, fontSize: 11 }}>{r.sigla}</strong>
                    <input
                      type="number"
                      value={ficha.recursos[r.sigla]?.total ?? 0}
                      onChange={(e) => updateFicha({
                        recursos: {
                          ...ficha.recursos,
                          [r.sigla]: { ...ficha.recursos[r.sigla], total: Number(e.target.value) || 0 },
                        },
                      })}
                      style={inpStyle({ padding: "4px 8px" })}
                    />
                    <input
                      type="number"
                      value={ficha.recursos[r.sigla]?.usado ?? 0}
                      onChange={(e) => updateFicha({
                        recursos: {
                          ...ficha.recursos,
                          [r.sigla]: { ...ficha.recursos[r.sigla], usado: Number(e.target.value) || 0 },
                        },
                      })}
                      style={inpStyle({ padding: "4px 8px" })}
                    />
                  </div>
                ))}
              </Card>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function ArsenalPanel({ arsenal, setArsenal }) {
  const [item, setItem] = useState(novoItem());

  const addItem = () => {
    setArsenal((prev) => [{ ...item, id: crypto.randomUUID?.() ?? `${Date.now()}` }, ...prev]);
    setItem(novoItem());
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
      <Card title={`Arsenal (${arsenal.length})`}>
        <div style={{ display: "grid", gap: 8 }}>
          {arsenal.map((it) => (
            <div key={it.id} style={{ background: G.bg3, border: `1px solid ${RANK_COR[it.rank] || G.border}`, borderRadius: 8, padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: G.gold2, fontFamily: "'Cinzel',serif" }}>{it.nome}</div>
                <div style={{ color: G.muted, fontSize: 10, fontFamily: "monospace" }}>{it.tipo} · {it.rank}</div>
              </div>
              <button style={btnStyle({ color: "#e74c3c", borderColor: "#e74c3c44" })} onClick={() => setArsenal((prev) => prev.filter((x) => x.id !== it.id))}>Excluir</button>
            </div>
          ))}
          {arsenal.length === 0 && <div style={{ color: G.muted, fontFamily: "monospace" }}>Nenhum item no arsenal.</div>}
        </div>
      </Card>

      <Card title="Novo item">
        <Field label="Nome">
          <input value={item.nome} onChange={(e) => setItem((p) => ({ ...p, nome: e.target.value }))} style={inpStyle()} />
        </Field>
        <Field label="Tipo">
          <select value={item.tipo} onChange={(e) => setItem((p) => ({ ...p, tipo: e.target.value }))} style={inpStyle()}>
            {ARSENAL_TIPOS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Rank">
          <select value={item.rank} onChange={(e) => setItem((p) => ({ ...p, rank: e.target.value }))} style={inpStyle()}>
            {ARSENAL_RANKS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Descrição">
          <textarea value={item.descricao} onChange={(e) => setItem((p) => ({ ...p, descricao: e.target.value }))} rows={4} style={inpStyle({ resize: "vertical" })} />
        </Field>
        <button style={btnStyle({ width: "100%" })} onClick={addItem}>Salvar item</button>
      </Card>
    </div>
  );
}

export default function VasterraApp() {
  const [section, setSection] = useState("fichas");
  const [fichas, setFichas] = useState([]);
  const [arsenal, setArsenal] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const f = await stGet("vasterra:fichas");
      const a = await stGet("vasterra:arsenal");
      if (Array.isArray(f)) setFichas(f);
      if (Array.isArray(a)) setArsenal(a);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) stSet("vasterra:fichas", fichas); }, [fichas, loaded]);
  useEffect(() => { if (loaded) stSet("vasterra:arsenal", arsenal); }, [arsenal, loaded]);

  if (!loaded) {
    return <div style={{ minHeight: "100vh", background: G.bg, color: G.gold, display: "grid", placeItems: "center" }}>VASTERRA</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: G.bg, color: G.text }}>
      <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;900&display=swap');
      * { box-sizing: border-box; }
      body { margin: 0; background: #050505; }
      `}</style>

      <header style={{ height: 54, borderBottom: `1px solid ${G.border}`, background: "#060606", display: "flex", alignItems: "center", padding: "0 20px", gap: 10 }}>
        <strong style={{ letterSpacing: 2, color: G.gold }}>VASTERRA</strong>
        <button style={btnStyle({ background: "transparent", border: "none", color: section === "fichas" ? G.gold : G.muted })} onClick={() => setSection("fichas")}>FICHAS</button>
        <button style={btnStyle({ background: "transparent", border: "none", color: section === "arsenal" ? G.gold : G.muted })} onClick={() => setSection("arsenal")}>ARSENAL</button>
      </header>

      <main style={{ padding: 16 }}>
        {section === "fichas" && <FichasPanel fichas={fichas} setFichas={setFichas} />}
        {section === "arsenal" && <ArsenalPanel arsenal={arsenal} setArsenal={setArsenal} />}
      </main>
    </div>
  );
}
