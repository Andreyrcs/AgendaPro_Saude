// Perfil familiar: as pessoas que esta conta cuida.
// Regra: cada conta só vê e gerencia a própria família.

import { FlatList, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Tela from '../componentes/Tela';
import Texto from '../componentes/Texto';
import Botao from '../componentes/Botao';
import Cartao from '../componentes/Cartao';
import { AvatarFamiliar } from '../componentes/Avatar';
import { Carregando, MensagemErro } from '../componentes/Estados';
import useDadosDaTela from '../componentes/useDadosDaTela';
import { useSessao } from '../contexto/SessaoContext';
import { listarFamiliares } from '../servicos/familia';
import { listarConsultas } from '../servicos/consultas';
import { cores } from '../estilos/cores';
import { espaco } from '../estilos/espacos';
import { curto } from '../utilitarios/datas';
import { descricaoFamiliar } from '../utilitarios/texto';

export default function FamiliaTela({ navigation }) {
  const { usuario } = useSessao();
  const { dados, erro, recarregar } = useDadosDaTela(async () => {
    const [familia, consultas] = await Promise.all([listarFamiliares(usuario), listarConsultas(usuario)]);
    return { familia, proximas: consultas.proximas };
  });

  if (!dados) {
    return (
      <Tela titulo="Família" rolavel={false}>
        {erro ? <MensagemErro mensagem={erro} aoTentarDeNovo={recarregar} /> : <Carregando />}
      </Tela>
    );
  }

  return (
    <Tela titulo="Família" subtitulo={`${dados.familia.length} ${dados.familia.length === 1 ? 'pessoa' : 'pessoas'} nesta conta`} rolavel={false}>
      <FlatList
        data={dados.familia}
        keyExtractor={(p) => p.id}
        contentContainerStyle={estilos.conteudo}
        ItemSeparatorComponent={() => <View style={{ height: espaco.m }} />}
        ListHeaderComponent={
          <View style={estilos.aviso}>
            <Feather name="lock" size={18} color={cores.mentaTinta} />
            <Texto variante="meta" style={estilos.flex}>
              Você só vê e gerencia as pessoas ligadas à sua conta.
            </Texto>
          </View>
        }
        renderItem={({ item: p }) => {
          const proxima = dados.proximas.find((c) => c.pessoa.id === p.id);
          const textoProxima = proxima
            ? `Próxima: ${proxima.titulo || proxima.especialidade.nome}, ${curto(proxima.data)} às ${proxima.hora}`
            : 'Nenhuma consulta marcada';
          return (
            <Cartao
              onPress={() => navigation.navigate('Pessoa', { id: p.id })}
              style={estilos.cartao}
              accessibilityLabel={`${p.nome}, ${descricaoFamiliar(p)}. ${textoProxima}`}
            >
              <AvatarFamiliar pessoa={p} tamanho={56} />
              <View style={estilos.flex}>
                <Texto variante="negrito">{p.titular ? `${p.nome} (você)` : p.nome}</Texto>
                <Texto variante="meta">{descricaoFamiliar(p)}</Texto>
                <Texto variante="meta" cor={proxima ? cores.mentaTinta : cores.tinta3}>
                  {textoProxima}
                </Texto>
              </View>
              <Feather name="chevron-right" size={22} color={cores.tinta3} />
            </Cartao>
          );
        }}
        ListFooterComponent={
          <Botao
            titulo="Adicionar familiar"
            icone="user-plus"
            variante="secundario"
            onPress={() => navigation.navigate('AdicionarFamiliar')}
            style={estilos.adicionar}
          />
        }
      />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  conteudo: { padding: espaco.g, paddingBottom: espaco.xg * 2 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: espaco.p, marginBottom: espaco.g },
  cartao: { flexDirection: 'row', alignItems: 'center', gap: espaco.m },
  adicionar: { marginTop: espaco.xg },
});
