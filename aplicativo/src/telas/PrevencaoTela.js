// Calendário de prevenção: check-ups e exames de rotina da família ao longo do ano,
// com as campanhas de saúde de cada mês.

import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Tela from '../componentes/Tela';
import Texto from '../componentes/Texto';
import Botao from '../componentes/Botao';
import Cartao from '../componentes/Cartao';
import Selo from '../componentes/Selo';
import { AvatarFamiliar } from '../componentes/Avatar';
import { Carregando, EstadoVazio, MensagemErro } from '../componentes/Estados';
import useDadosDaTela from '../componentes/useDadosDaTela';
import { useSessao } from '../contexto/SessaoContext';
import { listarPrevencao, marcarItemPrevencao } from '../servicos/prevencao';
import { listarFamiliares } from '../servicos/familia';
import { cores } from '../estilos/cores';
import { espaco, raios, TOQUE_MINIMO } from '../estilos/espacos';
import { nomeDoMes } from '../utilitarios/datas';

export default function PrevencaoTela({ navigation }) {
  const { usuario } = useSessao();
  const [filtro, setFiltro] = useState('todos');
  const [ocupado, setOcupado] = useState(null); // id do item sendo atualizado
  const { dados, erro, recarregar } = useDadosDaTela(async () => {
    const [meses, familia] = await Promise.all([listarPrevencao(usuario), listarFamiliares(usuario)]);
    return { meses, familia };
  });

  if (!dados) {
    return (
      <Tela titulo="Prevenção" rolavel={false}>
        {erro ? <MensagemErro mensagem={erro} aoTentarDeNovo={recarregar} /> : <Carregando />}
      </Tela>
    );
  }

  const passa = (item) => filtro === 'todos' || item.pessoa.id === filtro;
  const meses = dados.meses
    .map((m) => ({ ...m, itens: m.itens.filter(passa) }))
    .filter((m) => m.itens.length > 0);
  const contar = (id) => dados.meses.reduce((s, m) => s + m.itens.filter((i) => id === 'todos' || i.pessoa.id === id).length, 0);

  async function mudarStatus(item, status) {
    setOcupado(item.id);
    try {
      await marcarItemPrevencao(usuario, item.id, status);
      await recarregar();
    } finally {
      setOcupado(null);
    }
  }

  const filtros = [{ id: 'todos', rotulo: 'Todos' }, ...dados.familia.map((p) => ({ id: p.id, rotulo: p.titular ? 'Você' : p.curto }))];

  return (
    <Tela
      titulo="Prevenção"
      subtitulo="Check-ups e exames de rotina do ano"
      rolavel={false}
      acaoDireita={{ icone: 'plus', rotulo: 'Incluir alguém na prevenção', onPress: () => navigation.navigate('AdicionarPrevencao') }}
    >
      <FlatList
        data={meses}
        keyExtractor={(m) => m.mes}
        contentContainerStyle={estilos.conteudo}
        ItemSeparatorComponent={() => <View style={{ height: espaco.g }} />}
        ListHeaderComponent={
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.filtros}>
            {filtros.map((f) => {
              const ativo = filtro === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setFiltro(f.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${f.rotulo}, ${contar(f.id)} lembretes`}
                  accessibilityState={{ selected: ativo }}
                  style={[estilos.filtro, ativo && estilos.filtroAtivo]}
                >
                  <Texto variante="negrito" cor={ativo ? cores.sobreNoite : cores.noite}>
                    {f.rotulo} · {contar(f.id)}
                  </Texto>
                </Pressable>
              );
            })}
          </ScrollView>
        }
        ListEmptyComponent={
          <EstadoVazio
            icone="heart"
            titulo="Nenhum lembrete de prevenção"
            texto="Toque no + lá em cima para incluir alguém da sua família numa campanha."
          />
        }
        renderItem={({ item: mes }) => (
          <Cartao style={estilos.mes}>
            <Texto variante="subtitulo" accessibilityRole="header">
              {nomeDoMes(mes.mes)}
            </Texto>
            <View style={estilos.campanha}>
              {mes.campanha && <Selo texto={mes.campanha} tom="noite" />}
              <Texto variante="meta">{mes.tema}</Texto>
            </View>
            {mes.itens.map((item) => (
              <View key={item.id} style={estilos.item}>
                <View style={estilos.linha}>
                  <AvatarFamiliar pessoa={item.pessoa} tamanho={40} />
                  <View style={estilos.flex}>
                    <Texto variante="negrito">{item.titulo}</Texto>
                    <Texto variante="meta">
                      {item.pessoa.titular ? 'Você' : item.pessoa.curto} · {item.nota}
                    </Texto>
                  </View>
                </View>

                {item.status === 'agendado' && <Selo texto="Agendado" tom="menta" />}
                {item.status === 'feito' && (
                  <View style={estilos.acoes}>
                    <Selo texto="Feito" tom="menta" />
                    <Botao
                      titulo="Desfazer"
                      variante="texto"
                      pequeno
                      accessibilityLabel={`Desfazer: ${item.titulo} volta a ficar pendente`}
                      onPress={() => mudarStatus(item, 'pendente')}
                      carregando={ocupado === item.id}
                    />
                  </View>
                )}
                {item.status === 'pendente' && (
                  <View style={estilos.acoes}>
                    {item.esp && (
                      <Botao
                        titulo="Marcar"
                        icone="calendar"
                        pequeno
                        accessibilityLabel={`Marcar ${item.titulo} para ${item.pessoa.titular ? 'você' : item.pessoa.curto}`}
                        onPress={() =>
                          navigation.navigate('Agendar', { especialidade: item.esp, pessoa: item.pessoa.id, itemPrevencao: item.id })
                        }
                      />
                    )}
                    <Botao
                      titulo="Já fiz"
                      variante="secundario"
                      pequeno
                      accessibilityLabel={`Já fiz: ${item.titulo} de ${item.pessoa.titular ? 'você' : item.pessoa.curto}`}
                      onPress={() => mudarStatus(item, 'feito')}
                      carregando={ocupado === item.id}
                    />
                  </View>
                )}
              </View>
            ))}
          </Cartao>
        )}
      />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  conteudo: { padding: espaco.g, paddingBottom: espaco.xg * 2 },
  filtros: { gap: espaco.p, paddingBottom: espaco.g },
  filtro: {
    minHeight: TOQUE_MINIMO,
    paddingHorizontal: espaco.g,
    justifyContent: 'center',
    borderRadius: raios.controle,
    borderWidth: 1.5,
    borderColor: cores.linha,
    backgroundColor: cores.papel,
  },
  filtroAtivo: { backgroundColor: cores.noite, borderColor: cores.noite },
  mes: { gap: espaco.m },
  campanha: { gap: espaco.xs },
  item: { gap: espaco.p, paddingTop: espaco.m, borderTopWidth: 1.5, borderTopColor: cores.linha },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.m },
  acoes: { flexDirection: 'row', alignItems: 'center', gap: espaco.p, flexWrap: 'wrap' },
});
