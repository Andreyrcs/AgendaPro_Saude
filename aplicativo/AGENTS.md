App mobile do paciente do AgendaPro Saúde (PIM IV — UNIP). Expo managed workflow, JavaScript.

## Decisões do projeto (não mudar sem pedir ao grupo)

- Navegação com **React Navigation** (native-stack + bottom-tabs) em `src/navegacao/`. **Não** usar Expo Router.
- JavaScript, sem TypeScript. Estado só com Context API + hooks (sem Redux/Zustand).
- Estilos com `StyleSheet`, tokens em `src/estilos/`. Sem NativeWind/Tamagui/Reanimated.
- Sem testes automatizados nesta etapa.
- O código precisa ser simples o bastante para o grupo explicar na apresentação oral.
- Desenho e plano: `../specs/2026-11-09-aplicativo-mobile-design.md` e `../specs/2026-11-09-aplicativo-mobile-plano.md`.
- Não alterar `../backend`, `../frontend` nem `../docs`.

## Expo muda a cada SDK

Antes de usar uma API do Expo, confira a documentação da versão do `expo` em `package.json`:
`https://docs.expo.dev/versions/v<major>.0.0/` e `https://docs.expo.dev/llms.txt`.

## Comandos

```bash
npx expo install <pacote>   # sempre, em vez de npm install <pacote>
npx expo start              # servidor de desenvolvimento (abrir no Expo Go)
npm run celular             # o mesmo, mas funcionando no celular quando o projeto está num GitHub Codespace
npx expo-doctor             # diagnóstico de versões e configuração
npx expo export --platform android   # compila o app inteiro (acusa erro de import/sintaxe)
```
