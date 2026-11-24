// Configuração da conexão com a API (backend em ASP.NET).
//
// USAR_API_REAL
//   true → todas as telas falam com a API (Apêndice L); só o assistente de triagem roda no aparelho.
//   O banco simulado do começo do projeto foi retirado: não há mais caminho sem a API.
//
// IP_DA_CONEXAO
//   O IP do computador onde o backend e a web estão rodando, na mesma rede Wi-Fi do celular.
//   No celular, "localhost" é o próprio celular, e não o computador.
//   Na apresentação, o apresentacao.cmd informa o IP sozinho (EXPO_PUBLIC_IP_CONEXAO): não precisa mexer aqui.
//   O IP escrito abaixo só vale para quem roda "npx expo start" à mão (para descobrir: "ipconfig", linha IPv4).
//   O backend precisa escutar na rede, na porta 5080: dotnet run --launch-profile rede-local
//   (backend/README.md). Este é o único lugar do app com o endereço da API.

const IP_DA_CONEXAO = process.env.EXPO_PUBLIC_IP_CONEXAO || '192.168.1.121';

export const config = {
  USAR_API_REAL: true,
  ENDERECO_API: `http://${IP_DA_CONEXAO}:5080`,
  // Onde a web do AgendaPro está publicada (o cadastro abre a política de privacidade de lá)
  ENDERECO_WEB: `http://${IP_DA_CONEXAO}:5500`,
  TEMPO_LIMITE_MS: 8000, // se a API não responder nesse tempo, o app avisa
};
