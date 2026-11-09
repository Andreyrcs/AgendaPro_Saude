/* AgendaPro Saúde v2 — dados FICTÍCIOS da área da clínica.
   Hoje (terça, 20 de outubro de 2026) usa a agenda detalhada da v1; os outros dias
   são gerados com uma semente fixa, então os números são sempre os mesmos. */
(function () {
  "use strict";

  const D = window.DADOS;
  const MEDICOS = ["helena", "fernanda", "paulo", "camila", "luana", "andre"];
  const DURACAO = { paulo: 40 };
  const INICIO = 7 * 60;
  const FIM = 19 * 60;

  const hm = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const txt = (min) => String(Math.floor(min / 60)).padStart(2, "0") + ":" + String(Math.round(min % 60)).padStart(2, "0");
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const data = (s) => { const p = s.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const somaDias = (s, n) => { const d = data(s); d.setDate(d.getDate() + n); return iso(d); };
  const diasEntre = (a, b) => Math.round((data(b) - data(a)) / 86400000);

  /* Configuração da clínica: até quando a agenda fica aberta para marcar (2 meses à frente de hoje) */
  const ABRE_MESES = 2;
  const ABRE_ATE = (function () { const d = data(D.hoje); d.setMonth(d.getMonth() + ABRE_MESES); return iso(d); })();

  /* Agenda de hoje: [início, duração, paciente, situação] */
  const HOJE = {
    helena: [
      ["07:30", 30, "Antônio Carlos Ribeiro", "atendida"], ["08:00", 30, "Francisca Oliveira", "atendida"],
      ["08:30", 30, "Lucas Ferreira", "faltou"], ["09:00", 30, "Aline Souza", "atendida"],
      ["09:30", 30, "José Roberto Lima", "atendida"], ["10:30", 30, "Beatriz Nunes", "em"],
      ["11:00", 30, "Thiago Alves", "chegou"], ["11:30", 30, "Raimunda Costa", "confirmada"],
      ["14:00", 30, "Pedro Henrique Dias", "confirmada"], ["14:30", 30, "Ana Clara Mendes", "confirmada"],
      ["16:00", 30, "Márcia Gonçalves", "confirmada"],
    ],
    fernanda: [
      ["08:00", 30, "Kauã Pereira", "atendida"], ["08:30", 30, "Yasmin Freitas", "atendida"],
      ["09:30", 30, "Miguel Assis", "atendida"], ["10:00", 30, "Laura Batista", "atendida"],
      ["10:30", 30, "Heitor Carvalho", "em"], ["11:00", 30, "Sofia Almeida", "chegou"],
      ["13:00", 30, "Enzo Barros", "confirmada"], ["15:30", 30, "Davi Lucca Moreira", "confirmada"],
    ],
    paulo: [
      ["08:00", 40, "Sebastião Araújo", "atendida"], ["08:40", 40, "Sônia Cardoso", "atendida"],
      ["09:20", 40, "Benedito Silva", "atendida"], ["10:00", 40, "Iracema Tavares", "atendida"],
      ["10:40", 40, "Wellington Santos", "chegou"], ["11:20", 40, "Fátima Haddad", "confirmada"],
      ["14:00", 40, "Otávio Lopes", "confirmada"], ["14:40", 40, "Sebastião Rocha", "oferecida"],
      ["15:20", 40, "Cláudia Teixeira", "confirmada"],
    ],
    camila: [
      ["09:00", 30, "Letícia Barbosa", "atendida"], ["09:30", 30, "Gabriel Rocha", "atendida"],
      ["10:00", 30, "Natália Campos", "faltou"], ["10:30", 30, "Priscila Ramos", "em"],
      ["11:00", 30, "Hugo Martins", "confirmada"], ["13:30", 30, "Rosana Freire", "confirmada"],
      ["15:30", 30, "Daniel Kim", "confirmada"], ["16:00", 30, "Vitória Lima", "confirmada"],
    ],
    luana: [
      ["13:30", 30, "Rafael Moreira", "confirmada"], ["14:00", 30, "Joana Prado", "confirmada"],
      ["15:00", 30, "Celso Nakamura", "confirmada"],
    ],
    andre: [
      ["07:30", 30, "Marcos Paulo Reis", "atendida"], ["08:00", 30, "Elaine Duarte", "atendida"],
      ["10:00", 30, "Jorge Batista", "atendida"], ["11:30", 30, "Patrícia Lemos", "confirmada"],
      ["16:30", 30, "Severino Cunha", "confirmada"],
    ],
  };

  /* Expediente de cada médico: [início, fim] por dia da semana (0 = domingo) */
  const EXPEDIENTE = {
    helena: { semana: ["07:30", "17:00"], sabado: ["08:00", "12:00"] },
    fernanda: { semana: ["08:00", "16:30"], sabado: ["08:00", "12:00"] },
    paulo: { semana: ["08:00", "16:40"], sabado: null },
    camila: { semana: ["09:00", "17:00"], sabado: null },
    luana: { semana: ["13:30", "17:30"], sabado: null },
    andre: { semana: ["07:30", "17:30"], sabado: ["08:00", "12:00"] },
  };
  const OCUPACAO = { helena: 0.8, fernanda: 0.68, paulo: 0.86, camila: 0.9, luana: 0.5, andre: 0.6 };

  const PRIMEIROS = ["Ana", "Bruno", "Carla", "Diego", "Eliane", "Fábio", "Gisele", "Hélio", "Ivone", "Jéssica", "Kleber", "Lúcia", "Mateus", "Nair", "Otávio",
    "Paula", "Quitéria", "Renato", "Sueli", "Tiago", "Ubiratan", "Valéria", "Wagner", "Yara", "Zilda", "Akira", "Moacir", "Jaciara", "Kiara", "Raí",
    "Luzia", "Edson", "Maria José", "João Pedro", "Thaís", "Cícero", "Mariana", "Hiroshi", "Aparecida", "Ícaro"];
  const SOBRENOMES = ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Ferreira", "Almeida", "Costa", "Gomes", "Ribeiro", "Martins", "Carvalho",
    "Araújo", "Melo", "Barbosa", "Rocha", "Dias", "Nascimento", "Moreira", "Tanaka", "Guarani", "Yamada", "Cavalcanti", "Bezerra", "Teixeira", "Freitas"];

  function rng(semente) {
    let a = semente >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  let seq = 4800;
  const consultas = [];
  const hoje = D.hoje;

  function adicionar(medico, dia, ini, dur, paciente, status) {
    seq += 1;
    consultas.push({ id: "k" + seq, medico, data: dia, ini, dur, paciente, status });
  }

  function gerarDia(dia) {
    const dow = data(dia).getDay();
    if (dow === 0) return;
    if ((D.feriados || []).some((f) => f.data === dia)) return;
    if (dia === hoje) {
      MEDICOS.forEach((m) => HOJE[m].forEach(([h, dur, pac, st]) => adicionar(m, dia, hm(h), dur, pac, st)));
      return;
    }
    const sorte = rng(Number(dia.replace(/-/g, "")) * 7 + 13);
    /* quanto mais longe, mais vazia a agenda; vaga por cancelamento só nas próximas 3 semanas */
    const longe = diasEntre(hoje, dia);
    const fator = longe <= 21 ? 1 : Math.max(0.2, 1 - (longe - 21) / 45);
    MEDICOS.forEach((m) => {
      const exp = dow === 6 ? EXPEDIENTE[m].sabado : EXPEDIENTE[m].semana;
      if (!exp) return;
      const dur = DURACAO[m] || 30;
      for (let t = hm(exp[0]); t + dur <= hm(exp[1]); t += dur) {
        if (t >= 12 * 60 && t < 13 * 60) continue; /* almoço */
        const r = sorte();
        const nome = PRIMEIROS[Math.floor(sorte() * PRIMEIROS.length)] + " " + SOBRENOMES[Math.floor(sorte() * SOBRENOMES.length)];
        if (dia < hoje) {
          if (r < OCUPACAO[m]) adicionar(m, dia, t, dur, nome, sorte() < 0.09 ? "faltou" : "atendida");
        } else {
          if (r < OCUPACAO[m] * 0.92 * fator) adicionar(m, dia, t, dur, nome, "confirmada");
          else if (longe <= 21 && r < OCUPACAO[m]) adicionar(m, dia, t, dur, null, "vaga");
        }
      }
    });
  }

  for (let dia = "2026-09-28"; dia <= ABRE_ATE; dia = somaDias(dia, 1)) gerarDia(dia);

  /* Expediente como intervalos em minutos (para o mapa de calor) */
  function expediente(medico, dia) {
    const dow = data(dia).getDay();
    if (dow === 0 || (D.feriados || []).some((f) => f.data === dia)) return null;
    const e = dow === 6 ? EXPEDIENTE[medico].sabado : EXPEDIENTE[medico].semana;
    return e ? [hm(e[0]), hm(e[1])] : null;
  }

  /* Quem ainda está "Confirmada" e passou da tolerância de atraso vira falta. Só vale para hoje.
     Devolve as consultas que mudaram, para a tela avisar. */
  function aplicarFaltas(minutoAgora) {
    const limite = D.politica.toleranciaMin;
    const mudou = [];
    consultas.forEach((k) => {
      if (k.data === D.hoje && k.status === "confirmada" && minutoAgora >= k.ini + limite) {
        k.status = "faltou";
        k.faltaAuto = true;
        mudou.push(k);
      }
    });
    return mudou;
  }

  window.CLIDADOS = { aplicarFaltas, MEDICOS, DURACAO, INICIO, FIM, ABRE_MESES, ABRE_ATE, EXPEDIENTE, consultas, expediente, hm, txt, iso, data, somaDias };
})();
