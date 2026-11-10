// Texto com as fontes e tamanhos do projeto.
// Exemplo: <Texto variante="titulo">Agenda</Texto>

import { StyleSheet, Text } from 'react-native';
import { cores } from '../estilos/cores';
import { fontes, tamanhos } from '../estilos/tipografia';

export default function Texto({ variante = 'corpo', cor, style, children, ...props }) {
  return (
    <Text style={[estilos[variante], cor && { color: cor }, style]} {...props}>
      {children}
    </Text>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: fontes.textoNegrito, fontSize: tamanhos.titulo, lineHeight: 32, color: cores.tinta },
  subtitulo: { fontFamily: fontes.textoNegrito, fontSize: tamanhos.subtitulo, lineHeight: 25, color: cores.tinta },
  corpo: { fontFamily: fontes.texto, fontSize: tamanhos.corpo, lineHeight: 23, color: cores.tinta },
  negrito: { fontFamily: fontes.textoNegrito, fontSize: tamanhos.corpo, lineHeight: 23, color: cores.tinta },
  meta: { fontFamily: fontes.texto, fontSize: tamanhos.meta, lineHeight: 20, color: cores.tinta2 },
  rotulo: { fontFamily: fontes.textoMedio, fontSize: tamanhos.meta, lineHeight: 20, color: cores.tinta2 },
  numero: { fontFamily: fontes.numeroForte, fontSize: 40, lineHeight: 44, color: cores.tinta },
});
