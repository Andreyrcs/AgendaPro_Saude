// Etiqueta pequena de situação: "Confirmada", "Falta fazer", "Agendado"...

import { StyleSheet, View } from 'react-native';
import Texto from './Texto';
import { cores } from '../estilos/cores';
import { raios } from '../estilos/espacos';

const TONS = {
  neutro: { fundo: cores.gelo2, texto: cores.tinta2 },
  menta: { fundo: cores.menta2, texto: cores.mentaTinta },
  alerta: { fundo: cores.alerta, texto: cores.alertaTinta },
  perigo: { fundo: cores.domingoClaro, texto: cores.domingo },
  noite: { fundo: cores.noite, texto: cores.sobreNoite },
};

export default function Selo({ texto, tom = 'neutro' }) {
  const t = TONS[tom];
  return (
    <View style={[estilos.selo, { backgroundColor: t.fundo }]}>
      <Texto variante="rotulo" cor={t.texto}>
        {texto}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  selo: { alignSelf: 'flex-start', borderRadius: raios.controle, paddingHorizontal: 10, paddingVertical: 2 },
});
