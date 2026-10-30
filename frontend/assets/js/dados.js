/* AgendaPro Saúde — dados FICTÍCIOS do protótipo.
   Pessoas, médicos, clínica e horários foram inventados para demonstração.
   "Hoje" no protótipo é terça-feira, 20 de outubro de 2026. */
window.DADOS = {
  hoje: "2026-10-20",

  clinica: {
    nome: "Clínica Ipê",
    unidade: "Unidade Centro",
    endereco: "Rua das Palmeiras, 410 — Centro",
    telefone: "(11) 2345-0000",
    telefoneLink: "+551123450000",
  },

  /* Feriados no período mostrado (a clínica não abre) */
  feriados: [
    { data: "2026-11-02", nome: "Finados" },
    { data: "2026-11-20", nome: "Dia da Consciência Negra" },
  ],

  /* Demonstração de erro: este horário "acaba de ser ocupado" ao confirmar */
  horarioDisputado: { medico: "fernanda", data: "2026-10-26", hora: "13:00" },

  titular: "juliana",

  pessoas: [
    {
      id: "juliana", nome: "Juliana Santos", curto: "Juliana", tratamento: "você",
      relacao: "Você", idade: 36, genero: "f", cor: "var(--id-juliana)",
      alergias: "Nenhuma informada", sus: "•••• 7310",
      avatar: { pele: "#8d5524", cabelo: "crespo", corCabelo: "#1e1410", roupa: "#12263f" },
    },
    {
      id: "davi", nome: "Davi Santos Tanaka", curto: "Davi", tratamento: "o Davi",
      relacao: "Filho", idade: 8, genero: "m", cor: "var(--id-davi)",
      alergias: "Nenhuma informada", sus: "•••• 2284",
      avatar: { pele: "#c68642", cabelo: "cacheado", corCabelo: "#2b1b12", roupa: "#e07b39" },
    },
    {
      id: "marina", nome: "Marina Santos Tanaka", curto: "Marina", tratamento: "a Marina",
      relacao: "Filha", idade: 14, genero: "f", cor: "var(--id-marina)",
      alergias: "Rinite alérgica", sus: "•••• 5521",
      avatar: { pele: "#b5703f", cabelo: "trancas", corCabelo: "#1a120d", roupa: "#2f6f9f" },
    },
    {
      id: "cida", nome: "Maria Aparecida Santos", curto: "Dona Cida", tratamento: "a Dona Cida",
      relacao: "Mãe", idade: 71, genero: "f", cor: "var(--id-cida)",
      alergias: "Alergia a dipirona", sus: "•••• 0937",
      avatar: { pele: "#6b3e26", cabelo: "grisalho", corCabelo: "#d6d3cf", roupa: "#b5543a", oculos: true },
    },
    {
      id: "kenji", nome: "Kenji Tanaka", curto: "Seu Kenji", tratamento: "o Seu Kenji",
      relacao: "Sogro", idade: 74, genero: "m", cor: "var(--id-kenji)",
      alergias: "Nenhuma informada", sus: "•••• 4468",
      avatar: { pele: "#e8c39e", cabelo: "calvo", corCabelo: "#bdbab5", roupa: "#2e5e4e", oculos: true },
    },
  ],

  especialidades: {
    clinica: { nome: "Clínica geral", desc: "Primeira consulta para quase tudo, check-ups e pedidos de exame" },
    pediatria: { nome: "Pediatria", desc: "Saúde de crianças e adolescentes até 18 anos" },
    otorrino: { nome: "Otorrinolaringologia", desc: "Ouvido, nariz e garganta" },
    dermatologia: { nome: "Dermatologia", desc: "Pele, cabelo e unhas" },
    cardiologia: { nome: "Cardiologia", desc: "Coração e pressão arterial" },
    ortopedia: { nome: "Ortopedia", desc: "Ossos, músculos e articulações" },
    oftalmologia: { nome: "Oftalmologia", desc: "Olhos e visão" },
    ginecologia: { nome: "Ginecologia", desc: "Saúde da mulher" },
    psiquiatria: { nome: "Psiquiatria", desc: "Saúde mental, ansiedade, sono e humor" },
  },

  medicos: [
    { id: "helena", nome: "Dra. Helena Duarte", esp: "clinica", cor: "#d9ecf8" },
    { id: "fernanda", nome: "Dra. Fernanda Lima", esp: "pediatria", cor: "#fde3d3" },
    { id: "joao", nome: "Dr. João Batista Moura", esp: "pediatria", cor: "#e3f2dc" },
    { id: "rafael", nome: "Dr. Rafael Nogueira", esp: "otorrino", cor: "#efe2f5" },
    { id: "camila", nome: "Dra. Camila Rocha", esp: "dermatologia", cor: "#f9e9b9" },
    { id: "icaro", nome: "Dr. Ícaro Bezerra", esp: "dermatologia", cor: "#d6efe6" },
    { id: "paulo", nome: "Dr. Paulo Menezes", esp: "cardiologia", cor: "#f7d9dc" },
    { id: "andre", nome: "Dr. André Nascimento", esp: "ortopedia", cor: "#dfe6f6" },
    { id: "luana", nome: "Dra. Luana Potiguara", esp: "oftalmologia", cor: "#e6f1d4" },
    { id: "beatriz", nome: "Dra. Beatriz Yamamoto", esp: "ginecologia", cor: "#fbe0ea" },
    { id: "rosa", nome: "Dra. Rosa Amaral", esp: "psiquiatria", cor: "#e2ecf0" },
  ],

  /* Horários livres por médico (próximas semanas) */
  horarios: {
    helena: [
      { data: "2026-10-21", horas: ["08:00", "11:30"] },
      { data: "2026-10-22", horas: ["09:00", "14:00", "16:30"] },
    ],
    fernanda: [
      { data: "2026-10-21", horas: ["08:30", "10:00"] },
      { data: "2026-10-22", horas: ["15:30"] },
      { data: "2026-10-26", horas: ["09:00", "09:30", "13:00"] },
    ],
    joao: [{ data: "2026-10-27", horas: ["10:30", "11:00"] }],
    rafael: [
      { data: "2026-10-23", horas: ["07:30", "17:00"] },
      { data: "2026-10-29", horas: ["08:00"] },
    ],
    camila: [],
    icaro: [{ data: "2026-11-12", horas: ["14:00"] }],
    paulo: [
      { data: "2026-11-05", horas: ["10:30", "11:00"] },
      { data: "2026-11-10", horas: ["08:00"] },
    ],
    andre: [{ data: "2026-10-22", horas: ["10:00", "10:30"] }],
    luana: [{ data: "2026-10-28", horas: ["13:30", "15:00"] }],
    beatriz: [{ data: "2026-10-30", horas: ["09:00"] }],
    rosa: [{ data: "2026-11-03", horas: ["16:00"] }],
  },

  /* tipo: "consulta" (padrão), "exame" ou "prevencao" — muda o selo no calendário */
  consultas: [
    { id: "c1", pessoa: "davi", medico: "fernanda", data: "2026-10-23", hora: "14:30", sala: "Sala 4", status: "confirmada", motivo: "Consulta de rotina" },
    { id: "c5", pessoa: "marina", medico: "rafael", data: "2026-10-23", hora: "17:00", sala: "Sala 1", status: "confirmada", motivo: "Acompanhamento da rinite" },
    { id: "c2", pessoa: "kenji", medico: "helena", data: "2026-10-28", hora: "07:40", sala: "Sala 2", status: "confirmada", motivo: "Eletrocardiograma pedido no check-up", tipo: "exame", titulo: "Eletrocardiograma" },
    { id: "c3", pessoa: "marina", medico: "luana", data: "2026-11-04", hora: "09:15", sala: "Sala 7", status: "confirmada", motivo: "Dificuldade para enxergar o quadro" },
    { id: "c4", pessoa: "kenji", medico: "helena", data: "2026-11-13", hora: "11:00", sala: "Sala 2", status: "confirmada", motivo: "Check-up anual (Novembro Azul)", tipo: "prevencao", titulo: "Check-up anual" },
    { id: "c6", pessoa: "cida", medico: "luana", data: "2026-11-24", hora: "14:00", sala: "Sala 7", status: "confirmada", motivo: "Revisão do grau dos óculos" },
    { id: "c7", pessoa: "juliana", medico: "helena", data: "2026-12-08", hora: "08:30", sala: "Sala 2", status: "confirmada", motivo: "Mostrar o resultado dos exames de sangue" },
  ],

  passadas: [
    { id: "p1", pessoa: "cida", medico: "paulo", data: "2026-10-02", hora: "10:30", sala: "Sala 5", status: "realizada", motivo: "Pressão alta", gerou: "Retorno em até 45 dias" },
    { id: "p2", pessoa: "juliana", medico: "helena", data: "2026-09-15", hora: "08:00", sala: "Sala 2", status: "realizada", motivo: "Cansaço frequente", gerou: "Pedido de exames de sangue" },
  ],

  espera: {
    pessoa: "juliana", medico: "camila", posicao: 3, naFila: 7,
    desde: "2026-10-06", notificar: true, sms: false,
    vaga: { data: "2026-10-23", hora: "09:00", prazo: "30 minutos" },
  },

  acompanhamento: {
    retornos: [
      { id: "r1", pessoa: "cida", titulo: "Retorno com cardiologista", medico: "paulo", esp: "cardiologia", prazo: "2026-11-16", origem: "Pedido na consulta de 2 de outubro" },
    ],
    exames: [
      { id: "e1", pessoa: "juliana", titulo: "Hemograma e glicemia em jejum", pedidoPor: "helena", status: "pendente", obs: "Jejum de 8 horas", origem: "Pedido em 15 de setembro" },
      { id: "e2", pessoa: "kenji", titulo: "Eletrocardiograma", pedidoPor: "helena", status: "agendado", consulta: "c2", obs: "Levar exames anteriores" },
    ],
  },

  /* Calendário de prevenção: sugestões por idade, com as campanhas do Ministério da Saúde */
  prevencao: [
    { mes: "2026-10", campanha: "Outubro Rosa", tema: "Prevenção do câncer de mama", itens: [
      { pessoa: "cida", titulo: "Mamografia", status: "pendente", nota: "A cada 2 anos, dos 50 aos 74 anos", esp: "ginecologia" },
    ]},
    { mes: "2026-11", campanha: "Novembro Azul", tema: "Saúde do homem", itens: [
      { pessoa: "kenji", titulo: "Check-up anual com clínica geral", status: "agendado", nota: "Marcado para 13 de novembro", esp: "clinica" },
    ]},
    { mes: "2026-12", campanha: null, tema: "Antes das férias", itens: [
      { pessoa: "davi", titulo: "Revisão no dentista", status: "pendente", nota: "A cada 6 meses", esp: null },
      { pessoa: "marina", titulo: "Revisão no dentista", status: "pendente", nota: "A cada 6 meses", esp: null },
    ]},
    { mes: "2027-01", campanha: "Janeiro Branco", tema: "Saúde mental", itens: [
      { pessoa: "juliana", titulo: "Check-up anual com clínica geral", status: "pendente", nota: "Inclui conversa sobre sono e estresse", esp: "clinica" },
    ]},
    { mes: "2027-02", campanha: null, tema: "Volta às aulas", itens: [
      { pessoa: "davi", titulo: "Consulta anual com pediatra", status: "pendente", nota: "Conferir a caderneta de vacinação", esp: "pediatria" },
      { pessoa: "marina", titulo: "Consulta anual com pediatra", status: "pendente", nota: "Conferir a caderneta de vacinação", esp: "pediatria" },
    ]},
    { mes: "2027-03", campanha: "Março Lilás", tema: "Prevenção do câncer do colo do útero", itens: [
      { pessoa: "juliana", titulo: "Exame preventivo (Papanicolau)", status: "pendente", nota: "Frequência conforme orientação médica", esp: "ginecologia" },
    ]},
    { mes: "2027-04", campanha: "Vacinação contra a gripe", tema: "Campanha anual", itens: [
      { pessoa: "cida", titulo: "Vacina da gripe", status: "pendente", nota: "Grupo prioritário: 60 anos ou mais", esp: null },
      { pessoa: "kenji", titulo: "Vacina da gripe", status: "pendente", nota: "Grupo prioritário: 60 anos ou mais", esp: null },
    ]},
  ],

  /* Área da clínica: lista de espera de cada médico, em ordem de chegada.
     A Juliana (titular do app) é a 3ª da fila da Dra. Camila Rocha. */
  filas: {
    camila: [
      { nome: "Rita de Cássia Moura", desde: "2026-09-29", tel: "•••• 2210" },
      { nome: "Benedito Alves", desde: "2026-10-02", tel: "•••• 8812" },
      { nome: "Juliana Santos", desde: "2026-10-06", tel: "•••• 4471", app: true },
      { nome: "Tainá Guajajara", desde: "2026-10-09", tel: "•••• 0193" },
      { nome: "Osvaldo Pereira", desde: "2026-10-12", tel: "•••• 7765" },
      { nome: "Lúcia Hiromi Sato", desde: "2026-10-15", tel: "•••• 3348" },
      { nome: "Diego Marques", desde: "2026-10-18", tel: "•••• 5590" },
    ],
    paulo: [
      { nome: "Sebastião Rocha", desde: "2026-10-05", tel: "•••• 6127" },
      { nome: "Neide Fonseca", desde: "2026-10-08", tel: "•••• 9032" },
      { nome: "Hamilton Ito", desde: "2026-10-13", tel: "•••• 1145" },
      { nome: "Graça Nascimento", desde: "2026-10-17", tel: "•••• 4408" },
    ],
    fernanda: [
      { nome: "Gael Cardoso (por Bruna Cardoso)", desde: "2026-10-14", tel: "•••• 2271" },
      { nome: "Ayla Ribeiro (por Caio Ribeiro)", desde: "2026-10-16", tel: "•••• 6650" },
    ],
    luana: [
      { nome: "Irene Barbosa", desde: "2026-10-10", tel: "•••• 3019" },
      { nome: "Cauã Lima", desde: "2026-10-14", tel: "•••• 7782" },
      { nome: "Antônia Silva", desde: "2026-10-19", tel: "•••• 5126" },
    ],
    andre: [
      { nome: "Wellington Souza", desde: "2026-10-16", tel: "•••• 8890" },
    ],
    helena: [],
  },

  notificacoes: [
    { id: "n1", tipo: "lembrete", icone: "calendar-days", texto: "A consulta do Davi com a Dra. Fernanda Lima é sexta, às 14:30.", quando: "Hoje, 08:00", nova: true },
    { id: "n2", tipo: "fila", icone: "list-ordered", texto: "Você subiu para 3ª na fila de Dermatologia.", quando: "Ontem, 17:12", nova: true },
    { id: "n3", tipo: "retorno", icone: "repeat", texto: "Dona Cida precisa marcar o retorno com o cardiologista até 16 de novembro.", quando: "Sábado, 10:30", nova: false },
    { id: "n4", tipo: "prevencao", icone: "calendar-heart", texto: "Outubro Rosa: a mamografia da Dona Cida ainda não foi marcada.", quando: "1º de outubro", nova: false },
  ],
};
