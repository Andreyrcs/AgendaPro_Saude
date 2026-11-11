// Guarda a sessão (usuário logado e token) no celular com o AsyncStorage,
// para o paciente continuar logado quando reabrir o app.

import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVE = 'agendapro.sessao';

// { idUsuario, nome, email, token } ou null se ninguém entrou
export async function lerSessao() {
  try {
    const texto = await AsyncStorage.getItem(CHAVE);
    return texto ? JSON.parse(texto) : null;
  } catch (e) {
    return null; // sem sessão salva (ou salva com defeito): segue para o login
  }
}

export async function salvarSessao(usuario) {
  await AsyncStorage.setItem(CHAVE, JSON.stringify(usuario));
}

export async function apagarSessao() {
  await AsyncStorage.removeItem(CHAVE);
}
