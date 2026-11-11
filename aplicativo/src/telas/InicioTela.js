// Tela inicial: "Confirme sua consulta" (Vou / Não vou), faltas e restrição, atalho para o assistente,
// próxima consulta, lista de espera, família e o que ficou pendente depois das consultas.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Tela from '../componentes/Tela';
import Texto from '../componentes/Texto';
import Botao from '../componentes/Botao';
import Cartao from '../componentes/Cartao';
import FolhaDia from '../componentes/FolhaDia';
import Selo from '../componentes/Selo';
import CabecalhoSecao from '../componentes/CabecalhoSecao';
import { AvatarFamiliar } from '../componentes/Avatar';
import { Carregando, EstadoVazio, MensagemErro } from '../componentes/Estados';
import useDadosDaTela from '../componentes/useDadosDaTela';
import { useSessao } from '../contexto/SessaoContext';
import { listarConsultas, listarParaConfirmar, buscarSituacao, confirmarPresenca, cancelarConsulta } from '../servicos/consultas';
import { CartaoConfirmarPresenca, AvisoRestricao } from '../componentes/Presenca';
import { textoDasFaltas } from '../utilitarios/status';
import { buscarMinhaFila } from '../servicos/espera';
import { listarFamiliares } from '../servicos/familia';
import { listarAcompanhamento } from '../servicos/acompanhamento';
import { cores } from '../estilos/cores';
import { espaco, raios, TOQUE_MINIMO } from '../estilos/espacos';
import { HOJE, diaEMes, extenso, relativo } from '../utilitarios/datas';
import { fraseDaFila, nomeParaExibir, primeiroNome } from '../utilitarios/texto';

function saudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function InicioTela({ navigation }) {
  const { usuario } = useSessao();
  const { dados, erro, recarregar } = useDadosDaTela(async () => {
    // As buscas são independentes: pede todas ao mesmo tempo
    const [consultas, fila, familia, acompanhamento, paraConfirmar, situacao] = await Promise.all([
      listarConsultas(usuario),
      buscarMinhaFila(usuario),
      listarFamiliares(usuario),
      listarAcompanhamento(usuario),
      listarParaConfirmar(usuario),
      buscarSituacao(usuario),
    ]);
    return { consultas, fila, familia, acompanhamento, paraConfirmar, situacao };
  });
  const [respondendo, setRespondendo] = useState(false);
  const [aviso, setAviso] = useState(null);

  // "Vou" confirma a presença; "Não vou" cancela (até o fim da véspera, sem nenhuma consequência)
  async function responder(consulta, vou) {
    setRespondendo(true);
    try {
      if (vou) {
        await confirmarPresenca(usuario, consulta.id);
        setAviso('Presença confirmada. Se não puder mais ir, avise; cancelar no dia da consulta conta como falta.');
      } else {
        const r = await cancelarConsulta(usuario, consulta.id);
        setAviso((r.falta ? 'Consulta cancelada. Conta como falta sem aviso.' : 'Consulta cancelada, sem nenhuma consequência.') +
          (r.oferecidoAFila ? ' O horário foi oferecido a quem espera na lista.' : ''));
      }
      await recarregar();
    } catch (e) {
      setAviso(e.message);
    } finally {
      setRespondendo(false);
    }
  }

  const titulo = `${saudacao()}, ${primeiroNome(usuario.nome)}`;
  const hoje = extenso(HOJE);
  const subtitulo = hoje.charAt(0).toUpperCase() + hoje.slice(1);

  if (!dados) {
    return (
      <Tela titulo={titulo} subtitulo={subtitulo} rolavel={false}>
        {erro ? <MensagemErro mensagem={erro} aoTentarDeNovo={recarregar} /> : <Carregando />}
      </Tela>
    );
  }

  const proxima = dados.consultas.proximas[0];
  const { fila, familia, acompanhamento } = dados;
  const pendencias = [
    ...acompanhamento.retornos.map((r) => ({ id: r.id, pessoa: r.pessoa, titulo: r.titulo, sub: `Marque até ${diaEMes(r.prazo)}` })),
    ...acompanhamento.exames
      .filter((e) => e.status === 'pendente')
      .map((e) => ({ id: e.id, pessoa: e.pessoa, titulo: e.titulo, sub: e.obs })),
  ].slice(0, 2);

  return (
    <Tela titulo={titulo} subtitulo={subtitulo}>
      {/* Confirmação de presença, a partir do início da véspera */}
      {dados.paraConfirmar.map((c) => (
        <CartaoConfirmarPresenca
          key={c.id}
          consulta={c}
          ocupado={respondendo}
          aoVou={() => responder(c, true)}
          aoNaoVou={() => responder(c, false)}
        />
      ))}
      {aviso && (
        <Texto variante="meta" accessibilityLiveRegion="polite" style={estilos.avisoPresenca}>
          {aviso}
        </Texto>
      )}
      <AvisoRestricao situacao={dados.situacao} />
      {dados.situacao.faltas > 0 && (
        <Texto variante="meta" style={estilos.avisoPresenca}>
          {textoDasFaltas(dados.situacao.faltas)}
        </Texto>
      )}

      {/* Atalho para o assistente (nunca é bloqueado) */}
      <Pressable
        onPress={() => navigation.navigate('Assistente')}
        accessibilityRole="button"
        accessibilityLabel="Assistente de saúde: conte o que você está sentindo"
        style={({ pressed }) => [estilos.assistente, pressed && { opacity: 0.9 }]}
      >
        <Texto variante="negrito" cor={cores.sobreNoite}>
          Não sabe qual médico procurar?
        </Texto>
        <View style={estilos.campoFalso}>
          <Texto cor={cores.sobreNoite2} style={estilos.flex}>
            Conte o que você está sentindo
          </Texto>
          <View style={estilos.enviar}>
            <Feather name="send" size={18} color={cores.noite} />
          </View>
        </View>
      </Pressable>

      {/* Vaga aberta ou posição na fila */}
      {fila && (
        <Cartao
          onPress={() => navigation.navigate('Espera')}
          style={estilos.fila}
          accessibilityLabel={
            fila.vagaOferecida
              ? 'Abriu uma vaga na lista de espera. Toque para responder.'
              : `Lista de espera: ${fraseDaFila(fila.pessoa, fila.posicao)} para ${fila.especialidade.nome} com ${fila.medico.nome}`
          }
        >
          <Feather name={fila.vagaOferecida ? 'bell' : 'list'} size={24} color={cores.noite} />
          <View style={estilos.flex}>
            <Texto variante="negrito">
              {fila.vagaOferecida ? 'Abriu uma vaga para você!' : fraseDaFila(fila.pessoa, fila.posicao)}
            </Texto>
            <Texto variante="meta" cor={cores.noite}>
              {fila.vagaOferecida
                ? 'Toque para confirmar em até 30 minutos.'
                : `Lista de espera · ${fila.especialidade.nome} com ${fila.medico.nome}`}
            </Texto>
          </View>
          <Feather name="chevron-right" size={22} color={cores.noite} />
        </Cartao>
      )}

      <CabecalhoSecao titulo="Próxima consulta" acao={{ rotulo: 'Ver agenda', onPress: () => navigation.navigate('AgendaAba') }} />
      {proxima ? (
        <Cartao
          onPress={() => navigation.navigate('Consulta', { id: proxima.id })}
          style={estilos.proxima}
          accessibilityLabel={`Próxima consulta: ${proxima.titulo || proxima.especialidade.nome} para ${nomeParaExibir(proxima.pessoa)}, ${extenso(proxima.data)} às ${proxima.hora}, com ${proxima.medico.nome}`}
        >
          <FolhaDia data={proxima.data} />
          <View style={estilos.flex}>
            <Selo texto={relativo(proxima.data)} tom="menta" />
            <Texto variante="subtitulo" style={estilos.espacoTopo}>
              {proxima.hora} · {proxima.titulo || proxima.especialidade.nome}
            </Texto>
            <Texto variante="meta">para {nomeParaExibir(proxima.pessoa)}</Texto>
            <Texto variante="meta">
              {proxima.medico.nome} · {proxima.sala}
            </Texto>
          </View>
        </Cartao>
      ) : (
        <Cartao>
          <EstadoVazio
            titulo="Nenhuma consulta marcada"
            texto="Quando você marcar uma consulta, ela aparece aqui."
            acao={{ titulo: 'Marcar consulta', icone: 'plus', onPress: () => navigation.navigate('Agendar') }}
          />
        </Cartao>
      )}

      <CabecalhoSecao titulo="Família" acao={{ rotulo: 'Gerenciar', onPress: () => navigation.navigate('FamiliaAba') }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.familia}>
        {familia.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => navigation.navigate('FamiliaAba', { screen: 'Pessoa', params: { id: p.id }, initial: false })}
            accessibilityRole="button"
            accessibilityLabel={`${p.nome}, ${p.relacao}`}
            style={estilos.membro}
          >
            <AvatarFamiliar pessoa={p} tamanho={56} />
            <Texto variante="rotulo" numberOfLines={1}>
              {p.titular ? 'Você' : p.curto}
            </Texto>
          </Pressable>
        ))}
      </ScrollView>

      {pendencias.length > 0 && (
        <>
          <CabecalhoSecao titulo="Depois da consulta" acao={{ rotulo: 'Ver tudo', onPress: () => navigation.navigate('PosConsulta') }} />
          <Cartao style={estilos.lista}>
            {pendencias.map((item, i) => (
              <Pressable
                key={item.id}
                onPress={() => navigation.navigate('PosConsulta')}
                accessibilityRole="button"
                accessibilityLabel={`${item.titulo} para ${nomeParaExibir(item.pessoa)}. ${item.sub}`}
                style={[estilos.linhaLista, i > 0 && estilos.divisoria]}
              >
                <AvatarFamiliar pessoa={item.pessoa} tamanho={40} />
                <View style={estilos.flex}>
                  <Texto variante="negrito">{item.titulo}</Texto>
                  <Texto variante="meta">
                    {item.pessoa.titular ? 'Você' : item.pessoa.curto} · {item.sub}
                  </Texto>
                </View>
              </Pressable>
            ))}
          </Cartao>
        </>
      )}

      <Botao titulo="Marcar consulta" icone="plus" onPress={() => navigation.navigate('Agendar')} style={estilos.marcar} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  avisoPresenca: { marginBottom: espaco.m },
  flex: { flex: 1 },
  espacoTopo: { marginTop: espaco.xs },
  assistente: { backgroundColor: cores.noite2, borderRadius: raios.cartao, padding: espaco.g, gap: espaco.m },
  campoFalso: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cores.noite,
    borderRadius: raios.controle,
    paddingLeft: espaco.g,
    paddingRight: 6,
    minHeight: 52,
  },
  enviar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: cores.menta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.m,
    marginTop: espaco.g,
    backgroundColor: cores.menta,
    borderColor: cores.menta,
  },
  proxima: { flexDirection: 'row', gap: espaco.g, alignItems: 'center' },
  familia: { gap: espaco.g, paddingVertical: espaco.xs },
  membro: { alignItems: 'center', gap: espaco.xs, width: 68, minHeight: TOQUE_MINIMO },
  lista: { paddingVertical: espaco.xs },
  linhaLista: { flexDirection: 'row', alignItems: 'center', gap: espaco.m, paddingVertical: espaco.m, minHeight: TOQUE_MINIMO },
  divisoria: { borderTopWidth: 1.5, borderTopColor: cores.linha },
  marcar: { marginTop: espaco.xg },
});
