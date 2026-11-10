// Os três "estados" que toda tela com dados tem:
// carregando, deu erro, ou não há nada para mostrar.

import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Texto from './Texto';
import Botao from './Botao';
import { cores } from '../estilos/cores';
import { espaco } from '../estilos/espacos';

export function Carregando({ texto = 'Carregando…' }) {
  return (
    <View style={estilos.centro} accessibilityRole="progressbar" accessibilityLabel={texto}>
      <ActivityIndicator size="large" color={cores.noite} />
      <Texto variante="meta">{texto}</Texto>
    </View>
  );
}

export function MensagemErro({ mensagem, aoTentarDeNovo }) {
  return (
    <View style={estilos.centro} accessibilityRole="alert">
      <Feather name="wifi-off" size={32} color={cores.tinta2} />
      <Texto variante="negrito" style={estilos.texto}>
        {mensagem}
      </Texto>
      {aoTentarDeNovo && <Botao titulo="Tentar de novo" variante="secundario" onPress={aoTentarDeNovo} />}
    </View>
  );
}

export function EstadoVazio({ icone = 'calendar', titulo, texto, acao }) {
  return (
    <View style={estilos.vazio}>
      <Feather name={icone} size={32} color={cores.mentaTinta} />
      <Texto variante="negrito" style={estilos.texto}>
        {titulo}
      </Texto>
      {texto && (
        <Texto variante="meta" style={estilos.texto}>
          {texto}
        </Texto>
      )}
      {acao && <Botao titulo={acao.titulo} icone={acao.icone} variante="secundario" pequeno onPress={acao.onPress} />}
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espaco.m, padding: espaco.xg, minHeight: 240 },
  vazio: { alignItems: 'center', gap: espaco.p, paddingVertical: espaco.xg, paddingHorizontal: espaco.g },
  texto: { textAlign: 'center' },
});
