// Cartão de um médico no "Marcar consulta", que abre para baixo (acordeão):
// tocar no médico mostra os dias; tocar num dia mostra os horários daquele dia.
// Médico sem horário não abre: mostra "Sem horário disponível" e a lista de espera.
// Quem controla qual médico e qual dia estão abertos é a tela (só um médico aberto por vez).

import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Texto from './Texto';
import Botao from './Botao';
import Cartao from './Cartao';
import Entrada from './Entrada';
import FolhaDia from './FolhaDia';
import { AvatarMedico } from './Avatar';
import { cores } from '../estilos/cores';
import { espaco, raios, TOQUE_MINIMO } from '../estilos/espacos';
import { extenso, relativo } from '../utilitarios/datas';

export default function MedicoAcordeao({
  medico,
  dias,
  clinica, // nome da clínica
  aberto,
  aoTocar, // abre ou fecha este médico
  diaAberto, // 'AAAA-MM-DD' ou null
  aoEscolherDia,
  horaEscolhida, // a hora marcada no dia aberto, ou null
  aoEscolherHora,
  desativado, // enviando a consulta
  restrito, // faltas: sem agendamento direto por enquanto
  naFila, // a pessoa já está na fila deste médico
  aoIrParaFila,
  podeEntrarNaFila,
}) {
  const temHorario = dias.length > 0;
  const dia = dias.find((d) => d.data === diaAberto);
  const proximo = temHorario ? `Próximo horário: ${relativo(dias[0].data)}, ${dias[0].horas[0]}` : null;

  const identificacao = (
    <>
      <AvatarMedico medico={medico} tamanho={48} />
      <View style={estilos.flex}>
        <Texto variante="negrito">{medico.nome}</Texto>
        <Texto variante="meta">
          {clinica}
          {medico.sala ? ` · ${medico.sala}` : ''}
        </Texto>
        {proximo && (
          <Texto variante="rotulo" cor={cores.mentaTinta}>
            {proximo}
          </Texto>
        )}
      </View>
    </>
  );

  if (!temHorario) {
    return (
      <Cartao style={estilos.cartao}>
        <View style={estilos.cabeca}>{identificacao}</View>
        <View style={estilos.semHorario}>
          <Texto>
            <Texto variante="negrito">{restrito ? 'Agendamento direto indisponível por enquanto.' : 'Sem horário disponível.'}</Texto> Entre
            na lista de espera e avisamos quando abrir uma vaga.
          </Texto>
          {naFila && <Texto variante="meta">Você já está nesta fila.</Texto>}
          <Botao
            titulo={naFila ? 'Ver minha posição' : 'Entrar na lista de espera'}
            accessibilityLabel={naFila ? `Ver minha posição na fila de ${medico.nome}` : `Entrar na lista de espera de ${medico.nome}`}
            variante="menta"
            icone="list"
            pequeno
            onPress={aoIrParaFila}
            desativado={!naFila && !podeEntrarNaFila}
          />
        </View>
      </Cartao>
    );
  }

  return (
    <Cartao style={[estilos.cartao, aberto && estilos.cartaoAberto]}>
      <Pressable
        onPress={aoTocar}
        disabled={desativado}
        accessibilityRole="button"
        accessibilityLabel={`${medico.nome}. ${proximo}`}
        accessibilityHint={aberto ? 'Fecha os dias deste médico' : 'Mostra os dias e horários deste médico'}
        accessibilityState={{ expanded: aberto, disabled: desativado }}
        style={({ pressed }) => [estilos.cabeca, pressed && estilos.pressionado]}
      >
        {identificacao}
        <Feather name={aberto ? 'chevron-up' : 'chevron-down'} size={24} color={cores.noite} />
      </Pressable>

      {aberto && (
        <Entrada distancia={-8} style={estilos.conteudo}>
          <Texto variante="rotulo" cor={cores.tinta}>
            Escolha o dia
          </Texto>
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={estilos.dias} accessibilityRole="radiogroup">
            {dias.map((d) => {
              const marcado = d.data === diaAberto;
              return (
                <Pressable
                  key={d.data}
                  onPress={() => aoEscolherDia(d.data)}
                  disabled={desativado}
                  accessibilityRole="radio"
                  accessibilityLabel={`${extenso(d.data)}, ${d.horas.length === 1 ? '1 horário' : `${d.horas.length} horários`}`}
                  accessibilityState={{ checked: marcado, disabled: desativado }}
                  style={[estilos.dia, marcado && estilos.diaMarcado]}
                >
                  {/* o rótulo do botão já diz a data: o leitor de tela não precisa ler a folhinha */}
                  <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                    <FolhaDia data={d.data} tamanho="pequena" variante={marcado ? 'menta' : undefined} />
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {dia && (
            <View style={estilos.blocoHoras}>
              <Texto variante="rotulo" cor={cores.tinta} accessibilityLiveRegion="polite">
                Horários de {extenso(dia.data)}
              </Texto>
              <View style={estilos.horas}>
                {dia.horas.map((hora) => {
                  const ativo = hora === horaEscolhida;
                  return (
                    <Pressable
                      key={hora}
                      onPress={() => aoEscolherHora(hora)}
                      disabled={desativado}
                      accessibilityRole="button"
                      accessibilityLabel={`${extenso(dia.data)} às ${hora} com ${medico.nome}`}
                      accessibilityState={{ selected: ativo, disabled: desativado }}
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
          )}
        </Entrada>
      )}
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  cartao: { padding: 0, overflow: 'hidden' },
  cartaoAberto: { borderColor: cores.noite },
  cabeca: { flexDirection: 'row', alignItems: 'center', gap: espaco.m, minHeight: TOQUE_MINIMO, padding: espaco.g },
  pressionado: { backgroundColor: cores.gelo2 },
  semHorario: {
    gap: espaco.p,
    marginHorizontal: espaco.g,
    marginBottom: espaco.g,
    backgroundColor: cores.gelo,
    borderRadius: raios.folha,
    padding: espaco.m,
  },
  conteudo: { gap: espaco.p, padding: espaco.g, paddingTop: 0 },
  dias: { gap: espaco.xs, paddingBottom: espaco.p },
  dia: { minWidth: TOQUE_MINIMO, minHeight: TOQUE_MINIMO, padding: 3, borderRadius: raios.folha + 4, borderWidth: 2, borderColor: 'transparent' },
  diaMarcado: { borderColor: cores.noite, backgroundColor: cores.menta2 },
  blocoHoras: { gap: espaco.p },
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
});
