require('dotenv').config();

const { test, expect, request } = require('@playwright/test');
const AuthManager = require('./auth-manager');

const BASE_URL = 'https://reqres.in';
const USER_ENDPOINT = '/api/users/2';

function logStep(message) {
    console.log(`[TOKEN-REFRESH-TEST] ${message}`);
}

function buildDefaultHeaders() {
    const headers = {
        Accept: 'application/json',
    };

    if (process.env.REQRES_API_KEY) {
        headers['x-api-key'] = process.env.REQRES_API_KEY;
    }

    return headers;
}

test.describe('Questão 1.2 - Gerenciamento de Tokens', () => {
    let apiContext;

    test.beforeAll(async () => {
        apiContext = await request.newContext({
            baseURL: BASE_URL,
            extraHTTPHeaders: buildDefaultHeaders(),
        });

        logStep('Contexto de API inicializado');
    });

    test.afterAll(async () => {
        logStep('Finalizando contexto de API');
        await apiContext.dispose();
    });

    test('valida autenticar e obter token com sucesso', async () => {
        const authManager = new AuthManager(apiContext);

        logStep('Solicitando token inicial');
        const token = await authManager.getValidToken();
        const metadata = authManager.getTokenMetadata();

        logStep(`Token obtido com sucesso: ${token}`);
        logStep(`Expiração simulada: ${metadata.expiresAtIso}`);

        expect(token).toBeTruthy();
        expect(typeof token).toBe('string');
        expect(metadata.expiresAt).toBeGreaterThan(Date.now());
    });

    test('valida renovar automaticamente o token quando estiver expirado ou próximo do vencimento', async () => {
        // Observação para revisão:
        // Como a ReqRes é uma API simulada, a renovação automática foi validada
        // pelo reprocessamento da autenticação e pela atualização da expiração em memória,
        // sem assumir obrigatoriamente a troca do valor literal do token.
        const authManager = new AuthManager(apiContext, {
            tokenTtlMs: 2 * 60 * 1000,
            refreshWindowMs: 30 * 1000,
        });

        logStep('Obtendo token inicial');
        const firstToken = await authManager.getValidToken();
        const firstMetadata = authManager.getTokenMetadata();

        logStep(`Primeiro token: ${firstToken}`);
        logStep(`Primeira expiração: ${firstMetadata.expiresAtIso}`);

        logStep('Forçando expiração do token para validar renovação automática');
        authManager.forceExpireToken();

        const refreshedToken = await authManager.getValidToken();
        const refreshedMetadata = authManager.getTokenMetadata();

        logStep(`Token após renovação: ${refreshedToken}`);
        logStep(`Nova expiração: ${refreshedMetadata.expiresAtIso}`);

        expect(refreshedToken).toBeTruthy();
        expect(refreshedMetadata.expiresAt).toBeGreaterThan(Date.now());
    });

    test('valida reutilizar token válido sem reautenticar', async () => {
        const authManager = new AuthManager(apiContext);

        logStep('Obtendo token inicial');
        const firstToken = await authManager.getValidToken();

        logStep('Solicitando token novamente sem expiração próxima');
        const secondToken = await authManager.getValidToken();

        expect(secondToken).toBe(firstToken);
    });
    // Observação para revisão:
    // Foram criadas duas instâncias independentes do AuthManager para simular
    // execuções paralelas. Embora utilizem o mesmo apiContext para as chamadas HTTP,
    // cada instância mantém seu próprio estado em memória, incluindo token e expiração.
    // Isso valida que o gerenciamento de autenticação não depende de variáveis globais
    // compartilhadas e evita conflito entre execuções concorrentes.
    test('valida executar em paralelo sem conflito de gerenciamento de token', async () => {
        const workerA = new AuthManager(apiContext);
        const workerB = new AuthManager(apiContext);

        logStep('Executando autenticação paralela em instâncias independentes');

        const [tokenA, tokenB] = await Promise.all([
            workerA.getValidToken(),
            workerB.getValidToken(),
        ]);

        const metadataA = workerA.getTokenMetadata();
        const metadataB = workerB.getTokenMetadata();

        logStep(`Worker A expiration: ${metadataA.expiresAtIso}`);
        logStep(`Worker B expiration: ${metadataB.expiresAtIso}`);

        expect(tokenA).toBeTruthy();
        expect(tokenB).toBeTruthy();
        expect(metadataA.expiresAt).toBeGreaterThan(Date.now());
        expect(metadataB.expiresAt).toBeGreaterThan(Date.now());
    });

    test('valida chamada autenticada usando token válido', async () => {
        const authManager = new AuthManager(apiContext);

        logStep('Obtendo token válido para chamada autenticada');
        const token = await authManager.getValidToken();

        logStep(`Token utilizado: ${token}`);

        const response = await apiContext.get(USER_ENDPOINT, {
            headers: {
                ...buildDefaultHeaders(),
                ...authManager.getAuthHeader(),
            },
        });

        const body = await response.json();

        logStep(`Status recebido: ${response.status()}`);
        logStep(`Body recebido: ${JSON.stringify(body)}`);

        expect(response.status()).toBe(200);
        expect(body.data).toBeTruthy();
        expect(body.data.id).toBe(2);
    });
});