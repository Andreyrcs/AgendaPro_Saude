// Tela de "Consulta marcada!", usada ao agendar e ao aceitar uma vaga da lista de espera.

import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Tela from './Tela';
import Texto from './Texto';
import Botao from './Botao';
import FolhaDia from './FolhaDia';
import { cores } from '../estilos/cores';
import { espaco } from '../estilos/espacos';
import { extenso } from '../utilitarios/datas';
import { nomeParaExibir } from '../utilitarios/texto';

export default function SucessoConsulta({ consulta, titulo = 'Consulta marcada!', navigation }) {
  function verNaAgenda() {
    navigation.popToTop();
    navigation.navigate('AgendaAba', { screen: 'Agenda' });
  }

  return (
    <Tela titulo={titulo} rolavel={false}>
      <View style={estilos.sucesso} accessibilityLiveRegion="polite">
        <View style={estilos.carimbo}>
          <Feather name="check" size={44} color={cores.noite} />
        </View>
        <Texto variante="titulo" style={estilos.centro} accessibilityRole="header">
          {titulo}
        </Texto>
        <FolhaDia data={consulta.data} variante="menta" />
        <Texto style={estilos.centro}>
          {consulta.especialidade.nome} para {nomeParaExibir(consulta.pessoa)}
          {'\n'}
          {extenso(consulta.data)}, às {consulta.hora}
          {'\n'}
          {consulta.medico.nome} · {consulta.sala}
        </Texto>
        <Texto variante="meta" style={estilos.centro}>
          Chegue 15 minutos antes. Se não puder ir, cancele pelo app para liberar a vaga para outra pessoa.
        </Texto>
        <View style={estilos.botoes}>
          <Botao titulo="Ver na agenda" icone="calendar" onPress={verNaAgenda} />
          <Botao titulo="Voltar ao início" variante="secundario" onPress={() => navigation.popToTop()} />
        </View>
      </View>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  centro: { textAlign: 'center' },
  sucesso: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaco.xg, gap: espaco.g },
  carimbo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: cores.menta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botoes: { alignSelf: 'stretch', gap: espaco.p },
});
