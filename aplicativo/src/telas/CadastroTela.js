// Cadastro do paciente titular (tabelas Usuarios + Pacientes, e Paciente_Clinica se houver código).
// Só paciente cria a própria conta; médico e recepção são cadastrados pela clínica, no sistema web.

import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Tela from '../componentes/Tela';
import Texto from '../componentes/Texto';
import Botao from '../componentes/Botao';
import CampoTexto from '../componentes/CampoTexto';
import { useSessao } from '../contexto/SessaoContext';
import { cadastrar } from '../servicos/autenticacao';
import { config } from '../servicos/config';
import { HOJE, brParaIso, mascararData } from '../utilitarios/datas';
import { normalizarCodigo, validarCadastro } from '../utilitarios/validacao';
import { cores } from '../estilos/cores';
import { espaco, raios, TOQUE_MINIMO } from '../estilos/espacos';

// Máscara simples do código: letras maiúsculas e o hífen depois da 3ª letra (IPE-4821)
function mascararCodigo(texto) {
  const limpo = normalizarCodigo(texto).replace(/[^A-Z0-9]/g, '').slice(0, 7);
  return limpo.length > 3 ? `${limpo.slice(0, 3)}-${limpo.slice(3)}` : limpo;
}

export default function CadastroTela() {
  const { abrirSessao } = useSessao();
  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', senha: '', confirmar: '', nascimento: '', alergias: '', codigo: '', privacidade: false,
  });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const mudar = (campo) => (valor) => setForm({ ...form, [campo]: valor });

  async function criarConta() {
    const encontrados = validarCadastro(form, HOJE);
    setErros(encontrados);
    setErroGeral(null);
    if (Object.keys(encontrados).length > 0) {
      setErroGeral('Confira os campos marcados em vermelho.');
      return;
    }
    setEnviando(true);
    try {
      const usuario = await cadastrar({
        nome: form.nome,
        email: form.email,
        senha: form.senha,
        telefone: form.telefone,
        nascimento: brParaIso(form.nascimento),
        alergias: form.alergias,
        codigo: form.codigo,
      });
      await abrirSessao(usuario); // a navegação troca sozinha para as abas
    } catch (e) {
      if (e.message.includes('e-mail')) setErros({ email: e.message });
      if (e.message.includes('código')) setErros({ codigo: e.message });
      setErroGeral(e.message);
      setEnviando(false);
    }
  }

  return (
    <Tela titulo="Criar conta" subtitulo="Leva menos de 2 minutos" voltar>
      <View style={estilos.campos}>
        <CampoTexto rotulo="Nome completo" value={form.nome} onChangeText={mudar('nome')} erro={erros.nome} autoComplete="name" textContentType="name" />
        <CampoTexto
          rotulo="E-mail"
          value={form.email}
          onChangeText={mudar('email')}
          erro={erros.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <CampoTexto
          rotulo="Telefone"
          value={form.telefone}
          onChangeText={mudar('telefone')}
          erro={erros.telefone}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          placeholder="(11) 91234-5678"
        />
        <CampoTexto
          rotulo="Senha"
          value={form.senha}
          onChangeText={mudar('senha')}
          erro={erros.senha}
          dica="Pelo menos 8 caracteres."
          segredo
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <CampoTexto
          rotulo="Confirmar senha"
          value={form.confirmar}
          onChangeText={mudar('confirmar')}
          erro={erros.confirmar}
          segredo
          autoCapitalize="none"
          textContentType="newPassword"
        />
        <CampoTexto
          rotulo="Data de nascimento"
          value={form.nascimento}
          onChangeText={(t) => mudar('nascimento')(mascararData(t))}
          erro={erros.nascimento}
          keyboardType="number-pad"
          placeholder="DD/MM/AAAA"
        />
        <CampoTexto
          rotulo="Alergias (opcional)"
          value={form.alergias}
          onChangeText={mudar('alergias')}
          placeholder="Ex.: alergia a dipirona"
        />
        <CampoTexto
          rotulo="Código da clínica (opcional)"
          value={form.codigo}
          onChangeText={(t) => mudar('codigo')(mascararCodigo(t))}
          erro={erros.codigo}
          dica="A recepção informa. Exemplo: IPE-4821."
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="AAA-0000"
        />

        {/* Aceite: dado de saúde é dado sensível pela LGPD */}
        <View style={[estilos.aceite, erros.privacidade && estilos.aceiteErro]}>
          <Pressable
            onPress={() => mudar('privacidade')(!form.privacidade)}
            accessibilityRole="checkbox"
            accessibilityLabel="Li e aceito a política de privacidade"
            accessibilityState={{ checked: form.privacidade }}
            accessibilityHint={erros.privacidade}
            style={estilos.aceiteLinha}
          >
            <View style={[estilos.caixa, form.privacidade && estilos.caixaMarcada]}>
              {form.privacidade && <Feather name="check" size={20} color={cores.sobreNoite} />}
            </View>
            <Texto style={estilos.textoAceite}>Li e aceito a política de privacidade.</Texto>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL(`${config.ENDERECO_WEB}/privacidade.html`)}
            accessibilityRole="link"
            accessibilityLabel="Abrir a política de privacidade"
            style={estilos.link}
          >
            <Texto variante="negrito" cor={cores.mentaTinta}>
              Ler a política de privacidade
            </Texto>
          </Pressable>
        </View>
        {erros.privacidade && <Texto variante="meta" cor={cores.domingo}>{erros.privacidade}</Texto>}

        {erroGeral && (
          <View style={estilos.erro} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <Texto cor={cores.domingo}>{erroGeral}</Texto>
          </View>
        )}

        <Botao titulo="Criar conta" icone="user-plus" onPress={criarConta} carregando={enviando} accessibilityLabel="Criar conta" />
      </View>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  campos: { gap: espaco.g },
  aceite: {
    gap: espaco.p,
    padding: espaco.m,
    borderRadius: raios.folha,
    borderWidth: 1.5,
    borderColor: cores.linha,
    backgroundColor: cores.papel,
  },
  aceiteErro: { borderColor: cores.domingo },
  aceiteLinha: { flexDirection: 'row', gap: espaco.m, alignItems: 'center', minHeight: TOQUE_MINIMO },
  caixa: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: cores.noite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caixaMarcada: { backgroundColor: cores.noite },
  textoAceite: { flex: 1 },
  link: { minHeight: TOQUE_MINIMO, justifyContent: 'center' },
  erro: { backgroundColor: cores.domingoClaro, borderRadius: raios.folha, padding: espaco.m },
});
