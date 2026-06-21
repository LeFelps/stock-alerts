# Diretrizes de Interface

A interface do Stock Alerts usa Português do Brasil e deve manter uma aparência
profissional, minimalista e funcional.

## Linguagem

- Use Português do Brasil em todo texto visível.
- Prefira textos curtos, diretos e orientados à ação.
- Use os termos definidos no `CONTEXT.md` para conceitos do produto.

## Composição

- Use espaçamento generoso como separador visual padrão.
- Use bordas apenas em controles, tabelas, inputs, painéis de destaque ou
  separações necessárias para leitura.
- Evite transformar seções inteiras em cards por padrão.
- Containers pais controlam a disposição dos filhos com `padding`, `gap`,
  `space-y-*`, `space-x-*`, grid e flex.
- Evite margens em elementos filhos, exceto em micro-espaçamentos tipográficos
  locais.
- Todo elemento com borda ou fundo próprio deve ter padding adequado.

## Cores

- Use uma paleta neutra para estrutura e conteúdo.
- Use azul como acento principal para navegação ativa e ações primárias.
- Reserve verde e vermelho para estados financeiros ou semânticos.
- Badges devem ser discretos por padrão.

## Componentes

- Use tabelas limpas para dados comparáveis.
- Use divisores leves em tabelas apenas quando melhorarem a leitura.
- Use primitivas shadcn/Radix para overlays, drawers e componentes interativos.
- Não aninhe cards dentro de cards.
