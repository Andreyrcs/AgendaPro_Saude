// Adicionar familiar: nome, parentesco, nascimento, alergias e a cor do avatar.

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Tela from '../componentes/Tela';
import Texto from '../componentes/Texto';
import Botao from '../componentes/Botao';
import CampoTexto from '../componentes/CampoTexto';
import { AvatarFamiliar } from '../componentes/Avatar';
import { useSessao } from '../contexto/SessaoContext';
import { adicionarFamiliar } from '../servicos/familia';
import { cores, opcoesFamilia } from '../estilos/cores';
import { espaco, raios, TOQUE_MINIMO } from '../estilos/espacos';
import { HOJE, brParaIso, mascararData } from '../utilitarios/datas';

// Parentesco é obrigatório (coluna Pacientes.Parentesco); as mesmas opções da web
const PARENTESCOS = ['Filho(a)', 'Cônjuge', 'Pai/Mãe', 'Irmão(ã)', 'Outro'];

export default function AdicionarFamiliarTela({ navigation }) {
  const { usuario } = useSessao();
  const [nome, setNome] = useState('');
  const [relacao, setRelacao] = useState(null);
  const [nascimento, setNascimento] = useState('');
  const [alergias, setAlergias] = useState('');
  const [cor, setCor] = useState(opcoesFamilia[5]);
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    const iso = brParaIso(nascimento);
    const encontrados = {};
    if (!nome.trim()) encontrados.nome = 'Informe o nome do familiar.';
    if (!relacao) encontrados.relacao = 'Escolha o parentesco.';
    if (!iso || iso > HOJE) encontrados.nascimento = 'Informe uma data válida, no formato DD/MM/AAAA.';
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setSalvando(true);
    try {
      await adicionarFamiliar(usuario, { nome, relacao, nascimento: iso, alergias, cor });
      navigation.goBack();
    } catch (e) {
      setErros({ geral: e.message });
      setSalvando(false);
    }
  }

  return (
    <Tela titulo="Adicionar familiar" voltar>
      <View style={estilos.previa}>
        <AvatarFamiliar pessoa={{ nome: nome || '?', cor }} tamanho={88} />
        <Texto variante="meta">Prévia do avatar</Texto>
      </View>

      <View style={estilos.campos}>
        <CampoTexto rotulo="Nome completo" value={nome} onChangeText={setNome} erro={erros.nome} autoComplete="name" />

        <View style={estilos.grupo}>
          <Texto variante="rotulo" cor={cores.tinta}>
            Parentesco (obrigatório)
          </Texto>
          <View style={estilos.chips} accessibilityRole="radiogroup">
            {PARENTESCOS.map((p) => (
              <Pressable
                key={p}
                onPress={() => setRelacao(p)}
                accessibilityRole="radio"
                accessibilityLabel={`Parentesco: ${p}`}
                accessibilityState={{ checked: relacao === p }}
                style={[estilos.chip, relacao === p && estilos.chipAtivo]}
              >
                <Texto variante="negrito" cor={relacao === p ? cores.sobreNoite : cores.noite}>
                  {p}
                </Texto>
              </Pressable>
            ))}
          </View>
          {erros.relacao && <Texto variante="meta" cor={cores.domingo}>{erros.relacao}</Texto>}
        </View>

        <CampoTexto
          rotulo="Data de nascimento"
          value={nascimento}
          onChangeText={(t) => setNascimento(mascararData(t))}
          erro={erros.nascimento}
          keyboardType="number-pad"
          placeholder="DD/MM/AAAA"
        />
        <CampoTexto
          rotulo="Alergias (opcional)"
          value={alergias}
          onChangeText={setAlergias}
          placeholder="Ex.: alergia a dipirona"
        />

        <View style={estilos.grupo}>
          <Texto variante="rotulo" cor={cores.tinta}>
            Cor do avatar
          </Texto>
          <View style={estilos.chips} accessibilityRole="radiogroup">
            {opcoesFamilia.map((c, i) => (
              <Pressable
                key={c}
                onPress={() => setCor(c)}
                accessibilityRole="radio"
                accessibilityLabel={`Cor ${i + 1} de ${opcoesFamilia.length}`}
                accessibilityState={{ checked: cor === c }}
                style={[estilos.cor, { backgroundColor: c }, cor === c && estilos.corAtiva]}
              >
                {cor === c && <Feather name="check" size={22} color={cores.noite} />}
              </Pressable>
            ))}
          </View>
        </View>

        {erros.geral && <Texto cor={cores.domingo}>{erros.geral}</Texto>}
        <Botao titulo="Salvar familiar" icone="check" onPress={salvar} carregando={salvando} />
      </View>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  previa: { alignItems: 'center', gap: espaco.p, marginBottom: espaco.g },
  campos: { gap: espaco.g },
  grupo: { gap: espaco.p },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.p },
  chip: {
    minHeight: TOQUE_MINIMO,
    paddingHorizontal: espaco.g,
    justifyContent: 'center',
    borderRadius: raios.controle,
    borderWidth: 1.5,
    borderColor: cores.linha,
    backgroundColor: cores.papel,
  },
  chipAtivo: { backgroundColor: cores.noite, borderColor: cores.noite },
  cor: {
    width: TOQUE_MINIMO,
    height: TOQUE_MINIMO,
    borderRadius: TOQUE_MINIMO / 2,
    borderWidth: 2,
    borderColor: cores.linha,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corAtiva: { borderColor: cores.noite, borderWidth: 3 },
});
