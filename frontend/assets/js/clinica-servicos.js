/* AgendaPro Saúde — dados das telas do dono e da recepção, pela API (rotas em backend/docs/especificacao-api.md).
   CLINICA.iniciar(fn) é o portão das páginas já ligadas à API: mostra "Carregando…", busca os dados da clínica
   aberta na sessão uma vez e só então redesenha a casca e roda a página. Se a API não responder, a tela mostra o
   erro e "Tentar de novo" (nada quebra).
   Etapa 8a: a clínica (GET /api/clinicas/{id}, L1), a lista de espera (para o número no menu) e os médicos.
   As etapas 8b a 8d acrescentam aqui as especialidades, a agenda e os feriados.
   Os ids ficam como texto (F2): as telas comparam com A.mesmoId. */
(function () {
  "use strict";

  const API = window.API;
  const A = window.AP;

  const CLINICA = {
    clinica: null, /* { id, nome, endereco, telefone, cnpj, cidade, uf, codigo, publica } */
    fila: [], /* [{ medico, especialidade, pessoas: [...], vagas: [...] }] (F21) */
    medicos: [], /* [{ id, nome, crm, sala, telefone, especialidade: { id, nome, duracao }, expediente | null }] */
    carregada: false,
  };

  const comoTexto = (x) => (x === null || x === undefined ? x : String(x));

  function medicoDaApi(m) {
    return Object.assign({}, m, {
      id: comoTexto(m.id),
      especialidade: m.especialidade ? Object.assign({}, m.especialidade, { id: comoTexto(m.especialidade.id) }) : null,
    });
  }

  async function carregar() {
    const c = API.clinicaAtual();
    if (!c) throw new Error("Nenhuma clínica aberta. Entre de novo.");
    const base = "/api/clinicas/" + c.id;
    const [clinica, fila, medicos] = await Promise.all([
      API.recarregarClinica(),
      API.chamar("GET", base + "/lista-espera"),
      API.chamar("GET", base + "/medicos"),
    ]);
    CLINICA.clinica = clinica;
    CLINICA.fila = fila || [];
    CLINICA.medicos = (medicos || []).map(medicoDaApi);
    CLINICA.carregada = true;
    return CLINICA;
  }

  /* Pessoas esperando em todas as filas da clínica (o número ao lado de "Lista de espera" no menu) */
  function totalFila() {
    return CLINICA.fila.reduce((s, f) => s + (f.pessoas || []).length, 0);
  }

  function iniciar(montarTela) {
    if (API.liberada === false) return; /* a página já está indo para o login */
    const alvo = document.querySelector("main") || document.body;
    const espera = document.createElement("p");
    espera.className = "carregando-area";
    espera.setAttribute("role", "status");
    espera.textContent = "Carregando os dados da clínica…";
    alvo.prepend(espera);
    carregar().then(() => {
      espera.remove();
      if (window.CASCA) window.CASCA.atualizar();
      montarTela();
    }).catch((e) => {
      if (e && e.status === 401) return; /* api.js já mandou para o login */
      espera.className = "carregando-area carregando-area--erro";
      espera.setAttribute("role", "alert");
      espera.innerHTML = A.esc(e.message) + ' <button type="button" class="botao botao--secundario botao--pequeno">Tentar de novo</button>';
      espera.querySelector("button").addEventListener("click", () => { espera.remove(); iniciar(montarTela); });
    });
  }

  CLINICA.carregar = carregar;
  CLINICA.iniciar = iniciar;
  CLINICA.totalFila = totalFila;
  window.CLINICA = CLINICA;
})();
