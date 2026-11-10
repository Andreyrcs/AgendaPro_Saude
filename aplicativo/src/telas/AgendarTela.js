// Marcar consulta: para quem → médico e horário → confirmar.
// Parâmetros da rota (todos opcionais):
//   especialidade: id da especialidade (sem ela, a tela pede para escolher uma)
//   pessoa: id do familiar já escolhido (vindo do assistente ou da família)
//   itemPrevencao: id do item de prevenção que esta consulta resolve

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Tela from '../componentes/Tela';
import Texto from '../componentes/Texto';
import Botao from '../componentes/Botao';
import Cartao from '../componentes/Cartao';
import FolhaDia from '../componentes/FolhaDia';
import Selo from '../componentes/Selo';
import SucessoConsulta from '../componentes/SucessoConsulta';
import CabecalhoSecao from '../componentes/CabecalhoSecao';
import { AvatarFamiliar, AvatarMedico } from '../componentes/Avatar';
import { Carregando, MensagemErro } from '../componentes/Estados';
import useDadosDaTela from '../componentes/useDadosDaTela';
import { useSessao } from '../contexto/SessaoContext';
import { buscarEspecialidade, listarEspecialidades, listarHorariosLivres, primeiroHorario } from '../servicos/medicos';
import { listarFamiliares } from '../servicos/familia';
import { marcarConsulta } from '../servicos/consultas';
import { buscarMinhaFila, entrarNaFila } from '../servicos/espera';
import { marcarItemPrevencao } from '../servicos/prevencao';
import { clinica } from '../dados/dadosFicticios';
import { cores } from '../estilos/cores';
import { espaco, raios, TOQUE_MINIMO } from '../estilos/espacos';
import { curto, extenso, relativo } from '../utilitarios/datas';
import { nomeParaExibir } from '../utilitarios/texto';

export default function AgendarTela({ route, navigation }) {
  const especialidade = route.params?.especialidade;
  if (!especialidade) return <EscolherEspecialidade navigation={navigation} params={route.params} />;
  return <EscolherHorario navigation={navigation} params={route.params} />;
}

// Passo 0: sem especialidade, mostra a lista para escolher
function EscolherEspecialidade({ navigation, params }) {
  const { dados, erro, recarregar } = useDadosDaTela(listarEspecialidades);

  return (
    <Tela titulo="Marcar consulta" subtitulo="Qual especialidade você procura?" voltar>
      {!dados && (erro ? <MensagemErro mensagem={erro} aoTentarDeNovo={recarregar} /> : <Carregando />)}
      {dados && (
        <>
          <Cartao
            onPress={() => navigation.navigate('Assistente')}
            style={estilos.dicaAssistente}
            accessibilityLabel="Não sabe qual escolher? Conte o que sente ao assistente."
          >
            <Feather name="message-circle" size={22} color={cores.noite} />
            <Texto style={estilos.flex}>
              Não sabe qual escolher? <Texto variante="negrito">Conte o que sente ao assistente.</Texto>
            </Texto>
          </Cartao>
          <View style={estilos.lista}>
            {dados.map((e) => (
              <Cartao
                key={e.id}
                onPress={() => navigation.push('Agendar', { ...params, especialidade: e.id })}
                style={estilos.linha}
                accessibilityLabel={`${e.nome}. ${e.desc}`}
              >
                <View style={estilos.flex}>
                  <Texto variante="negrito">{e.nome}</Texto>
                  <Texto variante="meta">{e.desc}</Texto>
                </View>
                <Feather name="chevron-right" size={22} color={cores.tinta3} />
              </Cartao>
            ))}
          </View>
        </>
      )}
    </Tela>
  );
}

// Passos 1 a 3: para quem, horário, confirmar
function EscolherHorario({ navigation, params }) {
  const { usuario } = useSessao();
  const [quemEscolhido, setQuemEscolhido] = useState(null);
  const [escolha, setEscolha] = useState(null); // { medico, data, hora }
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState(null);
  const [marcada, setMarcada] = useState(null); // consulta criada → tela de sucesso

  const { dados, erro, recarregar } = useDadosDaTela(async () => {
    const [esp, familia, horarios, primeiro, fila] = await Promise.all([
      buscarEspecialidade(params.especialidade),
      listarFamiliares(usuario),
      listarHorariosLivres(params.especialidade),
      primeiroHorario(params.especialidade),
      buscarMinhaFila(usuario),
    ]);
    return { esp, familia, horarios, primeiro, fila };
  });

  if (!dados) {
    return (
      <Tela titulo="Marcar consulta" voltar rolavel={false}>
        {erro ? <MensagemErro mensagem={erro} aoTentarDeNovo={recarregar} /> : <Carregando />}
      </Tela>
    );
  }

  const { esp, familia, horarios, primeiro, fila } = dados;

  // Regra: pediatria só atende menores de 18 anos
  const elegivel = (p) => esp.id !== 'pediatria' || (p.idade !== null && p.idade < 18);
  const sugerida = familia.find((p) => p.id === params.pessoa && elegivel(p)) || familia.find(elegivel);
  const quem = familia.find((p) => p.id === quemEscolhido) || sugerida;

  if (marcada) return <SucessoConsulta consulta={marcada} navigation={navigation} />;

  const ehEscolha = (medico, data, hora) =>
    escolha && escolha.medico.id === medico.id && escolha.data === data && escolha.hora === hora;

  async function confirmar() {
    setEnviando(true);
    setErroEnvio(null);
    try {
      const consulta = await marcarConsulta(usuario, {
        pessoa: quem.id,
        medico: escolha.medico.id,
        data: escolha.data,
        hora: escolha.hora,
      });
      if (params.itemPrevencao) await marcarItemPrevencao(usuario, params.itemPrevencao, 'agendado');
      setMarcada(consulta);
    } catch (e) {
      setErroEnvio(e.message);
      setEscolha(null);
      recarregar(); // o horário pode ter sido ocupado: busca a lista de novo
    } finally {
      setEnviando(false);
    }
  }

  async function irParaFila(medico) {
    if (fila && fila.medico.id === medico.id) {
      navigation.navigate('Espera');
      return;
    }
    try {
      await entrarNaFila(usuario, { pessoa: quem.id, medico: medico.id });
      navigation.navigate('Espera');
    } catch (e) {
      setErroEnvio(e.message);
    }
  }

  const resumo = escolha
    ? `${esp.nome} para ${nomeParaExibir(quem)}: ${extenso(escolha.data)}, às ${escolha.hora}, com ${escolha.medico.nome}.`
    : 'Escolha um horário acima.';

  return (
    <Tela
      titulo="Marcar consulta"
      subtitulo={esp.nome}
      voltar
      rodape={
        <>
          {erroEnvio && (
            <View style={estilos.erro} accessibilityRole="alert" accessibilityLiveRegion="polite">
              <Texto cor={cores.domingo}>{erroEnvio}</Texto>
            </View>
          )}
          <Texto variante="meta" accessibilityLiveRegion="polite">
            {resumo}
          </Texto>
          <Botao
            titulo="Confirmar consulta"
            icone="check"
            onPress={confirmar}
            carregando={enviando}
            desativado={!escolha || !quem}
          />
        </>
      }
    >
      <Texto variante="meta">{esp.desc}</Texto>

      <CabecalhoSecao titulo="Para quem é a consulta?" />
      <View style={estilos.pessoas} accessibilityRole="radiogroup">
        {familia.map((p) => {
          const ok = elegivel(p);
          const marcadoAgora = quem && p.id === quem.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => setQuemEscolhido(p.id)}
              disabled={!ok || enviando}
              accessibilityRole="radio"
              accessibilityLabel={`${p.nome}${ok ? '' : ', fora da idade da pediatria'}`}
              accessibilityState={{ checked: !!marcadoAgora, disabled: !ok }}
              style={[estilos.pessoa, marcadoAgora && estilos.pessoaMarcada, !ok && estilos.desativado]}
            >
              <AvatarFamiliar pessoa={p} tamanho={36} />
              <View>
                <Texto variante="negrito">{p.titular ? 'Você' : p.curto}</Texto>
                {!ok && <Texto variante="meta">Fora da idade</Texto>}
              </View>
            </Pressable>
          );
        })}
      </View>
      {esp.id === 'pediatria' && (
        <Texto variante="meta" style={estilos.nota}>
          A pediatria atende crianças e adolescentes até 18 anos.
        </Texto>
      )}
      {!quem && (
        <Texto cor={cores.domingo} style={estilos.nota}>
          Ninguém da sua família pode ser atendido nesta especialidade.
        </Texto>
      )}

      <CabecalhoSecao titulo="Escolha o horário" />
      {primeiro && (
        <Cartao
          onPress={() => setEscolha({ medico: primeiro.medico, data: primeiro.data, hora: primeiro.hora })}
          style={[estilos.primeiro, ehEscolha(primeiro.medico, primeiro.data, primeiro.hora) && estilos.primeiroMarcado]}
          accessibilityLabel={`Primeiro horário livre: ${relativo(primeiro.data)}, ${extenso(primeiro.data)} às ${primeiro.hora}, com ${primeiro.medico.nome}`}
        >
          <FolhaDia data={primeiro.data} tamanho="pequena" variante="menta" />
          <View style={estilos.flex}>
            <Selo texto="Primeiro horário livre" tom="menta" />
            <Texto variante="subtitulo" style={{ marginTop: espaco.xs }}>
              {relativo(primeiro.data).replace(/^./, (l) => l.toUpperCase())}, {primeiro.hora}
            </Texto>
            <Texto variante="meta">{primeiro.medico.nome}</Texto>
          </View>
        </Cartao>
      )}

      <View style={estilos.lista}>
        {horarios.map(({ medico, dias }) => (
          <Cartao key={medico.id} style={estilos.medico}>
            <View style={estilos.linha}>
              <AvatarMedico medico={medico} tamanho={48} />
              <View style={estilos.flex}>
                <Texto variante="negrito">{medico.nome}</Texto>
                <Texto variante="meta">
                  {clinica.nome} · {medico.sala}
                </Texto>
              </View>
            </View>

            {dias.length === 0 ? (
              <View style={estilos.semHorario}>
                <Texto>
                  <Texto variante="negrito">Sem horários nas próximas 4 semanas.</Texto> Entre na lista de espera e
                  avisamos quando abrir uma vaga.
                </Texto>
                {fila && fila.medico.id === medico.id ? (
                  <>
                    <Texto variante="meta">Você já está nesta fila.</Texto>
                    <Botao titulo="Ver minha posição" variante="menta" icone="list" pequeno onPress={() => irParaFila(medico)} />
                  </>
                ) : (
                  <Botao
                    titulo="Entrar na lista de espera"
                    variante="menta"
                    icone="list"
                    pequeno
                    onPress={() => irParaFila(medico)}
                    desativado={!quem}
                  />
                )}
              </View>
            ) : (
              dias.map((dia) => (
                <View key={dia.data} style={estilos.dia}>
                  <Texto variante="rotulo" style={estilos.diaRotulo}>
                    {curto(dia.data)}
                  </Texto>
                  <View style={estilos.horas}>
                    {dia.horas.map((hora) => {
                      const ativo = ehEscolha(medico, dia.data, hora);
                      return (
                        <Pressable
                          key={hora}
                          onPress={() => setEscolha({ medico, data: dia.data, hora })}
                          disabled={enviando}
                          accessibilityRole="button"
                          accessibilityLabel={`${extenso(dia.data)} às ${hora} com ${medico.nome}`}
                          accessibilityState={{ selected: !!ativo }}
                          style={[estilos.hora, ativo && estilos.horaAtiva]}
                        >
                          <Texto variante="negrito" cor={ativo ? cores.sobreNoite : cores.noite}>
                            {hora}
                          </Texto>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </Cartao>
        ))}
      </View>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  lista: { gap: espaco.m, marginTop: espaco.m },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.m },
  dicaAssistente: { flexDirection: 'row', alignItems: 'center', gap: espaco.m, backgroundColor: cores.menta2, borderColor: cores.menta2 },
  nota: { marginTop: espaco.p },
  pessoas: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.p },
  pessoa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.p,
    minHeight: TOQUE_MINIMO + 8,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: raios.controle,
    borderWidth: 2,
    borderColor: cores.linha,
    backgroundColor: cores.papel,
  },
  pessoaMarcada: { borderColor: cores.noite, backgroundColor: cores.menta2 },
  desativado: { opacity: 0.5 },
  primeiro: { flexDirection: 'row', alignItems: 'center', gap: espaco.m, borderColor: cores.menta, borderWidth: 2 },
  primeiroMarcado: { borderColor: cores.noite, backgroundColor: cores.menta2 },
  medico: { gap: espaco.m },
  semHorario: { gap: espaco.p, backgroundColor: cores.gelo, borderRadius: raios.folha, padding: espaco.m },
  dia: { gap: espaco.xs },
  diaRotulo: { color: cores.tinta },
  horas: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.p },
  hora: {
    minHeight: TOQUE_MINIMO,
    minWidth: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: raios.controle,
    borderWidth: 1.5,
    borderColor: cores.noite,
    backgroundColor: cores.papel,
  },
  horaAtiva: { backgroundColor: cores.noite },
  erro: { backgroundColor: cores.domingoClaro, borderRadius: raios.folha, padding: espaco.m },
});
