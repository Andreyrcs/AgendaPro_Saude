// Linha com título, explicação e um interruptor (liga/desliga).

import { StyleSheet, Switch, View } from 'react-native';
import Texto from './Texto';
import { cores } from '../estilos/cores';
import { espaco } from '../estilos/espacos';

export default function Interruptor({ titulo, descricao, valor, aoMudar, desativado = false }) {
  return (
    <View style={estilos.linha}>
      <View style={estilos.textos}>
        <Texto variante="negrito">{titulo}</Texto>
        {descricao && <Texto variante="meta">{descricao}</Texto>}
      </View>
      <Switch
        value={valor}
        onValueChange={aoMudar}
        disabled={desativado}
        accessibilityLabel={titulo}
        accessibilityHint={descricao}
        trackColor={{ false: cores.linha, true: cores.mentaTinta }}
        thumbColor={cores.papel}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.m, minHeight: 56, paddingVertical: espaco.p },
  textos: { flex: 1, gap: 2 },
});
