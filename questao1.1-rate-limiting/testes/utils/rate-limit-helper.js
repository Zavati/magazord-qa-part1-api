function parseNumber(value) {
// Converte o valor recebido do header para número.
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function getRateLimitInfo(headers = {}) {
// Extrai e normaliza os principais headers de rate limit da resposta.
  const limit = parseNumber(headers['x-ratelimit-limit']);
  const remaining = parseNumber(headers['x-ratelimit-remaining']);
  const reset = parseNumber(headers['x-ratelimit-reset']);

  return {
    limit,
    remaining,
    reset,
    resetDate: formatResetTime(reset),
  };
}

function hasRequiredRateLimitHeaders(rateLimitInfo) {
// Verifica se os headers obrigatórios de rate limit estão presentes e válidos.
  return (
    rateLimitInfo.limit !== null &&
    rateLimitInfo.remaining !== null &&
    rateLimitInfo.reset !== null
  );
}

function isRateLimitCritical(rateLimitInfo, threshold = 1) {
// Indica se a quantidade restante está abaixo do limite seguro definido.
  if (
    !rateLimitInfo ||
    rateLimitInfo.remaining === null ||
    typeof threshold !== 'number'
  ) {
    return false;
  }

  return rateLimitInfo.remaining <= threshold;
}

function formatResetTime(resetEpoch) {
// Converte o timestamp epoch do reset para uma data ISO legível.
  if (!resetEpoch) {
    return null;
  }

  const date = new Date(resetEpoch * 1000);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function buildRateLimitLog(rateLimitInfo) {
// Monta uma mensagem simples de log com o estado atual do rate limit.    
  if (!rateLimitInfo) {
    return 'Rate limit info unavailable';
  }

  return [
    `limit=${rateLimitInfo.limit}`,
    `remaining=${rateLimitInfo.remaining}`,
    `reset=${rateLimitInfo.reset}`,
    `resetDate=${rateLimitInfo.resetDate}`,
  ].join(' | ');
}

module.exports = {
  getRateLimitInfo,
  hasRequiredRateLimitHeaders,
  isRateLimitCritical,
  formatResetTime,
  buildRateLimitLog,
};