### 1.1.a) Como você estruturaria seus testes automatizados para validar que o rate limiting está funcionando corretamente?

Estruturaria os testes em camadas, combinando validações funcionais e comportamentais.

Primeiro, criaria testes para validar a presença e a consistência dos headers de rate limit retornados pela API, como `X-RateLimit-Limit`, `X-RateLimit-Remaining` e `X-RateLimit-Reset`. Isso garante que a API está expondo corretamente as informações necessárias para que o consumidor acompanhe seu consumo e saiba quando a janela será reiniciada.

Em seguida, implementaria testes sequenciais para observar o comportamento desses headers ao longo de múltiplas requisições. O objetivo seria confirmar que o valor de requisições restantes é atualizado de forma coerente a cada chamada, sem inconsistências.

Também incluiria um mecanismo de proteção no próprio teste para evitar bloqueios desnecessários em ambientes reais ou compartilhados, interrompendo ou limitando a execução quando o número de requisições restantes estivesse abaixo de um threshold de segurança. Essa abordagem reduz flakiness(`ora passa, ora falha`), evita o consumo excessivo da API e torna a suíte mais estável.

Eu separaria os cenários em quatro grupos principais:
- validação da presença e formato dos headers
- acompanhamento do decremento do limite
- comportamento próximo do esgotamento da cota
- comportamento após o reset da janela

Em um ambiente interno e controlado, eu complementaria com testes de concorrência ou carga para verificar se o rate limiting continua consistente sob maior carga. Nesse caso, métricas, logs e observabilidade ajudariam a validar se a regra está sendo aplicada corretamente. Ainda assim, eu trataria esse tipo de validação como complementar, porque o objetivo principal do rate limiting é garantir o consumo da API, e não medir a capacidade de escala da infraestrutura.


1.1.b) Como você testaria o comportamento da API quando o limite é excedido?

Para validar o limite excedido, eu não dependeria apenas de um ambiente produtivo ou de uma API pública, porque isso torna o teste instável e caro em execução.

A abordagem principal seria utilizar um ambiente controlado, com configuração conhecida de rate limiting, para consumir o endpoint até o limite definido e então validar o comportamento da API após o esgotamento. Nesse cenário, eu esperaria:

retorno do status adequado, como 429 Too Many Requests ou o status definido pela API
mensagem de erro compatível
headers indicando limite esgotado
informação de reset da janela, quando disponível

Em APIs públicas ou ambientes compartilhados, eu faria esse teste de forma controlada, evitando exaurir o limite real com frequência. Nesses casos, o ideal é validar o comportamento quando o limite já estiver próximo do fim ou usar mocks para simular a resposta de rate limit excedido.

Obs: IMPORTANTE.
Como complemento, em ambiente interno, eu poderia executar testes de carga ou concorrência para validar se o bloqueio continua correto sob maior pressão. Nesse tipo de cenário, a infraestrutura também passa a ser relevante, inclusive auto scaling e métricas da aplicação, mas isso seria uma validação adicional de robustez da solução, e não o teste principal de rate limiting.