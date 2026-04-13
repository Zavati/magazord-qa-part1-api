# Part 1 API - Teste Magazord

Este repositório contém a implementação da **Parte 1 - Testes de API** do desafio técnico para a vaga.

O foco desta etapa é demonstrar:

- organização de testes de API
- capacidade de estruturar automação de forma profissional
- tratamento de autenticação e expiração de token
- validação de rate limiting
- pensamento crítico sobre qualidade, estabilidade e segurança da execução

---

## Objetivo do projeto

Este projeto foi criado para atender aos cenários propostos na **Parte 1** do teste técnico, cobrindo:

### Questão 1.1 - Rate Limiting
Validação do comportamento de uma API com limitação de requisições, incluindo:

- leitura e validação dos headers de rate limit
- prevenção de bloqueio durante a execução dos testes
- detecção controlada de cenário com limite excedido

### Questão 1.2 - Gerenciamento de Tokens
Validação de fluxo autenticado com controle de expiração de token, incluindo:

- autenticação via API
- gerenciamento de token em memória
- simulação de expiração próxima
- renovação automática
- execução segura sem conflito lógico entre testes

---

## Stack utilizada

- **Node.js** 18+
- **Playwright**
- **JavaScript**
- Estrutura baseada em helpers, utils e organização por questão

---

## Instalação do projeto

### 1. Clonar o repositório

git clone <url-do-repositorio>
cd part1-api

### 2. Inicializar o projeto Node.js
- npm install
### 3. Instalar o Playwright Test
- npm install -D @playwright/test
### 4. Instalar suporte para variáveis de ambiente
- npm install dotenv
### 5. Criar o arquivo de ambiente
- Crie um arquivo .env
- Suite completa TRUE, False para pipelines(opt-in). 
- ENABLE_EXHAUST_RATE_LIMIT_TEST=false
- EXHAUST_MAX_ATTEMPTS=70
- REQRES_API_KEY=sua_chave_aqui
- REQRES_EMAIL=eve.holt@reqres.in
- REQRES_PASSWORD=cityslicka

## Como rodar o projeto
- npx playwright test
- npx playwright test questao1.1-rate-limiting/testes/rate-limiting.spec.js
- npx playwright test questao1.2-token-management/testes/token-refresh.spec.js
- npx playwright show-report

```bash
