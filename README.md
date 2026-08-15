# Brisa

Brisa é uma aplicação web de meteorologia em português que apresenta o tempo atual e previsões com dados públicos da [Open-Meteo](https://open-meteo.com/).

## Principais recursos

- busca de cidades com sugestões;
- condições atuais, previsão horária para as próximas 24 horas e previsão para sete dias;
- temperaturas em Celsius ou Fahrenheit;
- persistência local da última cidade selecionada;
- estados de carregamento e erro com opção de nova tentativa.

## Stack

- Vue 3 e TypeScript;
- Vite;
- Vitest.

## APIs

- [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api), para a busca de cidades;
- [Open-Meteo Weather Forecast API](https://open-meteo.com/en/docs), para condições atuais e previsões.

Geocodificação e dados meteorológicos são fornecidos pela Open-Meteo.

## Requisitos

- Node.js `^20.19.0` ou `>=22.12.0`;
- npm 10 ou superior.

## Desenvolvimento

```sh
npm install
npm run dev
```

Para executar verificação de tipos, testes e build:

```sh
npm run check
```

Para gerar o build de produção:

```sh
npm run build
```
