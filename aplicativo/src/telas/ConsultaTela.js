// Detalhe de uma consulta, com a opção de cancelar (avisando se, por ser no dia, conta como falta).

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Tela from '../componentes/Tela';
import Texto from '../componentes/Texto';
import Botao from '../componentes/Botao';
import Cartao from '../componentes/Cartao';
import FolhaDia from '../componentes/FolhaDia';
import Selo from '../componentes/Selo';
import Confirmacao from '../componentes/Confirmacao';
import { AvatarFamiliar, AvatarMedico } from '../componentes/Avatar';
import { Carregando, MensagemErro } from '../componentes/Estados';
import useDadosDaTela from '../componentes/useDadosDaTela';
import { useSessao } from '../contexto/SessaoContext';
import { buscarConsulta, cancelarConsulta, cancelarContaFalta } from '../servicos/consultas';
import { clinica } from '../dados/dadosFicticios';
import { cores } from '../estilos/cores';
import { espaco } from '../estilos/espacos';
import { extenso, relativo } from '../utilitarios/datas';
import { STATUS_CONSULTA, STATUS_FUTUROS } from '../utilitarios/status';

function Linha({ icone, titulo, texto }) {
  return (
    <View style={estilos.linha} accessible accessibilityLabel={`${titulo}: ${texto}`}>
      <Feather name={icone} size={20} color={cores.tinta2} style={estilos.icone} />
      <View style={estilos.flex}>
        <Texto variante="meta">{titulo}</Texto>
        <Texto>{texto}</Texto>
      </View>
    </View>
  );
}

export default function ConsultaTela({ route, navigation }) {
  const { usuario } = useSessao();
  const { dados: c, erro, recarregar } = useDadosDaTela(() => buscarConsulta(usuario, route.params.id));
  const [perguntando, setPerguntando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [erroCancelar, setErroCancelar] = useState(null);

  if (!c) {
    return (
      <Tela titulo="Consulta" voltar rolavel={false}>
        {erro ? <MensagemErro mensagem={erro} aoTentarDeNovo={recarregar} /> : <Carregando />}
      </Tela>
    );
  }

  const titulo = c.titulo || c.especialidade.nome;
  const futura = STATUS_FUTUROS.includes(c.status);
  const contaFalta = futura && cancelarContaFalta(c);
  const avisoCancelar = contaFalta
    ? ' Hoje é o dia da consulta e você confirmou presença: cancelar agora conta como falta sem aviso.'
    : ' Sem nenhuma consequência: o horário volta para quem precisa.';

  async function cancelar() {
    setCancelando(true);
    setErroCancelar(null);
    try {
      await cancelarConsulta(usuario, c.id);
      setPerguntando(false);
      navigation.goBack();
    } catch (e) {
      setErroCancelar(e.message);
      setCancelando(false);
    }
  }

  return (
    <Tela titulo={titulo} subtitulo={`para ${c.pessoa.titular ? 'você' : c.pessoa.curto}`} voltar>
      <Cartao style={estilos.topo}>
        <FolhaDia data={c.data} />
        <View style={estilos.flex}>
          <Selo texto={futura ? `${STATUS_CONSULTA[c.status]} · ${relativo(c.data)}` : STATUS_CONSULTA[c.status] || c.status} tom={futura ? 'menta' : 'neutro'} />
          <Texto variante="titulo" style={estilos.hora}>
            {c.hora}
          </Texto>
          <Texto variante="meta">{extenso(c.data)}</Texto>
        </View>
      </Cartao>

      <Cartao style={estilos.detalhes}>
        <View style={estilos.pessoa}>
          <AvatarMedico medico={c.medico} tamanho={44} />
          <View style={estilos.flex}>
            <Texto variante="negrito">{c.medico.nome}</Texto>
            <Texto variante="meta">{c.especialidade.nome}</Texto>
          </View>
        </View>
        <View style={estilos.pessoa}>
          <AvatarFamiliar pessoa={c.pessoa} tamanho={44} />
          <View style={estilos.flex}>
            <Texto variante="negrito">{c.pessoa.nome}</Texto>
            <Texto variante="meta">{c.pessoa.relacao}</Texto>
          </View>
        </View>
        <Linha icone="map-pin" titulo="Onde" texto={`${clinica.nome} · ${c.sala}\n${clinica.endereco}`} />
        <Linha icone="file-text" titulo="Motivo" texto={c.motivo} />
        {c.pessoa.alergias && c.pessoa.alergias !== 'Nenhuma informada' && (
          <Linha icone="alert-circle" titulo="Alergias" texto={c.pessoa.alergias} />
        )}
      </Cartao>

      {futura && (
        <>
          <Texto variante="meta" style={estilos.aviso}>
            Chegue 15 minutos antes. Se não puder ir, cancele para liberar o horário para outra pessoa.
          </Texto>
          <Botao titulo="Cancelar consulta" variante="textoPerigo" icone="x-circle" onPress={() => setPerguntando(true)} />
        </>
      )}

      <Confirmacao
        visivel={perguntando}
        titulo="Cancelar esta consulta?"
        texto={`${titulo} para ${c.pessoa.titular ? 'você' : c.pessoa.curto}, ${extenso(c.data)} às ${c.hora}.${avisoCancelar}`}
        rotuloConfirmar="Cancelar consulta"
        rotuloCancelar="Manter consulta"
        perigo
        carregando={cancelando}
        aoConfirmar={cancelar}
        aoCancelar={() => setPerguntando(false)}
      >
        {erroCancelar && <Texto cor={cores.domingo}>{erroCancelar}</Texto>}
      </Confirmacao>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: espaco.g },
  hora: { marginTop: espaco.xs },
  detalhes: { marginTop: espaco.m, gap: espaco.g },
  pessoa: { flexDirection: 'row', alignItems: 'center', gap: espaco.m },
  linha: { flexDirection: 'row', gap: espaco.m },
  icone: { marginTop: 2, width: 44, textAlign: 'center' },
  aviso: { marginTop: espaco.g, marginBottom: espaco.p },
});
