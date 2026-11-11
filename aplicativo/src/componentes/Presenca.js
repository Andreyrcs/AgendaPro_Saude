// Cartão "Confirme sua consulta" (Vou / Não vou) e o aviso de restrição por faltas sem aviso.
// Nada aqui envolve valores: avisar até o fim da véspera não tem consequência.

import { Linking, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Texto from './Texto';
import Botao from './Botao';
import { cores } from '../estilos/cores';
import { espaco, raios } from '../estilos/espacos';
import { HOJE, diaEMes } from '../utilitarios/datas';
import { FALTAS_PARA_RESTRICAO } from '../utilitarios/status';
import { clinica } from '../dados/dadosFicticios';
import { nomeParaExibir } from '../utilitarios/texto';

export function CartaoConfirmarPresenca({ consulta, aoVou, aoNaoVou, ocupado }) {
  const amanha = consulta.data > HOJE;
  return (
    <View style={estilos.cartao} accessibilityRole="summary">
      <Texto variante="negrito" cor={cores.noite}>
        Confirme sua consulta {amanha ? 'de amanhã' : 'de hoje'}
      </Texto>
      <Texto cor={cores.noite}>
        {consulta.especialidade.nome} com {consulta.medico.nome}, às {consulta.hora}
        {consulta.pessoa.titular ? '' : ` · para ${nomeParaExibir(consulta.pessoa)}`}.
      </Texto>
      {amanha && (
        <Texto variante="meta" cor={cores.noite}>
          Se não puder ir, toque em “Não vou” até o fim de hoje: não há nenhuma consequência.
        </Texto>
      )}
      <View style={estilos.acoes}>
        <Botao titulo="Vou" icone="check" onPress={aoVou} desativado={ocupado} style={estilos.flex} />
        <Botao titulo="Não vou" variante="secundario" onPress={aoNaoVou} desativado={ocupado} style={estilos.flex} />
      </View>
    </View>
  );
}

// situacao = { tipo: 'normal' | 'so_fila' | 'so_recepcao', ate }
export function AvisoRestricao({ situacao }) {
  if (!situacao || situacao.tipo === 'normal') return null;
  const recepcao = situacao.tipo === 'so_recepcao';
  return (
    <View style={estilos.aviso} accessibilityRole="alert">
      <Feather name="info" size={20} color={cores.noite} />
      <View style={estilos.flex}>
        <Texto variante="negrito">{recepcao ? 'Agende pela recepção' : 'Por enquanto, só pela lista de espera'}</Texto>
        <Texto>
          {recepcao
            ? `Houve uma nova falta sem aviso durante a restrição. Até ${diaEMes(situacao.ate)}, as consultas são marcadas pela recepção da clínica.`
            : `Houve ${FALTAS_PARA_RESTRICAO} faltas sem aviso depois de confirmar presença. Até ${diaEMes(situacao.ate)} você pode entrar na lista de espera, mas não marcar direto.`}
        </Texto>
        {recepcao && (
          <Botao
            titulo={`Ligar para a clínica · ${clinica.telefone}`}
            icone="phone"
            onPress={() => Linking.openURL(clinica.telefoneLink)}
            style={estilos.ligar}
          />
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  cartao: { backgroundColor: cores.menta, borderRadius: raios.cartao, padding: espaco.g, gap: espaco.p, marginBottom: espaco.g },
  acoes: { flexDirection: 'row', gap: espaco.m, marginTop: espaco.p },
  aviso: { flexDirection: 'row', gap: espaco.m, backgroundColor: cores.gelo2, borderRadius: raios.folha, padding: espaco.m, marginBottom: espaco.g },
  ligar: { marginTop: espaco.m },
});
