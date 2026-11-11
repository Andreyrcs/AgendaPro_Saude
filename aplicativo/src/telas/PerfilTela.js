// Perfil: dados da conta, clínica, faltas registradas e a regra de presença, acessibilidade e sair.

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
import useDadosDaTela from '../componentes/useDadosDaTela';
import { buscarSituacao } from '../servicos/consultas';
import { AvisoRestricao } from '../componentes/Presenca';
import { clinica } from '../dados/dadosFicticios';
import { TEXTO_DA_REGRA, textoDasFaltas } from '../utilitarios/status';
import { cores } from '../estilos/cores';
import { espaco, raios } from '../estilos/espacos';

export default function PerfilTela() {
  const { usuario, sair } = useSessao();
  const { reduzirMovimento, sistemaPede, pacientePediu, definirReduzirMovimento } = usePreferencias();

  const [perguntandoSaida, setPerguntandoSaida] = useState(false);
  const { dados: situacao } = useDadosDaTela(() => buscarSituacao(usuario));

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

      <CabecalhoSecao titulo="Presença e faltas" />
      <AvisoRestricao situacao={situacao} />
      <Cartao>
        <Texto variante="negrito">{situacao ? textoDasFaltas(situacao.faltas) : ' '}</Texto>
        <Texto variante="meta" style={estilos.dica}>
          {TEXTO_DA_REGRA}
        </Texto>
      </Cartao>

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
  sair: { marginTop: espaco.xg },
});
