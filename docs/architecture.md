# Arquitetura

Este app usa modulos por funcionalidade com camadas internas. Rotas do App
Router devem ficar finas e delegar comportamento de produto para modulos em
`src/features`.

## Modulos

Crie um modulo apenas quando ele tiver comportamento real. Nao crie pastas
vazias para escopo futuro.

Estrutura padrao:

```text
src/features/<feature>/
  domain/
  application/
  infrastructure/
  server/
  ui/
```

- `domain`: tipos e regras puras do conceito de produto.
- `application`: casos de uso, portas de repositorio/provedor e tipos Result.
- `infrastructure`: adaptadores de IO, como Drizzle ou APIs externas.
- `server`: adaptadores de Next.js, Server Actions e helpers autenticados.
- `ui`: componentes especificos da funcionalidade.

`src/components/ui` continua reservado para primitivas compartilhadas. Layouts
de rota podem ficar em `src/app` quando forem composicao de navegacao, nao
comportamento de produto.

## Linguagem

Identificadores e pastas usam ingles: `profile`, `watchlist`, `alertRule`,
`alert`, `asset`.

Texto visivel usa Portugues do Brasil e os termos do `CONTEXT.md`: `Perfil`,
`Ativo`, `Lista de acompanhamento`, `Regra de alerta` e `Alerta`.

## Dependencias

Rotas e arquivos `server` podem importar Next.js, Auth.js, actions e adaptadores
de infraestrutura.

Casos de uso em `application` nao importam React, Next.js, Auth.js, Drizzle ou
variaveis de ambiente. Eles recebem entradas de negocio e dependencias
explicitamente.

Dominios em `domain` nao importam IO, framework ou UI.

## Casos de Uso

Casos de uso exportam funcoes com a assinatura:

```ts
useCase(command, deps);
```

`command` contem entrada de negocio, incluindo identificadores do Perfil
autenticado quando necessario. `deps` contem portas como repositorios e
provedores.

Falhas esperadas retornam Results tipados. Erros inesperados de infraestrutura
podem ser lancados.

## Repositorios

Portas de repositorio vivem na camada `application`. Implementacoes Drizzle
vivem em `infrastructure`.

Repositorios retornam DTOs ou objetos de dominio definidos pelo modulo, nunca
linhas Drizzle diretamente.

Recursos pertencentes a um Perfil devem exigir `profileId` nos metodos de
repositorio. O repositorio aplica esse filtro para impedir acesso entre Perfis.
Casos de uso ainda expressam politica de negocio e autorizacao.

## Validacao

Use Zod para validar entradas nao confiaveis:

- `FormData` recebido por Server Actions.
- respostas de provedores externos.
- parametros de rota ou payloads de Route Handlers.

Dados devem ser parseados na borda antes de chegar aos casos de uso.

## App Router

Leia os guias em `node_modules/next/dist/docs/` antes de alterar APIs do
Next.js. Este projeto usa Next.js 16 App Router.

Paginas e layouts sao Server Components por padrao. Use Client Components
apenas para estado, eventos, hooks ou APIs do navegador.

Server Actions sao acessiveis por POST direto. Toda Server Action deve
autenticar, validar entrada, chamar casos de uso e revalidar ou redirecionar
apenas na borda.

## Dados de Mercado e Alertas

Dados de mercado devem passar por uma porta de provedor e adaptadores externos.
Casos de uso consomem dados normalizados, nao detalhes de `fetch` ou do
provedor.

A avaliacao de Regras de alerta deve ser um caso de uso independente de UI e
Next.js, chamavel futuramente por cron, worker ou Route Handler.

Um Alerta e a ocorrencia de dominio. Email e um canal de entrega de
infraestrutura, nao um conceito canonico de produto neste momento.

## Testes

Novos modulos devem ter testes de casos de uso com repositorios falsos.
Adaptadores de Server Action devem ser testados quando autenticacao, validacao
ou revalidacao forem relevantes.

UI deve ter testes focados em comportamento roteado e fluxo do usuario.
