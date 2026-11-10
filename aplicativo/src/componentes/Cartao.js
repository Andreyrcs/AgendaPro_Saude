// Cartão branco de cantos arredondados. Se receber onPress, vira um botão.

import { Pressable, StyleSheet, View } from 'react-native';
import { cores } from '../estilos/cores';
import { espaco, raios } from '../estilos/espacos';

export default function Cartao({ children, onPress, accessibilityLabel, accessibilityHint, style }) {
  if (!onPress) {
    return <View style={[estilos.cartao, style]}>{children}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [estilos.cartao, pressed && estilos.pressionado, style]}
    >
      {children}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    backgroundColor: cores.papel,
    borderRadius: raios.cartao,
    borderWidth: 1.5,
    borderColor: cores.linha,
    padding: espaco.g,
  },
  pressionado: { backgroundColor: cores.gelo2 },
});
