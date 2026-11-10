// Cadastro de paciente. Só paciente cria a própria conta; médico e recepção
// são cadastrados pela clínica, no sistema web.

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Tela from '../componentes/Tela';
import Texto from '../componentes/Texto';
import Botao from '../componentes/Botao';
import CampoTexto from '../componentes/CampoTexto';
import { useSessao } from '../contexto/SessaoContext';
import { cadastrar } from '../servicos/autenticacao';
import { brParaIso, mascararData } from '../utilitarios/datas';
import { cores } from '../estilos/cores';
import { espaco, raios, TOQUE_MINIMO } from '../estilos/espacos';

// Confere os campos e devolve { campo: 'mensagem' } com cada problema encontrado
function validar(f) {
  const erros = {};
  if (!f.nome.trim()) erros.nome = 'Informe o seu nome completo.';
  if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) erros.email = 'Informe um e-mail válido, como nome@exemplo.com.';
  if (f.senha.length < 6) erros.senha = 'A senha precisa ter pelo menos 6 caracteres.';
  if (f.confirmar !== f.senha) erros.confirmar = 'As senhas não são iguais.';
  if (f.nascimento && !brParaIso(f.nascimento)) erros.nascimento = 'Use o formato DD/MM/AAAA.';
  if (!f.termos) erros.termos = 'Para criar a conta, aceite os termos.';
  return erros;
}

export default function CadastroTela() {
  const { abrirSessao } = useSessao();
  const [form, setForm] = useState({
    nome: '', email: '', senha: '', confirmar: '', telefone: '', nascimento: '', termos: false,
  });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const mudar = (campo) => (valor) => setForm({ ...form, [campo]: valor });

  async function criarConta() {
    const encontrados = validar(form);
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
      });
      await abrirSessao(usuario); // entra direto no app
    } catch (e) {
      if (e.message.includes('e-mail')) setErros({ email: e.message });
      setErroGeral(e.message);
      setEnviando(false);
    }
  }

  return (
    <Tela titulo="Criar conta" subtitulo="Leva menos de 2 minutos" voltar>
      <View style={estilos.campos}>
        <CampoTexto rotulo="Nome completo" value={form.nome} onChangeText={mudar('nome')} erro={erros.nome} autoComplete="name" />
        <CampoTexto
          rotulo="E-mail"
          value={form.email}
          onChangeText={mudar('email')}
          erro={erros.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <CampoTexto
          rotulo="Senha"
          value={form.senha}
          onChangeText={mudar('senha')}
          erro={erros.senha}
          dica="Pelo menos 6 caracteres."
          segredo
          autoCapitalize="none"
          autoComplete="new-password"
        />
        <CampoTexto
          rotulo="Confirmar senha"
          value={form.confirmar}
          onChangeText={mudar('confirmar')}
          erro={erros.confirmar}
          segredo
          autoCapitalize="none"
        />
        <CampoTexto
          rotulo="Telefone (opcional)"
          value={form.telefone}
          onChangeText={mudar('telefone')}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="(11) 91234-5678"
        />
        <CampoTexto
          rotulo="Data de nascimento (opcional)"
          value={form.nascimento}
          onChangeText={(t) => mudar('nascimento')(mascararData(t))}
          erro={erros.nascimento}
          keyboardType="number-pad"
          placeholder="DD/MM/AAAA"
        />

        {/* Caixa de aceite: dado de saúde é dado sensível pela LGPD */}
        <Pressable
          onPress={() => mudar('termos')(!form.termos)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: form.termos }}
          accessibilityHint={erros.termos}
          style={[estilos.aceite, erros.termos && estilos.aceiteErro]}
        >
          <View style={[estilos.caixa, form.termos && estilos.caixaMarcada]}>
            {form.termos && <Feather name="check" size={20} color={cores.sobreNoite} />}
          </View>
          <Texto style={estilos.textoAceite}>
            Li e aceito os <Texto variante="negrito">Termos de Uso</Texto> e a{' '}
            <Texto variante="negrito">Política de Privacidade</Texto>. Entendo que meus dados de saúde são
            dados sensíveis (LGPD) e só serão usados para o meu atendimento.
          </Texto>
        </Pressable>
        {erros.termos && <Texto variante="meta" cor={cores.domingo}>{erros.termos}</Texto>}

        {erroGeral && (
          <View style={estilos.erro} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <Texto cor={cores.domingo}>{erroGeral}</Texto>
          </View>
        )}

        <Botao titulo="Criar conta" icone="user-plus" onPress={criarConta} carregando={enviando} />
      </View>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  campos: { gap: espaco.g },
  aceite: {
    flexDirection: 'row',
    gap: espaco.m,
    alignItems: 'flex-start',
    minHeight: TOQUE_MINIMO,
    padding: espaco.m,
    borderRadius: raios.folha,
    borderWidth: 1.5,
    borderColor: cores.linha,
    backgroundColor: cores.papel,
  },
  aceiteErro: { borderColor: cores.domingo },
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
  erro: { backgroundColor: cores.domingoClaro, borderRadius: raios.folha, padding: espaco.m },
});
