require('dotenv').config();

class AuthManager {
  // Inicializa o gerenciador com contexto de API, credenciais e regras de expiração.
  constructor(apiContext, options = {}) {
    this.apiContext = apiContext;
    this.loginEndpoint = options.loginEndpoint || '/api/login';
    this.email = options.email || process.env.REQRES_EMAIL || 'eve.holt@reqres.in';
    this.password = options.password || process.env.REQRES_PASSWORD || 'cityslicka';
    this.tokenTtlMs = options.tokenTtlMs || 2 * 60 * 1000; // 2 minutos
    this.refreshWindowMs = options.refreshWindowMs || 30 * 1000; // 30 segundos

    this.token = null;
    this.expiresAt = null;
  }

  // Realiza o login na API, armazena o token e calcula a expiração simulada.
  async login() {
    const response = await this.apiContext.post(this.loginEndpoint, {
      data: {
        email: this.email,
        password: this.password,
      },
    });

    const body = await response.json();

    if (response.status() !== 200 || !body.token) {
      throw new Error(
        `Falha ao autenticar. Status: ${response.status()} | Body: ${JSON.stringify(body)}`
      );
    }

    this.token = body.token;
    this.expiresAt = Date.now() + this.tokenTtlMs;

    return this.token;
  }

  // Verifica se não existe token válido armazenado em memória.
  isTokenMissing() {
    return !this.token || !this.expiresAt;
  }

  // Verifica se o token janela de renovação antecipada.
  isTokenExpiringSoon() {
    if (this.isTokenMissing()) {
      return true;
    }

    return Date.now() >= this.expiresAt - this.refreshWindowMs;
  }

  // Verifica se o token já expirou.
  isTokenExpired() {
    if (this.isTokenMissing()) {
      return true;
    }

    return Date.now() >= this.expiresAt;
  }

  // Retorna um token válido; se estiver ausente ou próximo da expiração, reautentica.
  async getValidToken() {
    if (this.isTokenMissing() || this.isTokenExpiringSoon()) {
      await this.login();
    }

    return this.token;
  }

  // Monta o header Authorization para chamadas autenticadas.
  getAuthHeader() {
    if (!this.token) {
      throw new Error('Token ainda não foi gerado. Execute getValidToken() antes.');
    }

    return {
      Authorization: `Bearer ${this.token}`,
    };
  }

  // Retorna dados auxiliares do token para inspeção e validação nos testes.
  getTokenMetadata() {
    return {
      token: this.token,
      expiresAt: this.expiresAt,
      expiresAtIso: this.expiresAt ? new Date(this.expiresAt).toISOString() : null,
    };
  }

  // Força a expiração do token em memória para simular renovação automática.
  forceExpireToken() {
    this.expiresAt = Date.now() - 1000;
  }
}

module.exports = AuthManager;