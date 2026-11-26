// Paciente que entrou mas ainda não tem clínica (criou a conta pelo site sem código, por exemplo).
// No app, a clínica só é escolhida pelo código no cadastro; para quem já tem conta, a escolha é pelo site.
// Esta tela explica isso, abre o site e confere de novo depois que a pessoa escolher.

import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Tela from '../componentes/Tela';
import Texto from '../componentes/Texto';
import Botao from '../componentes/Botao';
import Cartao from '../componentes/Cartao';
import { useSessao } from '../contexto/SessaoContext';
import { chamarApi } from '../servicos/api';
import { config } from '../servicos/config';
import { cores } from '../estilos/cores';
import { espaco } from '../estilos/espacos';

export default function SemClinicaTela() {
  const { usuario, abrirSessao, sair } = useSessao();
  const [conferindo, setConferindo] = useState(false);
  const [aviso, setAviso] = useState('');

  // GET /api/pacientes/{id}/clinicas: se a pessoa já escolheu pelo site, o app segue para as abas
  async function conferirDeNovo() {
    setConferindo(true);
    setAviso('');
    try {
      const clinicas = await chamarApi(`/api/pacientes/${usuario.idUsuario}/clinicas`);
      if (clinicas.length) {
        await abrirSessao({ ...usuario, clinicaId: clinicas[0].id, clinica: clinicas[0] });
        return;
      }
      setAviso('Ainda não achamos uma clínica na sua conta. Escolha pelo site e toque aqui de novo.');
    } catch (e) {
      setAviso(e.message);
    }
    setConferindo(false);
  }

  return (
    <Tela titulo="Escolha sua clínica pelo site" subtitulo={`Olá, ${usuario.nome.split(' ')[0]}`}>
      <Cartao>
        <View style={estilos.linha}>
          <Feather name="info" size={24} color={cores.noite} accessibilityElementsHidden importantForAccessibility="no" />
          <Texto style={estilos.texto}>
            Sua conta ainda não está ligada a nenhuma clínica. Entre no site do AgendaPro Saúde com o mesmo e-mail e
            a mesma senha e escolha a clínica pela busca ou pelo código que a recepção passou. Depois, volte aqui.
          </Texto>
        </View>
      </Cartao>
      <View style={estilos.botoes}>
        <Botao
          titulo="Abrir o site"
          icone="external-link"
          onPress={() => Linking.openURL(`${config.ENDERECO_WEB}/login.html`)}
          accessibilityHint="Abre o site do AgendaPro Saúde no navegador"
        />
        <Botao titulo="Já escolhi: conferir de novo" variante="secundario" icone="refresh-cw" carregando={conferindo} onPress={conferirDeNovo} />
        {aviso ? (
          <Texto variante="meta" accessibilityLiveRegion="polite" accessibilityRole="alert">
            {aviso}
          </Texto>
        ) : null}
        <Botao titulo="Sair" variante="texto" onPress={sair} />
      </View>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', gap: espaco.m, alignItems: 'flex-start' },
  texto: { flex: 1 },
  botoes: { gap: espaco.m, marginTop: espaco.xg },
});
