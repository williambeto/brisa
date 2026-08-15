# AGENTS.md

## Projeto
- Brisa é um único pacote e uma SPA Vue 3 client-only; não há backend, router nem store.
- `src/main.ts` monta `src/App.vue` e carrega o CSS global.
- Use Node `^20.19.0` ou `>=22.12.0`, conforme a exigência do Vite registrada no lockfile.

## Comandos e artefatos
- O gate canônico é `npm run check`; ele executa exatamente `type-check → test → build`.
- Para um teste focado, use `npm test -- <arquivo.test.ts>`; `npm test -- src/services/openMeteo.test.ts` é verificado.
- `npm run validate` coleta evidências do AI Workflow e não substitui o gate da aplicação.
- Não há CI, hooks, task runner, ESLint ou formatter configurados; não invente esses gates.
- `dist/` é gerado e ignorado; nunca o edite.

## Fronteiras da aplicação
- `src/App.vue` orquestra localidade, unidade, status e requisição de previsão.
- `src/components/CitySearch.vue` concentra debounce, combobox/teclado e cancelamento da busca.
- `src/services/openMeteo.ts` é a fronteira exclusiva das APIs de geocoding e previsão e normaliza payloads não confiáveis para `src/types/weather.ts`.
- Componentes devem consumir o domínio normalizado, nunca campos crus da API.
- Mapeamentos WMO, categorias e ícones ficam em `src/utils/weather.ts`; o SVG correspondente fica em `src/components/WeatherIcon.vue`.
- Formatação pt-BR e de horários fica em `src/utils/formatters.ts`.
- Persistência defensiva e fallback para São Paulo ficam em `src/utils/storage.ts`.

## Invariantes de dados
- Open-Meteo usa `timezone=auto` e devolve horários locais sem offset.
- `formatHour` extrai deliberadamente a hora da string; não passe esses timestamps por `Date` de modo que aplique o fuso do navegador.
- A troca °C/°F refaz a requisição com `temperature_unit`; não faça conversão parcial no cliente.
- Ao mudar campos de previsão, mantenha juntos arrays de query, normalizador, tipos e `src/services/openMeteo.test.ts`.
- Ao mudar WMO ou storage, atualize respectivamente `src/utils/weather.test.ts` ou `src/utils/storage.test.ts`.
- Preserve cancelamento de requests e cleanup no unmount na busca e na previsão para impedir respostas obsoletas de sobrescrever o estado.

## Produto
- Interface e cópia são pt-BR, a marca é Brisa e a atribuição pública à Open-Meteo deve permanecer.

## OpenCode e segurança Git
- `opencode.jsonc` configura o OpenCode e aponta para o conteúdo gerado e ignorado em `.ai-workflow/`.
- Em tarefas normais da aplicação, não edite `opencode.jsonc` nem `.ai-workflow/`.
- `.ai-workflow/AGENTS.md` é o contrato canônico do tooling: leia e preserve, sem copiá-lo para cá.
- Nunca implemente em `main` ou `master`.
- Preserve alterações não commitadas alheias e mantenha o diff no escopo autorizado.
- Exija autorização conversacional explícita antes de qualquer mutação, commit, tag ou push.
