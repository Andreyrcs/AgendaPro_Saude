// Moldura de toda tela: cabeçalho azul-noite (com "Voltar" quando precisa),
// área de conteúdo que rola, e um rodapé fixo opcional (ex.: "Confirmar consulta").

import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import Texto from './Texto';
import { cores } from '../estilos/cores';
import { espaco, TOQUE_MINIMO } from '../estilos/espacos';

export default function Tela({
  titulo,
  subtitulo,
  voltar = false,
  acaoDireita, // { icone, rotulo, onPress }
  rolavel = true,
  rodape,
  children,
}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    // behavior="padding" nas duas plataformas: no Android o app é "edge-to-edge"
    // e a janela não encolhe sozinha quando o teclado abre.
    <KeyboardAvoidingView style={estilos.raiz} behavior="padding">
      <StatusBar style="light" />
      <View style={[estilos.cabecalho, { paddingTop: insets.top + espaco.p }]}>
        <View style={estilos.linhaTopo}>
          {voltar && (
            <Pressable
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              style={estilos.iconeBotao}
            >
              <Feather name="chevron-left" size={28} color={cores.sobreNoite} />
            </Pressable>
          )}
          <View style={estilos.titulos}>
            {titulo && (
              <Texto variante="subtitulo" cor={cores.sobreNoite} accessibilityRole="header" numberOfLines={2}>
                {titulo}
              </Texto>
            )}
            {subtitulo && (
              <Texto variante="meta" cor={cores.sobreNoite2} numberOfLines={2}>
                {subtitulo}
              </Texto>
            )}
          </View>
          {acaoDireita && (
            <Pressable
              onPress={acaoDireita.onPress}
              accessibilityRole="button"
              accessibilityLabel={acaoDireita.rotulo}
              style={estilos.iconeBotao}
            >
              <Feather name={acaoDireita.icone} size={24} color={cores.sobreNoite} />
            </Pressable>
          )}
        </View>
      </View>

      {rolavel ? (
        <ScrollView
          style={estilos.corpo}
          contentContainerStyle={estilos.conteudo}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={estilos.corpo}>{children}</View>
      )}

      {rodape && <View style={estilos.rodape}>{rodape}</View>}
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.gelo },
  cabecalho: { backgroundColor: cores.noite, paddingHorizontal: espaco.g, paddingBottom: espaco.g },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', gap: espaco.p, minHeight: TOQUE_MINIMO },
  titulos: { flex: 1 },
  iconeBotao: {
    width: TOQUE_MINIMO,
    height: TOQUE_MINIMO,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -espaco.p,
  },
  corpo: { flex: 1 },
  conteudo: { padding: espaco.g, paddingBottom: espaco.xg * 2 },
  rodape: {
    backgroundColor: cores.papel,
    borderTopWidth: 1.5,
    borderTopColor: cores.linha,
    padding: espaco.g,
    gap: espaco.p,
  },
});
