/* AgendaPro Saúde: regras do assistente, usadas pelo app e pela página inicial.
   Fica num arquivo só para que o alerta de emergência nunca seja diferente entre as telas. */
(function () {
  "use strict";

  function analisar(texto) {
    const t = texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (/(suicid|me matar|tirar (a )?minha vida|nao quero mais viver|acabar com tudo)/.test(t)) return { tipo: "cvv" };
    if (/(dor no peito|aperto no peito|peito doendo|dor forte no peito|falta de ar|nao consigo respirar|dificuldade para respirar|desmai|convuls|boca torta|fraqueza de um lado|nao consegue falar|sangramento forte|sangrando muito|infarto|\bavc\b|inconsciente|engasg)/.test(t)) return { tipo: "emergencia" };
    const D = window.DADOS;
    let quem = D.titular;
    if (/(filho|davi|menino|bebe)/.test(t)) quem = "davi";
    else if (/(filha|marina|menina)/.test(t)) quem = "marina";
    else if (/(mae|cida)/.test(t)) quem = "cida";
    else if (/(sogro|kenji)/.test(t)) quem = "kenji";
    const crianca = D.pessoas.find((p) => p.id === quem).idade < 18;
    let esps;
    if (/(ouvido|orelha|garganta|nariz|sinusite)/.test(t)) esps = crianca ? ["pediatria", "otorrino"] : ["otorrino", "clinica"];
    else if (/(pele|mancha|coceira|cocam|coca|espinha|acne|cabelo caindo|unha|pinta)/.test(t)) esps = crianca ? ["pediatria", "dermatologia"] : ["dermatologia"];
    else if (/(costas|coluna|joelho|ombro|torci|tornozelo|fratur|osso)/.test(t)) esps = crianca ? ["pediatria", "ortopedia"] : ["ortopedia", "clinica"];
    else if (/(pressao|coracao|palpita|batedeira)/.test(t)) esps = ["cardiologia", "clinica"];
    else if (/(olho|vista|enxerg|visao|oculos|quadro)/.test(t)) esps = ["oftalmologia"];
    else if (/(menstrua|gravid|preventivo|colica)/.test(t)) esps = ["ginecologia", "clinica"];
    else if (/(ansied|ansios|triste|depress|nao durmo|sem dormir|insonia|estresse|panico)/.test(t)) esps = ["psiquiatria", "clinica"];
    else esps = crianca ? ["pediatria"] : ["clinica"];
    return { tipo: "sugestao", quem, esps };
  }

  window.TRIAGEM = { analisar };
})();
