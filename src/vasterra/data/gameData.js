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
  { g:"Social",    cor:"#f39c12", list:["Enganação","Diplomacia","Intimidação","Social","Carisma Pessoal"] },
  { g:"Mental",    cor:"#9b59b6", list:["Conhecimento","Cognitiva","Misticismo","Religiões","Nobreza","Atualidades","Vontade","Mentalidade","Estratégia"] },
  { g:"Percepção", cor:"#3498db", list:["Percepção","Intuição","Iniciativa"] },
  { g:"Furtivo",   cor:"#2ecc71", list:["Furtividade","Ladinagem"] },
  { g:"Sobrev.",   cor:"#27ae60", list:["Sobrevivência","Primeiros-Socorros","Adestramento","Cavalgar","Pilotagem"] },
  { g:"Especial",  cor:"#c8a96e", list:["Artística","Poder","Profissão 1","Profissão 2"] },
];

export const ESSENCIAS_VIRTUDES = [
  { nome:"O Cinza",  tag:"Humildade",  cor:"#888888", coringa:false, forma:"Poeira cinzenta levitando, opaca e estável" },
  { nome:"Luz",      tag:"Caridade",   cor:"#e0d8c8", coringa:true,  forma:"Vórtice circular preto que clareia ao puro branco" },
  { nome:"Mecânico", tag:"Diligência", cor:"#6a9fd8", coringa:false, forma:"Engrenagens flutuantes em padrões complexos" },
  { nome:"Raiz",     tag:"Paciência",  cor:"#5c8a3a", coringa:true,  forma:"Emaranhado de raízes flutuantes levemente brilhantes" },
  { nome:"Cristal",  tag:"Pureza",     cor:"#a0d8ef", coringa:false, forma:"Diamante negro reluzente refratando prismas harmônicos" },
  { nome:"Éter",     tag:"Sabedoria",  cor:"#2d9e5a", coringa:false, forma:"Rachadura verde-escura estilhaçada — portal para a galáxia" },
  { nome:"Água",     tag:"Temperança", cor:"#3a7abf", coringa:false, forma:"Esfera líquida com reflexo da lua em órbita suave" },
];

export const ESSENCIAS_PECADOS = [
  { nome:"Sangue",     tag:"Fúria",    cor:"#c0392b", coringa:false, forma:"Coração líquido vermelho que explode em jatos pulsantes" },
  { nome:"Víscera",    tag:"Gula",     cor:"#7b1a1a", coringa:false, forma:"Massa de carne negra com brilho vermelho pulsante e mandíbulas" },
  { nome:"Sombra",     tag:"Inveja",   cor:"#7b2fbe", coringa:false, forma:"Véu escuro de fumaça com olhar rosa claro espiando" },
  { nome:"Ouro Negro", tag:"Ganância", cor:"#5a4a0a", coringa:true,  forma:"Metal de ouro negro cintilante com veios de substância escuríssima" },
  { nome:"Ouro",       tag:"Soberba",  cor:"#d4a017", coringa:false, forma:"Lâminas douradas levitantes girando como coroas partidas" },
  { nome:"Néctar",     tag:"Luxúria",  cor:"#e8507a", coringa:false, forma:"Véu de néctar rosa com fios viscosos exalando fragrâncias" },
  { nome:"Corrosão",   tag:"Preguiça", cor:"#8b6914", coringa:true,  forma:"Placas enferrujadas ou casulo elétrico com magnetismo sobrenatural" },
];

export const STATUS_CFG = [
  { sigla:"VIT",  nome:"Vitalidade",  cor:"#e74c3c", msg:"MORRENDO — incapacitado!" },
  { sigla:"EST",  nome:"Estamina",    cor:"#e67e22", msg:"Pode desmaiar / cair / dormir" },
  { sigla:"MAN",  nome:"Mana",        cor:"#9b59b6", msg:"Sem magia — suscetível a ataques arcanos" },
  { sigla:"SAN",  nome:"Sanidade",    cor:"#1abc9c", msg:"BREAKMENTAL D100 + Trauma permanente!" },
  { sigla:"CONS", nome:"Consciência", cor:"#3498db", msg:"DESMAIA imediatamente!" },
];

export const RECURSOS_CFG = [
  { sigla:"ACO", nome:"Ação",      cor:"#e74c3c" },
  { sigla:"MOV", nome:"Movimento", cor:"#e67e22" },
  { sigla:"REA", nome:"Reação",    cor:"#3498db" },
  { sigla:"ESF", nome:"Esforço",   cor:"#9b59b6" },
];

export const ARSENAL_TIPOS = ["Arma","Ferramenta","Armadura","Vestimenta","Acessório","Marcas","Consumível","Outros"];
export const ARSENAL_RANKS = ["Comum","Incomum","Raro","Épico","Lendário","Único","Mítico","Divino"];
export const RANK_COR = { Comum:"#7f8c8d", Incomum:"#27ae60", Raro:"#2980b9", Épico:"#8e44ad", Lendário:"#e67e22", Único:"#c0392b", Mítico:"#ff69b4", Divino:"#f0e68c" };
