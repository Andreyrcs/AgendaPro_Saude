// Botão do app, com as variantes de cor do protótipo.
// Enquanto "carregando" for true, o botão fica desativado: assim um toque duplo
// não marca nem cancela a mesma consulta duas vezes.

import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Texto from './Texto';
import { cores } from '../estilos/cores';
import { raios, TOQUE_MINIMO } from '../estilos/espacos';

const VARIANTES = {
  principal: { fundo: cores.noite, texto: cores.sobreNoite, borda: cores.noite },
  secundario: { fundo: cores.papel, texto: cores.noite, borda: cores.linha },
  menta: { fundo: cores.menta, texto: cores.noite, borda: cores.menta },
  perigo: { fundo: cores.domingo, texto: cores.sobreNoite, borda: cores.domingo },
  texto: { fundo: 'transparent', texto: cores.noite, borda: 'transparent' },
  textoPerigo: { fundo: 'transparent', texto: cores.domingo, borda: 'transparent' },
};

export default function Botao({
  titulo,
  onPress,
  variante = 'principal',
  icone,
  carregando = false,
  desativado = false,
  pequeno = false,
  accessibilityLabel,
  accessibilityHint,
  style,
}) {
  const v = VARIANTES[variante];
  const bloqueado = desativado || carregando;

  return (
    <Pressable
      onPress={onPress}
      disabled={bloqueado}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || titulo}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: bloqueado, busy: carregando }}
      style={({ pressed }) => [
        estilos.botao,
        pequeno && estilos.pequeno,
        { backgroundColor: v.fundo, borderColor: v.borda },
        bloqueado && estilos.desativado,
        pressed && estilos.pressionado,
        style,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={v.texto} />
      ) : (
        <View style={estilos.conteudo}>
          {icone && <Feather name={icone} size={20} color={v.texto} />}
          <Texto variante="negrito" cor={v.texto} style={estilos.texto}>
            {titulo}
          </Texto>
        </View>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  botao: {
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: raios.controle,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pequeno: { minHeight: TOQUE_MINIMO, paddingHorizontal: 16 },
  conteudo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  texto: { textAlign: 'center' },
  desativado: { opacity: 0.5 },
  pressionado: { opacity: 0.8 },
});
