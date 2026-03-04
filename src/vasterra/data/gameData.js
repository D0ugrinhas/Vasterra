export const RACAS = ["Humano","Anão","Elfo","Adroxxiano","Thiliano","Demi-Humano","Druida","Anjo","Demônio","Yalk","Glastinniano","Fada","Draconauta"];

export const CLASSES = {
  Estrutural: ["Lutador","Paladino","Amaldiçoado","Mago","Zoner Leve","Zoner Pesado","Aéreo","Gêmeos","Bardo","Aura","Mártir","Artífice","Clérigo","Invocador"],
  Funcional:  ["Erudito","Especialista","Suporte","Curandeiro","Tanker","Atacante","Assassino","Versátil","Rushdown","Velocista","Ladino","Pesquisador","Caçador","Domador"],
  Dominante:  ["Buffer","Debuffer","Purificador","Sedutor","Hit Killer","Vidente","Ancorador","Arcanista","Mercador","Construtor","Anomalia","Astrólogo","Necromante","Místico","Palhaço","Ilusionista"],
};

export const ATRIBUTOS = [
  { sigla:"FOR",  nome:"Força",        desc:"Poder físico bruto",              bonus:null },
  { sigla:"VIG",  nome:"Vigor",         desc:"Resistência; define ESF (X=VIG)", bonus:null },
  { sigla:"DES",  nome:"Destreza",      desc:"Agilidade e reflexos",            bonus:"+3 EST" },
  { sigla:"CONST",nome:"Constituição",  desc:"Robustez e HP",                   bonus:"+5 VIT" },
  { sigla:"INT",  nome:"Inteligência",  desc:"Conhecimento arcano",             bonus:"+3 MAN" },
  { sigla:"SAB",  nome:"Sabedoria",     desc:"Conexão espiritual",              bonus:"+3 MAN" },
  { sigla:"CAR",  nome:"Carisma",       desc:"Presença e magnetismo",           bonus:null },
  { sigla:"MENT", nome:"Mentalidade",   desc:"Estabilidade mental",             bonus:null },
];

export const PERICIAS_GRUPOS = [
  { g:"Combate",   cor:"#e74c3c", list:["Lâminas Pesadas","Lâminas Grandes","Lâminas Médias","Lâminas Pequenas","Contundentes Pesados","Contundentes Grandes","Contundentes Médios","Contundentes Pequenos","Punhos","Chutes","Arte Marcial","Pontaria"] },
  { g:"Físico",    cor:"#e67e22", list:["Agilidade","Acrobacia","Atletismo","Fortitude"] },
  { g:"Social",    cor:"#f39c12", list:["Enganação","Diplomacia","Intimidação","Social","Sedução"] },
  { g:"Mental",    cor:"#9b59b6", list:["Conhecimento","Cognitiva","Misticismo","Religiões","Nobreza","Atualidades","Vontade","Mentalidade","Estratégia"] },
  { g:"Reativas", cor:"#3498db", list:["Percepção","Intuição","Reflexos"] },
  { g:"Furtivo",   cor:"#2ecc71", list:["Furtividade","Ladinagem"] },
  { g:"Sobrev.",   cor:"#27ae60", list:["Sobrevivência","Primeiros-Socorros","Adestramento","Cavalgar","Pilotagem","Construção", "Fabricação"] },
  { g:"Especial",  cor:"#c8a96e", list:["Artística","Poder","Aura", "Profissão 1","Profissão 2", "Iniciativa"] },
];

export const PERICIAS_DESC = {
  "Lâminas Pesadas": "Domínio de armas cortantes de grande massa e impacto.",
  "Lâminas Grandes": "Uso eficiente de espadas e lâminas longas de duas mãos.",
  "Lâminas Médias": "Perícia com espadas curtas e lâminas versáteis de combate.",
  "Lâminas Pequenas": "Precisão com adagas, facas e armas de corte curtas.",
  "Contundentes Pesados": "Controle de marretas e maças de alto peso e quebra.",
  "Contundentes Grandes": "Técnica com bastões e armas de impacto de porte grande.",
  "Contundentes Médios": "Eficiência com armas de impacto de alcance médio.",
  "Contundentes Pequenos": "Golpes rápidos com porretes e impacto leve.",
  Punhos: "Combate corpo a corpo usando socos e bloqueios manuais.",
  Chutes: "Aplicação de golpes com pernas e postura ofensiva móvel.",
  "Arte Marcial": "Disciplina de luta técnica com combinações e contra-ataques.",
  Pontaria: "Precisão para ataques à distância com foco em acerto.",
  Agilidade: "Velocidade de movimentos e mudanças rápidas de direção.",
  Acrobacia: "Execução de saltos, rolamentos e manobras corporais complexas.",
  Atletismo: "Capacidade física geral para corrida, natação e escalada.",
  Fortitude: "Resistência corporal contra fadiga, venenos e dor.",
  Enganação: "Habilidade de mentir, disfarçar intenções e confundir alvos.",
  Diplomacia: "Negociação, etiqueta e condução de acordos sociais.",
  Intimidação: "Pressão psicológica para impor medo ou obediência.",
  Social: "Convivência, leitura de contexto e interação em grupos.",
  Sedução: "Influência por charme, presença e persuasão emocional.",
  Conhecimento: "Base geral de estudos, teorias e fatos acadêmicos.",
  Cognitiva: "Raciocínio lógico, análise e resolução de problemas.",
  Misticismo: "Compreensão de fenômenos arcanos e ocultismo.",
  Religiões: "Saber sobre crenças, cultos e tradições espirituais.",
  Nobreza: "Etiqueta cortesã, linhagens e política aristocrática.",
  Atualidades: "Informações recentes sobre eventos e cenários do mundo.",
  Vontade: "Força mental para resistir coerção e influências externas.",
  Mentalidade: "Estabilidade psíquica e controle emocional em pressão.",
  Estratégia: "Planejamento tático para combate e gestão de recursos.",
  Percepção: "Captação de detalhes visuais, sonoros e ambientais.",
  Intuição: "Leitura instintiva de situações e intenções ocultas.",
  Reflexos: "Resposta rápida a estímulos e ameaças imediatas.",
  Furtividade: "Mover-se sem ser detectado por visão ou audição.",
  Ladinagem: "Técnicas de trapaça, destranca e ações clandestinas.",
  Sobrevivência: "Manter-se vivo em ambientes hostis e sem suporte.",
  "Primeiros-Socorros": "Estabilização inicial de ferimentos e emergências.",
  Adestramento: "Treino e condução de animais ou criaturas aliadas.",
  Cavalgar: "Controle de montarias em deslocamento e combate.",
  Pilotagem: "Operação de veículos e condução sob risco.",
  Construção: "Montagem de estruturas, barreiras e peças utilitárias.",
  Fabricação: "Produção artesanal de itens, munições e componentes.",
  Artística: "Expressão criativa por música, pintura, atuação e afins.",
  Poder: "Canalização de energia especial vinculada ao personagem.",
  Aura: "Manipulação da presença energética para suporte ou pressão.",
  "Profissão 1": "Competência técnica de um ofício principal escolhido.",
  "Profissão 2": "Competência técnica de um segundo ofício especializado.",
  Iniciativa: "Prontidão para agir primeiro ao iniciar conflitos.",
};

export const ESSENCIAS_VIRTUDES = [
  { nome:"O Cinza",  tag:"Humildade",  cor:"#888888", coringa:false, forma:"Poeira cinzenta levitando, opaca e estável" },
  { nome:"Luz",      tag:"Caridade",   cor:"#fbe6bb", coringa:true,  forma:"Vórtice circular preto que clareia ao puro branco" },
  { nome:"Mecânico", tag:"Diligência", cor:"#ffea00", coringa:false, forma:"Engrenagens flutuantes em padrões complexos" },
  { nome:"Raiz",     tag:"Paciência",  cor:"#b1ff79", coringa:true,  forma:"Emaranhado de raízes flutuantes levemente brilhantes" },
  { nome:"Cristal",  tag:"Pureza",     cor:"#ffffff", coringa:false, forma:"Diamante negro reluzente refratando prismas harmônicos" },
  { nome:"Éter",     tag:"Sabedoria",  cor:"#075140", coringa:false, forma:"Rachadura verde-escura estilhaçada — portal para a galáxia" },
  { nome:"Água",     tag:"Temperança", cor:"#19baf0", coringa:false, forma:"Esfera líquida com reflexo da lua em órbita suave" },
];

export const ESSENCIAS_PECADOS = [
  { nome:"Sangue",     tag:"Fúria",    cor:"#c0392b", coringa:false, forma:"Coração líquido vermelho que explode em jatos pulsantes" },
  { nome:"Víscera",    tag:"Gula",     cor:"#3b0921", coringa:false, forma:"Massa de carne negra com brilho vermelho pulsante e mandíbulas" },
  { nome:"Sombra",     tag:"Inveja",   cor:"#8800ff", coringa:false, forma:"Véu escuro de fumaça com olhar rosa claro espiando" },
  { nome:"Ouro Negro", tag:"Ganância", cor:"#1f1d16", coringa:true,  forma:"Metal de ouro negro cintilante com veios de substância escuríssima" },
  { nome:"Ouro",       tag:"Soberba",  cor:"#fff30b", coringa:false, forma:"Lâminas douradas levitantes girando como coroas partidas" },
  { nome:"Néctar",     tag:"Luxúria",  cor:"#ff0cf3", coringa:false, forma:"Véu de néctar rosa com fios viscosos exalando fragrâncias" },
  { nome:"Corrosão",   tag:"Preguiça", cor:"#8b6914", coringa:true,  forma:"Placas enferrujadas ou casulo elétrico com magnetismo sobrenatural" },
];

export const STATUS_CFG = [
  { sigla:"VIT",  nome:"Vitalidade",  cor:"#f1250e", msg:"MORRENDO — incapacitado!" },
  { sigla:"EST",  nome:"Estamina",    cor:"#f9f100", msg:"Pode desmaiar / cair / dormir" },
  { sigla:"MAN",  nome:"Mana",        cor:"#0077ff", msg:"Sem magia — suscetível a ataques arcanos" },
  { sigla:"SAN",  nome:"Sanidade",    cor:"#811abc", msg:"BREAKMENTAL + Trauma permanente!" },
  { sigla:"CONS", nome:"Consciência", cor:"#1abc9c", msg:"DESMAIA imediatamente!" },
];

export const RECURSOS_CFG = [
  { sigla:"ACO", nome:"Ação",      cor:"#22ee5f" },
  { sigla:"MOV", nome:"Movimento", cor:"#227de6" },
  { sigla:"REA", nome:"Reação",    cor:"#d31515" },
  { sigla:"ESF", nome:"Esforço",   cor:"#290404" },
];

export const ARSENAL_TIPOS = ["Arma","Ferramenta","Armadura","Vestimenta","Acessório","Marcas","Consumível","Outros"];
export const ARSENAL_RANKS = ["Comum","Incomum","Raro","Épico","Lendário","Único","Mítico","Divino"];
export const RANK_COR = { Comum:"#7f8c8d", Incomum:"#27ae60", Raro:"#2980b9", Épico:"#8e44ad", Lendário:"#e67e22", Único:"#c0392b", Mítico:"#ff69b4", Divino:"#f0e68c" };

export const MOD_ORIGENS = ["Efeito", "Maldição", "Item", "Outro"];

export const RACAS_COMBINACOES = {
  "Anão+Elfo": "Dwalf",
  "Elfo+Anão": "Alfar",
    "Thiliano+Adroxxiano+Elfo+Humano": "Glastiniano",
  "Druida+Anjo": "Deva",
};

export const normalizarCombinacaoRacas = (racas = []) => racas.filter(Boolean).join("+");

export const resolverNomeRaca = (racaBase, racasExtras = []) => {
  const racas = [racaBase, ...racasExtras].filter(Boolean);
  if (racas.length <= 1) return racaBase || "Humano";
  const chave = normalizarCombinacaoRacas(racas);
  if (RACAS_COMBINACOES[chave]) return RACAS_COMBINACOES[chave];
  if (racas.length === 2) return `Meio-${racas[0]}`;
  return `${racas[0]} híbrido`;
};
