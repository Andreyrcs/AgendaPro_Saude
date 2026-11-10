// Título de uma seção da tela, com um link opcional à direita ("Ver tudo").

import { Pressable, StyleSheet, View } from 'react-native';
import Texto from './Texto';
import { cores } from '../estilos/cores';
import { espaco, TOQUE_MINIMO } from '../estilos/espacos';

export default function CabecalhoSecao({ titulo, acao }) {
  return (
    <View style={estilos.linha}>
      <Texto variante="subtitulo" accessibilityRole="header">
        {titulo}
      </Texto>
      {acao && (
        <Pressable onPress={acao.onPress} accessibilityRole="link" accessibilityLabel={acao.rotulo} style={estilos.acao}>
          <Texto variante="rotulo" cor={cores.mentaTinta}>
            {acao.rotulo}
          </Texto>
        </Pressable>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: espaco.xg,
    marginBottom: espaco.p,
    minHeight: TOQUE_MINIMO,
  },
  acao: { minHeight: TOQUE_MINIMO, justifyContent: 'center', paddingLeft: espaco.g },
});
