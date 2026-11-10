// Assistente de saúde (chat).
// Ajuda a descobrir a especialidade e leva direto ao agendamento.
// NÃO faz diagnóstico, e em emergência NÃO agenda: manda ligar 192 (SAMU).

import { useRef, useState } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Tela from '../componentes/Tela';
import Texto from '../componentes/Texto';
import Botao from '../componentes/Botao';
import useDadosDaTela from '../componentes/useDadosDaTela';
import { useSessao } from '../contexto/SessaoContext';
import { usePreferencias } from '../contexto/PreferenciasContext';
import { listarFamiliares } from '../servicos/familia';
import { analisarSintomas } from '../servicos/assistente';
import { cores } from '../estilos/cores';
import { fontes, tamanhos } from '../estilos/tipografia';
import { espaco, raios, TOQUE_MINIMO } from '../estilos/espacos';
import { relativo } from '../utilitarios/datas';
import { primeiroNome } from '../utilitarios/texto';

const RESPOSTAS_RAPIDAS = [
  { texto: 'Meu filho está com dor de ouvido' },
  { texto: 'Estou com dor de cabeça e febre' },
  { texto: 'Minha mãe com a pressão alta' },
  { texto: 'Dor no peito e falta de ar', alerta: true },
];

let proximoId = 1;
const novaMensagem = (autor, conteudo) => ({ id: String(proximoId++), autor, ...conteudo });

export default function AssistenteTela({ navigation }) {
  const { usuario } = useSessao();
  const { reduzirMovimento } = usePreferencias();
  const { dados: familia } = useDadosDaTela(() => listarFamiliares(usuario));
  const lista = useRef(null);

  const [texto, setTexto] = useState('');
  const [digitando, setDigitando] = useState(false);
  const [mensagens, setMensagens] = useState([
    novaMensagem('assistente', {
      texto: `Olá, ${primeiroNome(usuario.nome)}! O que você ou alguém da família está sentindo? Pode escrever do seu jeito.`,
    }),
  ]);

  function enviar(conteudo) {
    const limpo = conteudo.trim();
    if (!limpo || digitando || !familia) return;
    setTexto('');
    setMensagens((atuais) => [...atuais, novaMensagem('eu', { texto: limpo })]);
    setDigitando(true);
    // Pequena pausa de "digitando", mais curta para quem pediu menos movimento
    setTimeout(() => {
      const resposta = analisarSintomas(limpo, familia);
      setMensagens((atuais) => [...atuais, novaMensagem('assistente', { resposta })]);
      setDigitando(false);
    }, reduzirMovimento ? 350 : 800);
  }

  function irParaAgendar(especialidade, pessoa) {
    navigation.navigate('Agendar', { especialidade, pessoa });
  }

  const soBoasVindas = mensagens.length === 1;

  return (
    <Tela
      titulo="Assistente de saúde"
      subtitulo="Orienta, não faz diagnóstico"
      voltar
      rolavel={false}
      rodape={
        <View style={estilos.compositor}>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="Escreva o que está sentindo"
            placeholderTextColor={cores.tinta3}
            accessibilityLabel="Mensagem para o assistente"
            style={estilos.entrada}
            multiline
            maxLength={500}
            onSubmitEditing={() => enviar(texto)}
            blurOnSubmit
            returnKeyType="send"
          />
          <Pressable
            onPress={() => enviar(texto)}
            accessibilityRole="button"
            accessibilityLabel="Enviar"
            accessibilityState={{ disabled: !texto.trim() || digitando }}
            style={[estilos.enviar, (!texto.trim() || digitando) && { opacity: 0.5 }]}
          >
            <Feather name="send" size={22} color={cores.sobreNoite} />
          </Pressable>
        </View>
      }
    >
      {/* Aviso fixo: a regra "não faz diagnóstico" precisa estar visível, não só no código */}
      <View style={estilos.aviso} accessibilityRole="text">
        <Feather name="info" size={20} color={cores.mentaTinta} />
        <Texto variante="meta" cor={cores.tinta} style={estilos.flex}>
          Eu ajudo a descobrir a especialidade certa e a marcar a consulta.{' '}
          <Texto variante="meta" style={estilos.negrito}>
            Não faço diagnóstico.
          </Texto>{' '}
          Em emergência, ligue 192 (SAMU).
        </Texto>
      </View>

      <FlatList
        ref={lista}
        data={mensagens}
        keyExtractor={(m) => m.id}
        contentContainerStyle={estilos.conversa}
        onContentSizeChange={() => lista.current?.scrollToEnd({ animated: !reduzirMovimento })}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <Mensagem mensagem={item} aoEscolher={irParaAgendar} />}
        ListFooterComponent={
          <>
            {soBoasVindas && (
              <View style={estilos.rapidas}>
                {RESPOSTAS_RAPIDAS.map((r) => (
                  <Pressable
                    key={r.texto}
                    onPress={() => enviar(r.texto)}
                    accessibilityRole="button"
                    style={[estilos.rapida, r.alerta && estilos.rapidaAlerta]}
                  >
                    <Texto variante="rotulo" cor={r.alerta ? cores.domingo : cores.noite}>
                      {r.texto}
                    </Texto>
                  </Pressable>
                ))}
              </View>
            )}
            {digitando && (
              <View style={[estilos.balao, estilos.balaoAssistente]} accessibilityLiveRegion="polite">
                <Texto variante="meta">O assistente está escrevendo…</Texto>
              </View>
            )}
          </>
        }
      />
    </Tela>
  );
}

// Um balão da conversa
function Mensagem({ mensagem, aoEscolher }) {
  if (mensagem.autor === 'eu') {
    return (
      <View style={[estilos.balao, estilos.balaoEu]}>
        <Texto cor={cores.sobreNoite}>{mensagem.texto}</Texto>
      </View>
    );
  }
  if (mensagem.texto) {
    return (
      <View style={[estilos.balao, estilos.balaoAssistente]}>
        <Texto>{mensagem.texto}</Texto>
      </View>
    );
  }

  const r = mensagem.resposta;

  // Emergência: só o alerta. Nenhuma especialidade, nenhum agendamento.
  if (r.tipo === 'emergencia') {
    return (
      <View style={estilos.emergencia} accessibilityRole="alert" accessibilityLiveRegion="assertive">
        <View style={estilos.linha}>
          <Feather name="alert-triangle" size={22} color={cores.domingo} />
          <Texto variante="subtitulo" cor={cores.domingo}>
            Isso pode ser uma emergência
          </Texto>
        </View>
        <Texto>
          Dor no peito, falta de ar, desmaio ou fraqueza de um lado do corpo precisam de atendimento{' '}
          <Texto variante="negrito">agora</Texto>. Não espere por uma consulta.
        </Texto>
        <Botao titulo="Ligar 192 (SAMU)" variante="perigo" icone="phone" onPress={() => Linking.openURL('tel:192')} />
        <Botao
          titulo="Pronto-socorro mais perto"
          variante="secundario"
          icone="map-pin"
          onPress={() => Linking.openURL('https://www.google.com/maps/search/pronto-socorro')}
        />
      </View>
    );
  }

  if (r.tipo === 'cvv') {
    return (
      <View style={estilos.emergencia} accessibilityRole="alert" accessibilityLiveRegion="assertive">
        <View style={estilos.linha}>
          <Feather name="heart" size={22} color={cores.domingo} />
          <Texto variante="subtitulo" cor={cores.domingo}>
            Você não precisa passar por isso só
          </Texto>
        </View>
        <Texto>
          Converse agora com alguém do CVV, de graça, 24 horas por dia. Se houver risco imediato, ligue para o SAMU.
        </Texto>
        <Botao titulo="Ligar 188 (CVV)" variante="perigo" icone="phone" onPress={() => Linking.openURL('tel:188')} />
        <Botao titulo="Ligar 192 (SAMU)" variante="secundario" icone="phone" onPress={() => Linking.openURL('tel:192')} />
      </View>
    );
  }

  // Sugestão de especialidades
  const intro = r.quem.titular
    ? 'Entendi. Pelo que você contou, estas especialidades podem ajudar:'
    : `Entendi. Para ${r.quem.curto}, estas especialidades podem ajudar:`;

  return (
    <View style={estilos.sugestoes}>
      <View style={[estilos.balao, estilos.balaoAssistente]}>
        <Texto>{intro}</Texto>
      </View>
      {r.especialidades.map((e) => {
        const h = e.primeiroHorario;
        const sub = h
          ? `Próximo horário: ${relativo(h.data)}, ${h.hora} com ${h.medico.nome}`
          : 'Sem horário livre agora. Você pode entrar na lista de espera.';
        return (
          <Pressable
            key={e.id}
            onPress={() => aoEscolher(e.id, r.quem.id)}
            accessibilityRole="button"
            accessibilityLabel={`${e.nome}. ${e.desc}. ${sub}`}
            accessibilityHint="Abre a marcação de consulta"
            style={({ pressed }) => [estilos.sugestao, pressed && { backgroundColor: cores.gelo2 }]}
          >
            <View style={estilos.flex}>
              <Texto variante="negrito">{e.nome}</Texto>
              <Texto variante="meta">{e.desc}</Texto>
              <Texto variante="meta" cor={cores.mentaTinta}>
                {sub}
              </Texto>
            </View>
            <Feather name="chevron-right" size={22} color={cores.tinta3} />
          </Pressable>
        );
      })}
      <View style={[estilos.balao, estilos.balaoAssistente]}>
        <Texto>
          Isto é uma orientação, não um diagnóstico. Se piorar, ou se aparecer febre alta, falta de ar ou dor forte,
          procure um pronto-socorro.
        </Texto>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  negrito: { fontFamily: fontes.textoNegrito, color: cores.tinta },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.p },
  aviso: {
    flexDirection: 'row',
    gap: espaco.p,
    alignItems: 'flex-start',
    backgroundColor: cores.menta2,
    paddingHorizontal: espaco.g,
    paddingVertical: espaco.m,
  },
  conversa: { padding: espaco.g, gap: espaco.m },
  balao: { maxWidth: '88%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  balaoEu: { alignSelf: 'flex-end', backgroundColor: cores.noite, borderBottomRightRadius: 6 },
  balaoAssistente: {
    alignSelf: 'flex-start',
    backgroundColor: cores.papel,
    borderWidth: 1.5,
    borderColor: cores.linha,
    borderBottomLeftRadius: 6,
  },
  rapidas: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.p },
  rapida: {
    minHeight: TOQUE_MINIMO,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: raios.controle,
    borderWidth: 1.5,
    borderColor: cores.linha,
    backgroundColor: cores.papel,
  },
  rapidaAlerta: { borderColor: cores.domingo },
  emergencia: {
    backgroundColor: cores.domingoClaro,
    borderRadius: raios.cartao,
    borderWidth: 1.5,
    borderColor: cores.domingo,
    padding: espaco.g,
    gap: espaco.m,
  },
  sugestoes: { gap: espaco.p },
  sugestao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.m,
    backgroundColor: cores.papel,
    borderRadius: raios.folha,
    borderWidth: 1.5,
    borderColor: cores.linha,
    padding: espaco.m,
    minHeight: TOQUE_MINIMO,
  },
  compositor: { flexDirection: 'row', alignItems: 'flex-end', gap: espaco.p },
  entrada: {
    flex: 1,
    minHeight: TOQUE_MINIMO,
    maxHeight: 120,
    borderWidth: 1.5,
    borderColor: cores.linha,
    borderRadius: 24,
    paddingHorizontal: espaco.g,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fontes.texto,
    fontSize: tamanhos.corpo,
    color: cores.tinta,
    backgroundColor: cores.gelo,
  },
  enviar: {
    width: TOQUE_MINIMO,
    height: TOQUE_MINIMO,
    borderRadius: TOQUE_MINIMO / 2,
    backgroundColor: cores.noite,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
