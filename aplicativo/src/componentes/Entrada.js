// Animação de entrada: o conteúdo aparece subindo um pouquinho.
// Toca quando a tela abre e de novo cada vez que o paciente volta para ela (ex.: troca de aba).
// Se o paciente pediu para reduzir movimento, não anima nada.

import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePreferencias } from '../contexto/PreferenciasContext';

export default function Entrada({ children, style, atraso = 0, distancia = 14 }) {
  const navigation = useNavigation();
  const { reduzirMovimento } = usePreferencias();
  const progresso = useRef(new Animated.Value(reduzirMovimento ? 1 : 0)).current;

  useEffect(() => {
    if (reduzirMovimento) {
      progresso.setValue(1);
      return;
    }
    const tocar = () => {
      progresso.setValue(0);
      Animated.timing(progresso, {
        toValue: 1,
        duration: 320,
        delay: atraso,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };
    tocar(); // primeira vez que a tela aparece
    return navigation.addListener('focus', tocar); // e sempre que voltar para ela
  }, [reduzirMovimento]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progresso,
          transform: [{ translateY: progresso.interpolate({ inputRange: [0, 1], outputRange: [distancia, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
