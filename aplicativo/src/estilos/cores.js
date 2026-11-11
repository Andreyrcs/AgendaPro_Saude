// Cores do AgendaPro Saúde, copiadas de frontend/assets/css/tokens.css.
// Regra da marca: o vermelho ("domingo") só aparece em domingo/feriado e em emergência.

export const cores = {
  // Campos
  noite: '#12263f', // azul-noite: topo, botão principal, títulos
  noite2: '#1c3756', // um passo acima do azul-noite
  menta: '#a8e6cf', // lista de espera e confirmações
  menta2: '#d4f3e6', // menta clara, para realces suaves
  mentaTinta: '#1f6b52', // menta escura para texto sobre fundo claro
  domingo: '#c8381f', // vermelho: feriado e emergência, nada mais
  domingoClaro: '#fbe7e2',
  alerta: '#f6e5a8', // amarelo dos selos de prazo (mesmo tom da Dona Cida)
  alertaTinta: '#6b5200',

  // Chão e superfícies
  gelo: '#f4f7f6', // fundo do app
  gelo2: '#e7eeeb',
  papel: '#ffffff', // cartões e folhas
  linha: '#d9e2df', // bordas e divisórias

  // Texto
  tinta: '#12263f',
  tinta2: '#4b5b6c',
  tinta3: '#5d6b7a',
  sobreNoite: '#ffffff',
  sobreNoite2: '#bccbdc',

  // Cor de cada familiar (a mesma da web)
  familia: {
    juliana: '#cfe2f6',
    davi: '#fbdcc6',
    marina: '#d3f0e2',
    cida: '#f6e5a8',
    kenji: '#f3d3de',
  },
};

// Cores que o paciente pode escolher ao adicionar um familiar (8 opções)
export const opcoesFamilia = [
  cores.familia.juliana,
  cores.familia.davi,
  cores.familia.marina,
  cores.familia.cida,
  cores.familia.kenji,
  '#e2ecf0',
  '#efe2f5',
  '#e6f1d4',
];
