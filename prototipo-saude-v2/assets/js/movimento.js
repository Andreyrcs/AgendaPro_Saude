/* AgendaPro Saúde v2 — kit de movimento compartilhado (app e clínica)
   Regras (Emil Kowalski): só transform e opacity; ease-out para entrar, ease-in-out para mover;
   mola só em arrastar, encaixar e carimbar; com "reduzir movimento", tudo vira opacidade. */
(function () {
  "use strict";

  const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
  const EASE_IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)";
  const EASE_GAVETA = "cubic-bezier(0.32, 0.72, 0, 1)";

  function reduzido() {
    return document.documentElement.dataset.movimento === "reduzido" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* ─── Mola: oscilador amortecido amostrado como curva linear() ───
     Parâmetros no estilo Apple: duração percebida e "bounce" (0 = sem quique). */
  const suportaLinear = (function () {
    try { return CSS.supports("animation-timing-function", "linear(0, 1)"); } catch (e) { return false; }
  })();
  const cacheMola = {};

  function mola(opcoes) {
    const duracao = (opcoes && opcoes.duracao) || 0.5;
    const bounce = Math.min(Math.max((opcoes && opcoes.bounce) || 0, 0), 0.6);
    const chave = duracao + "|" + bounce;
    if (cacheMola[chave]) return cacheMola[chave];

    const zeta = 1 - bounce;
    const w0 = (2 * Math.PI) / duracao;
    const x = (t) => {
      if (zeta >= 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
    };
    /* tempo até assentar (fica a menos de 0,1% do destino) */
    let fim = duracao;
    for (let t = 0; t < 4; t += 0.004) {
      let assentou = true;
      for (let k = t; k < t + 0.25; k += 0.01) if (Math.abs(1 - x(k)) > 0.001) { assentou = false; break; }
      if (assentou) { fim = t; break; }
    }
    const pontos = [];
    const N = 48;
    for (let i = 0; i <= N; i++) pontos.push(+x((fim * i) / N).toFixed(4));
    pontos[N] = 1;
    const r = {
      easing: suportaLinear ? "linear(" + pontos.join(", ") + ")" : EASE_OUT,
      duracao: Math.round(fim * 1000),
    };
    cacheMola[chave] = r;
    return r;
  }

  /* ─── FLIP: anima um elemento da posição antiga até onde ele está agora ─── */
  function flip(el, de, opcoes) {
    opcoes = opcoes || {};
    const para = el.getBoundingClientRect();
    if (!de || !para.width) return null;
    const dx = de.left - para.left;
    const dy = de.top - para.top;
    const sx = opcoes.escala ? de.width / para.width : 1;
    const sy = opcoes.escala ? de.height / para.height : 1;
    if (reduzido()) {
      return el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "ease" });
    }
    const m = opcoes.mola ? mola(opcoes.mola) : null;
    return el.animate(
      [
        { transformOrigin: "top left", transform: "translate(" + dx + "px," + dy + "px) scale(" + sx + "," + sy + ")" },
        { transformOrigin: "top left", transform: "none" },
      ],
      { duration: m ? m.duracao : opcoes.duracao || 300, easing: m ? m.easing : opcoes.easing || EASE_IN_OUT }
    );
  }

  /* ─── Contador animado (números do topo da clínica, posição na fila) ─── */
  function contador(el, para, opcoes) {
    opcoes = opcoes || {};
    const de = Number(el.dataset.valor != null ? el.dataset.valor : el.textContent) || 0;
    el.dataset.valor = para;
    const formato = opcoes.formato || ((n) => String(n));
    if (de === para) { el.textContent = formato(para); return; }
    if (reduzido()) {
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 100 }).finished.then(() => {
        el.textContent = formato(para);
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
      });
      return;
    }
    const dur = opcoes.duracao || Math.min(900, 260 + Math.abs(para - de) * 22);
    const t0 = performance.now();
    const passo = (agora) => {
      const p = Math.min((agora - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 4);
      el.textContent = formato(Math.round(de + (para - de) * e));
      if (p < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
    if (opcoes.pulso !== false) {
      el.animate([{ transform: "translateY(0)" }, { transform: "translateY(-3px)" }, { transform: "translateY(0)" }], { duration: 320, easing: EASE_OUT });
    }
  }

  /* ─── Número que rola (ex.: "4º" → "3º") ─── */
  function rolar(el, novo, direcao) {
    const velho = el.textContent;
    if (velho === novo) return Promise.resolve();
    if (reduzido()) {
      return el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120 }).finished.then(() => {
        el.textContent = novo;
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
      });
    }
    el.innerHTML = '<span class="rolo"><span class="rolo__trilho"><span>' + velho + "</span><span>" + novo + "</span></span></span>";
    const rolo = el.querySelector(".rolo");
    const trilho = el.querySelector(".rolo__trilho");
    const h = trilho.firstElementChild.getBoundingClientRect().height;
    rolo.style.height = h + "px";
    const sobe = direcao !== "desce";
    const quadros = sobe
      ? [{ transform: "translateY(0)" }, { transform: "translateY(-" + h + "px)" }]
      : [{ transform: "translateY(-" + h + "px)" }, { transform: "translateY(0)" }];
    if (!sobe) trilho.insertBefore(trilho.lastElementChild, trilho.firstElementChild);
    return trilho.animate(quadros, { duration: 560, easing: EASE_IN_OUT, fill: "forwards" })
      .finished.then(() => { el.textContent = novo; });
  }

  /* ─── Tremor curto: "aqui não dá" ─── */
  function tremer(el) {
    if (reduzido()) return el.animate([{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], { duration: 260 });
    return el.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(-7px)" }, { transform: "translateX(6px)" }, { transform: "translateX(-4px)" }, { transform: "translateX(2px)" }, { transform: "translateX(0)" }],
      { duration: 340, easing: "ease-out" }
    );
  }

  /* ─── Chuva de folhinhas: comemoração curta (12 peças, ~900ms) ─── */
  function chuvaDeFolhas(alvo) {
    if (reduzido()) return;
    const caixa = alvo.getBoundingClientRect();
    const camada = document.createElement("div");
    camada.className = "chuva-folhas";
    camada.setAttribute("aria-hidden", "true");
    camada.style.cssText = "position:fixed;left:" + caixa.left + "px;top:" + caixa.top + "px;width:" + caixa.width + "px;height:" + caixa.height + "px;pointer-events:none;z-index:60;overflow:visible";
    document.body.appendChild(camada);
    const cores = ["var(--menta)", "var(--noite)", "var(--menta)", "#ffffff"];
    let ultimas = [];
    for (let i = 0; i < 12; i++) {
      const f = document.createElement("span");
      f.className = "chuva-folhas__folha";
      f.style.setProperty("--faixa", cores[i % cores.length]);
      const x0 = caixa.width * (0.15 + Math.random() * 0.7);
      const dx = (Math.random() - 0.5) * 140;
      const giro = (Math.random() - 0.5) * 540;
      const queda = caixa.height * 0.55 + Math.random() * 120;
      f.style.left = x0 + "px";
      f.style.top = caixa.height * 0.25 + "px";
      camada.appendChild(f);
      ultimas.push(
        f.animate(
          [
            { transform: "translate(0,0) rotate(0deg) scale(0.6)", opacity: 0 },
            { transform: "translate(" + dx * 0.3 + "px,-" + (60 + Math.random() * 50) + "px) rotate(" + giro * 0.3 + "deg) scale(1)", opacity: 1, offset: 0.3 },
            { transform: "translate(" + dx + "px," + queda + "px) rotate(" + giro + "deg) scale(0.9)", opacity: 0 },
          ],
          { duration: 820 + Math.random() * 180, delay: i * 18, easing: "cubic-bezier(0.2, 0.6, 0.35, 1)", fill: "forwards" }
        )
      );
    }
    Promise.all(ultimas.map((a) => a.finished)).then(() => camada.remove(), () => camada.remove());
  }

  /* ─── Canal entre páginas: clínica ⇄ app ⇄ página inicial ───
     Dentro de um iframe, avisa a página-mãe por postMessage. Em abas separadas, usa o
     evento "storage". Cada mensagem tem um id, para não ser tratada duas vezes. */
  const CHAVE = "ap-canal";
  const vistos = new Set();
  function enviar(msg) {
    msg = Object.assign({ id: Math.random().toString(36).slice(2), t: Date.now() }, msg);
    vistos.add(msg.id);
    try { if (window.parent !== window) window.parent.postMessage({ ap: msg }, "*"); } catch (e) { /* sem página-mãe */ }
    try { localStorage.setItem(CHAVE, JSON.stringify(msg)); } catch (e) { /* sem armazenamento */ }
    return msg;
  }
  function ouvir(fn) {
    const entregar = (msg) => {
      if (!msg || !msg.tipo || vistos.has(msg.id)) return;
      vistos.add(msg.id);
      fn(msg);
    };
    window.addEventListener("message", (ev) => { if (ev.data && ev.data.ap) entregar(ev.data.ap); });
    window.addEventListener("storage", (ev) => {
      if (ev.key !== CHAVE || !ev.newValue) return;
      try { entregar(JSON.parse(ev.newValue)); } catch (e) { /* mensagem inválida */ }
    });
  }

  function esperar(ms) {
    return new Promise((r) => setTimeout(r, reduzido() ? Math.min(ms, 160) : ms));
  }

  window.MOV = {
    EASE_OUT, EASE_IN_OUT, EASE_GAVETA,
    reduzido, mola, flip, contador, rolar, tremer, chuvaDeFolhas, esperar,
    canal: { enviar, ouvir },
  };
})();
