// Agenda da família, com duas vistas:
// Lista: próximas consultas, e embaixo as que já aconteceram.
// Mês: uma folhinha do mês com marcação nos dias que têm consulta.

import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Tela from '../componentes/Tela';
import Texto from '../componentes/Texto';
import Cartao from '../componentes/Cartao';
import CartaoConsulta from '../componentes/CartaoConsulta';
import CabecalhoSecao from '../componentes/CabecalhoSecao';
import { Carregando, EstadoVazio, MensagemErro } from '../componentes/Estados';
import useDadosDaTela from '../componentes/useDadosDaTela';
import { useSessao } from '../contexto/SessaoContext';
import { listarConsultas } from '../servicos/consultas';
import { cores } from '../estilos/cores';
import { fontes } from '../estilos/tipografia';
import { espaco, raios, TOQUE_MINIMO } from '../estilos/espacos';
import { HOJE, ehDomingoOuFeriado, extenso, nomeDoMes, paraData, paraIso } from '../utilitarios/datas';

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const SEMANA_EXTENSO = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

// '2026-10' → ['2026-09-27', ..., null...]: as casas da grade, começando no domingo
function casasDoMes(anoMes) {
  const [ano, mes] = anoMes.split('-').map(Number);
  const primeiro = new Date(ano, mes - 1, 1, 12);
  const totalDias = new Date(ano, mes, 0).getDate();
  const casas = Array(primeiro.getDay()).fill(null); // dias vazios antes do dia 1
  for (let dia = 1; dia <= totalDias; dia++) casas.push(paraIso(new Date(ano, mes - 1, dia, 12)));
  while (casas.length % 7 !== 0) casas.push(null);
  return casas;
}

function outroMes(anoMes, delta) {
  const [ano, mes] = anoMes.split('-').map(Number);
  return paraIso(new Date(ano, mes - 1 + delta, 1, 12)).slice(0, 7);
}

export default function AgendaTela({ navigation }) {
  const { usuario } = useSessao();
  const { dados, erro, recarregar } = useDadosDaTela(() => listarConsultas(usuario));
  const [vista, setVista] = useState('lista');
  const [mes, setMes] = useState(HOJE.slice(0, 7));
  const [diaEscolhido, setDiaEscolhido] = useState(null);

  const tela = (conteudo) => (
    <Tela
      titulo="Agenda"
      subtitulo="Consultas de toda a família"
      rolavel={false}
      acaoDireita={{ icone: 'plus', rotulo: 'Marcar uma consulta', onPress: () => navigation.navigate('Agendar') }}
    >
      {conteudo}
    </Tela>
  );

  if (!dados) return tela(erro ? <MensagemErro mensagem={erro} aoTentarDeNovo={recarregar} /> : <Carregando />);

  const todas = [...dados.proximas, ...dados.passadas];
  const abrir = (c) => navigation.navigate('Consulta', { id: c.id });

  // O que a lista mostra depende da vista
  let itens;
  if (vista === 'lista') {
    itens = dados.proximas;
  } else if (diaEscolhido) {
    itens = todas.filter((c) => c.data === diaEscolhido);
  } else {
    itens = todas.filter((c) => c.data.startsWith(mes)).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  }

  const cabecalho = (
    <View style={estilos.cabecalho}>
      {/* Escolha da vista: Lista ou Mês */}
      <View style={estilos.segmentos} accessibilityRole="tablist">
        {[
          { id: 'lista', rotulo: 'Lista' },
          { id: 'mes', rotulo: 'Mês' },
        ].map((v) => (
          <Pressable
            key={v.id}
            onPress={() => setVista(v.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: vista === v.id }}
            style={[estilos.segmento, vista === v.id && estilos.segmentoAtivo]}
          >
            <Texto variante="negrito" cor={vista === v.id ? cores.sobreNoite : cores.noite}>
              {v.rotulo}
            </Texto>
          </Pressable>
        ))}
      </View>

      <Cartao
        onPress={() => navigation.navigate('PosConsulta')}
        style={estilos.pos}
        accessibilityLabel="Depois da consulta: retornos e exames pedidos"
      >
        <Feather name="clipboard" size={22} color={cores.noite} />
        <View style={estilos.flex}>
          <Texto variante="negrito">Depois da consulta</Texto>
          <Texto variante="meta">Retornos e exames pedidos pelos médicos</Texto>
        </View>
        <Feather name="chevron-right" size={22} color={cores.tinta3} />
      </Cartao>

      {vista === 'mes' && (
        <GradeDoMes
          mes={mes}
          consultas={todas}
          diaEscolhido={diaEscolhido}
          aoEscolherDia={(d) => setDiaEscolhido(d === diaEscolhido ? null : d)}
          aoMudarMes={(delta) => {
            setMes(outroMes(mes, delta));
            setDiaEscolhido(null);
          }}
        />
      )}

      <CabecalhoSecao
        titulo={
          vista === 'lista'
            ? 'Próximas consultas'
            : diaEscolhido
              ? extenso(diaEscolhido).replace(/^./, (l) => l.toUpperCase())
              : `Consultas de ${nomeDoMes(mes).split(' ')[0].toLowerCase()}`
        }
      />
    </View>
  );

  const rodape =
    vista === 'lista' && dados.passadas.length > 0 ? (
      <View>
        <CabecalhoSecao titulo="Consultas que já aconteceram" />
        <View style={estilos.itens}>
          {dados.passadas.map((c) => (
            <CartaoConsulta key={c.id} consulta={c} onPress={() => abrir(c)} />
          ))}
        </View>
      </View>
    ) : null;

  return tela(
    <FlatList
      data={itens}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => <CartaoConsulta consulta={item} onPress={() => abrir(item)} />}
      ItemSeparatorComponent={() => <View style={{ height: espaco.m }} />}
      ListHeaderComponent={cabecalho}
      ListFooterComponent={rodape}
      ListEmptyComponent={
        <EstadoVazio
          titulo={vista === 'lista' ? 'Nenhuma consulta marcada' : 'Nenhuma consulta neste período'}
          texto="Para marcar, toque no + lá em cima ou converse com o assistente."
          acao={{ titulo: 'Marcar consulta', icone: 'plus', onPress: () => navigation.navigate('Agendar') }}
        />
      }
      contentContainerStyle={estilos.conteudo}
    />,
  );
}

// A folhinha do mês: 7 colunas, de domingo a sábado
function GradeDoMes({ mes, consultas, diaEscolhido, aoEscolherDia, aoMudarMes }) {
  const casas = casasDoMes(mes);
  const diasComConsulta = new Set(consultas.map((c) => c.data));

  return (
    <Cartao style={estilos.grade}>
      <View style={estilos.mesTopo}>
        <Pressable onPress={() => aoMudarMes(-1)} accessibilityRole="button" accessibilityLabel="Mês anterior" style={estilos.seta}>
          <Feather name="chevron-left" size={26} color={cores.noite} />
        </Pressable>
        <Texto variante="subtitulo" accessibilityRole="header" accessibilityLiveRegion="polite">
          {nomeDoMes(mes)}
        </Texto>
        <Pressable onPress={() => aoMudarMes(1)} accessibilityRole="button" accessibilityLabel="Próximo mês" style={estilos.seta}>
          <Feather name="chevron-right" size={26} color={cores.noite} />
        </Pressable>
      </View>

      <View style={estilos.semana} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {SEMANA.map((d, i) => (
          <Texto key={i} variante="rotulo" style={[estilos.celulaSemana, i === 0 && { color: cores.domingo }]}>
            {d}
          </Texto>
        ))}
      </View>

      <View style={estilos.dias}>
        {casas.map((dia, i) => {
          if (!dia) return <View key={`vazio-${i}`} style={estilos.casa} />;
          const tem = diasComConsulta.has(dia);
          const hoje = dia === HOJE;
          const escolhido = dia === diaEscolhido;
          const vermelho = ehDomingoOuFeriado(dia);
          const numero = paraData(dia).getDate();
          return (
            <Pressable
              key={dia}
              onPress={() => aoEscolherDia(dia)}
              accessibilityRole="button"
              accessibilityLabel={`${SEMANA_EXTENSO[paraData(dia).getDay()]}, ${numero}${hoje ? ', hoje' : ''}${tem ? ', tem consulta' : ''}`}
              accessibilityState={{ selected: escolhido }}
              style={estilos.casa}
            >
              <View style={[estilos.numero, hoje && estilos.hoje, escolhido && estilos.escolhido]}>
                <Texto
                  style={[
                    estilos.textoNumero,
                    vermelho && { color: cores.domingo },
                    escolhido && { color: cores.sobreNoite },
                  ]}
                >
                  {numero}
                </Texto>
              </View>
              <View style={[estilos.ponto, tem && { backgroundColor: escolhido ? cores.menta : cores.noite }]} />
            </Pressable>
          );
        })}
      </View>
      <Texto variante="meta" style={estilos.legenda}>
        Toque num dia para ver as consultas dele. O ponto marca os dias com consulta.
      </Texto>
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  conteudo: { padding: espaco.g, paddingBottom: espaco.xg * 2 },
  cabecalho: { gap: espaco.m },
  itens: { gap: espaco.m },
  segmentos: {
    flexDirection: 'row',
    backgroundColor: cores.gelo2,
    borderRadius: raios.controle,
    padding: 4,
  },
  segmento: { flex: 1, minHeight: TOQUE_MINIMO, alignItems: 'center', justifyContent: 'center', borderRadius: raios.controle },
  segmentoAtivo: { backgroundColor: cores.noite },
  pos: { flexDirection: 'row', alignItems: 'center', gap: espaco.m },
  grade: { padding: espaco.p }, // padding menor para cada dia ter pelo menos 48 de largura
  mesTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seta: { width: TOQUE_MINIMO, height: TOQUE_MINIMO, alignItems: 'center', justifyContent: 'center' },
  semana: { flexDirection: 'row', marginTop: espaco.p },
  celulaSemana: { width: `${100 / 7}%`, textAlign: 'center' },
  dias: { flexDirection: 'row', flexWrap: 'wrap' },
  casa: { width: `${100 / 7}%`, height: 52, alignItems: 'center', justifyContent: 'center' },
  numero: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  hoje: { borderWidth: 2, borderColor: cores.mentaTinta },
  escolhido: { backgroundColor: cores.noite },
  textoNumero: { fontFamily: fontes.numero, fontSize: 16, color: cores.tinta },
  ponto: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  legenda: { marginTop: espaco.p },
});
