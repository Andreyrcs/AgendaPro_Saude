/* AgendaPro Saúde — máscaras dos campos dos cadastros.
   Basta marcar o campo: <input data-mascara="cpf">. Vale também para formulários criados depois (a escuta é no document).
     cpf 000.000.000-00 · cnpj 00.000.000/0000-00 · telefone (00) 00000-0000 ou (00) 0000-0000 · data dd/mm/aaaa
     crm UF 000000 (o "CRM/" fica fixo na frente do campo) · uf duas letras · codigo AAA-0000
   A máscara é só visual: cada tela continua mandando para a API o formato de sempre.
   Colar passa pela máscara ANTES do maxlength, para "CPF: 529.982.247-25" não perder os últimos números. */
(function () {
  "use strict";

  const numeros = (t) => String(t || "").replace(/\D/g, "");
  const letras = (t) => String(t || "").normalize("NFD").replace(/[^a-zA-Z]/g, "").toUpperCase();

  function cpf(t) {
    return numeros(t).slice(0, 11).replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  function cnpj(t) {
    return numeros(t).slice(0, 14).replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/\/(\d{4})(\d)/, "/$1-$2");
  }
  /* 10 números: fixo, (00) 0000-0000; 11 números: celular, (00) 00000-0000 */
  function telefone(t) {
    let n = numeros(t);
    if (n.length > 11 && /^\s*\+?\s*55/.test(t)) n = n.slice(2); /* colado com o código do Brasil */
    n = n.replace(/^0+/, "").slice(0, 11); /* DDD não começa com zero */
    if (n.length < 3) return n ? "(" + n : "";
    if (n.length < 7) return "(" + n.slice(0, 2) + ") " + n.slice(2);
    const meio = n.length === 11 ? 7 : 6;
    return "(" + n.slice(0, 2) + ") " + n.slice(2, meio) + "-" + n.slice(meio);
  }
  function data(t) {
    const iso = /^\s*(\d{4})-(\d{2})-(\d{2})/.exec(t);
    const n = iso ? iso[3] + iso[2] + iso[1] : numeros(t).slice(0, 8);
    return n.replace(/^(\d{2})(\d)/, "$1/$2").replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
  }
  /* a sigla do estado (2 letras) e só números */
  function crm(t) {
    const sigla = letras(t).replace(/^(CRM)+/, "").slice(0, 2); /* "CRM" digitado ou colado não conta */
    const n = sigla.length === 2 ? numeros(t).slice(0, 7) : "";
    return sigla + (n ? " " + n : "");
  }
  const uf = (t) => letras(t).slice(0, 2);
  function codigo(t) {
    const l = letras(t).slice(0, 3);
    const n = l.length === 3 ? numeros(t).slice(0, 4) : "";
    return l + (n ? "-" + n : "");
  }

  const MASCARAS = { cpf, cnpj, telefone, data, crm, uf, codigo };
  const COMPLETO = { cpf: 11, cnpj: 14, telefone: 10, data: 8 }; /* quantos números o valor inteiro tem */
  const mascaraDe = (el) => (el && el.dataset && el.readOnly !== true ? MASCARAS[el.dataset.mascara] : null);

  /* aplica a máscara e deixa o cursor depois do mesmo número (ou letra) em que ele estava */
  function aplicar(el, texto, cursor) {
    const novo = mascaraDe(el)(texto);
    const contam = (t) => t.replace(/[^a-zA-Z0-9]/g, "").length;
    const antes = contam(texto.slice(0, cursor));
    const noFim = cursor >= texto.length;
    if (el.value !== novo) el.value = novo;
    let i = novo.length;
    if (!noFim) for (i = 0; i < novo.length && contam(novo.slice(0, i)) < antes; i += 1);
    if (document.activeElement === el && el.setSelectionRange && el.type !== "email") el.setSelectionRange(i, i);
  }

  document.addEventListener("input", (ev) => {
    if (mascaraDe(ev.target)) aplicar(ev.target, ev.target.value, ev.target.selectionStart == null ? ev.target.value.length : ev.target.selectionStart);
  }, true);

  document.addEventListener("paste", (ev) => {
    const el = ev.target;
    if (!mascaraDe(el) || !ev.clipboardData) return;
    ev.preventDefault();
    let colado = ev.clipboardData.getData("text");
    const tipo = el.dataset.mascara;
    /* 1/5/1990 → 01/05/1990 */
    if (tipo === "data") colado = colado.replace(/^\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\s*$/, (_, d, m, a) => d.padStart(2, "0") + m.padStart(2, "0") + a);
    /* colou o valor inteiro: substitui o que estava no campo */
    const inteiro = COMPLETO[tipo] && numeros(colado).length >= COMPLETO[tipo];
    const ini = inteiro ? "" : el.value.slice(0, el.selectionStart);
    const fim = inteiro ? "" : el.value.slice(el.selectionEnd);
    aplicar(el, ini + colado + fim, (ini + colado).length);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, true);

  /* Nome, e-mail e outros textos: o limite fica no maxlength de cada campo (o tamanho da coluna no banco) */
  window.MASCARAS = MASCARAS;
})();
