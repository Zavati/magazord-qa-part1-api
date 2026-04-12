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

### 1.1.b) Como você testaria o comportamento da API quando o limite é excedido?

Eu testaria esse cenário de forma controlada, evitando depender dele na execução padrão da suíte.

Em APIs públicas, forçar o esgotamento do rate limit em toda execução pode tornar os testes instáveis e consumir desnecessariamente a cota disponível. Por isso, no fluxo padrão eu validaria os headers de rate limit e o status retornado pela API, verificando se, quando a cota estiver esgotada, o comportamento é consistente com o esperado, como `403` e `X-RateLimit-Remaining = 0`.

Além disso, eu criaria um teste opt-in, executado apenas manualmente ou por configuração de ambiente, para consumir requisições até detectar o bloqueio. Nesse cenário, eu validaria o status de erro, a mensagem retornada pela API, os headers indicando cota esgotada e o tempo de reset da janela.

Dessa forma, consigo validar o comportamento de limite excedido sem tornar a suíte frágil ou agressiva contra uma API pública compartilhada.