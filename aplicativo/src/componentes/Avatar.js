// Avatares: círculo com as iniciais sobre a cor própria de cada pessoa.
// Familiares usam a cor da família; médicos usam a cor de destaque deles.

import { StyleSheet, View } from 'react-native';
import Texto from './Texto';
import { cores } from '../estilos/cores';
import { fontes } from '../estilos/tipografia';
import { iniciais } from '../utilitarios/texto';

function Circulo({ nome, cor, tamanho }) {
  return (
    <View
      // O nome já aparece ao lado do avatar: o leitor de tela não precisa ler as iniciais
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[estilos.circulo, { width: tamanho, height: tamanho, borderRadius: tamanho / 2, backgroundColor: cor }]}
    >
      <Texto style={{ fontFamily: fontes.textoNegrito, fontSize: tamanho * 0.36, color: cores.noite }}>
        {iniciais(nome)}
      </Texto>
    </View>
  );
}

export function AvatarFamiliar({ pessoa, tamanho = 44 }) {
  return <Circulo nome={pessoa.nome} cor={pessoa.cor} tamanho={tamanho} />;
}

export function AvatarMedico({ medico, tamanho = 44 }) {
  return <Circulo nome={medico.nome} cor={medico.cor} tamanho={tamanho} />;
}

const estilos = StyleSheet.create({
  circulo: { alignItems: 'center', justifyContent: 'center' },
});
