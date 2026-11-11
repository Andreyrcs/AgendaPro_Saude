/* AgendaPro Saúde — dados iniciais da Clínica Ipê (carga inicial do sistema).
   "Hoje" é a data real do computador. As datas abaixo são contadas a partir de hoje
   (dia(3) = daqui a 3 dias), então a agenda sempre começa preenchida em volta do dia atual.
   Quando a API estiver no ar, estes dados passam a vir do banco (ver docs/relatorio-integracao.md). */
(function () {
  "use strict";

  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const HOJE = iso(new Date());

  /* Feriados nacionais (a clínica não abre) */
  const FERIADOS = [
    { data: "2026-01-01", nome: "Confraternização Universal" }, { data: "2026-02-16", nome: "Carnaval" }, { data: "2026-02-17", nome: "Carnaval" },
    { data: "2026-04-03", nome: "Sexta-feira Santa" }, { data: "2026-04-21", nome: "Tiradentes" }, { data: "2026-05-01", nome: "Dia do Trabalho" },
    { data: "2026-06-04", nome: "Corpus Christi" }, { data: "2026-09-07", nome: "Independência" }, { data: "2026-10-12", nome: "Nossa Senhora Aparecida" },
    { data: "2026-11-02", nome: "Finados" }, { data: "2026-11-15", nome: "Proclamação da República" }, { data: "2026-11-20", nome: "Dia da Consciência Negra" },
    { data: "2026-12-25", nome: "Natal" },
    { data: "2027-01-01", nome: "Confraternização Universal" }, { data: "2027-02-08", nome: "Carnaval" }, { data: "2027-02-09", nome: "Carnaval" },
    { data: "2027-03-26", nome: "Sexta-feira Santa" }, { data: "2027-04-21", nome: "Tiradentes" }, { data: "2027-05-01", nome: "Dia do Trabalho" },
    { data: "2027-05-27", nome: "Corpus Christi" }, { data: "2027-09-07", nome: "Independência" }, { data: "2027-10-12", nome: "Nossa Senhora Aparecida" },
    { data: "2027-11-02", nome: "Finados" }, { data: "2027-11-15", nome: "Proclamação da República" }, { data: "2027-11-20", nome: "Dia da Consciência Negra" },
    { data: "2027-12-25", nome: "Natal" },
  ];
  const fechado = (s) => { const p = s.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]).getDay() === 0 || FERIADOS.some((f) => f.data === s); };

  /* dia(n): a data de hoje + n dias. Para consultas, pula domingo e feriado (dia útil seguinte ou anterior). */
  function dia(n, util) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    let s = iso(d);
    while (util !== false && fechado(s)) { d.setDate(d.getDate() + (n < 0 ? -1 : 1)); s = iso(d); }
    return s;
  }
  const mes = (n) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + n); return d.getFullYear() + "-" + pad(d.getMonth() + 1); };
  const SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const diaSemana = (s) => { const p = s.split("-").map(Number); return SEMANA[new Date(p[0], p[1] - 1, p[2]).getDay()]; };
  const porExtenso = (s) => { const p = s.split("-").map(Number); return p[2] + " de " + MESES[p[1] - 1]; };

  /* Campanhas do Ministério da Saúde por mês do ano (1 = janeiro) */
  const CAMPANHAS = {
    1: ["Janeiro Branco", "Saúde mental"], 2: [null, "Volta às aulas"], 3: ["Março Lilás", "Prevenção do câncer do colo do útero"],
    4: ["Vacinação contra a gripe", "Campanha anual"], 5: ["Maio Amarelo", "Segurança no trânsito"], 6: [null, "Inverno: cuidado com o pulmão"],
    7: [null, "Férias de julho"], 8: ["Agosto Dourado", "Aleitamento materno"], 9: ["Setembro Amarelo", "Prevenção do suicídio"],
    10: ["Outubro Rosa", "Prevenção do câncer de mama"], 11: ["Novembro Azul", "Saúde do homem"], 12: [null, "Antes das férias"],
  };
  /* O que cada pessoa da família tem para fazer em cada mês do ano */
  const PREVENCAO_POR_MES = {
    1: [{ pessoa: "juliana", titulo: "Check-up anual com clínica geral", nota: "Inclui conversa sobre sono e estresse", esp: "clinica" }],
    2: [{ pessoa: "davi", titulo: "Consulta anual com pediatra", nota: "Conferir a caderneta de vacinação", esp: "pediatria" },
        { pessoa: "marina", titulo: "Consulta anual com pediatra", nota: "Conferir a caderneta de vacinação", esp: "pediatria" }],
    3: [{ pessoa: "juliana", titulo: "Exame preventivo (Papanicolau)", nota: "Frequência conforme orientação médica", esp: "ginecologia" }],
    4: [{ pessoa: "cida", titulo: "Vacina da gripe", nota: "Grupo prioritário: 60 anos ou mais", esp: null },
        { pessoa: "kenji", titulo: "Vacina da gripe", nota: "Grupo prioritário: 60 anos ou mais", esp: null }],
    10: [{ pessoa: "cida", titulo: "Mamografia", nota: "A cada 2 anos, dos 50 aos 74 anos", esp: "ginecologia" }],
    11: [{ pessoa: "kenji", titulo: "Check-up anual com clínica geral", nota: "Uma vez por ano depois dos 50", esp: "clinica" }],
    12: [{ pessoa: "davi", titulo: "Revisão no dentista", nota: "A cada 6 meses", esp: null },
         { pessoa: "marina", titulo: "Revisão no dentista", nota: "A cada 6 meses", esp: null }],
  };
  function prevencao() {
    const lista = [];
    for (let i = -1; i <= 5; i++) {
      const m = mes(i);
      const n = Number(m.slice(5));
      lista.push({
        mes: m, campanha: CAMPANHAS[n][0], tema: CAMPANHAS[n][1],
        itens: (PREVENCAO_POR_MES[n] || []).map((it, i) => Object.assign({ id: "v" + m + "-" + i, status: "pendente" }, it)),
      });
    }
    return lista;
  }

  const consultas = [
    { id: "c1", pessoa: "davi", medico: "fernanda", data: dia(3), hora: "14:30", sala: "Sala 4", status: "confirmada", motivo: "Consulta de rotina" },
    { id: "c5", pessoa: "marina", medico: "rafael", data: dia(3), hora: "17:00", sala: "Sala 1", status: "confirmada", motivo: "Acompanhamento da rinite" },
    { id: "c2", pessoa: "kenji", medico: "helena", data: dia(8), hora: "07:40", sala: "Sala 2", status: "confirmada", motivo: "Eletrocardiograma pedido no check-up", tipo: "exame", titulo: "Eletrocardiograma" },
    { id: "c3", pessoa: "marina", medico: "luana", data: dia(15), hora: "09:15", sala: "Sala 7", status: "confirmada", motivo: "Dificuldade para enxergar o quadro" },
    { id: "c4", pessoa: "kenji", medico: "helena", data: dia(24), hora: "11:00", sala: "Sala 2", status: "confirmada", motivo: "Check-up anual", tipo: "prevencao", titulo: "Check-up anual" },
    { id: "c6", pessoa: "cida", medico: "luana", data: dia(35), hora: "14:00", sala: "Sala 7", status: "confirmada", motivo: "Revisão do grau dos óculos" },
    { id: "c7", pessoa: "juliana", medico: "helena", data: dia(49), hora: "08:30", sala: "Sala 2", status: "confirmada", motivo: "Mostrar o resultado dos exames de sangue" },
  ];

  window.DADOS = {
    hoje: HOJE,
    dia, mes,

    /* Status da CONSULTA e estado do HORÁRIO: os mesmos nomes na web, no app e no banco.
       Uma consulta cancelada continua no histórico; o horário dela volta a "livre"
       (ou vira "oferecido", se houver lista de espera para aquele médico). */
    STATUS_CONSULTA: {
      confirmada: "Confirmada", na_recepcao: "Na recepção", em_atendimento: "Em atendimento",
      atendida: "Atendida", faltou: "Faltou", cancelada: "Cancelada",
    },
    ESTADO_HORARIO: { livre: "Livre", ocupado: "Ocupado", oferecido: "Oferecido à fila" },

    /* Presença e faltas.
       - A partir do início da véspera, o paciente confirma: "Vou" ou "Não vou".
       - "Não vou" ou cancelar até o fim da véspera (AVISO_ATE): sem consequência.
       - Cancelar no próprio dia depois de ter dito "Vou" conta como falta sem aviso.
       - "Faltou" só é marcado pelo médico ou pela recepção; atraso não é falta.
       - FALTAS_PARA_RESTRICAO faltas sem aviso → por DIAS_DE_RESTRICAO dias só a lista de espera;
         nova falta nesse período → por DIAS_DE_RESTRICAO dias só agenda com a recepção.
       - DIAS_DE_RESTRICAO dias sem novas faltas → volta ao normal sozinho. */
    FALTAS_PARA_RESTRICAO: 2,
    DIAS_DE_RESTRICAO: 30,
    AVISO_ATE: "fim do dia anterior à consulta",
    /* o último instante para avisar sem consequência: 23:59:59 da véspera */
    avisoAte(dataConsulta) {
      const p = dataConsulta.split("-").map(Number);
      return new Date(p[0], p[1] - 1, p[2] - 1, 23, 59, 59);
    },

    clinica: {
      nome: "Clínica Ipê",
      unidade: "Unidade Centro",
      endereco: "Rua das Palmeiras, 410 — Centro",
      telefone: "(11) 2345-0000",
      telefoneLink: "+551123450000",
    },

    feriados: FERIADOS,

    titular: "juliana",

    pessoas: [
      {
        id: "juliana", nome: "Juliana Santos", curto: "Juliana", tratamento: "você",
        relacao: "Titular", idade: 36, genero: "f", cor: "var(--id-juliana)",
        alergias: "Nenhuma informada",
        avatar: { pele: "#8d5524", cabelo: "crespo", corCabelo: "#1e1410", roupa: "#12263f" },
      },
      {
        id: "davi", nome: "Davi Santos Tanaka", curto: "Davi", tratamento: "o Davi",
        relacao: "Filho", idade: 8, genero: "m", cor: "var(--id-davi)",
        alergias: "Nenhuma informada",
        avatar: { pele: "#c68642", cabelo: "cacheado", corCabelo: "#2b1b12", roupa: "#e07b39" },
      },
      {
        id: "marina", nome: "Marina Santos Tanaka", curto: "Marina", tratamento: "a Marina",
        relacao: "Filha", idade: 14, genero: "f", cor: "var(--id-marina)",
        alergias: "Rinite alérgica",
        avatar: { pele: "#b5703f", cabelo: "trancas", corCabelo: "#1a120d", roupa: "#2f6f9f" },
      },
      {
        id: "cida", nome: "Maria Aparecida Santos", curto: "Dona Cida", tratamento: "a Dona Cida",
        relacao: "Mãe", idade: 71, genero: "f", cor: "var(--id-cida)",
        alergias: "Alergia a dipirona",
        avatar: { pele: "#6b3e26", cabelo: "grisalho", corCabelo: "#d6d3cf", roupa: "#b5543a", oculos: true },
      },
      {
        id: "kenji", nome: "Kenji Tanaka", curto: "Seu Kenji", tratamento: "o Seu Kenji",
        relacao: "Sogro", idade: 74, genero: "m", cor: "var(--id-kenji)",
        alergias: "Nenhuma informada",
        avatar: { pele: "#e8c39e", cabelo: "calvo", corCabelo: "#bdbab5", roupa: "#2e5e4e", oculos: true },
      },
    ],

    especialidades: {
      clinica: { nome: "Clínica geral", desc: "Primeira consulta para quase tudo, check-ups e pedidos de exame", duracao: 30 },
      pediatria: { nome: "Pediatria", desc: "Saúde de crianças e adolescentes até 18 anos", duracao: 30 },
      otorrino: { nome: "Otorrinolaringologia", desc: "Ouvido, nariz e garganta", duracao: 30 },
      dermatologia: { nome: "Dermatologia", desc: "Pele, cabelo e unhas", duracao: 30 },
      cardiologia: { nome: "Cardiologia", desc: "Coração e pressão arterial", duracao: 40 },
      ortopedia: { nome: "Ortopedia", desc: "Ossos, músculos e articulações", duracao: 30 },
      oftalmologia: { nome: "Oftalmologia", desc: "Olhos e visão", duracao: 30 },
      ginecologia: { nome: "Ginecologia", desc: "Saúde da mulher", duracao: 30 },
      psiquiatria: { nome: "Psiquiatria", desc: "Saúde mental, ansiedade, sono e humor", duracao: 30 },
    },

    /* Todos os médicos cadastrados; "clinica" diz onde cada um atende.
       api.js deixa em DADOS.medicos só os da clínica aberta na sessão. */
    todosMedicos: [
      { id: "helena", clinica: "ipe", nome: "Dra. Helena Duarte", esp: "clinica", cor: "#d9ecf8", crm: "CRM/SP 107919" },
      { id: "fernanda", clinica: "ipe", nome: "Dra. Fernanda Lima", esp: "pediatria", cor: "#fde3d3", crm: "CRM/SP 115838" },
      { id: "joao", clinica: "ipe", nome: "Dr. João Batista Moura", esp: "pediatria", cor: "#e3f2dc", crm: "CRM/SP 123757" },
      { id: "rafael", clinica: "ipe", nome: "Dr. Rafael Nogueira", esp: "otorrino", cor: "#efe2f5", crm: "CRM/SP 131676" },
      { id: "camila", clinica: "ipe", nome: "Dra. Camila Rocha", esp: "dermatologia", cor: "#f9e9b9", crm: "CRM/SP 139595" },
      { id: "icaro", clinica: "ipe", nome: "Dr. Ícaro Bezerra", esp: "dermatologia", cor: "#d6efe6", crm: "CRM/SP 147514" },
      { id: "paulo", clinica: "ipe", nome: "Dr. Paulo Menezes", esp: "cardiologia", cor: "#f7d9dc", crm: "CRM/SP 155433" },
      { id: "andre", clinica: "ipe", nome: "Dr. André Nascimento", esp: "ortopedia", cor: "#dfe6f6", crm: "CRM/SP 163352" },
      { id: "luana", clinica: "ipe", nome: "Dra. Luana Potiguara", esp: "oftalmologia", cor: "#e6f1d4", crm: "CRM/SP 171271" },
      { id: "beatriz", clinica: "ipe", nome: "Dra. Beatriz Yamamoto", esp: "ginecologia", cor: "#fbe0ea", crm: "CRM/SP 179190" },
      { id: "rosa", clinica: "ipe", nome: "Dra. Rosa Amaral", esp: "psiquiatria", cor: "#e2ecf0", crm: "CRM/SP 187109" },
      { id: "marcos", clinica: "jacaranda", nome: "Dr. Marcos Vieira", esp: "clinica", cor: "#d9ecf8", crm: "CRM/SP 195028" },
      { id: "silvia", clinica: "jacaranda", nome: "Dra. Sílvia Prado", esp: "pediatria", cor: "#fde3d3", crm: "CRM/SP 202947" },
      { id: "tomas", clinica: "jacaranda", nome: "Dr. Tomás Okada", esp: "ortopedia", cor: "#dfe6f6", crm: "CRM/SP 210866" },
      { id: "renata", clinica: "aroeira", nome: "Dra. Renata Campos", esp: "cardiologia", cor: "#f7d9dc", crm: "CRM/SP 218785" },
      { id: "igor", clinica: "aroeira", nome: "Dr. Igor Azevedo", esp: "dermatologia", cor: "#f9e9b9", crm: "CRM/SP 226704" },
      { id: "lia", clinica: "aroeira", nome: "Dra. Lia Moreno", esp: "ginecologia", cor: "#fbe0ea", crm: "CRM/SP 234623" },
    ],
    medicos: [],

    /* Horários livres para o paciente: vêm da agenda da clínica (paciente-servicos.js preenche) */
    horarios: {},

    /* tipo: "consulta" (padrão), "exame" ou "prevencao" — muda o selo no calendário */
    consultas,

    passadas: [
      { id: "p1", pessoa: "cida", medico: "paulo", data: dia(-18), hora: "10:30", sala: "Sala 5", status: "atendida", motivo: "Pressão alta", gerou: "Retorno em até 45 dias" },
      { id: "p2", pessoa: "juliana", medico: "helena", data: dia(-35), hora: "08:00", sala: "Sala 2", status: "atendida", motivo: "Cansaço frequente", gerou: "Pedido de exames de sangue" },
    ],

    /* A Juliana espera vaga com a Dra. Camila. "vaga" só aparece quando a recepção cancela
       uma consulta da Dra. Camila e ela é a 1ª da fila (clinica.js avisa pelo canal). */
    espera: {
      pessoa: "juliana", medico: "camila", posicao: 3, naFila: 7,
      desde: dia(-14, false), notificar: true, sms: false,
      vaga: null,
    },

    acompanhamento: {
      retornos: [
        { id: "r1", pessoa: "cida", titulo: "Retorno com cardiologista", medico: "paulo", esp: "cardiologia", prazo: dia(27), origem: "Pedido na consulta de " + porExtenso(dia(-18)) },
      ],
      exames: [
        { id: "e1", pessoa: "juliana", titulo: "Hemograma e glicemia em jejum", pedidoPor: "helena", status: "pendente", obs: "Jejum de 8 horas", origem: "Pedido em " + porExtenso(dia(-35)) },
        { id: "e2", pessoa: "kenji", titulo: "Eletrocardiograma", pedidoPor: "helena", status: "agendado", consulta: "c2", obs: "Levar exames anteriores" },
      ],
    },

    /* Calendário de prevenção: do mês passado até 5 meses à frente, com as campanhas do Ministério da Saúde */
    prevencao: prevencao(),

    /* Lista de espera de cada médico, em ordem de chegada.
       A Juliana (titular do app) é a 3ª da fila da Dra. Camila Rocha. */
    filas: {
      camila: [
        { nome: "Rita de Cássia Moura", desde: dia(-22, false), tel: "•••• 2210" },
        { nome: "Benedito Alves", desde: dia(-18, false), tel: "•••• 8812" },
        { nome: "Juliana Santos", desde: dia(-14, false), tel: "•••• 4471", app: true },
        { nome: "Tainá Guajajara", desde: dia(-11, false), tel: "•••• 0193" },
        { nome: "Osvaldo Pereira", desde: dia(-8, false), tel: "•••• 7765" },
        { nome: "Lúcia Hiromi Sato", desde: dia(-5, false), tel: "•••• 3348" },
        { nome: "Diego Marques", desde: dia(-2, false), tel: "•••• 5590" },
      ],
      paulo: [
        { nome: "Sebastião Rocha", desde: dia(-15, false), tel: "•••• 6127" },
        { nome: "Neide Fonseca", desde: dia(-12, false), tel: "•••• 9032" },
        { nome: "Hamilton Ito", desde: dia(-7, false), tel: "•••• 1145" },
        { nome: "Graça Nascimento", desde: dia(-3, false), tel: "•••• 4408" },
      ],
      fernanda: [
        { nome: "Gael Cardoso (por Bruna Cardoso)", desde: dia(-6, false), tel: "•••• 2271" },
        { nome: "Ayla Ribeiro (por Caio Ribeiro)", desde: dia(-4, false), tel: "•••• 6650" },
      ],
      luana: [
        { nome: "Irene Barbosa", desde: dia(-10, false), tel: "•••• 3019" },
        { nome: "Cauã Lima", desde: dia(-6, false), tel: "•••• 7782" },
        { nome: "Antônia Silva", desde: dia(-1, false), tel: "•••• 5126" },
      ],
      andre: [{ nome: "Wellington Souza", desde: dia(-4, false), tel: "•••• 8890" }],
      helena: [],
      marcos: [{ nome: "Cristiane Lopes", desde: dia(-5, false), tel: "•••• 3381" }],
      silvia: [],
      tomas: [],
      renata: [{ nome: "Aurélio Batista", desde: dia(-9, false), tel: "•••• 6604" }, { nome: "Sandra Kato", desde: dia(-2, false), tel: "•••• 1290" }],
      igor: [],
      lia: [],
    },

    notificacoes: [
      { id: "n1", tipo: "lembrete", icone: "calendar-days", texto: "A consulta do Davi com a Dra. Fernanda Lima é " + diaSemana(consultas[0].data) + ", às 14:30.", quando: "Hoje, 08:00", nova: true },
      { id: "n2", tipo: "fila", icone: "list-ordered", texto: "Você subiu para 3ª na fila de Dermatologia.", quando: "Ontem, 17:12", nova: true },
      { id: "n3", tipo: "retorno", icone: "repeat", texto: "Dona Cida precisa marcar o retorno com o cardiologista até " + porExtenso(dia(27)) + ".", quando: "Há 3 dias", nova: false },
      { id: "n4", tipo: "prevencao", icone: "calendar-heart", texto: "Lembrete de prevenção: confira o que a família tem para este mês.", quando: "Dia 1º", nova: false },
    ],
  };
  window.DADOS.medicos = window.DADOS.todosMedicos.filter((m) => m.clinica === "ipe");
})();
