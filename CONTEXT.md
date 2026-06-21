# Alertas de Ativos

Contexto do produto para acompanhar ativos financeiros e configurar alertas
acionados por regras definidas pelo usuário.

## Language

**Ativo**:
Instrumento financeiro acompanhado pelo usuário no app.
_Avoid_: Stock como termo de UI.

**Lista de acompanhamento**:
Conjunto salvo de Ativos que o usuário deseja monitorar.
_Avoid_: Portfólio, a menos que o app passe a rastrear posições detidas.

**Regra de alerta**:
Condição salva pelo usuário para um Ativo ou item da Lista de acompanhamento.
_Avoid_: Alerta quando se referir à configuração salva.

**Alerta**:
Ocorrência gerada quando uma Regra de alerta é atendida.
_Avoid_: Notificação como termo canônico de UI.

## Example Dialogue

Dev: A Lista de acompanhamento pode conter Ativos que o usuário não possui?

Especialista: Sim. Ela representa monitoramento, não posse. Se o produto passar
a rastrear posições, isso deve ser tratado como outro conceito.

Dev: Então o usuário cria uma Regra de alerta para um Ativo, e quando a condição
é atendida o sistema gera um Alerta?

Especialista: Exatamente.
