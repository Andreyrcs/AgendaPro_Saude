// Perfil: dados da conta, acessibilidade e sair.

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Confirmacao from '../componentes/Confirmacao';
import Tela from '../componentes/Tela';
import Texto from '../componentes/Texto';
import Botao from '../componentes/Botao';
import Cartao from '../componentes/Cartao';
import Interruptor from '../componentes/Interruptor';
import CabecalhoSecao from '../componentes/CabecalhoSecao';
import { AvatarFamiliar } from '../componentes/Avatar';
import { useSessao } from '../contexto/SessaoContext';
import { usePreferencias } from '../contexto/PreferenciasContext';
import { config } from '../servicos/config';
import { clinica } from '../dados/dadosFicticios';
import { cores } from '../estilos/cores';
import { espaco, raios } from '../estilos/espacos';

export default function PerfilTela() {
  const { usuario, sair } = useSessao();
  const { reduzirMovimento, sistemaPede, pacientePediu, definirReduzirMovimento } = usePreferencias();

  const [perguntandoSaida, setPerguntandoSaida] = useState(false);

  return (
    <Tela titulo="Perfil">
      <Cartao style={estilos.conta}>
        <AvatarFamiliar pessoa={{ nome: usuario.nome, cor: cores.familia.juliana }} tamanho={64} />
        <View style={estilos.flex}>
          <Texto variante="subtitulo">{usuario.nome}</Texto>
          <Texto variante="meta">{usuario.email}</Texto>
        </View>
      </Cartao>

      <CabecalhoSecao titulo="Sua clínica" />
      <Cartao>
        <Texto variante="negrito">
          {clinica.nome} · {clinica.unidade}
        </Texto>
        <Texto variante="meta">{clinica.endereco}</Texto>
        <Texto variante="meta">{clinica.telefone}</Texto>
      </Cartao>

      <CabecalhoSecao titulo="Acessibilidade" />
      <Cartao>
        <Interruptor
          titulo="Reduzir movimento"
          descricao={
            sistemaPede
              ? 'Já está ligado pela configuração do seu celular.'
              : 'Desliga os deslizes entre as telas.'
          }
          valor={reduzirMovimento}
          aoMudar={definirReduzirMovimento}
          desativado={sistemaPede && !pacientePediu}
        />
        <Texto variante="meta" style={estilos.dica}>
          Para letras maiores, aumente o tamanho do texto nas configurações do celular. O app acompanha.
        </Texto>
      </Cartao>

      <CabecalhoSecao titulo="Conexão" />
      <View style={[estilos.selo, config.USAR_API_REAL ? estilos.seloReal : estilos.seloDemo]}>
        <Texto variante="negrito">
          {config.USAR_API_REAL ? 'Conectado à API' : 'Modo demonstração (dados simulados)'}
        </Texto>
        <Texto variante="meta">
          {config.USAR_API_REAL
            ? `Login e cadastro usam o servidor em ${config.ENDERECO_API}.`
            : 'Para usar a API real, mude USAR_API_REAL em src/servicos/config.js.'}
        </Texto>
      </View>

      <Botao
        titulo="Sair da conta"
        variante="textoPerigo"
        icone="log-out"
        onPress={() => setPerguntandoSaida(true)}
        style={estilos.sair}
      />

      <Confirmacao
        visivel={perguntandoSaida}
        titulo="Sair da conta?"
        texto="Você vai precisar entrar de novo com e-mail e senha."
        rotuloConfirmar="Sair"
        rotuloCancelar="Continuar no app"
        perigo
        aoConfirmar={sair}
        aoCancelar={() => setPerguntandoSaida(false)}
      />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  conta: { flexDirection: 'row', alignItems: 'center', gap: espaco.g },
  flex: { flex: 1 },
  dica: { marginTop: espaco.p },
  selo: { borderRadius: raios.folha, padding: espaco.m, gap: 2 },
  seloReal: { backgroundColor: cores.menta2 },
  seloDemo: { backgroundColor: cores.gelo2 },
  sair: { marginTop: espaco.xg },
});
