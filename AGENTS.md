# AGENTS.md

## Projeto
- Brisa é um único pacote: SPA Vue 3 client-only, sem backend, router ou store.
- `src/main.ts` é o entrypoint: monta `src/App.vue` e carrega `src/styles.css`.
- Use Node `^20.19.0` ou `>=22.12.0`, faixa exigida pelo Vite no lockfile.

## Fronteiras
- `src/App.vue` orquestra localidade, unidade, status e requisição de previsão.
- `src/components/CitySearch.vue` concentra debounce, combobox/teclado, estados da busca, cancelamento e cleanup.
- `src/services/openMeteo.ts` é a única fronteira das APIs Open-Meteo de geocoding e previsão; normaliza payloads não confiáveis para `src/types/weather.ts`.
- Componentes consomem somente o domínio normalizado; nunca campos crus da API.
- `src/utils/weather.ts` mapeia WMO, categorias e ícones (`WeatherIcon.vue` renderiza o SVG); `src/utils/formatters.ts` trata pt-BR e horários; `src/utils/storage.ts` faz persistência defensiva e fallback para São Paulo.

## Dados e concorrência
- Open-Meteo usa `timezone=auto` e devolve timestamps locais sem offset. `formatHour` extrai a hora da string; não passe esses timestamps por `Date` se isso aplicar o fuso do navegador.
- Trocar °C/°F refaz a previsão com `temperature_unit`; não faça conversão parcial no cliente.
- Preserve cancelamento e cleanup no unmount na busca e na previsão; respostas obsoletas não podem sobrescrever o estado.
- Ao alterar campos de previsão, atualize juntos arrays da query, normalizador, tipos e `src/services/openMeteo.test.ts`. Ao alterar WMO, atualize `src/utils/weather.test.ts`; ao alterar storage, atualize `src/utils/storage.test.ts`.

## Comandos e testes
- Instale e rode localmente com `npm install` e `npm run dev`.
- O gate `npm run check` executa exatamente `type-check → test → build`.
- Para foco, use `npm test -- <arquivo.test.ts>`; `npm run test:package` valida a fronteira do pacote; `npm run test:e2e` executa o Playwright.
- `npm run validate` coleta evidências do AI Workflow e não substitui `npm run check`.
- O Vitest descobre somente `src/**/*.test.ts` e `tests/**/*.test.ts`, excluindo `e2e/**`; o Playwright usa `e2e/` isoladamente. As fixtures bloqueiam HTTP(S) e WebSocket externos não mockados.
- Não há lint, formatter, CI ou task runner configurados; não invente esses gates. `dist/` é gerado e ignorado; nunca o edite.

## Produto e tooling
- Interface e cópia são pt-BR; a marca é Brisa e a atribuição pública à Open-Meteo deve permanecer.
- `opencode.jsonc` configura o OpenCode e aponta para conteúdo gerado/ignorado em `.ai-workflow/`; em tarefas normais da aplicação, não edite `opencode.jsonc` nem `.ai-workflow/`.
- `.ai-workflow/AGENTS.md` é o contrato canônico do tooling: leia e preserve, sem copiá-lo ou editá-lo em tarefas normais.

## Git
- Nunca implemente em `main` ou `master`.
- Preserve alterações não commitadas alheias e mantenha o diff no escopo autorizado.
- Exija autorização conversacional explícita antes de qualquer alteração no repositório, commit, tag ou push.
