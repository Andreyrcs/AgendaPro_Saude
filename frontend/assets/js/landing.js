/* AgendaPro Saúde: página inicial. Ondas de pontos, celular ilustrado e passos que trocam a tela. */
(function () {
  "use strict";

  const A = window.AP;
  const D = window.DADOS;
  const raiz = document.documentElement;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduzido = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function lerPref(chave, padrao) {
    try { return localStorage.getItem("ap-" + chave) || padrao; } catch (e) { return padrao; }
  }
  function gravarPref(chave, valor) {
    try { localStorage.setItem("ap-" + chave, valor); } catch (e) { /* sem armazenamento: vale só nesta visita */ }
  }
  function aplicarTexto(valor) {
    if (valor === "normal") delete raiz.dataset.texto; else raiz.dataset.texto = valor;
  }
  aplicarTexto(lerPref("texto", "normal"));

  /* ─── Marca, avatares e folhas do app ─── */
  $$("[data-marca]").forEach((el) => { el.innerHTML = A.marca(Number(el.dataset.marca)); });
  $$("[data-avatar]").forEach((el) => {
    const pessoa = D.pessoas.find((p) => p.id === el.dataset.avatar);
    el.outerHTML = el.classList.length
      ? '<span class="' + el.className + '">' + A.avatar(pessoa, Number(el.dataset.tam) || 48) + "</span>"
      : A.avatar(pessoa, 48);
  });
  $$("[data-folha]").forEach((el) => {
    el.outerHTML = A.folha(el.dataset.folha, { menta: "menta" in el.dataset });
  });

  /* Corpo 3D dos celulares: lâminas atrás da frente, do aro claro ao fundo escuro, botões e reflexo */
  function encorpar(cel) {
    const largura = cel.getBoundingClientRect().width || 300;
    const prof = Math.max(8, Math.round(largura * 0.05));
    cel.style.setProperty("--prof", prof + "px");
    let html = "";
    for (let k = 1; k <= prof; k++) {
      const f = k / prof;
      const luz = Math.round(118 - 70 * Math.min(1, f * 1.6));
      const cor = k === prof ? "#121417" : "rgb(" + luz + "," + (luz + 5) + "," + (luz + 11) + ")";
      html += '<i class="cel__camada" style="--z:-' + k + "px;--cor:" + cor + '"></i>';
    }
    html += '<i class="cel__botao cel__botao--1"></i><i class="cel__botao cel__botao--2"></i><i class="cel__botao cel__botao--3"></i>';
    cel.insertAdjacentHTML("afterbegin", html);
    const vidro = cel.querySelector(".cel__vidro");
    if (vidro) vidro.insertAdjacentHTML("beforeend", '<i class="cel__brilho"></i>');
  }
  $$(".cel").forEach(encorpar);

  /* O celular da abertura acompanha o mouse de leve, com inércia */
  (function seguirMouse() {
    const cel = $(".cel--inclinado");
    if (!cel || reduzido() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let alvoX = 0, alvoY = 0, x = 0, y = 0, rodando = false;
    function passo() {
      x += (alvoX - x) * 0.08;
      y += (alvoY - y) * 0.08;
      cel.style.setProperty("--mx", x.toFixed(2) + "deg");
      cel.style.setProperty("--my", y.toFixed(2) + "deg");
      if (Math.abs(alvoX - x) > 0.01 || Math.abs(alvoY - y) > 0.01) requestAnimationFrame(passo);
      else rodando = false;
    }
    window.addEventListener("pointermove", (ev) => {
      if (window.scrollY > window.innerHeight) return;
      alvoY = (ev.clientX / window.innerWidth - 0.5) * 16;
      alvoX = (ev.clientY / window.innerHeight - 0.5) * -10;
      if (!rodando) { rodando = true; requestAnimationFrame(passo); }
    }, { passive: true });
  })();

  /* Mês de outubro no celular da abertura */
  (function montarMes() {
    const alvo = $("#dias-mes");
    if (!alvo) return;
    const marcados = { 2: 1, 23: 1, 28: 1 };
    const feriados = { 12: 1 };
    let html = "";
    for (let i = 0; i < new Date(2026, 9, 1).getDay(); i++) html += "<span></span>";
    for (let dia = 1; dia <= 31; dia++) {
      const domingo = new Date(2026, 9, dia).getDay() === 0;
      const classes = [];
      if (domingo || feriados[dia]) classes.push("vermelho");
      if (dia === 20) classes.push("hoje");
      if (marcados[dia]) classes.push("marcado");
      html += '<span class="' + classes.join(" ") + '">' + dia + "</span>";
    }
    alvo.innerHTML = html;
  })();

  /* ─── Ondas de pontos: uma malha cujo tamanho segue ondas que correm da esquerda para a direita ─── */
  function ondas(canvas, opcoes) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    const cor = opcoes.cor;
    const passo = opcoes.passo || 15;
    let largura = 0;
    let altura = 0;
    let rodando = false;
    let visivel = true;
    let quadro = 0;
    let inicio = performance.now();

    function medir() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      largura = r.width;
      altura = r.height;
      canvas.width = Math.round(largura * dpr);
      canvas.height = Math.round(altura * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function desenhar(t) {
      ctx.clearRect(0, 0, largura, altura);
      const faixas = 7;
      const caminhos = Array.from({ length: faixas }, () => new Path2D());
      const raioMax = passo * 0.21;
      for (let y = passo / 2; y < altura; y += passo) {
        for (let x = passo / 2; x < largura; x += passo) {
          const nx = x / largura;
          const curva = Math.sin(y * 0.0055 + nx * 2.4 + t * 0.12) * 2.8 + Math.sin(y * 0.0019 - nx * 1.6) * 1.5;
          const fase = x * 0.0088 - t * 0.6 + curva;
          let onda = 0.5 + 0.5 * Math.sin(fase);
          onda = onda * onda * onda;
          const peso = opcoes.peso(nx, y / altura) * (largura < 700 ? 0.5 : 1);
          const v = onda * peso;
          if (v < 0.04) continue;
          const faixa = Math.min(faixas - 1, Math.floor(v * faixas));
          const raio = 0.5 + raioMax * v;
          caminhos[faixa].moveTo(x + raio, y);
          caminhos[faixa].arc(x, y, raio, 0, Math.PI * 2);
        }
      }
      caminhos.forEach((c, i) => {
        ctx.fillStyle = "rgba(" + cor + "," + (0.1 + (i / faixas) * opcoes.alfa).toFixed(3) + ")";
        ctx.fill(c);
      });
    }

    function laco(agora) {
      if (!rodando) return;
      desenhar((agora - inicio) / 1000);
      quadro = requestAnimationFrame(laco);
    }
    function ligar() {
      if (rodando || reduzido() || !visivel || document.hidden) return;
      rodando = true;
      quadro = requestAnimationFrame(laco);
    }
    function desligar() {
      rodando = false;
      cancelAnimationFrame(quadro);
    }

    medir();
    desenhar(2.4);
    if ("ResizeObserver" in window) {
      new ResizeObserver(() => { medir(); if (!rodando) desenhar((performance.now() - inicio) / 1000 + 2.4); }).observe(canvas);
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((e) => { visivel = e[0].isIntersecting; if (visivel) ligar(); else desligar(); }).observe(canvas);
    }
    document.addEventListener("visibilitychange", () => { if (document.hidden) desligar(); else ligar(); });
    inicio -= 2400;
    ligar();
  }

  ondas($("#ondas"), {
    cor: "18,38,63",
    alfa: 0.4,
    passo: 15,
    /* mais forte à direita, quase sumindo atrás do texto */
    peso: (nx, ny) => 0.22 + 0.78 * Math.min(1, Math.max(0, (nx - 0.28) / 0.5)) * (0.75 + 0.25 * Math.sin(ny * 3)),
  });
  ondas($("#ondas-final"), {
    cor: "245,244,236",
    alfa: 0.55,
    passo: 16,
    peso: (nx) => 0.25 + 0.75 * Math.min(1, Math.max(0, (nx - 0.35) / 0.45)),
  });

  /* ─── Topo: a marca aparece quando a assinatura sai de vista; a seção atual fica marcada ─── */
  const topo = $("#topo");
  const assinatura = $(".assinatura");
  if ("IntersectionObserver" in window && assinatura) {
    topo.classList.add("topo--na-abertura");
    new IntersectionObserver((e) => {
      topo.classList.toggle("topo--na-abertura", e[0].isIntersecting);
    }, { rootMargin: "-80px 0px 0px 0px" }).observe(assinatura);

    const links = $$(".ilha__nucleo a[data-secao]");
    const secoes = links.map((a) => document.getElementById(a.dataset.secao)).filter(Boolean);
    const marcar = (id) => links.forEach((a) => a.setAttribute("aria-current", String(a.dataset.secao === id)));
    const obsSecoes = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => { if (e.isIntersecting) marcar(e.target.id); });
    }, { rootMargin: "-45% 0px -50% 0px" });
    secoes.forEach((s) => obsSecoes.observe(s));
    marcar("inicio");
  }

  /* ─── Revelação ao rolar ─── */
  const revelar = $$(".revela");
  if ("IntersectionObserver" in window && !reduzido()) {
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("visivel");
        obs.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    revelar.forEach((el) => obs.observe(el));
  } else {
    revelar.forEach((el) => el.classList.add("visivel"));
  }

  /* ─── Como funciona: o celular preso troca de tela conforme o passo ─── */
  const vidro = $("#palco-vidro");
  const passos = $$(".passo");
  if (vidro && passos.length) {
    passos.forEach((p, i) => {
      const app = $(".passo__tela .app", p).cloneNode(true);
      app.dataset.passo = String(i);
      vidro.insertBefore(app, vidro.querySelector(".cel__brilho"));
    });
    const telas = $$(".app", vidro);
    const ativar = (i) => {
      passos.forEach((p, j) => p.classList.toggle("ativo", j === i));
      telas.forEach((t, j) => t.classList.toggle("ativo", j === i));
    };
    ativar(0);
    if ("IntersectionObserver" in window) {
      const obs = new IntersectionObserver((entradas) => {
        entradas.forEach((e) => { if (e.isIntersecting) ativar(Number(e.target.dataset.passo)); });
      }, { rootMargin: "-48% 0px -48% 0px" });
      passos.forEach((p) => obs.observe(p));
    }
  }

  /* ─── Tamanho do texto: o mesmo ajuste do app ─── */
  const tamanhos = $$("#tamanhos [role=radio]");
  function pintar(valor) {
    tamanhos.forEach((b) => {
      const sim = b.dataset.texto === valor;
      b.setAttribute("aria-checked", String(sim));
      b.tabIndex = sim ? 0 : -1;
    });
  }
  function escolher(valor) {
    const controle = $("#tamanhos");
    const antes = controle.getBoundingClientRect().top;
    gravarPref("texto", valor);
    aplicarTexto(valor);
    pintar(valor);
    window.scrollBy({ top: controle.getBoundingClientRect().top - antes, behavior: "instant" });
  }
  tamanhos.forEach((b, i) => {
    b.addEventListener("click", () => escolher(b.dataset.texto));
    b.addEventListener("keydown", (ev) => {
      const d = ev.key === "ArrowRight" || ev.key === "ArrowDown" ? 1 : ev.key === "ArrowLeft" || ev.key === "ArrowUp" ? -1 : 0;
      if (!d) return;
      ev.preventDefault();
      const alvo = tamanhos[(i + d + tamanhos.length) % tamanhos.length];
      escolher(alvo.dataset.texto);
      alvo.focus();
    });
  });
  pintar(lerPref("texto", "normal"));
})();
