// Logotipo do AgendaPro Saúde, igual ao ícone do protótipo:
// uma folha de calendário azul-noite, faixa menta em cima e uma cruz branca.
// Feito só com Views, sem imagem.

import { StyleSheet, View } from 'react-native';
import { cores } from '../estilos/cores';

// sobreNoite: em fundo azul-noite, a folha fica um tom mais clara para aparecer
export default function Marca({ tamanho = 56, sobreNoite = false }) {
  const t = tamanho;
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="AgendaPro Saúde"
      style={[
        estilos.folha,
        sobreNoite && { backgroundColor: cores.noite2 },
        { width: t, height: t * 0.92, borderRadius: t * 0.22 },
      ]}
    >
      <View style={[estilos.faixa, { height: t * 0.26 }]} />
      <View style={estilos.centro}>
        <View style={{ width: t * 0.12, height: t * 0.38, backgroundColor: cores.papel, borderRadius: 2 }} />
        <View
          style={{ position: 'absolute', width: t * 0.38, height: t * 0.12, backgroundColor: cores.papel, borderRadius: 2 }}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  folha: { backgroundColor: cores.noite, overflow: 'hidden' },
  faixa: { backgroundColor: cores.menta },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
