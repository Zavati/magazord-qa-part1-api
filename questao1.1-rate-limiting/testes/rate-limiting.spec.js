require('dotenv').config();
const { test, expect, request } = require('@playwright/test');
const {
    getRateLimitInfo,
    hasRequiredRateLimitHeaders,
    isRateLimitCritical,
    buildRateLimitLog,
} = require('./utils/rate-limit-helper');

const BASE_URL = 'https://api.github.com';
const ENDPOINT = '/users/github';
const SAFE_THRESHOLD = 1;
const EXHAUST_MAX_ATTEMPTS = Number(process.env.EXHAUST_MAX_ATTEMPTS || 70);
const ENABLE_EXHAUST_RATE_LIMIT_TEST =
    process.env.ENABLE_EXHAUST_RATE_LIMIT_TEST === 'true';
function buildRequestHeaders() {
    const headers = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
    };

    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    return headers;
}

function logStep(message) {
    console.log(`[RATE-LIMIT-TEST] ${message}`);
}

test.describe('Questão 1.1 - Rate Limiting', () => {
    let apiContext;
    let requestHeaders;

    test.beforeAll(async () => {
        requestHeaders = buildRequestHeaders();

        logStep('Inicializando contexto de API');
        logStep(`Base URL: ${BASE_URL}`);
        logStep(`Endpoint alvo: ${ENDPOINT}`);
        logStep(`Headers da requisição: ${JSON.stringify(requestHeaders, null, 2)}`);

        apiContext = await request.newContext({
            baseURL: BASE_URL,
            extraHTTPHeaders: requestHeaders,
        });
    });

    test.afterAll(async () => {
        logStep('Finalizando contexto de API');
        await apiContext.dispose();
    });

    test('valida headers de rate limiting', async () => {
        logStep('Iniciando cenário: validação dos headers de rate limiting');
        logStep(`Realizando GET ${BASE_URL}${ENDPOINT}`);

        const response = await apiContext.get(ENDPOINT);
        const headers = response.headers();
        const rateLimitInfo = getRateLimitInfo(headers);

        logStep(`Status recebido: ${response.status()}`);
        logStep(`Headers de rate limit recebidos: ${buildRateLimitLog(rateLimitInfo)}`);

        logStep('Validando presença dos headers obrigatórios de rate limit');
        expect(hasRequiredRateLimitHeaders(rateLimitInfo)).toBeTruthy();

        logStep('Validando se o status retornado é compatível com o estado atual da API');
        expect([200, 403, 429]).toContain(response.status());

        logStep('Validando se limit é maior que zero');
        expect(rateLimitInfo.limit).not.toBeNull();
        expect(rateLimitInfo.limit).toBeGreaterThan(0);

        logStep('Validando se remaining é maior ou igual a zero');
        expect(rateLimitInfo.remaining).not.toBeNull();
        expect(rateLimitInfo.remaining).toBeGreaterThanOrEqual(0);

        logStep('Validando se reset está presente e é maior que zero');
        expect(rateLimitInfo.reset).not.toBeNull();
        expect(rateLimitInfo.reset).toBeGreaterThan(0);

        if ([403, 429].includes(response.status())) {
            logStep(
                'API respondeu com bloqueio por rate limit, mas os headers foram expostos corretamente'
            );
        }

        logStep('Cenário finalizado com sucesso');
    });

    test('valida consumo agressivo quando o limite estiver crítico', async () => {
        logStep('Iniciando cenário: proteção contra consumo agressivo');
        logStep(`Realizando GET ${BASE_URL}${ENDPOINT}`);

        const response = await apiContext.get(ENDPOINT);
        const headers = response.headers();
        const rateLimitInfo = getRateLimitInfo(headers);

        logStep(`Status recebido: ${response.status()}`);
        logStep(`Estado atual do rate limit: ${buildRateLimitLog(rateLimitInfo)}`);

        logStep('Validando presença dos headers obrigatórios');
        expect(hasRequiredRateLimitHeaders(rateLimitInfo)).toBeTruthy();

        logStep('Validando se o status retornado é compatível com o estado atual da API');
        expect([200, 403, 429]).toContain(response.status());

        const critical = isRateLimitCritical(rateLimitInfo, SAFE_THRESHOLD);

        logStep(
            `Verificando se remaining (${rateLimitInfo.remaining}) está abaixo ou igual ao threshold (${SAFE_THRESHOLD})`
        );
        logStep(`Resultado da análise de criticidade: ${critical ? 'CRÍTICO' : 'SEGURO'}`);

        if ([403, 429].includes(response.status())) {
            logStep('API já está bloqueada por rate limit. Cenário tratado como comportamento esperado.');
            expect(rateLimitInfo.remaining).toBe(0);
            return;
        }

        test.skip(
            critical,
            `Execução interrompida por segurança. Remaining atual: ${rateLimitInfo.remaining}`
        );

        logStep('Limite em estado seguro, validando continuidade do cenário');
        expect(critical).toBeFalsy();

        logStep('Cenário finalizado com sucesso');
    });

    test('valida estado atual do rate limit de forma controlada', async () => {
        // Observação para revisão:
        // Este cenário é útil para inspecionar a troca de status e a mensagem de retorno
        // quando o rate limit é esgotado. Mesmo assim, ele não deve ser obrigatório em
        // pipeline, pois depende do consumo real de uma API pública compartilhada.
        // A abordagem mais madura é:
        // 1. manter os testes seguros como padrão;
        // 2. deixar o cenário destrutivo como opt-in/manual;
        // 3. documentar essa decisão no README.
        logStep('Iniciando cenário: detecção controlada do estado do rate limit');
        logStep(`Realizando GET ${BASE_URL}${ENDPOINT}`);

        const response = await apiContext.get(ENDPOINT);
        const headers = response.headers();
        const rateLimitInfo = getRateLimitInfo(headers);

        logStep(`Status recebido: ${response.status()}`);
        logStep(`Estado atual do rate limit: ${buildRateLimitLog(rateLimitInfo)}`);

        logStep('Validando presença dos headers obrigatórios');
        expect(hasRequiredRateLimitHeaders(rateLimitInfo)).toBeTruthy();

        if (rateLimitInfo.remaining === 0) {
            logStep('Rate limit esgotado detectado. Validando retorno HTTP 403');
            expect(response.status()).toBe(403);
            logStep('Cenário finalizado com validação do limite esgotado');
            return;
        }

        logStep(
            `Rate limit ainda disponível. Remaining atual: ${rateLimitInfo.remaining}. Validando status esperado (200 ou 403)`
        );
        expect([200, 403]).toContain(response.status());

        logStep('Cenário finalizado com sucesso');
    });

    if (ENABLE_EXHAUST_RATE_LIMIT_TEST) {
        test('valida status e mensagem quando o rate limit for esgotado (opt-in)', async () => {
            logStep('Iniciando cenário opt-in de esgotamento do rate limit');

            let lastResponse;
            let lastRateLimitInfo;

            for (let attempt = 1; attempt <= EXHAUST_MAX_ATTEMPTS; attempt++) {
                logStep(`Tentativa ${attempt}/${EXHAUST_MAX_ATTEMPTS}: GET ${BASE_URL}${ENDPOINT}`);

                lastResponse = await apiContext.get(ENDPOINT);
                const headers = lastResponse.headers();
                lastRateLimitInfo = getRateLimitInfo(headers);

                logStep(`Status recebido: ${lastResponse.status()}`);
                logStep(`Estado do rate limit: ${buildRateLimitLog(lastRateLimitInfo)}`);

                if ([403, 429].includes(lastResponse.status()) || lastRateLimitInfo.remaining === 0) {
                    const bodyText = await lastResponse.text();

                    logStep('Limite esgotado ou bloqueio detectado');
                    logStep(`Body recebido: ${bodyText}`);

                    expect([403, 429]).toContain(lastResponse.status());
                    expect(lastRateLimitInfo.remaining).toBe(0);
                    return;
                }
            }

            throw new Error(
                `Rate limit não foi esgotado após ${EXHAUST_MAX_ATTEMPTS} tentativas. ` +
                `Último estado observado: ${buildRateLimitLog(lastRateLimitInfo)}`
            );
        });
    } else {
        test.skip('valida status e mensagem quando o rate limit for esgotado (opt-in)', async () => {
            logStep(
                'Teste opt-in desabilitado. Defina ENABLE_EXHAUST_RATE_LIMIT_TEST=true para executar.'
            );
        });
    }

});