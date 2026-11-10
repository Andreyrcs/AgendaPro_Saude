// Hook que toda tela com dados usa.
// Chama a função de serviço sempre que a tela aparece (useFocusEffect):
// é assim que o app "sincroniza" — voltou para a tela, busca de novo.
//
// Exemplo:
//   const { dados, carregando, erro, recarregar } =
//     useDadosDaTela(() => listarConsultas(usuario));

import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export default function useDadosDaTela(carregar) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // Guarda sempre a versão mais nova da função, sem recriar o efeito a cada render
  const carregarRef = useRef(carregar);
  carregarRef.current = carregar;

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await carregarRef.current());
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      recarregar();
    }, [recarregar]),
  );

  return { dados, carregando, erro, recarregar };
}
