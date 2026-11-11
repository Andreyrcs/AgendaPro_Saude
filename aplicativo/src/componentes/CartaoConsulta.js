// Cartão de uma consulta nas listas (Agenda, Família, Depois da consulta).

import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Cartao from './Cartao';
import Texto from './Texto';
import FolhaDia from './FolhaDia';
import Selo from './Selo';
import { cores } from '../estilos/cores';
import { espaco } from '../estilos/espacos';
import { extenso } from '../utilitarios/datas';
import { nomeParaExibir } from '../utilitarios/texto';
import { STATUS_CONSULTA, STATUS_FUTUROS } from '../utilitarios/status';

const TIPOS = { exame: 'Exame', prevencao: 'Prevenção' };

export default function CartaoConsulta({ consulta, onPress }) {
  const titulo = consulta.titulo || consulta.especialidade.nome;
  const quem = nomeParaExibir(consulta.pessoa);
  // consulta que já passou ou foi cancelada mostra o status (Atendida, Faltou, Cancelada...)
  const passada = !STATUS_FUTUROS.includes(consulta.status);
  const rotulo = STATUS_CONSULTA[consulta.status] || consulta.status;

  return (
    <Cartao
      onPress={onPress}
      style={estilos.cartao}
      accessibilityLabel={`${titulo} para ${quem}, ${extenso(consulta.data)} às ${consulta.hora}, com ${consulta.medico.nome}${passada ? '. ' + rotulo : ''}`}
      accessibilityHint="Abre os detalhes da consulta"
    >
      <FolhaDia data={consulta.data} tamanho="pequena" />
      <View style={estilos.textos}>
        <Texto variante="negrito" numberOfLines={2}>
          {titulo}
        </Texto>
        <Texto variante="meta">
          para {quem} · {consulta.hora}
        </Texto>
        <Texto variante="meta" numberOfLines={1}>
          {consulta.medico.nome}
        </Texto>
        {(TIPOS[consulta.tipo] || passada) && (
          <View style={estilos.selos}>
            {TIPOS[consulta.tipo] && <Selo texto={TIPOS[consulta.tipo]} tom="menta" />}
            {passada && <Selo texto={rotulo} />}
          </View>
        )}
      </View>
      <Feather name="chevron-right" size={22} color={cores.tinta3} />
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  cartao: { flexDirection: 'row', alignItems: 'center', gap: espaco.m, padding: espaco.m },
  textos: { flex: 1, gap: 2 },
  selos: { flexDirection: 'row', gap: espaco.xs, marginTop: espaco.xs },
});
