// Guarda quem está logado e salva isso no celular (AsyncStorage),
// para o paciente não precisar entrar de novo toda vez que abrir o app.

import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { definirToken } from '../servicos/api';

const CHAVE = 'agendapro.sessao';

const SessaoContext = createContext(null);

export function SessaoProvider({ children }) {
  const [usuario, setUsuario] = useState(null); // { idUsuario, nome, email, token }
  const [carregandoSessao, setCarregandoSessao] = useState(true);

  // Ao abrir o app: tenta recuperar a sessão salva
  useEffect(() => {
    AsyncStorage.getItem(CHAVE)
      .then((texto) => {
        if (texto) {
          const salvo = JSON.parse(texto);
          definirToken(salvo.token);
          setUsuario(salvo);
        }
      })
      .catch(() => {}) // sem sessão salva: segue para o login
      .finally(() => setCarregandoSessao(false));
  }, []);

  async function abrirSessao(novoUsuario) {
    definirToken(novoUsuario.token);
    setUsuario(novoUsuario);
    await AsyncStorage.setItem(CHAVE, JSON.stringify(novoUsuario));
  }

  async function sair() {
    definirToken(null);
    setUsuario(null);
    await AsyncStorage.removeItem(CHAVE);
  }

  return (
    <SessaoContext.Provider value={{ usuario, carregandoSessao, abrirSessao, sair }}>
      {children}
    </SessaoContext.Provider>
  );
}

export function useSessao() {
  return useContext(SessaoContext);
}
