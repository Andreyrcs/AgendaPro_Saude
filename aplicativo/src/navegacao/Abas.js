// As 5 abas do app. Cada aba tem a sua própria pilha de telas,
// para o botão "Voltar" funcionar dentro dela (ex.: Agenda → Detalhe da consulta).

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { usePreferencias } from '../contexto/PreferenciasContext';
import BarraAbas from './BarraAbas';

import InicioTela from '../telas/InicioTela';
import AssistenteTela from '../telas/AssistenteTela';
import AgendarTela from '../telas/AgendarTela';
import AgendaTela from '../telas/AgendaTela';
import ConsultaTela from '../telas/ConsultaTela';
import EsperaTela from '../telas/EsperaTela';
import PosConsultaTela from '../telas/PosConsultaTela';
import NotificacoesTela from '../telas/NotificacoesTela';
import FamiliaTela from '../telas/FamiliaTela';
import PessoaTela from '../telas/PessoaTela';
import AdicionarFamiliarTela from '../telas/AdicionarFamiliarTela';
import PrevencaoTela from '../telas/PrevencaoTela';
import AdicionarPrevencaoTela from '../telas/AdicionarPrevencaoTela';
import PerfilTela from '../telas/PerfilTela';

const Aba = createBottomTabNavigator();
const PilhaInicio = createNativeStackNavigator();
const PilhaAgenda = createNativeStackNavigator();
const PilhaFamilia = createNativeStackNavigator();
const PilhaPrevencao = createNativeStackNavigator();

function useOpcoesDaPilha() {
  const { reduzirMovimento } = usePreferencias();
  return { headerShown: false, animation: reduzirMovimento ? 'none' : 'default' };
}

function InicioAba() {
  return (
    <PilhaInicio.Navigator screenOptions={useOpcoesDaPilha()}>
      <PilhaInicio.Screen name="Inicio" component={InicioTela} />
      <PilhaInicio.Screen name="Assistente" component={AssistenteTela} />
      <PilhaInicio.Screen name="Agendar" component={AgendarTela} />
      <PilhaInicio.Screen name="Consulta" component={ConsultaTela} />
      <PilhaInicio.Screen name="Espera" component={EsperaTela} />
      <PilhaInicio.Screen name="PosConsulta" component={PosConsultaTela} />
      <PilhaInicio.Screen name="Notificacoes" component={NotificacoesTela} />
    </PilhaInicio.Navigator>
  );
}

function AgendaAba() {
  return (
    <PilhaAgenda.Navigator screenOptions={useOpcoesDaPilha()}>
      <PilhaAgenda.Screen name="Agenda" component={AgendaTela} />
      <PilhaAgenda.Screen name="Consulta" component={ConsultaTela} />
      <PilhaAgenda.Screen name="PosConsulta" component={PosConsultaTela} />
      <PilhaAgenda.Screen name="Agendar" component={AgendarTela} />
      <PilhaAgenda.Screen name="Espera" component={EsperaTela} />
    </PilhaAgenda.Navigator>
  );
}

function FamiliaAba() {
  return (
    <PilhaFamilia.Navigator screenOptions={useOpcoesDaPilha()}>
      <PilhaFamilia.Screen name="Familia" component={FamiliaTela} />
      <PilhaFamilia.Screen name="Pessoa" component={PessoaTela} />
      <PilhaFamilia.Screen name="AdicionarFamiliar" component={AdicionarFamiliarTela} />
      <PilhaFamilia.Screen name="Agendar" component={AgendarTela} />
      <PilhaFamilia.Screen name="Consulta" component={ConsultaTela} />
    </PilhaFamilia.Navigator>
  );
}

function PrevencaoAba() {
  return (
    <PilhaPrevencao.Navigator screenOptions={useOpcoesDaPilha()}>
      <PilhaPrevencao.Screen name="Prevencao" component={PrevencaoTela} />
      <PilhaPrevencao.Screen name="AdicionarPrevencao" component={AdicionarPrevencaoTela} />
      <PilhaPrevencao.Screen name="Agendar" component={AgendarTela} />
    </PilhaPrevencao.Navigator>
  );
}

// Nome da aba → ícone (Feather) e rótulo (a barra está em BarraAbas.js)
const ABAS = {
  InicioAba: { icone: 'home', rotulo: 'Início' },
  AgendaAba: { icone: 'calendar', rotulo: 'Agenda' },
  FamiliaAba: { icone: 'users', rotulo: 'Família' },
  PrevencaoAba: { icone: 'heart', rotulo: 'Prevenção' },
  PerfilAba: { icone: 'user', rotulo: 'Perfil' },
};

export default function Abas() {
  return (
    <Aba.Navigator
      tabBar={(props) => <BarraAbas {...props} abas={ABAS} />}
      screenOptions={{ headerShown: false }}
    >
      <Aba.Screen name="InicioAba" component={InicioAba} />
      <Aba.Screen name="AgendaAba" component={AgendaAba} />
      <Aba.Screen name="FamiliaAba" component={FamiliaAba} />
      <Aba.Screen name="PrevencaoAba" component={PrevencaoAba} />
      <Aba.Screen name="PerfilAba" component={PerfilTela} />
    </Aba.Navigator>
  );
}
