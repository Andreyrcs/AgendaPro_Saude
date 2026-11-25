// Marcar consulta: para quem → médico → dia → horário → confirmar.
// Parâmetros da rota (todos opcionais):
//   especialidade: id da especialidade (sem ela, a tela pede para escolher uma)
//   pessoa: id do familiar já escolhido (vindo do assistente ou da família)
//   itemPrevencao: id do item de prevenção que esta consulta resolve

import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Tela from '../componentes/Tela';
import Texto from '../componentes/Texto';
import Botao from '../componentes/Botao';
import Cartao from '../componentes/Cartao';
import FolhaDia from '../componentes/FolhaDia';
import MedicoAcordeao from '../componentes/MedicoAcordeao';
import Selo from '../componentes/Selo';
import SucessoConsulta from '../componentes/SucessoConsulta';
import CabecalhoSecao from '../componentes/CabecalhoSecao';
import { AvatarFamiliar } from '../componentes/Avatar';
import { Carregando, MensagemErro } from '../componentes/Estados';
import useDadosDaTela from '../componentes/useDadosDaTela';
import { useSessao } from '../contexto/SessaoContext';
import { usePreferencias } from '../contexto/PreferenciasContext';
import { buscarEspecialidade, calcularPrimeiroHorario, listarEspecialidades, listarHorariosLivres } from '../servicos/medicos';
import { listarFamiliares } from '../servicos/familia';
import { marcarConsulta, buscarSituacao } from '../servicos/consultas';
import { AvisoRestricao } from '../componentes/Presenca';
import { TEXTO_DA_REGRA, textoDasFaltas } from '../utilitarios/status';
import { buscarMinhaFila, entrarNaFila } from '../servicos/espera';
import { marcarItemPrevencao } from '../servicos/prevencao';
import { cores } from '../estilos/cores';
import { espaco, raios, TOQUE_MINIMO } from '../estilos/espacos';
import { extenso, relativo } from '../utilitarios/datas';
import { clinicaDaSessao, ehPediatria, nomeParaExibir } from '../utilitarios/texto';

export default function AgendarTela({ route, navigation }) {
  const especialidade = route.params?.especialidade;
  if (!especialidade) return <EscolherEspecialidade navigation={navigation} params={route.params} />;
  return <EscolherHorario navigation={navigation} params={route.params} />;
}

// Passo 0: sem especialidade, mostra a lista para escolher
function EscolherEspecialidade({ navigation, params }) {
  const { usuario } = useSessao();
  const { dados, erro, recarregar } = useDadosDaTela(() => listarEspecialidades(usuario));

  return (
    <Tela titulo="Marcar consulta" subtitulo="Qual especialidade você procura?" voltar>
      {!dados && (erro ? <MensagemErro mensagem={erro} aoTentarDeNovo={recarregar} /> : <Carregando />)}
      {dados && (
        <>
          <Cartao
            onPress={() => navigation.navigate('InicioAba', { screen: 'Assistente', initial: false })}
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

// Passos 1 a 4: para quem, médico, dia e horário, confirmar
function EscolherHorario({ navigation, params }) {
  const { usuario } = useSessao();
  const [quemEscolhido, setQuemEscolhido] = useState(null);
  const [aberta, setAberta] = useState({ medico: null, dia: null }); // o médico aberto (só um) e o dia escolhido nele
  const [escolha, setEscolha] = useState(null); // { medico, data, hora }
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState(null);
  const [marcada, setMarcada] = useState(null); // consulta criada → tela de sucesso
  const { reduzirMovimento } = usePreferencias();
  const rolagem = useRef(null);
  const posicoes = useRef({}); // onde está cada cartão de médico na tela

  // Ao abrir um médico, o cartão dele vai para o alto: o que estava aberto antes fechou e a tela mudou de altura
  useEffect(() => {
    if (!aberta.medico) return undefined;
    const espera = setTimeout(() => {
      const { lista, [aberta.medico]: cartao } = posicoes.current;
      if (rolagem.current && lista !== undefined && cartao !== undefined) {
        rolagem.current.scrollTo({ y: Math.max(0, lista + cartao - espaco.m), animated: !reduzirMovimento });
      }
    }, 120);
    return () => clearTimeout(espera);
  }, [aberta.medico]);

  const { dados, erro, recarregar } = useDadosDaTela(async () => {
    const [esp, familia, horarios, fila, situacao] = await Promise.all([
      buscarEspecialidade(params.especialidade),
      listarFamiliares(usuario),
      listarHorariosLivres(params.especialidade),
      buscarMinhaFila(usuario),
      buscarSituacao(usuario),
    ]);
    return { esp, familia, horarios, primeiro: calcularPrimeiroHorario(horarios), fila, situacao };
  });

  if (!dados) {
    return (
      <Tela titulo="Marcar consulta" voltar rolavel={false}>
        {erro ? <MensagemErro mensagem={erro} aoTentarDeNovo={recarregar} /> : <Carregando />}
      </Tela>
    );
  }

  const { esp, familia, fila, situacao } = dados;
  // faltas sem aviso podem limitar o agendamento direto (o assistente e o 192 nunca são bloqueados)
  const restrito = situacao.tipo !== 'normal';
  const soRecepcao = situacao.tipo === 'so_recepcao';
  const primeiro = restrito ? null : dados.primeiro;
  const horarios = soRecepcao ? [] : restrito ? dados.horarios.map((h) => ({ ...h, dias: [] })) : dados.horarios;

  // Regra: pediatria só atende menores de 18 anos
  const elegivel = (p) => !ehPediatria(esp) || (p.idade !== null && p.idade < 18);
  const sugerida = familia.find((p) => p.id === params.pessoa && elegivel(p)) || familia.find(elegivel);
  const quem = familia.find((p) => p.id === quemEscolhido) || sugerida;

  if (marcada) return <SucessoConsulta consulta={marcada} navigation={navigation} />;

  const ehEscolha = (medico, data, hora) =>
    escolha && escolha.medico.id === medico.id && escolha.data === data && escolha.hora === hora;

  // Abre um médico (e um dia). Trocar de médico ou de dia desfaz a escolha: só se confirma o que está à vista.
  function abrir(medico, dia = null) {
    setAberta({ medico, dia });
    setEscolha(null);
  }

  function escolherPrimeiro() {
    setAberta({ medico: primeiro.medico.id, dia: primeiro.data });
    setEscolha({ medico: primeiro.medico, data: primeiro.data, hora: primeiro.hora });
  }

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
      // a consulta fica ligada ao item de prevenção (Pessoa_Prevencao.IdConsulta)
      if (params.itemPrevencao) await marcarItemPrevencao(usuario, params.itemPrevencao, 'agendado', consulta.id);
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
    : 'Escolha o médico, o dia e o horário acima.';

  return (
    <Tela
      titulo="Marcar consulta"
      subtitulo={esp.nome}
      voltar
      rolagemRef={rolagem}
      rodape={
        <>
          {erroEnvio && (
            <View style={estilos.erro} accessibilityRole="alert" accessibilityLiveRegion="polite">
              <Texto cor={cores.domingo}>{erroEnvio}</Texto>
            </View>
          )}
          {/* a regra das faltas aparece antes de confirmar; enquanto se procura o horário, o rodapé fica pequeno */}
          {escolha && <Texto variante="meta">{textoDasFaltas(situacao.faltas)} {TEXTO_DA_REGRA}</Texto>}
          <Texto variante="meta" accessibilityLiveRegion="polite">
            {resumo}
          </Texto>
          <Botao
            titulo="Confirmar consulta"
            icone="check"
            onPress={confirmar}
            carregando={enviando}
            desativado={!escolha || !quem || restrito}
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
      {ehPediatria(esp) && (
        <Texto variante="meta" style={estilos.nota}>
          A pediatria atende crianças e adolescentes até 18 anos.
        </Texto>
      )}
      {!quem && (
        <Texto cor={cores.domingo} style={estilos.nota}>
          Ninguém da sua família pode ser atendido nesta especialidade.
        </Texto>
      )}

      <CabecalhoSecao titulo="Escolha o médico" />
      <AvisoRestricao situacao={situacao} />
      {primeiro && (
        <Cartao
          onPress={escolherPrimeiro}
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

      {dados.horarios.length === 0 && (
        <Texto style={estilos.nota}>
          Sem horário disponível no momento: ainda não há médico nesta especialidade. Ligue para a clínica
          {clinicaDaSessao(usuario).telefone ? `: ${clinicaDaSessao(usuario).telefone}` : ''}.
        </Texto>
      )}
      <View style={estilos.lista} onLayout={(e) => { posicoes.current.lista = e.nativeEvent.layout.y; }}>
        {horarios.map(({ medico, dias }) => {
          const aberto = aberta.medico === medico.id;
          return (
            <View key={medico.id} onLayout={(e) => { posicoes.current[medico.id] = e.nativeEvent.layout.y; }}>
              <MedicoAcordeao
                medico={medico}
                dias={dias}
                clinica={clinicaDaSessao(usuario).nome}
                aberto={aberto}
                aoTocar={() => abrir(aberto ? null : medico.id)}
                diaAberto={aberto ? aberta.dia : null}
                aoEscolherDia={(dia) => dia !== aberta.dia && abrir(medico.id, dia)}
                horaEscolhida={aberto && escolha && escolha.medico.id === medico.id && escolha.data === aberta.dia ? escolha.hora : null}
                aoEscolherHora={(hora) => setEscolha({ medico, data: aberta.dia, hora })}
                desativado={enviando}
                restrito={restrito}
                naFila={!!fila && fila.medico.id === medico.id}
                aoIrParaFila={() => irParaFila(medico)}
                podeEntrarNaFila={!!quem}
              />
            </View>
          );
        })}
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
  erro: { backgroundColor: cores.domingoClaro, borderRadius: raios.folha, padding: espaco.m },
});
