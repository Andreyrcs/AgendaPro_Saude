/* AgendaPro Saúde — o único lugar com o endereço da API.
   A API roda no mesmo computador que serve a web, na porta 5080. Por isso o endereço sai da própria página:
     aberta por http://localhost:5500    → API em http://localhost:5080
     aberta por http://192.168.0.10:5500 → API em http://192.168.0.10:5080 (apresentação, outro notebook da rede)
   Não há IP para trocar aqui. A origem com IP é liberada no CORS da API pelo apresentacao.cmd (docs/apresentacao.md). */
(function () {
  "use strict";
  const host = location.hostname;
  const ehIpDaRede = /^\d+\.\d+\.\d+\.\d+$/.test(host) && host !== "127.0.0.1";
  window.AGENDAPRO_CONFIG = {
    API_URL: "http://" + (ehIpDaRede ? host : "localhost") + ":5080",
    TEMPO_LIMITE_MS: 8000, // depois disso: "Não foi possível falar com o servidor" (seção 6.5)
  };
})();
