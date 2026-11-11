// Janela de confirmação que sobe da parte de baixo da tela (a "gaveta" da versão web).
// Usada antes de ações que não dá para desfazer: cancelar consulta, sair da fila, sair da conta.

import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Texto from './Texto';
import Botao from './Botao';
import { usePreferencias } from '../contexto/PreferenciasContext';
import { cores } from '../estilos/cores';
import { espaco, raios } from '../estilos/espacos';

export default function Confirmacao({
  visivel,
  titulo,
  texto,
  rotuloConfirmar,
  rotuloCancelar = 'Voltar',
  perigo = false,
  carregando = false,
  aoConfirmar,
  aoCancelar,
  aoFechar, // tocar fora ou no "voltar" do Android; se não vier, vale o mesmo que cancelar
  children, // conteúdo extra opcional (ex.: contagem regressiva da vaga)
}) {
  const fechar = aoFechar || aoCancelar;
  const insets = useSafeAreaInsets();
  const { reduzirMovimento } = usePreferencias();

  return (
    <Modal
      visible={visivel}
      transparent
      animationType={reduzirMovimento ? 'none' : 'slide'}
      onRequestClose={fechar}
    >
      <View style={estilos.fundo}>
        {/* Tocar fora da gaveta fecha */}
        <Pressable style={estilos.fora} onPress={fechar} accessibilityRole="button" accessibilityLabel="Fechar" />
        <View style={[estilos.gaveta, { paddingBottom: insets.bottom + espaco.xg }]} accessibilityViewIsModal>
          <View style={estilos.alca} />
          <Texto variante="subtitulo" accessibilityRole="header">
            {titulo}
          </Texto>
          {texto && <Texto cor={cores.tinta2}>{texto}</Texto>}
          {children}
          <View style={estilos.botoes}>
            <Botao
              titulo={rotuloConfirmar}
              variante={perigo ? 'perigo' : 'principal'}
              onPress={aoConfirmar}
              carregando={carregando}
            />
            <Botao titulo={rotuloCancelar} variante="secundario" onPress={aoCancelar} desativado={carregando} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(18, 38, 63, 0.45)', justifyContent: 'flex-end' },
  fora: { flex: 1 },
  gaveta: {
    backgroundColor: cores.papel,
    borderTopLeftRadius: raios.cartao,
    borderTopRightRadius: raios.cartao,
    padding: espaco.xg,
    gap: espaco.m,
  },
  alca: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: cores.linha },
  botoes: { gap: espaco.p, marginTop: espaco.p },
});
