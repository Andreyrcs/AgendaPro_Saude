// Tela de login. Só para pacientes: médico e recepção usam o sistema web da clínica.

import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Texto from '../componentes/Texto';
import Botao from '../componentes/Botao';
import CampoTexto from '../componentes/CampoTexto';
import Marca from '../componentes/Marca';
import { useSessao } from '../contexto/SessaoContext';
import { entrar } from '../servicos/autenticacao';
import { config } from '../servicos/config';
import { cores } from '../estilos/cores';
import { espaco, raios, TOQUE_MINIMO } from '../estilos/espacos';

// Conta fictícia da demonstração (a mesma do protótipo web)
const DEMONSTRACAO = { email: 'juliana.santos@email.com', senha: 'paciente123' };

export default function LoginTela({ navigation }) {
  const insets = useSafeAreaInsets();
  const { abrirSessao } = useSessao();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function fazerLogin(emailUsado, senhaUsada) {
    if (!emailUsado.trim() || !senhaUsada) {
      setErro('Preencha o e-mail e a senha.');
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      const usuario = await entrar(emailUsado, senhaUsada);
      await abrirSessao(usuario); // a navegação troca sozinha para as abas
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  function entrarComDemonstracao() {
    setEmail(DEMONSTRACAO.email);
    setSenha(DEMONSTRACAO.senha);
    fazerLogin(DEMONSTRACAO.email, DEMONSTRACAO.senha);
  }

  return (
    <KeyboardAvoidingView style={estilos.raiz} behavior="padding">
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={[estilos.topo, { paddingTop: insets.top + espaco.xg }]}>
          <Marca tamanho={56} sobreNoite />
          <Texto variante="titulo" cor={cores.sobreNoite} accessibilityRole="header">
            AgendaPro Saúde
          </Texto>
          <Texto cor={cores.sobreNoite2}>
            Consultas para você e sua família, do que você sente até o horário marcado.
          </Texto>
        </View>

        <View style={estilos.formulario}>
          <Texto variante="subtitulo" accessibilityRole="header">
            Entrar na sua conta
          </Texto>

          <CampoTexto
            rotulo="E-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="seuemail@exemplo.com"
          />
          <CampoTexto
            rotulo="Senha"
            value={senha}
            onChangeText={setSenha}
            segredo
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            onSubmitEditing={() => fazerLogin(email, senha)}
          />

          {erro && (
            <View style={estilos.erro} accessibilityRole="alert" accessibilityLiveRegion="polite">
              <Texto cor={cores.domingo}>{erro}</Texto>
            </View>
          )}

          <Botao titulo="Entrar" icone="log-in" onPress={() => fazerLogin(email, senha)} carregando={enviando} />

          <Pressable
            onPress={() => navigation.navigate('Cadastro')}
            accessibilityRole="link"
            style={estilos.link}
          >
            <Texto>
              Ainda não tem conta? <Texto variante="negrito" cor={cores.mentaTinta}>Criar conta</Texto>
            </Texto>
          </Pressable>

          <View style={estilos.separador} />

          <Botao
            titulo="Entrar como paciente (demonstração)"
            variante="secundario"
            icone="user-check"
            onPress={entrarComDemonstracao}
            desativado={enviando}
            accessibilityHint="Entra com a conta fictícia da Juliana Santos"
          />
          <Texto variante="meta" style={estilos.centro}>
            {config.USAR_API_REAL
              ? 'Conectado à API do AgendaPro.'
              : 'Modo demonstração: os dados são fictícios e ficam só neste celular.'}
          </Texto>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.gelo },
  topo: {
    backgroundColor: cores.noite,
    paddingHorizontal: espaco.xg,
    paddingBottom: espaco.xg * 1.5,
    gap: espaco.m,
  },
  formulario: {
    flex: 1,
    backgroundColor: cores.gelo,
    marginTop: -espaco.g,
    borderTopLeftRadius: raios.cartao,
    borderTopRightRadius: raios.cartao,
    padding: espaco.xg,
    gap: espaco.g,
  },
  erro: { backgroundColor: cores.domingoClaro, borderRadius: raios.folha, padding: espaco.m },
  link: { minHeight: TOQUE_MINIMO, alignItems: 'center', justifyContent: 'center' },
  separador: { height: 1.5, backgroundColor: cores.linha },
  centro: { textAlign: 'center' },
});
