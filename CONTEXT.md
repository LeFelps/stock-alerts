# Alertas de Ativos

Contexto do produto para acompanhar ativos financeiros e configurar alertas
acionados por regras definidas pelo usuário.

## Language

**Ativo**:
Instrumento financeiro acompanhado pelo usuário no app.
_Avoid_: Stock como termo de UI.

**Código do Ativo**:
Identificador alfanumérico canônico de um Ativo listado na B3. Um Perfil pode
ter no máximo um item da Lista de acompanhamento para cada Código do Ativo.
_Avoid_: Código antigo, Nome do Ativo.

**Nome do Ativo**:
Nome completo associado ao Código do Ativo pelo catálogo de mercado; não é
definido pelo usuário.
_Avoid_: Apelido, Nome personalizado.

**Perfil**:
Identidade pertencente ao app para uma pessoa autenticada. Um Perfil possui
zero ou mais Listas de acompanhamento, Regras de alerta e Alertas.
_Avoid_: Conta, Usuário.

**Lista de acompanhamento**:
Conjunto salvo de Ativos que o usuário deseja monitorar.
_Avoid_: Portfólio, a menos que o app passe a rastrear posições detidas.

**Regra de alerta**:
Condição salva pelo usuário para um Ativo ou item da Lista de acompanhamento.
_Avoid_: Alerta quando se referir à configuração salva.

**Alerta**:
Ocorrência gerada quando uma Regra de alerta é atendida.
_Avoid_: Notificação como termo canônico de UI.

**Data de mercado**:
Data à qual pertencem preços, indicadores e sinais processados pelo app.
_Avoid_: Pregão. Use `dia de mercado` ou a data formatada diretamente quando
isso for mais claro no texto visível.

## Example Dialogue

Dev: A Lista de acompanhamento pode conter Ativos que o usuário não possui?

Especialista: Sim. Ela representa monitoramento, não posse. Se o produto passar
a rastrear posições, isso deve ser tratado como outro conceito.

Dev: O Perfil é a mesma coisa que a conta Google usada para entrar?

Especialista: Não. A conta Google é apenas o método de acesso. O Perfil é a
identidade do app que possui preferências, Listas de acompanhamento, Regras de
alerta e Alertas.

Dev: Então o usuário cria uma Regra de alerta para um Ativo, e quando a condição
é atendida o sistema gera um Alerta?

Especialista: Exatamente.

Dev: E se alguém informar um código antigo que agora corresponde a outro?

Especialista: Ao adicionar o Ativo, a Lista de acompanhamento registra o Código
do Ativo canônico atual e o Nome do Ativo associado a ele.
