/* AgendaPro Saúde — constantes comuns às telas (nomes dos status, regras de presença e faltas) e os dados de
   exemplo da ilustração do celular na página inicial (index.html, Figura B.1 da documentação).
   As telas de verdade não usam dados de exemplo: tudo vem da API (paciente-servicos.js, clinica-servicos.js e
   medico.js), e "clinica" começa vazia até api.js copiar a clínica da sessão. */
(function () {
  "use strict";

  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const HOJE = iso(new Date());

  /* Feriados nacionais: a ilustração da página inicial e a folha do dia até a API responder (GET /api/feriados) */
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
  /* Consultas de exemplo: só a ilustração da página inicial (landing.js) */
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

    /* a clínica da sessão (api.js preenche) */
    clinica: { nome: "", endereco: "", telefone: "", telefoneLink: "" },

    feriados: FERIADOS,

    /* Pessoas de exemplo: só a ilustração da página inicial (landing.js) */
    /* cpf: Pacientes.CPF, 11 dígitos, fictício e válido (dígitos verificadores corretos), sem repetir */
    pessoas: [
      {
        id: "juliana", nome: "Juliana Santos", curto: "Juliana", tratamento: "você",
        relacao: "Titular", idade: 36, cpf: "28461593782", cor: "var(--id-juliana)",
        alergias: "Nenhuma informada",
        avatar: { pele: "#8d5524", cabelo: "crespo", corCabelo: "#1e1410", roupa: "#12263f" },
      },
      {
        id: "davi", nome: "Davi Santos Tanaka", curto: "Davi", tratamento: "o Davi",
        relacao: "Filho", idade: 8, cpf: "39152840689", cor: "var(--id-davi)",
        alergias: "Nenhuma informada",
        avatar: { pele: "#c68642", cabelo: "cacheado", corCabelo: "#2b1b12", roupa: "#e07b39" },
      },
      {
        id: "marina", nome: "Marina Santos Tanaka", curto: "Marina", tratamento: "a Marina",
        relacao: "Filha", idade: 14, cpf: "47590312860", cor: "var(--id-marina)",
        alergias: "Rinite alérgica",
        avatar: { pele: "#b5703f", cabelo: "trancas", corCabelo: "#1a120d", roupa: "#2f6f9f" },
      },
      {
        id: "cida", nome: "Maria Aparecida Santos", curto: "Dona Cida", tratamento: "a Dona Cida",
        relacao: "Mãe", idade: 71, cpf: "56308174262", cor: "var(--id-cida)",
        alergias: "Alergia a dipirona",
        avatar: { pele: "#6b3e26", cabelo: "grisalho", corCabelo: "#d6d3cf", roupa: "#b5543a", oculos: true },
      },
      {
        id: "kenji", nome: "Kenji Tanaka", curto: "Seu Kenji", tratamento: "o Seu Kenji",
        relacao: "Sogro", idade: 74, cpf: "61827435909", cor: "var(--id-kenji)",
        alergias: "Nenhuma informada",
        avatar: { pele: "#e8c39e", cabelo: "calvo", corCabelo: "#bdbab5", roupa: "#2e5e4e", oculos: true },
      },
    ],

    /* preenchidos pela API nas telas do paciente (paciente-servicos.js) */
    especialidades: {},
    medicos: [],
    horarios: {},

    /* tipo: "consulta" (padrão), "exame" ou "prevencao" — muda o selo no calendário */
    consultas,

  };
})();
