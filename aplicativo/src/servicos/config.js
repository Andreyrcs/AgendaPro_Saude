// Configuração da conexão com a API (backend em ASP.NET).
//
// USAR_API_REAL
//   true → todas as telas falam com a API (Apêndice L); só o assistente de triagem roda no aparelho.
//   O banco simulado do começo do projeto foi retirado: não há mais caminho sem a API.
//
// ENDERECO_API
//   No celular, "localhost" é o próprio celular, e não o computador.
//   Use o IP do computador onde o backend está rodando, na mesma rede Wi-Fi.
//   Para descobrir o IP: no Windows, "ipconfig"; no Linux/Mac, "ip addr" ou "ifconfig".
//   O backend precisa escutar na rede, na porta 5080: dotnet run --launch-profile rede-local
//   (backend/README.md). Este é o único lugar do app com o endereço da API.

export const config = {
  USAR_API_REAL: true,
  ENDERECO_API: 'http://192.168.0.10:5080',
  // Onde a web do AgendaPro está publicada (o cadastro abre a política de privacidade de lá)
  ENDERECO_WEB: 'http://192.168.0.10:5510',
  TEMPO_LIMITE_MS: 8000, // se a API não responder nesse tempo, o app avisa
};
