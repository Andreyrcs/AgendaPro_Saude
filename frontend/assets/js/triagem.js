/* AgendaPro Saúde: regras do assistente, usadas pelo app e pela página inicial.
   Fica num arquivo só para que o alerta de emergência nunca seja diferente entre as telas.
   Roda no próprio navegador, de propósito: o alerta de emergência não pode depender da internet. */
(function () {
  "use strict";

  const semAcento = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  /* De quem a pessoa está falando: pelo nome de alguém da família ou pelo parentesco
     (os parentescos da API: Filho(a), Cônjuge, Pai/Mãe, Irmão(ã), Outro — F31). Sem pista: o titular. */
  const PISTAS = [
    { palavras: /\b(filho|filha|menino|menina|bebe|crianca)\b/, relacao: "Filho(a)" },
    { palavras: /\b(mae|pai)\b/, relacao: "Pai/Mãe" },
    { palavras: /\b(esposa|esposo|marido|mulher)\b/, relacao: "Cônjuge" },
    { palavras: /\b(irmao|irma)\b/, relacao: "Irmão(ã)" },
  ];
  function descobrirQuem(t, pessoas, titular) {
    const porNome = pessoas.find((p) => !p.titular && semAcento(p.curto).length > 1 && new RegExp("\\b" + semAcento(p.curto) + "\\b").test(t));
    if (porNome) return porNome.id;
    for (const pista of PISTAS) {
      if (pista.palavras.test(t)) {
        const achados = pessoas.filter((p) => p.relacao === pista.relacao);
        /* "meu filho": o mais novo, que é quem mais costuma ir ao pediatra */
        if (achados.length) return achados.sort((a, b) => (a.idade ?? 99) - (b.idade ?? 99))[0].id;
      }
    }
    return titular;
  }

  /* Devolve { tipo: "cvv" } | { tipo: "emergencia" } | { tipo: "sugestao", quem, esps: [NOMES de especialidade] }.
     São nomes, e não ids: o id de cada especialidade muda de clínica para clínica (F2). */
  function analisar(texto) {
    const t = semAcento(texto);
    if (/(suicid|me matar|me enforcar|automutil|tirar (a )?(minha |propria )+vida|acabar com (a )?minha vida|acabar com tudo|desistir d[ae] (vida|viver)|(quero|queria|prefiro|preferia|vontade de|melhor) (morrer|sumir)|nao (quero|aguento) mais (viver|existir)|nao quero viver|sem vontade de viver)/.test(t)) return { tipo: "cvv" };
    if (/(dor no peito|aperto no peito|peito doendo|dor forte no peito|falta de ar|nao consigo respirar|dificuldade para respirar|desmai|convuls|boca torta|fraqueza de um lado|nao consegue falar|sangramento forte|sangrando muito|infarto|\bavc\b|inconsciente|engasg)/.test(t)) return { tipo: "emergencia" };
    const D = window.DADOS;
    const quem = descobrirQuem(t, D.pessoas, D.titular);
    const p = D.pessoas.find((x) => String(x.id) === String(quem));
    const crianca = !!p && p.idade !== null && p.idade < 18;
    let esps;
    if (/(ouvido|orelha|garganta|nariz|sinusite)/.test(t)) esps = crianca ? ["Pediatria", "Otorrinolaringologia"] : ["Otorrinolaringologia", "Clínica geral"];
    else if (/(pele|mancha|coceira|cocam|coca|espinha|acne|cabelo caindo|unha|pinta)/.test(t)) esps = crianca ? ["Pediatria", "Dermatologia"] : ["Dermatologia"];
    else if (/(costas|coluna|joelho|ombro|torci|tornozelo|fratur|osso)/.test(t)) esps = crianca ? ["Pediatria", "Ortopedia"] : ["Ortopedia", "Clínica geral"];
    else if (/(pressao|coracao|palpita|batedeira)/.test(t)) esps = ["Cardiologia", "Clínica geral"];
    else if (/(olho|vista|enxerg|visao|oculos|quadro)/.test(t)) esps = ["Oftalmologia"];
    else if (/(menstrua|gravid|preventivo|colica)/.test(t)) esps = ["Ginecologia", "Clínica geral"];
    else if (/(ansied|ansios|triste|depress|nao durmo|sem dormir|insonia|estresse|panico)/.test(t)) esps = ["Psiquiatria", "Clínica geral"];
    else esps = crianca ? ["Pediatria"] : ["Clínica geral"];
    return { tipo: "sugestao", quem, esps };
  }

  window.TRIAGEM = { analisar, semAcento };
})();
