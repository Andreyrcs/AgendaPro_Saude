// Configuração da conexão com a API (backend em ASP.NET).
//
// USAR_API_REAL
//   false → o app usa o banco em memória (src/dados/bancoSimulado.js) e funciona sem backend
//   true  → login e cadastro chamam a API de verdade
//
// ENDERECO_API
//   No celular, "localhost" é o próprio celular, e não o computador.
//   Use o IP do computador onde o backend está rodando, na mesma rede Wi-Fi.
//   Para descobrir o IP: no Windows, "ipconfig"; no Linux/Mac, "ip addr" ou "ifconfig".
//   O backend precisa escutar na rede: dotnet run --urls http://0.0.0.0:5000

export const config = {
  USAR_API_REAL: false,
  ENDERECO_API: 'http://192.168.0.10:5000',
  // Onde a web do AgendaPro está publicada (o cadastro abre a política de privacidade de lá)
  ENDERECO_WEB: 'http://192.168.0.10:5510',
  TEMPO_LIMITE_MS: 8000, // se a API não responder nesse tempo, o app avisa
};
