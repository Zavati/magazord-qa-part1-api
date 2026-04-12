// Converte o valor recebido do header para número.
function parseNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}
// Extrai e normaliza os principais headers de rate limit da resposta.
function getRateLimitInfo(headers = {}) {
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
// Verifica se os headers obrigatórios de rate limit estão presentes.
function hasRequiredRateLimitHeaders(rateLimitInfo) {
  return (
    rateLimitInfo.limit !== null &&
    rateLimitInfo.remaining !== null &&
    rateLimitInfo.reset !== null
  );
}
// Indica se a quantidade restante está abaixo do limite.
function isRateLimitCritical(rateLimitInfo, threshold = 1) {
  if (
    !rateLimitInfo ||
    rateLimitInfo.remaining === null ||
    typeof threshold !== 'number'
  ) {
    return false;
  }

  return rateLimitInfo.remaining <= threshold;
}
// Converte o timestamp epoch do reset para uma data ISO.
function formatResetTime(resetEpoch) {
  if (!resetEpoch) {
    return null;
  }

  const date = new Date(resetEpoch * 1000);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}
// Monta uma mensagem simples de log com o estado atual do rate limit.  
function buildRateLimitLog(rateLimitInfo) {
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