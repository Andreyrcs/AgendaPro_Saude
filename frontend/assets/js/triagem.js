/* AgendaPro Saúde: regras do assistente da web do paciente (computador e celular).
   Fica num arquivo só para que o alerta de emergência nunca seja diferente entre as telas.
   Roda no próprio navegador, de propósito: o alerta de emergência não pode depender da internet.
   A lógica é a MESMA do aplicativo (aplicativo/src/servicos/assistente.js e utilitarios/texto.js). Mudou aqui, mude lá. */
(function () {
  "use strict";

  const semAcento = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Jeitos comuns de escrever a mesma especialidade (cada clínica digita o nome que quiser)
  const ESPECIALIDADES = [
    ['clinica geral', 'clinico geral', 'clinica medica', 'clinica', 'clinico', 'medico geral', 'medicina geral', 'medico clinico',
      'medicina interna', 'medicina de familia', 'medicina da familia', 'generalista'],
    ['pediatria', 'pediatra'],
    ['otorrinolaringologia', 'otorrinolaringologista', 'otorrino'],
    ['dermatologia', 'dermatologista', 'dermato'],
    ['ortopedia', 'ortopedista', 'ortopedia e traumatologia'],
    ['cardiologia', 'cardiologista', 'cardio'],
    ['oftalmologia', 'oftalmologista', 'oftalmo'],
    ['ginecologia', 'ginecologista', 'gineco', 'ginecologia e obstetricia'],
    ['psiquiatria', 'psiquiatra'],
  ];

  // Uma letra a mais, a menos, trocada ou fora de ordem ('clinca' ≈ 'clinica'). Palavras curtas precisam ser iguais,
  // e duas letras de diferença já é outra palavra ('radiologia' ≠ 'cardiologia').
  function palavraQuaseIgual(a, b) {
    if (a === b) return true;
    if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
    let i = 0;
    while (i < a.length && a[i] === b[i]) i += 1;
    const restoA = a.slice(i);
    const restoB = b.slice(i);
    return (
      restoA.slice(1) === restoB.slice(1) || // trocada
      restoA.slice(1) === restoB || // a mais
      restoA === restoB.slice(1) || // a menos
      (restoA[0] === restoB[1] && restoA[1] === restoB[0] && restoA.slice(2) === restoB.slice(2)) // fora de ordem
    );
  }

  function nomeQuaseIgual(a, b) {
    const x = a.split(' ');
    const y = b.split(' ');
    return x.length === y.length && x.every((palavra, i) => palavraQuaseIgual(palavra, y[i]));
  }

  // 'Clínica geral' = 'Clinico Geral' = 'CLINICA MÉDICA' = 'Clinca geral'
  // A comparação ignora acento, maiúsculas, pontuação e espaços, e aceita as variações da lista e uma letra errada por palavra.
  function mesmaEspecialidade(a, b) {
    const limpar = (nome) => semAcento(nome).replace(/[^a-z0-9]+/g, ' ').trim();
    const x = limpar(a);
    const y = limpar(b);
    if (x === y) return true;
    if (/^podiatr/.test(x) || /^podiatr/.test(y)) return false; // podiatria (pés) fica a uma letra de pediatria
    const ehDoGrupo = (nome) => (grupo) => grupo.some((variacao) => nomeQuaseIgual(nome, variacao));
    return nomeQuaseIgual(x, y) || ESPECIALIDADES.some((grupo) => ehDoGrupo(x)(grupo) && ehDoGrupo(y)(grupo));
  }

  const CRISE = /(suicid|me matar|me enforcar|automutil|tirar (a )?(minha |propria )+vida|acabar com (a )?minha vida|acabar com tudo|desistir d[ae] (vida|viver)|(quero|queria|prefiro|preferia|vontade de|melhor) (morrer|sumir)|nao (quero|aguento) mais (viver|existir)|nao quero viver|sem vontade de viver)/;

  const EMERGENCIA =
    /(dor no peito|aperto no peito|peito doendo|dor forte no peito|falta de ar|nao consigo respirar|dificuldade para respirar|desmai|convuls|boca torta|fraqueza de um lado|nao consegue falar|sangramento forte|sangrando muito|infarto|\bavc\b|inconsciente|engasg)/;

  // Prepara o texto antes de procurar as palavras: sem acento, sem pontuação e sem emojis, com um espaço só,
  // sem letras repetidas ("doooor") e com os erros e jeitos comuns de escrever uma emergência.
  function preparar(texto) {
    return semAcento(texto)
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/(.)\1{2,}/g, '$1')
      .replace(/\bpeit[ou]s?\b|\bpieto\b/g, 'peito')
      .replace(/\bdor(es)? (muito )?(forte )?(n[oa]|d[oe]) (meu )?peito/g, 'dor no peito')
      .replace(/\bpeito (dele |dela )?(esta |ta |muito )*(doi|doendo|apertado|apertando)/g, 'peito doendo')
      .replace(/\bsem ar\b(?! condicionado)/g, 'falta de ar')
      .replace(/\bfaltar? (de|d|o) ar\b|\bfaltando (o )?ar\b/g, 'falta de ar')
      .replace(/nao (estou|to|esta|ta) conseguindo respirar/g, 'nao consigo respirar')
      .replace(/fraqueza (em|no|num) (um )?lado/g, 'fraqueza de um lado')
      .replace(/(rosto|boca) (esta |ta |ficou )?tort[oa]/g, 'boca torta');
  }

  // Palavras que indicam o parentesco → o parentesco da API (o mesmo do site)
  const PARENTESCOS = [
    { palavras: /\b(filh[oa]|menin[oa]|bebe|crianca)\b/, relacao: 'Filho(a)', crianca: true },
    { palavras: /\b(mae|pai)\b/, relacao: 'Pai/Mãe' },
    { palavras: /\b(espos[oa]|marido|mulher)\b/, relacao: 'Cônjuge' },
    { palavras: /\b(irmao|irma)\b/, relacao: 'Irmão(ã)' },
  ];

  // Descobre de quem a pessoa está falando: pelo nome, depois pelo parentesco. Se não achar ninguém, é o titular.
  // naoCadastrado = falou de um parente que ainda não está na família.
  function descobrirQuem(t, familiares) {
    const titular = familiares.find((p) => p.titular) || familiares[0];
    const outros = familiares.filter((p) => !p.titular);

    // compara palavra por palavra (o nome é digitado pela pessoa e pode ter qualquer caractere)
    const porNome = outros.find((p) => {
      const nome = preparar(p.curto);
      return nome.length > 1 && ` ${t} `.includes(` ${nome} `);
    });
    if (porNome) return { quem: porNome, crianca: ehCrianca(porNome), naoCadastrado: false };

    const pista = PARENTESCOS.find((p) => p.palavras.test(t));
    if (pista) {
      // "meu filho": o mais novo, que é quem mais costuma ir ao pediatra
      const [achado] = outros.filter((p) => p.relacao === pista.relacao).sort((a, b) => (a.idade ?? 99) - (b.idade ?? 99));
      if (achado) return { quem: achado, crianca: ehCrianca(achado), naoCadastrado: false };
      return { quem: titular, crianca: !!pista.crianca, naoCadastrado: true };
    }
    return { quem: titular, crianca: ehCrianca(titular), naoCadastrado: false };
  }

  function ehCrianca(pessoa) {
    return pessoa.idade !== null && pessoa.idade !== undefined && pessoa.idade < 18;
  }

  // Sintoma → NOMES das especialidades (a primeira é a mais indicada). São nomes, e não ids, porque o id
  // de cada especialidade muda de clínica para clínica (F2); o nome é procurado nas especialidades da clínica.
  const SINTOMAS = [
    { palavras: /\b(ouvido|orelha|garganta|nariz|sinusite)/, nomes: ['Otorrinolaringologia', 'Clínica geral'] },
    { palavras: /\b(pele|mancha|coceira|cocam|coca(r|ndo)?\b|espinha|acne|cabelo caindo|unha|pinta(s)?\b)/, nomes: ['Dermatologia'] },
    { palavras: /\b(costas|coluna|joelho|ombro|torci|tornozelo|fratur|osso)/, nomes: ['Ortopedia', 'Clínica geral'] },
    { palavras: /\b(pressao|coracao|palpita|batedeira)/, nomes: ['Cardiologia', 'Clínica geral'] },
    { palavras: /\b(olho|vista|enxerg|visao|oculos)|\b(ve|ver|le|ler) o quadro/, nomes: ['Oftalmologia'] },
    { palavras: /\b(menstrua|gravid|preventivo|colica)/, nomes: ['Ginecologia', 'Clínica geral'] },
    { palavras: /\b(ansied|ansios|triste|depress|deprim|nao durmo|sem dormir|insonia|estresse|panico)/, nomes: ['Psiquiatria', 'Clínica geral'] },
    // queixas gerais: a clínica geral avalia e encaminha
    { palavras: /\b(dor|dores|doi|doendo|doid[oa]|febre|grip|resfri|tosse|catarro|enjo|vomit|diarre|tont|cansa|fraqueza|fraco|mal estar|passando mal|cabeca|barriga|estomago|dente|alerg|infec|machuc|ferid|inflam|check ?up|consulta|medico)/, nomes: ['Clínica geral'] },
  ];

  // reconhecido = false quando nenhuma palavra foi encontrada: a tela avisa e sugere a clínica geral
  function escolherEspecialidades(t, crianca) {
    const achado = SINTOMAS.find((s) => s.palavras.test(t));
    const nomes = achado ? achado.nomes : ['Clínica geral'];
    // criança: a pediatria vem primeiro
    return { nomes: crianca ? ['Pediatria', ...nomes.filter((n) => n !== 'Clínica geral')] : nomes, reconhecido: !!achado };
  }

  // O cartão de uma especialidade da clínica, com o primeiro horário livre (os horários já vieram na carga da página).
  // situacao: "livre" | "semHorario" (há médico: lista de espera) | "semMedico"
  function montarCartao(id) {
    const D = window.DADOS;
    const medicos = D.medicos.filter((m) => String(m.esp) === String(id) && D.horarios[m.id]);
    let primeiroHorario = null;
    medicos.forEach((medico) => D.horarios[medico.id].forEach((dia) => dia.horas.forEach((hora) => {
      if (!primeiroHorario || dia.data + hora < primeiroHorario.data + primeiroHorario.hora) primeiroHorario = { data: dia.data, hora, medico };
    })));
    const situacao = primeiroHorario ? "livre" : medicos.length > 0 ? "semHorario" : "semMedico";
    return { id, nome: D.especialidades[id].nome, duracao: D.especialidades[id].duracao, primeiroHorario, situacao };
  }

  // Devolve uma destas respostas:
  //   { tipo: "cvv" } | { tipo: "emergencia" } | { tipo: "naoEntendi" }
  //   { tipo: "sugestao", quem (pessoa), naoCadastrado, reconhecido, especialidades: [cartões], naoAtendidas: [nomes] }
  function analisar(texto) {
    const t = preparar(texto);

    if (CRISE.test(t)) return { tipo: "cvv" };
    if (EMERGENCIA.test(t)) return { tipo: "emergencia" };
    if (!/[a-z]/.test(t)) return { tipo: "naoEntendi" };

    const D = window.DADOS;
    const { quem, crianca, naoCadastrado } = descobrirQuem(t, D.pessoas.map((p) => Object.assign({}, p, { titular: String(p.id) === String(D.titular) })));
    const { nomes, reconhecido } = escolherEspecialidades(t, crianca);

    const naClinica = (nome) => Object.keys(D.especialidades).filter((id) => mesmaEspecialidade(D.especialidades[id].nome, nome));
    let achadas = nomes.flatMap(naClinica);
    const naoAtendidas = nomes.filter((nome) => naClinica(nome).length === 0);
    // a clínica não atende nenhuma das sugeridas: a clínica geral avalia e encaminha
    if (achadas.length === 0) achadas = naClinica("Clínica geral");

    return { tipo: "sugestao", quem, naoCadastrado, reconhecido, naoAtendidas, especialidades: achadas.map(montarCartao) };
  }

  /* A resposta na tela, igual no computador e no celular. o = { A, I, ligarClinica, adicionar (rota), balao (atributos do balão) } */
  function sugestaoHTML(r, o) {
    const { A, I } = o;
    const clinica = window.DADOS.clinica;
    const balao = (texto) => '<p class="balao balao--ele"' + (o.balao || "") + ">" + texto + "</p>";
    if (r.tipo === "naoEntendi") return balao("Não entendi. Escreva com palavras o que está sentindo, por exemplo: “dor de garganta e febre”.");

    const temCartao = r.especialidades.length > 0;
    let intro = r.quem.titular
      ? "Entendi. Pelo que você contou, estas especialidades podem ajudar:"
      : "Entendi. Para " + A.esc(r.quem.curto) + ", estas especialidades podem ajudar:";
    if (!r.reconhecido) intro = "Não reconheci um sintoma no que você escreveu. Pode contar de outro jeito, ou começar por aqui:";
    if (!temCartao) intro = "Entendi.";

    const cartoes = r.especialidades.map((e) => {
      const h = e.primeiroHorario;
      const rota = "#agendar/" + e.id + "/" + r.quem.id;
      const sub = {
        livre: h && "Próximo horário: " + A.relativo(h.data) + ", " + h.hora + " com " + A.esc(h.medico.nome),
        semHorario: "Sem horário disponível no momento",
        semMedico: "Sem horário disponível no momento: ainda não há médico nesta especialidade",
      }[e.situacao];
      return (
        '<a class="sugestao pressionavel" href="' + rota + '">' +
        '<span><span class="sugestao__esp" style="display:block">' + A.esc(e.nome) + '</span>' +
        '<span class="sugestao__sub" style="display:block">Consulta de ' + A.esc(e.duracao) + " minutos</span>" +
        '<span class="sugestao__sub" style="display:block">' + sub + "</span></span>" + I("chevron-right") + "</a>" +
        /* a fila é por médico: a próxima tela mostra cada um com "Entrar na lista de espera" */
        (e.situacao === "semHorario" ? '<a class="botao botao--menta botao--pequeno" href="' + rota + '" aria-label="Entrar na lista de espera de ' + A.esc(e.nome) + '">' + I("list-ordered") + "Entrar na lista de espera</a>" : "") +
        (e.situacao === "semMedico" ? o.ligarClinica("Ligar para a clínica") : "")
      );
    }).join("");

    return (
      balao(intro) +
      (r.naoCadastrado
        ? balao("Essa pessoa ainda não está na sua família. Para marcar para ela, adicione primeiro.") +
          '<a class="botao botao--secundario botao--pequeno" href="' + o.adicionar + '">' + I("plus") + "Adicionar familiar</a>"
        : "") +
      (temCartao ? '<div class="sugestoes">' + cartoes + "</div>" : "") +
      (r.naoAtendidas.length
        ? balao(A.esc(clinica.nome || "Sua clínica") + " não atende " + A.esc(r.naoAtendidas.join(" nem ")) + "." + (temCartao ? "" : " Ligue para a clínica para saber quem pode atender.")) +
          (temCartao ? "" : o.ligarClinica("Ligar para a clínica"))
        : "") +
      balao("Isto é uma orientação, não um diagnóstico. Se piorar, ou se aparecer febre alta, falta de ar ou dor forte, procure um pronto-socorro.")
    );
  }

  window.TRIAGEM = { analisar, mesmaEspecialidade, sugestaoHTML };
})();
