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
import { validarLogin } from '../utilitarios/validacao';
import { cores } from '../estilos/cores';
import { espaco, raios, TOQUE_MINIMO } from '../estilos/espacos';

// Acesso rápido: a conta da carga inicial (a mesma da web)
const ACESSO_RAPIDO = { email: 'juliana.santos@email.com', senha: 'paciente123' };

export default function LoginTela({ navigation }) {
  const insets = useSafeAreaInsets();
  const { abrirSessao } = useSessao();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function fazerLogin(emailUsado, senhaUsada) {
    const problema = validarLogin(emailUsado, senhaUsada); // "Preencha e-mail e senha."
    if (problema) {
      setErro(problema);
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

  function entrarRapido() {
    setEmail(ACESSO_RAPIDO.email);
    setSenha(ACESSO_RAPIDO.senha);
    fazerLogin(ACESSO_RAPIDO.email, ACESSO_RAPIDO.senha);
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

          <Botao titulo="Entrar" icone="log-in" onPress={() => fazerLogin(email, senha)} carregando={enviando} accessibilityLabel="Entrar" />

          <Pressable
            onPress={() => navigation.navigate('Cadastro')}
            accessibilityRole="link"
            accessibilityLabel="Ainda não tem conta? Criar conta"
            style={estilos.link}
          >
            <Texto>
              Ainda não tem conta? <Texto variante="negrito" cor={cores.mentaTinta}>Criar conta</Texto>
            </Texto>
          </Pressable>

          <View style={estilos.separador} />

          <Texto variante="meta" style={estilos.centro}>
            Acesso rápido
          </Texto>
          <Botao
            titulo="Juliana Santos · paciente"
            variante="secundario"
            icone="user-check"
            onPress={entrarRapido}
            desativado={enviando}
            accessibilityHint="Entra com a conta da Juliana Santos"
          />
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
