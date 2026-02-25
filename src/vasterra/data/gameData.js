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
