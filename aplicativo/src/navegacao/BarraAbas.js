// Barra de abas do app: uma barra azul-noite com cantos de cima arredondados.
// A aba escolhida "sobe" num círculo menta. Ao trocar de aba o círculo encolhe até sumir
// e reaparece, com um pulinho, na aba nova. A barra também sobe do rodapé quando o app abre.
// (Feita à mão no lugar da barra padrão do React Navigation, que não tem esse destaque.)

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Texto from '../componentes/Texto';
import { usePreferencias } from '../contexto/PreferenciasContext';
import { cores } from '../estilos/cores';
import { fontes } from '../estilos/tipografia';

const FAIXA = 28; // espaço acima da barra por onde o círculo sobe
const BARRA = 64; // altura da barra azul
const MIOLO = 52; // círculo menta
const ANEL = 6; // anel da cor do fundo em volta do círculo (dá o efeito de "recorte")
const CIRCULO = MIOLO + ANEL * 2;

export default function BarraAbas({ state, navigation, abas }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { reduzirMovimento } = usePreferencias();
  const [tecladoAberto, setTecladoAberto] = useState(false);

  const largura = width / state.routes.length;
  const centro = (indice) => indice * largura + (largura - CIRCULO) / 2;

  // Onde o círculo está (visual) e se ele está escondido no meio da troca
  const [visual, setVisual] = useState(state.index);
  const [escondido, setEscondido] = useState(false);
  const posicao = useRef(new Animated.Value(centro(state.index))).current;
  const escala = useRef(new Animated.Value(1)).current; // 0 = sumiu, 1 = inteiro
  const subida = useRef(new Animated.Value(reduzirMovimento ? 1 : 0)).current; // entrada da barra
  const animacao = useRef(null);
  const primeiraVez = useRef(true);

  // Entrada: a barra sobe do rodapé
  useEffect(() => {
    if (reduzirMovimento) return;
    Animated.timing(subida, {
      toValue: 1,
      duration: 450,
      delay: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  // Troca de aba: encolhe → muda de lugar → cresce de novo
  useEffect(() => {
    if (primeiraVez.current) {
      primeiraVez.current = false;
      return;
    }
    animacao.current?.stop();

    if (reduzirMovimento) {
      posicao.setValue(centro(state.index));
      escala.setValue(1);
      setVisual(state.index);
      setEscondido(false);
      return;
    }

    setEscondido(true); // o ícone da aba antiga reaparece enquanto o círculo some
    animacao.current = Animated.timing(escala, {
      toValue: 0,
      duration: 130,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    });
    animacao.current.start(({ finished }) => {
      if (!finished) return; // o paciente tocou em outra aba no meio: a nova troca assume
      posicao.setValue(centro(state.index));
      setVisual(state.index);
      setEscondido(false);
      animacao.current = Animated.spring(escala, {
        toValue: 1,
        friction: 5,
        tension: 150,
        useNativeDriver: true,
      });
      animacao.current.start();
    });
  }, [state.index]);

  // Se a tela mudar de largura, o círculo continua centrado na aba
  useEffect(() => {
    posicao.setValue(centro(visual));
  }, [largura]);

  // Esconde a barra enquanto o teclado está aberto
  useEffect(() => {
    const ao = Keyboard.addListener('keyboardDidShow', () => setTecladoAberto(true));
    const sai = Keyboard.addListener('keyboardDidHide', () => setTecladoAberto(false));
    return () => {
      ao.remove();
      sai.remove();
    };
  }, []);

  if (tecladoAberto) return null;

  const alturaTotal = FAIXA + BARRA + insets.bottom;
  const iconeDoCirculo = abas[state.routes[visual]?.name]?.icone ?? 'circle';

  return (
    <Animated.View
      style={[
        estilos.faixa,
        { transform: [{ translateY: subida.interpolate({ inputRange: [0, 1], outputRange: [alturaTotal, 0] }) }] },
      ]}
      accessibilityRole="tablist"
    >
      <View style={[estilos.barra, { paddingBottom: insets.bottom, height: BARRA + insets.bottom }]}>
        {state.routes.map((rota, indice) => {
          const aba = abas[rota.name];
          const focada = state.index === indice;
          const circuloAqui = visual === indice && !escondido;

          const aoTocar = () => {
            const evento = navigation.emit({ type: 'tabPress', target: rota.key, canPreventDefault: true });
            if (!focada && !evento.defaultPrevented) navigation.navigate(rota.name, rota.params);
          };

          return (
            <Pressable
              key={rota.key}
              onPress={aoTocar}
              accessibilityRole="tab"
              accessibilityLabel={aba.rotulo}
              accessibilityState={{ selected: focada }}
              style={estilos.aba}
            >
              {/* o ícone da aba escolhida fica dentro do círculo, então aqui só reserva o espaço */}
              <Feather
                name={aba.icone}
                size={24}
                color={cores.sobreNoite2}
                style={{ opacity: circuloAqui ? 0 : 1 }}
              />
              <Texto
                maxFontSizeMultiplier={1.2}
                style={[estilos.rotulo, focada && estilos.rotuloAtivo]}
                numberOfLines={1}
              >
                {aba.rotulo}
              </Texto>
            </Pressable>
          );
        })}
      </View>

      {/* O círculo fica por cima e não pega toque: quem recebe é a aba que está embaixo dele */}
      <Animated.View
        pointerEvents="none"
        style={[
          estilos.circulo,
          { opacity: escala, transform: [{ translateX: posicao }, { scale: escala }] },
        ]}
      >
        <Feather name={iconeDoCirculo} size={26} color={cores.noite} />
      </Animated.View>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  // A faixa tem a cor do fundo do app: o anel do círculo some nela e sobra só o "recorte" na barra
  faixa: { backgroundColor: cores.gelo, paddingTop: FAIXA },
  barra: {
    flexDirection: 'row',
    backgroundColor: cores.noite,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  aba: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 10,
    gap: 4,
  },
  rotulo: {
    fontFamily: fontes.textoMedio,
    fontSize: 12,
    lineHeight: 16,
    color: cores.sobreNoite2,
  },
  rotuloAtivo: { color: cores.sobreNoite, fontFamily: fontes.textoNegrito },
  circulo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CIRCULO,
    height: CIRCULO,
    borderRadius: CIRCULO / 2,
    borderWidth: ANEL,
    borderColor: cores.gelo,
    backgroundColor: cores.menta,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
