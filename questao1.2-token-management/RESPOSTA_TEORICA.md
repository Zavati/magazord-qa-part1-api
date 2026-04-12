### 1.2.a) Como você implementaria um mecanismo de refresh token automático?

O gerenciamento do token deve ser centralizado em uma classe ou serviço responsável por autenticação, armazenamento em memória e controle de expiração.

A cada obtenção de token, o sistema deve registrar o valor retornado pela API, mas também sua data de expiração. Antes de cada chamada autenticada, essa camada deve verificar se o token ainda é válido ou se está próximo do vencimento. Caso esteja expirado ou dentro de uma janela de segurança definida, um novo login deve ser executado automaticamente para renovar o token e atualizar o estado armazenado.

Essa abordagem evita duplicação de lógica nos testes, reduz falhas por expiração durante execuções longas e torna o uso do token transparente para a suíte. No contexto deste desafio, como a API utilizada não fornece um endpoint real de refresh token, a renovação automática pode ser simulada por uma nova autenticação, reaproveitando o endpoint de login.

### 1.2.b) Como você garantiria que testes executados em paralelo não conflitem no gerenciamento de tokens?

Para evitar conflito em execuções paralelas, o gerenciamento de token não deve ser global. O ideal é que cada worker, contexto de teste ou instância de execução tenha seu próprio gerenciador de autenticação, mantendo isolamento entre os fluxos.

No caso deste desafio, uma abordagem segura é instanciar o gerenciador de autenticação por contexto de teste, garantindo que cada execução paralela controle seu próprio token, sua própria expiração e sua própria renovação automática. Dessa forma, elimina-se o risco de sobrescrita de estado e a suíte permanece previsível mesmo com execução concorrente.