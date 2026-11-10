// Campo de formulário com rótulo visível em cima e mensagem de erro embaixo.
// Com "segredo", ganha o botão "Mostrar senha".

import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Texto from './Texto';
import { cores } from '../estilos/cores';
import { fontes, tamanhos } from '../estilos/tipografia';
import { espaco, raios, TOQUE_MINIMO } from '../estilos/espacos';

export default function CampoTexto({ rotulo, erro, segredo = false, dica, style, ...props }) {
  const [mostrar, setMostrar] = useState(false);

  return (
    <View style={[estilos.bloco, style]}>
      <Texto variante="rotulo" style={estilos.rotulo}>
        {rotulo}
      </Texto>
      <View style={[estilos.caixa, erro && estilos.caixaErro]}>
        <TextInput
          style={estilos.entrada}
          placeholderTextColor={cores.tinta3}
          secureTextEntry={segredo && !mostrar}
          accessibilityLabel={rotulo}
          accessibilityHint={erro || dica}
          {...props}
        />
        {segredo && (
          <Pressable
            onPress={() => setMostrar(!mostrar)}
            accessibilityRole="button"
            accessibilityLabel={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
            style={estilos.mostrar}
          >
            <Texto variante="rotulo" cor={cores.noite}>
              {mostrar ? 'Ocultar' : 'Mostrar'}
            </Texto>
          </Pressable>
        )}
      </View>
      {dica && !erro && <Texto variante="meta">{dica}</Texto>}
      {erro && (
        <Texto variante="meta" cor={cores.domingo} accessibilityLiveRegion="polite">
          {erro}
        </Texto>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { gap: espaco.xs },
  rotulo: { color: cores.tinta },
  caixa: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    backgroundColor: cores.papel,
    borderWidth: 1.5,
    borderColor: cores.linha,
    borderRadius: raios.folha,
  },
  caixaErro: { borderColor: cores.domingo },
  entrada: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: espaco.g,
    fontFamily: fontes.texto,
    fontSize: tamanhos.corpo,
    color: cores.tinta,
  },
  mostrar: { minHeight: TOQUE_MINIMO, justifyContent: 'center', paddingHorizontal: espaco.g },
});
