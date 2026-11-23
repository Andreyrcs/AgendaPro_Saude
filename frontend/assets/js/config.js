/* AgendaPro Saúde — o único lugar com o endereço da API.
   Na própria máquina: http://localhost:5080 (dotnet run --launch-profile http).
   Na apresentação com dois computadores: o IP do computador que roda a API, por exemplo
   http://192.168.0.10:5080 (dotnet run --launch-profile rede-local). Nesse caso, a origem da web
   (http://<IP>:5500) precisa estar liberada no CORS da API (backend/README.md, seção CORS). */
window.AGENDAPRO_CONFIG = {
  API_URL: "http://localhost:5080",
  TEMPO_LIMITE_MS: 8000, // depois disso: "Não foi possível falar com o servidor" (seção 6.5)
};
