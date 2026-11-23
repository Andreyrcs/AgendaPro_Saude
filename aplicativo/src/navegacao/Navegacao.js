// Navegação principal.
// Sem ninguém logado → telas de Login e Cadastro.
// Com alguém logado → as abas do app.
// (É o padrão de autenticação recomendado pelo React Navigation.)

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSessao } from '../contexto/SessaoContext';
import { usePreferencias } from '../contexto/PreferenciasContext';
import { Carregando } from '../componentes/Estados';
import LoginTela from '../telas/LoginTela';
import CadastroTela from '../telas/CadastroTela';
import SemClinicaTela from '../telas/SemClinicaTela';
import Abas from './Abas';

const Pilha = createNativeStackNavigator();

export default function Navegacao() {
  const { usuario, carregandoSessao } = useSessao();
  const { reduzirMovimento } = usePreferencias();

  if (carregandoSessao) return <Carregando texto="Abrindo o app…" />;

  return (
    <Pilha.Navigator
      screenOptions={{ headerShown: false, animation: reduzirMovimento ? 'none' : 'default' }}
    >
      {usuario && usuario.clinicaId === null ? (
        // A API disse que a conta não tem clínica: explica como escolher, em vez de abrir abas sem saída
        <Pilha.Screen name="SemClinica" component={SemClinicaTela} />
      ) : usuario ? (
        <Pilha.Screen name="Abas" component={Abas} />
      ) : (
        <>
          <Pilha.Screen name="Login" component={LoginTela} />
          <Pilha.Screen name="Cadastro" component={CadastroTela} />
        </>
      )}
    </Pilha.Navigator>
  );
}
