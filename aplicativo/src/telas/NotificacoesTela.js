// Avisos: a lista de notificações da conta. Ao abrir, todas passam a lidas.

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Tela from '../componentes/Tela';
import Texto from '../componentes/Texto';
import Cartao from '../componentes/Cartao';
import Selo from '../componentes/Selo';
import { Carregando, EstadoVazio, MensagemErro } from '../componentes/Estados';
import useDadosDaTela from '../componentes/useDadosDaTela';
import { useSessao } from '../contexto/SessaoContext';
import { listarNotificacoes, marcarTodasComoLidas } from '../servicos/notificacoes';
import { cores } from '../estilos/cores';
import { espaco } from '../estilos/espacos';
import { curto } from '../utilitarios/datas';

const ICONES = { VAGA_OFERECIDA: 'bell', CONSULTA_CONFIRMADA: 'check-circle', RESTRICAO: 'info', LEMBRETE: 'calendar', FILA: 'list', RETORNO: 'repeat' };

export default function NotificacoesTela() {
  const { usuario } = useSessao();
  const { dados, erro, recarregar } = useDadosDaTela(() => listarNotificacoes(usuario));

  // abriu a lista: os avisos deixam de ser novos (na próxima vez)
  useEffect(() => {
    if (dados && dados.some((n) => !n.lida)) marcarTodasComoLidas(usuario);
  }, [dados, usuario]);

  if (!dados) {
    return (
      <Tela titulo="Avisos" voltar rolavel={false}>
        {erro ? <MensagemErro mensagem={erro} aoTentarDeNovo={recarregar} /> : <Carregando />}
      </Tela>
    );
  }

  return (
    <Tela titulo="Avisos" voltar>
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
    </Tela>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1, gap: espaco.xs },
  lista: { gap: espaco.m },
  item: { flexDirection: 'row', gap: espaco.m, alignItems: 'flex-start' },
  rodape: { flexDirection: 'row', alignItems: 'center', gap: espaco.p },
});
