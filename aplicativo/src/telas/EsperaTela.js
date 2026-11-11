// Lista de espera: posição na fila e a vaga oferecida (com 30 minutos para aceitar),
// que aparece quando a recepção cancela uma consulta deste médico e chega a sua vez.

import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Tela from '../componentes/Tela';
import Texto from '../componentes/Texto';
import Botao from '../componentes/Botao';
import Cartao from '../componentes/Cartao';
import FolhaDia from '../componentes/FolhaDia';
import CabecalhoSecao from '../componentes/CabecalhoSecao';
import Confirmacao from '../componentes/Confirmacao';
import SucessoConsulta from '../componentes/SucessoConsulta';
import { Carregando, EstadoVazio, MensagemErro } from '../componentes/Estados';
import useDadosDaTela from '../componentes/useDadosDaTela';
import { useSessao } from '../contexto/SessaoContext';
import { buscarMinhaFila, responderVaga, sairDaFila } from '../servicos/espera';
import { cores } from '../estilos/cores';
import { fontes } from '../estilos/tipografia';
import { espaco, raios } from '../estilos/espacos';
import { diaEMes, extenso } from '../utilitarios/datas';
import { fraseDaFila, ordinal } from '../utilitarios/texto';

// Milissegundos → '29:59'
function relogio(ms) {
  const segundos = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;
}

export default function EsperaTela({ navigation }) {
  const { usuario } = useSessao();
  const { dados: fila, carregando, erro, recarregar } = useDadosDaTela(() => buscarMinhaFila(usuario));
  const [atualizando, setAtualizando] = useState(false);
  const [perguntandoSaida, setPerguntandoSaida] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [vagaFechada, setVagaFechada] = useState(false); // fechou a janela sem responder
  const [respondendo, setRespondendo] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [aceita, setAceita] = useState(null); // consulta criada ao aceitar a vaga
  const [agora, setAgora] = useState(Date.now());

  const vaga = fila && fila.vagaOferecida;

  // Relógio da contagem regressiva: atualiza a cada segundo enquanto há vaga oferecida
  useEffect(() => {
    if (!vaga) return undefined;
    setAgora(Date.now()); // acerta o relógio assim que a vaga aparece
    const intervalo = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, [vaga]);

  const restante = vaga ? vaga.expiraEm - agora : 0;

  // Acabou o tempo: a vaga passa para a próxima pessoa (mesmo efeito de recusar)
  useEffect(() => {
    if (vaga && restante <= 0 && !respondendo) {
      responder(false, 'O tempo acabou e a vaga passou para a próxima pessoa. Você continua em 1º.');
    }
  });

  if (aceita) return <SucessoConsulta consulta={aceita} titulo="Vaga confirmada!" navigation={navigation} />;

  if (fila === null && !carregando && !erro) {
    return (
      <Tela titulo="Lista de espera" voltar>
        <EstadoVazio
          icone="list"
          titulo="Você não está em nenhuma fila agora."
          texto="Quando não houver horário com o médico que você quer, toque em “Entrar na lista de espera” na tela de marcar consulta."
          acao={{ titulo: 'Marcar consulta', icone: 'plus', onPress: () => navigation.navigate('Agendar') }}
        />
      </Tela>
    );
  }

  if (!fila) {
    return (
      <Tela titulo="Lista de espera" voltar rolavel={false}>
        {erro ? <MensagemErro mensagem={erro} aoTentarDeNovo={recarregar} /> : <Carregando />}
      </Tela>
    );
  }

  const frase = fraseDaFila(fila.pessoa, fila.posicao);

  // Busca de novo a fila: se a recepção ofereceu uma vaga, ela aparece agora
  async function atualizar() {
    setAtualizando(true);
    setAviso(null);
    setVagaFechada(false);
    try {
      const nova = await recarregar();
      if (nova && nova.vagaOferecida) AccessibilityInfo.announceForAccessibility('Abriu uma vaga para você!');
    } finally {
      setAtualizando(false);
    }
  }

  async function responder(aceitar, mensagem) {
    setRespondendo(true);
    try {
      const consulta = await responderVaga(usuario, fila.id, aceitar);
      if (consulta) {
        setAceita(consulta);
      } else {
        setAviso(mensagem || 'Vaga recusada. Ela passou para a próxima pessoa. Você continua em 1º.');
        await recarregar();
      }
    } catch (e) {
      setAviso(e.message);
      await recarregar();
    } finally {
      setRespondendo(false);
    }
  }

  async function sair() {
    setSaindo(true);
    try {
      await sairDaFila(usuario, fila.id);
      setPerguntandoSaida(false);
      await recarregar();
    } finally {
      setSaindo(false);
    }
  }

  return (
    <Tela titulo="Lista de espera" subtitulo={`${fila.especialidade.nome} · ${fila.medico.nome}`} voltar>
      {/* Posição na fila */}
      <View style={estilos.painel} accessible accessibilityLabel={`${frase}. ${fila.naFila} pessoas na fila.`}>
        <View style={estilos.linha}>
          <Texto style={estilos.posicao}>{ordinal(fila.posicao, fila.pessoa.genero === 'f' ? 'f' : 'm')}</Texto>
          <Texto variante="subtitulo" cor={cores.noite} style={estilos.flex}>
            {frase}
          </Texto>
        </View>
        <Texto cor={cores.noite}>
          <Texto variante="negrito">{fila.especialidade.nome}</Texto> · {fila.medico.nome}
          {'\n'}Na fila desde {diaEMes(fila.desde)}
        </Texto>
        {/* Bolinhas: na frente (azul), você (destaque), atrás (cinza) */}
        <View style={estilos.bolinhas}>
          {Array.from({ length: fila.naFila }, (_, i) => i + 1).map((n) => (
            <View
              key={n}
              style={[
                estilos.bolinha,
                n < fila.posicao && { backgroundColor: cores.noite },
                n === fila.posicao && estilos.voce,
                n > fila.posicao && { backgroundColor: cores.papel },
              ]}
            />
          ))}
        </View>
      </View>

      {aviso && (
        <View style={estilos.aviso} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Feather name="info" size={20} color={cores.noite} />
          <Texto style={estilos.flex}>{aviso}</Texto>
        </View>
      )}

      {vaga && vagaFechada && (
        <Botao titulo="Responder à vaga aberta" variante="menta" icone="bell" onPress={() => setVagaFechada(false)} style={estilos.espacoTopo} />
      )}

      <CabecalhoSecao titulo="Como funciona" />
      <Cartao style={estilos.passos}>
        {[
          'Quando a recepção cancela uma consulta deste médico, a vaga vai para a primeira pessoa da fila.',
          'Você recebe um aviso e tem 30 minutos para confirmar.',
          'Se não confirmar a tempo, a vaga passa para a próxima pessoa.',
        ].map((passo, i) => (
          <View key={i} style={estilos.passo}>
            <View style={estilos.numeroPasso}>
              <Texto variante="negrito">{i + 1}</Texto>
            </View>
            <Texto style={estilos.flex}>{passo}</Texto>
          </View>
        ))}
      </Cartao>

      <Botao
        titulo="Atualizar a fila"
        variante="secundario"
        icone="refresh-cw"
        onPress={atualizar}
        carregando={atualizando}
        desativado={!!vaga}
        style={estilos.espacoTopo}
      />

      <Botao titulo="Sair da fila" variante="textoPerigo" onPress={() => setPerguntandoSaida(true)} style={estilos.espacoTopo} />
      <Texto variante="meta" style={estilos.centro}>
        Você perde a sua posição.
      </Texto>

      <Confirmacao
        visivel={perguntandoSaida}
        titulo="Sair da lista de espera?"
        texto={`Você vai perder a ${fila.posicao}ª posição na fila de ${fila.medico.nome}. Se quiser voltar depois, entra no fim da fila.`}
        rotuloConfirmar="Sair da fila"
        rotuloCancelar="Continuar na fila"
        perigo
        carregando={saindo}
        aoConfirmar={sair}
        aoCancelar={() => setPerguntandoSaida(false)}
      />

      {/* Oferta de vaga com contagem regressiva */}
      {vaga && (
        <Confirmacao
          visivel={!vagaFechada}
          titulo="Abriu uma vaga para você!"
          rotuloConfirmar="Aceitar vaga"
          rotuloCancelar="Não quero esta vaga"
          carregando={respondendo}
          aoConfirmar={() => responder(true)}
          aoCancelar={() => responder(false)}
          aoFechar={() => setVagaFechada(true)}
        >
          <View style={estilos.vaga}>
            <FolhaDia data={vaga.data} variante="menta" />
            <View style={estilos.flex}>
              <Texto variante="negrito">{fila.especialidade.nome}</Texto>
              <Texto>{fila.medico.nome}</Texto>
              <Texto>
                {extenso(vaga.data)}, às {vaga.hora}
              </Texto>
            </View>
          </View>
          <View style={estilos.contagem} accessible accessibilityLabel={`Confirme em até ${relogio(restante)} minutos`}>
            <Feather name="clock" size={20} color={cores.noite} />
            <Texto>
              Confirme em até <Texto style={estilos.relogio}>{relogio(restante)}</Texto>
            </Texto>
          </View>
          <Texto variante="meta">Se você não quiser, a vaga vai para a próxima pessoa e você continua em 1º.</Texto>
        </Confirmacao>
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  centro: { textAlign: 'center' },
  espacoTopo: { marginTop: espaco.g },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.g },
  painel: { backgroundColor: cores.menta, borderRadius: raios.cartao, padding: espaco.xg, gap: espaco.m },
  posicao: { fontFamily: fontes.numeroForte, fontSize: 72, lineHeight: 76, color: cores.noite },
  bolinhas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: espaco.xs },
  bolinha: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: cores.noite },
  voce: { width: 26, height: 26, borderRadius: 13, backgroundColor: cores.papel, borderWidth: 6, borderColor: cores.mentaTinta, marginTop: -4 },
  aviso: {
    flexDirection: 'row',
    gap: espaco.p,
    backgroundColor: cores.gelo2,
    borderRadius: raios.folha,
    padding: espaco.m,
    marginTop: espaco.g,
  },
  passos: { gap: espaco.m },
  passo: { flexDirection: 'row', gap: espaco.m, alignItems: 'flex-start' },
  numeroPasso: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: cores.menta2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaga: { flexDirection: 'row', alignItems: 'center', gap: espaco.g },
  contagem: { flexDirection: 'row', alignItems: 'center', gap: espaco.p, backgroundColor: cores.menta2, borderRadius: raios.folha, padding: espaco.m },
  relogio: { fontFamily: fontes.numeroForte },
});
