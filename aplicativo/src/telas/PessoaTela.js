// Detalhe de um familiar: dados de saúde, consultas e pendências dele.

import { StyleSheet, View } from 'react-native';
import Tela from '../componentes/Tela';
import Texto from '../componentes/Texto';
import Botao from '../componentes/Botao';
import Cartao from '../componentes/Cartao';
import Selo from '../componentes/Selo';
import CartaoConsulta from '../componentes/CartaoConsulta';
import CabecalhoSecao from '../componentes/CabecalhoSecao';
import { AvatarFamiliar } from '../componentes/Avatar';
import { Carregando, EstadoVazio, MensagemErro } from '../componentes/Estados';
import useDadosDaTela from '../componentes/useDadosDaTela';
import { useSessao } from '../contexto/SessaoContext';
import { listarFamiliares } from '../servicos/familia';
import { listarConsultas } from '../servicos/consultas';
import { listarAcompanhamento } from '../servicos/acompanhamento';
import { cores } from '../estilos/cores';
import { espaco } from '../estilos/espacos';
import { diaEMes } from '../utilitarios/datas';
import { descricaoFamiliar } from '../utilitarios/texto';

export default function PessoaTela({ route, navigation }) {
  const { usuario } = useSessao();
  const id = route.params.id;

  const { dados, erro, recarregar } = useDadosDaTela(async () => {
    const [familia, consultas, acompanhamento] = await Promise.all([
      listarFamiliares(usuario),
      listarConsultas(usuario),
      listarAcompanhamento(usuario),
    ]);
    const pessoa = familia.find((p) => p.id === id);
    // Regra de negócio: só a própria família
    if (!pessoa) throw new Error('Você só pode gerenciar a sua família.');
    return {
      pessoa,
      consultas: consultas.proximas.filter((c) => c.pessoa.id === id),
      retornos: acompanhamento.retornos.filter((r) => r.pessoa.id === id),
      exames: acompanhamento.exames.filter((e) => e.pessoa.id === id),
    };
  });

  if (!dados) {
    return (
      <Tela titulo="Família" voltar rolavel={false}>
        {erro ? <MensagemErro mensagem={erro} aoTentarDeNovo={recarregar} /> : <Carregando />}
      </Tela>
    );
  }

  const { pessoa, consultas, retornos, exames } = dados;
  const chamada = pessoa.titular ? 'você' : pessoa.curto;

  return (
    <Tela titulo={pessoa.titular ? 'Você' : pessoa.curto} subtitulo={descricaoFamiliar(pessoa)} voltar>
      <View style={estilos.topo}>
        <AvatarFamiliar pessoa={pessoa} tamanho={88} />
        <Texto variante="subtitulo" style={estilos.centro}>
          {pessoa.nome}
        </Texto>
      </View>

      <Cartao style={estilos.ficha}>
        <View>
          <Texto variante="meta">Parentesco</Texto>
          <Texto variante="negrito">{pessoa.relacao}</Texto>
        </View>
        <View>
          <Texto variante="meta">Alergias</Texto>
          <Texto variante="negrito" cor={pessoa.alergias === 'Nenhuma informada' ? cores.tinta : cores.domingo}>
            {pessoa.alergias}
          </Texto>
        </View>
      </Cartao>

      <Botao
        titulo={`Marcar consulta para ${chamada}`}
        icone="plus"
        onPress={() => navigation.navigate('Agendar', { pessoa: pessoa.id })}
        style={estilos.marcar}
      />

      <CabecalhoSecao titulo="Consultas marcadas" />
      {consultas.length === 0 ? (
        <EstadoVazio titulo="Nenhuma consulta marcada" />
      ) : (
        <View style={estilos.lista}>
          {consultas.map((c) => (
            <CartaoConsulta key={c.id} consulta={c} onPress={() => navigation.navigate('Consulta', { id: c.id })} />
          ))}
        </View>
      )}

      {(retornos.length > 0 || exames.length > 0) && (
        <>
          <CabecalhoSecao titulo="Pendências" />
          <View style={estilos.lista}>
            {retornos.map((r) => (
              <Cartao key={r.id} style={estilos.pendencia}>
                <Texto variante="negrito">{r.titulo}</Texto>
                <Texto variante="meta">{r.medico.nome}</Texto>
                <Selo texto={`Marque até ${diaEMes(r.prazo)}`} tom="alerta" />
              </Cartao>
            ))}
            {exames.map((e) => (
              <Cartao key={e.id} style={estilos.pendencia}>
                <Texto variante="negrito">{e.titulo}</Texto>
                <Texto variante="meta">{e.obs}</Texto>
                <Selo texto={e.status === 'agendado' ? 'Agendado' : 'Falta fazer'} tom={e.status === 'agendado' ? 'menta' : 'alerta'} />
              </Cartao>
            ))}
          </View>
        </>
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  centro: { textAlign: 'center' },
  topo: { alignItems: 'center', gap: espaco.p, marginBottom: espaco.g },
  ficha: { flexDirection: 'row', justifyContent: 'space-around', gap: espaco.g },
  marcar: { marginTop: espaco.g },
  lista: { gap: espaco.m },
  pendencia: { gap: espaco.xs },
});
