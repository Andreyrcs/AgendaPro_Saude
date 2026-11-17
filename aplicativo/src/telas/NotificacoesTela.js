// Avisos: a lista de notificações da conta. Ao abrir, todas passam a lidas.
// "Simular notificação" cria um aviso de vaga e mostra no topo, como a notificação do celular.

import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Tela from '../componentes/Tela';
import Texto from '../componentes/Texto';
import Botao from '../componentes/Botao';
import Cartao from '../componentes/Cartao';
import Selo from '../componentes/Selo';
import { Carregando, EstadoVazio, MensagemErro } from '../componentes/Estados';
import useDadosDaTela from '../componentes/useDadosDaTela';
import { useSessao } from '../contexto/SessaoContext';
import { listarNotificacoes, marcarTodasComoLidas, simularNotificacao } from '../servicos/notificacoes';
import { cores } from '../estilos/cores';
import { espaco, raios } from '../estilos/espacos';
import { curto } from '../utilitarios/datas';

const ICONES = { VAGA_OFERECIDA: 'bell', CONSULTA_CONFIRMADA: 'check-circle', RESTRICAO: 'info', LEMBRETE: 'calendar', FILA: 'list', RETORNO: 'repeat' };

// O aviso que desce do topo da tela e some sozinho depois de alguns segundos
function AvisoNoTopo({ aviso, aoFechar }) {
  const margem = useSafeAreaInsets();
  const descida = useRef(new Animated.Value(-160)).current;

  useEffect(() => {
    if (!aviso) return undefined;
    descida.setValue(-160);
    Animated.spring(descida, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
    const tempo = setTimeout(aoFechar, 6000);
    return () => clearTimeout(tempo);
  }, [aviso, descida, aoFechar]);

  return (
    <Modal visible={!!aviso} transparent animationType="none" onRequestClose={aoFechar}>
      <View style={[estilos.camada, { paddingTop: margem.top + espaco.p }]} pointerEvents="box-none">
        <Animated.View style={{ transform: [{ translateY: descida }] }}>
          <Pressable
            onPress={aoFechar}
            accessibilityRole="alert"
            accessibilityLabel={aviso ? `AgendaPro Saúde, agora: ${aviso.mensagem}` : ''}
            style={estilos.aviso}
          >
            <View style={estilos.icone}>
              <Feather name="bell" size={20} color={cores.sobreNoite} />
            </View>
            <View style={estilos.flex}>
              <View style={estilos.topoAviso}>
                <Texto variante="negrito">AgendaPro Saúde</Texto>
                <Texto variante="meta">agora</Texto>
              </View>
              <Texto>{aviso ? aviso.mensagem : ''}</Texto>
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function NotificacoesTela() {
  const { usuario } = useSessao();
  const { dados, erro, recarregar } = useDadosDaTela(() => listarNotificacoes(usuario));
  const [aviso, setAviso] = useState(null);
  const [simulando, setSimulando] = useState(false);

  // abriu a lista: os avisos deixam de ser novos (na próxima vez)
  useEffect(() => {
    if (dados && dados.some((n) => !n.lida)) marcarTodasComoLidas(usuario);
  }, [dados, usuario]);

  async function simular() {
    setSimulando(true);
    const novo = await simularNotificacao(usuario);
    await recarregar();
    setSimulando(false);
    setAviso(novo);
  }

  if (!dados) {
    return (
      <Tela titulo="Avisos" voltar rolavel={false}>
        {erro ? <MensagemErro mensagem={erro} aoTentarDeNovo={recarregar} /> : <Carregando />}
      </Tela>
    );
  }

  return (
    <Tela titulo="Avisos" voltar>
      <Botao titulo="Simular notificação" icone="bell" variante="secundario" onPress={simular} carregando={simulando} style={estilos.simular} />
      {dados.length === 0 ? (
        <EstadoVazio icone="bell" titulo="Nenhum aviso por enquanto." texto="Vagas da lista de espera, confirmações e lembretes aparecem aqui." />
      ) : (
        <View style={estilos.lista}>
          {dados.map((n) => (
            <Cartao key={n.id} style={estilos.item} accessibilityLabel={`${n.lida ? '' : 'Novo. '}${n.mensagem} ${curto(n.dataEnvio)}`}>
              <Feather name={ICONES[n.tipo] || 'bell'} size={22} color={cores.noite} />
              <View style={estilos.flex}>
                <Texto>{n.mensagem}</Texto>
                <View style={estilos.rodape}>
                  {!n.lida && <Selo texto="Novo" tom="menta" />}
                  <Texto variante="meta">{curto(n.dataEnvio)}</Texto>
                </View>
              </View>
            </Cartao>
          ))}
        </View>
      )}
      <AvisoNoTopo aviso={aviso} aoFechar={() => setAviso(null)} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1, gap: espaco.xs },
  lista: { gap: espaco.m },
  simular: { marginBottom: espaco.g },
  item: { flexDirection: 'row', gap: espaco.m, alignItems: 'flex-start' },
  rodape: { flexDirection: 'row', alignItems: 'center', gap: espaco.p },
  camada: { flex: 1, paddingHorizontal: espaco.p },
  aviso: {
    flexDirection: 'row',
    gap: espaco.m,
    alignItems: 'flex-start',
    padding: espaco.m,
    borderRadius: raios.cartao,
    backgroundColor: cores.papel,
    borderWidth: 1,
    borderColor: cores.linha,
    shadowColor: cores.noite,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  icone: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: cores.noite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topoAviso: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
