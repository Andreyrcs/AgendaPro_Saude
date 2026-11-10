// Ponto de entrada do app.
// 1. Carrega as fontes do projeto.
// 2. Liga os "provedores" (sessão e preferências), que qualquer tela pode ler.
// 3. Mostra a navegação.

import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import {
  AtkinsonHyperlegibleNext_400Regular,
  AtkinsonHyperlegibleNext_600SemiBold,
  AtkinsonHyperlegibleNext_700Bold,
} from '@expo-google-fonts/atkinson-hyperlegible-next';
import { Archivo_700Bold, Archivo_800ExtraBold } from '@expo-google-fonts/archivo';

import { SessaoProvider } from './src/contexto/SessaoContext';
import { PreferenciasProvider } from './src/contexto/PreferenciasContext';
import Navegacao from './src/navegacao/Navegacao';
import { cores } from './src/estilos/cores';

export default function App() {
  const [fontesProntas] = useFonts({
    AtkinsonHyperlegibleNext_400Regular,
    AtkinsonHyperlegibleNext_600SemiBold,
    AtkinsonHyperlegibleNext_700Bold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
  });

  if (!fontesProntas) {
    return <View style={{ flex: 1, backgroundColor: cores.noite }} />;
  }

  return (
    <SafeAreaProvider>
      <PreferenciasProvider>
        <SessaoProvider>
          <NavigationContainer>
            <Navegacao />
          </NavigationContainer>
        </SessaoProvider>
      </PreferenciasProvider>
    </SafeAreaProvider>
  );
}
