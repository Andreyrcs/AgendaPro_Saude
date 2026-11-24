// Depois da consulta: retornos que o médico pediu, exames solicitados
// e as próximas consultas da família.

import { Linking, StyleSheet, View } from 'react-native';
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
import { listarAcompanhamento } from '../servicos/acompanhamento';
import { listarConsultas } from '../servicos/consultas';
import { clinicaDaSessao } from '../utilitarios/texto';
import { espaco } from '../estilos/espacos';
import { diaEMes, diasAte } from '../utilitarios/datas';

const quem = (p) => (p.titular ? 'Você' : p.curto);

export default function PosConsultaTela({ navigation }) {
  const { usuario } = useSessao();
  const clinica = clinicaDaSessao(usuario);
  const { dados, erro, recarregar } = useDadosDaTela(async () => {
    const [acompanhamento, consultas] = await Promise.all([listarAcompanhamento(usuario), listarConsultas(usuario)]);
    return { ...acompanhamento, proximas: consultas.proximas.slice(0, 3) };
  });

  if (!dados) {
    return (
      <Tela titulo="Depois da consulta" voltar rolavel={false}>
        {erro ? <MensagemErro mensagem={erro} aoTentarDeNovo={recarregar} /> : <Carregando />}
      </Tela>
    );
  }

  const { retornos, exames, proximas } = dados;

  return (
    <Tela titulo="Depois da consulta" subtitulo="Retornos, exames e próximas consultas" voltar>
      <CabecalhoSecao titulo="Retornos" />
      {retornos.length === 0 && <EstadoVazio icone="repeat" titulo="Nenhum retorno pendente" />}
      <View style={estilos.lista}>
        {retornos.map((r) => {
          const faltam = r.prazo ? diasAte(r.prazo) : null;
          const urgente = faltam !== null && faltam <= 30;
          const prazo = faltam === null ? 'A recepção vai marcar'
            : faltam <= 0 ? 'Marcado para hoje'
            : `Marcado para ${diaEMes(r.prazo)} (${faltam === 1 ? 'falta 1 dia' : `faltam ${faltam} dias`})`;
          return (
            <Cartao key={r.id} style={estilos.item}>
              <View style={estilos.linha}>
                <AvatarFamiliar pessoa={r.pessoa} tamanho={44} />
                <View style={estilos.flex}>
                  <Texto variante="negrito">{r.titulo}</Texto>
                  <Texto variante="meta">
                    {quem(r.pessoa)} · {r.medico.nome}
                  </Texto>
                </View>
              </View>
              <Selo texto={prazo} tom={urgente ? 'alerta' : 'neutro'} />
              <Texto variante="meta">{r.origem}</Texto>
              {!!clinica.telefoneLink && <Botao
                titulo="Ligar para a clínica"
                variante="secundario"
                icone="phone"
                pequeno
                accessibilityHint={`Liga para ${clinica.nome}, ${clinica.telefone}`}
                onPress={() => Linking.openURL(clinica.telefoneLink)}
              />}
            </Cartao>
          );
        })}
      </View>

      <CabecalhoSecao titulo="Exames pedidos" />
      {exames.length === 0 && <EstadoVazio icone="activity" titulo="Nenhum exame pedido" />}
      <View style={estilos.lista}>
        {exames.map((e) => (
          <Cartao key={e.id} style={estilos.item}>
            <View style={estilos.linha}>
              <AvatarFamiliar pessoa={e.pessoa} tamanho={44} />
              <View style={estilos.flex}>
                <Texto variante="negrito">{e.titulo}</Texto>
                <Texto variante="meta">
                  {quem(e.pessoa)} · pedido por {e.pedidoPor.nome}
                </Texto>
              </View>
            </View>
            <Selo texto={e.status === 'agendado' ? 'Agendado' : 'Falta fazer'} tom={e.status === 'agendado' ? 'menta' : 'alerta'} />
            <Texto variante="meta">
              {e.obs}
              {e.origem ? ` · ${e.origem}` : ''}
            </Texto>
          </Cartao>
        ))}
      </View>

      <CabecalhoSecao titulo="Próximas consultas" acao={{ rotulo: 'Ver agenda', onPress: () => navigation.navigate('AgendaAba', { screen: 'Agenda' }) }} />
      {proximas.length === 0 && <EstadoVazio titulo="Nenhuma consulta marcada" />}
      <View style={estilos.lista}>
        {proximas.map((c) => (
          <CartaoConsulta key={c.id} consulta={c} onPress={() => navigation.navigate('Consulta', { id: c.id })} />
        ))}
      </View>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  lista: { gap: espaco.m },
  item: { gap: espaco.p },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.m },
});
