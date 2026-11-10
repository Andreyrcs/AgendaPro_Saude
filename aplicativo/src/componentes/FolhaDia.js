// "A folhinha da família": cada dia como uma folha de calendário de parede.
// Faixa azul-noite com o mês, número grande, dia da semana embaixo.
// Domingo e feriado ficam com o número em vermelho, como na folhinha de verdade.

import { StyleSheet, View } from 'react-native';
import Texto from './Texto';
import { cores } from '../estilos/cores';
import { fontes } from '../estilos/tipografia';
import { raios } from '../estilos/espacos';
import { diaSemanaCurto, ehDomingoOuFeriado, extenso, mesCurto, paraData } from '../utilitarios/datas';

const MEDIDAS = {
  normal: { largura: 76, numero: 46, mes: 13 },
  pequena: { largura: 58, numero: 34, mes: 12 },
};

export default function FolhaDia({ data, tamanho = 'normal', variante }) {
  const m = MEDIDAS[tamanho];
  const vermelho = ehDomingoOuFeriado(data);
  const menta = variante === 'menta';

  return (
    <View style={[estilos.folha, { width: m.largura }]} accessible accessibilityLabel={extenso(data)}>
      <View style={[estilos.mes, menta && estilos.mesMenta]}>
        <Texto style={[estilos.textoMes, { fontSize: m.mes }, menta && { color: cores.noite }]}>{mesCurto(data)}</Texto>
      </View>
      <Texto
        style={[
          estilos.numero,
          { fontSize: m.numero, lineHeight: m.numero * 1.05 },
          vermelho && { color: cores.domingo },
        ]}
      >
        {paraData(data).getDate()}
      </Texto>
      <Texto variante="rotulo" style={estilos.semana}>
        {diaSemanaCurto(data)}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  folha: {
    backgroundColor: cores.papel,
    borderRadius: raios.folha,
    borderWidth: 1.5,
    borderColor: cores.linha,
    overflow: 'hidden',
    alignItems: 'center',
  },
  mes: { alignSelf: 'stretch', backgroundColor: cores.noite, paddingVertical: 3, alignItems: 'center' },
  mesMenta: { backgroundColor: cores.menta },
  textoMes: { fontFamily: fontes.numero, color: cores.sobreNoite, letterSpacing: 0.5 },
  numero: { fontFamily: fontes.numeroForte, color: cores.tinta, paddingTop: 4, letterSpacing: -1 },
  semana: { paddingBottom: 6 },
});
