// Incluir alguém da família na prevenção: quem, em qual campanha/mês e qual exame.
// Ex.: Dona Cida → Outubro Rosa → Mamografia.

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Tela from '../componentes/Tela';
import Texto from '../componentes/Texto';
import Botao from '../componentes/Botao';
import { AvatarFamiliar } from '../componentes/Avatar';
import { Carregando, MensagemErro } from '../componentes/Estados';
import useDadosDaTela from '../componentes/useDadosDaTela';
import { useSessao } from '../contexto/SessaoContext';
import { incluirNaPrevencao, listarPrevencao, sugestoesDoMes } from '../servicos/prevencao';
import { listarFamiliares } from '../servicos/familia';
import { cores } from '../estilos/cores';
import { espaco, raios, TOQUE_MINIMO } from '../estilos/espacos';
import { nomeDoMes } from '../utilitarios/datas';

export default function AdicionarPrevencaoTela({ navigation }) {
  const { usuario } = useSessao();
  const { dados, erro, recarregar } = useDadosDaTela(async () => {
    const [meses, familia] = await Promise.all([listarPrevencao(usuario), listarFamiliares(usuario)]);
    return { meses, familia };
  });
  const [pessoa, setPessoa] = useState(null);
  const [mes, setMes] = useState(null);
  const [titulo, setTitulo] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [salvando, setSalvando] = useState(false);

  if (!dados) {
    return (
      <Tela titulo="Incluir na prevenção" voltar rolavel={false}>
        {erro ? <MensagemErro mensagem={erro} aoTentarDeNovo={recarregar} /> : <Carregando />}
      </Tela>
    );
  }

  const mesEscolhido = dados.meses.find((m) => m.mes === mes);
  const sugestoes = mesEscolhido ? sugestoesDoMes(mesEscolhido) : [];

  async function salvar() {
    const sugestao = sugestoes.find((s) => s.titulo === titulo);
    if (!pessoa || !mesEscolhido || !sugestao) {
      setMensagem('Escolha quem vai entrar, a campanha e o exame.');
      return;
    }
    setMensagem(null);
    setSalvando(true);
    try {
      await incluirNaPrevencao(usuario, { mes, pessoa, ...sugestao });
      navigation.goBack();
    } catch (e) {
      setMensagem(e.message);
      setSalvando(false);
    }
  }

  return (
    <Tela titulo="Incluir na prevenção" subtitulo="Escolha quem, a campanha e o exame" voltar>
      <View style={estilos.campos}>
        <View style={estilos.grupo}>
          <Texto variante="subtitulo">Quem vai entrar?</Texto>
          <View style={estilos.chips} accessibilityRole="radiogroup">
            {dados.familia.map((p) => {
              const ativo = pessoa === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setPessoa(p.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: ativo }}
                  accessibilityLabel={p.titular ? 'Você' : `${p.curto}, ${p.relacao}`}
                  style={[estilos.pessoa, ativo && estilos.ativo]}
                >
                  <AvatarFamiliar pessoa={p} tamanho={32} />
                  <Texto variante="negrito" cor={ativo ? cores.sobreNoite : cores.noite}>
                    {p.titular ? 'Você' : p.curto}
                  </Texto>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={estilos.grupo}>
          <Texto variante="subtitulo">Em qual campanha?</Texto>
          <View style={estilos.lista} accessibilityRole="radiogroup">
            {dados.meses.map((m) => {
              const ativo = mes === m.mes;
              return (
                <Pressable
                  key={m.mes}
                  onPress={() => {
                    setMes(m.mes);
                    setTitulo(null); // cada campanha tem os seus exames
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: ativo }}
                  style={[estilos.linha, ativo && estilos.ativo]}
                >
                  <View style={estilos.flex}>
                    <Texto variante="negrito" cor={ativo ? cores.sobreNoite : cores.noite}>
                      {m.campanha || m.tema}
                    </Texto>
                    <Texto variante="meta" cor={ativo ? cores.sobreNoite2 : cores.tinta2}>
                      {nomeDoMes(m.mes)}
                      {m.campanha ? ` · ${m.tema}` : ''}
                    </Texto>
                  </View>
                  {ativo && <Feather name="check" size={22} color={cores.menta} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        {mesEscolhido && (
          <View style={estilos.grupo}>
            <Texto variante="subtitulo">Qual exame ou check-up?</Texto>
            <View style={estilos.lista} accessibilityRole="radiogroup">
              {sugestoes.map((s) => {
                const ativo = titulo === s.titulo;
                return (
                  <Pressable
                    key={s.titulo}
                    onPress={() => setTitulo(s.titulo)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: ativo }}
                    style={[estilos.linha, ativo && estilos.ativo]}
                  >
                    <View style={estilos.flex}>
                      <Texto variante="negrito" cor={ativo ? cores.sobreNoite : cores.noite}>
                        {s.titulo}
                      </Texto>
                      <Texto variante="meta" cor={ativo ? cores.sobreNoite2 : cores.tinta2}>
                        {s.nota}
                      </Texto>
                    </View>
                    {ativo && <Feather name="check" size={22} color={cores.menta} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {mensagem && (
          <Texto cor={cores.domingo} accessibilityLiveRegion="polite">
            {mensagem}
          </Texto>
        )}
        <Botao titulo="Incluir na prevenção" icone="heart" onPress={salvar} carregando={salvando} />
      </View>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  campos: { gap: espaco.xg },
  grupo: { gap: espaco.m },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.p },
  lista: { gap: espaco.p },
  pessoa: {
    minHeight: TOQUE_MINIMO,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.p,
    paddingLeft: espaco.p,
    paddingRight: espaco.g,
    borderRadius: raios.controle,
    borderWidth: 1.5,
    borderColor: cores.linha,
    backgroundColor: cores.papel,
  },
  linha: {
    minHeight: TOQUE_MINIMO,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.m,
    padding: espaco.m,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: cores.linha,
    backgroundColor: cores.papel,
  },
  ativo: { backgroundColor: cores.noite, borderColor: cores.noite },
});
