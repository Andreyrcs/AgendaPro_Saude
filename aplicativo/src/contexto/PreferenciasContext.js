// Preferências de acessibilidade.
// "Reduzir movimento" fica ligado se o celular pedir (opção do sistema)
// OU se o paciente ligar o interruptor na tela de Perfil.

import { createContext, useContext, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVE = 'agendapro.reduzirMovimento';

const PreferenciasContext = createContext(null);

export function PreferenciasProvider({ children }) {
  const [sistemaPede, setSistemaPede] = useState(false);
  const [pacientePediu, setPacientePediu] = useState(false);

  useEffect(() => {
    // Opção "reduzir movimento" do celular (iOS e Android)
    AccessibilityInfo.isReduceMotionEnabled().then(setSistemaPede).catch(() => {});
    const assinatura = AccessibilityInfo.addEventListener('reduceMotionChanged', setSistemaPede);

    // Escolha salva pelo paciente no Perfil
    AsyncStorage.getItem(CHAVE)
      .then((valor) => setPacientePediu(valor === 'sim'))
      .catch(() => {});

    return () => assinatura.remove();
  }, []);

  function definirReduzirMovimento(ligado) {
    setPacientePediu(ligado);
    AsyncStorage.setItem(CHAVE, ligado ? 'sim' : 'nao').catch(() => {});
  }

  const valor = {
    reduzirMovimento: sistemaPede || pacientePediu,
    sistemaPede,
    pacientePediu,
    definirReduzirMovimento,
  };

  return <PreferenciasContext.Provider value={valor}>{children}</PreferenciasContext.Provider>;
}

export function usePreferencias() {
  return useContext(PreferenciasContext);
}
