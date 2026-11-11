// Guarda quem está logado (usuário e token) e mantém isso salvo no celular (servicos/sessao.js),
// para o paciente não precisar entrar de novo toda vez que abrir o app.
// A navegação (navegacao/Navegacao.js) mostra Login/Cadastro ou as abas conforme "usuario".

import { createContext, useContext, useEffect, useState } from 'react';
import { definirToken } from '../servicos/api';
import { apagarSessao, lerSessao, salvarSessao } from '../servicos/sessao';

const SessaoContext = createContext(null);

export function SessaoProvider({ children }) {
  const [usuario, setUsuario] = useState(null); // { idUsuario, nome, email, token }
  const [carregandoSessao, setCarregandoSessao] = useState(true);

  // Ao abrir o app: recupera a sessão salva, se houver
  useEffect(() => {
    lerSessao()
      .then((salvo) => {
        if (salvo) {
          definirToken(salvo.token);
          setUsuario(salvo);
        }
      })
      .finally(() => setCarregandoSessao(false));
  }, []);

  async function abrirSessao(novoUsuario) {
    definirToken(novoUsuario.token);
    await salvarSessao(novoUsuario);
    setUsuario(novoUsuario); // a navegação troca sozinha para as abas
  }

  // "Sair" do Perfil: apaga a sessão e a navegação volta sozinha para o Login
  async function sair() {
    definirToken(null);
    await apagarSessao();
    setUsuario(null);
  }

  return (
    <SessaoContext.Provider value={{ usuario, token: usuario ? usuario.token : null, carregandoSessao, abrirSessao, sair }}>
      {children}
    </SessaoContext.Provider>
  );
}

export function useSessao() {
  return useContext(SessaoContext);
}
