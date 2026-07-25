/**
 * AFAU Digital — utils.js
 * Funções puras: decodificação local do link da SEMOB, validação de
 * domínio (allowlist) e formatação de CPF/placa.
 *
 * IMPORTANTE (decisão de arquitetura — ver spec v2):
 * O app NUNCA faz fetch() para o domínio da SEMOB. Ele apenas decodifica
 * localmente os parâmetros que já vêm no próprio link do QR Code.
 * A ida ao site oficial é sempre um clique explícito do usuário, em
 * nova aba — isso evita CORS (GitHub Pages não tem backend) e evita
 * expor dados a um proxy de terceiros.
 */

const AfauUtils = (() => {

  // Único domínio autorizado a ser aberto automaticamente/sugerido.
  // Qualquer link fora desta lista é tratado como suspeito.
  const ALLOWED_HOSTS = ['servicos.semob.df.gov.br'];

  /**
   * Valida se uma URL pertence ao domínio oficial da SEMOB.
   * @param {string} rawUrl
   * @returns {{ ok: boolean, url: URL|null, reason?: string }}
   */
  function validateOfficialUrl(rawUrl) {
    let url;
    try {
      url = new URL(rawUrl);
    } catch (e) {
      return { ok: false, url: null, reason: 'invalid_url' };
    }
    if (url.protocol !== 'https:') {
      return { ok: false, url, reason: 'not_https' };
    }
    if (!ALLOWED_HOSTS.includes(url.hostname)) {
      return { ok: false, url, reason: 'domain_mismatch' };
    }
    return { ok: true, url };
  }

  /**
   * Decodifica Base64 com segurança (retorna null em caso de erro,
   * nunca lança exceção para quem chama).
   */
  function safeBase64Decode(b64) {
    try {
      // atob lida com Latin1; decodeURIComponent+escape cobre UTF-8 se preciso.
      return decodeURIComponent(escape(atob(b64)));
    } catch (e) {
      try { return atob(b64); } catch (e2) { return null; }
    }
  }

  function safeBase64Encode(str) {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
      return btoa(str);
    }
  }

  /**
   * Extrai { cpf, cpfBase64, plate } de um link do QR da SEMOB.
   * Formato observado:
   *   https://servicos.semob.df.gov.br/.../default?cpf=<base64>&plate=<placa>#/
   *
   * Só decodifica dados — nunca faz requisição de rede.
   */
  function parseSemobLink(rawUrl) {
    const validation = validateOfficialUrl(rawUrl);
    if (!validation.ok) {
      return { ok: false, reason: validation.reason, url: rawUrl };
    }
    const params = validation.url.searchParams;
    const cpfB64 = params.get('cpf') || '';
    const plate = (params.get('plate') || '').toUpperCase();
    const cpf = cpfB64 ? safeBase64Decode(cpfB64) : '';

    if (!cpf || !plate) {
      return { ok: false, reason: 'missing_params', url: rawUrl };
    }

    return {
      ok: true,
      url: rawUrl,
      cpf,
      cpfBase64: cpfB64,
      plate,
    };
  }

  /** Formata string de 11 dígitos como 000.000.000-00 */
  function formatCpf(cpf) {
    const digits = (cpf || '').replace(/\D/g, '');
    if (digits.length !== 11) return cpf || '';
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  /** Monta o link oficial a partir de CPF (texto) + placa, para consulta manual */
  function buildSemobLink(cpfDigits, plate) {
    const base = 'https://servicos.semob.df.gov.br/lowcode/public/form/edsp_frm_info_disc_vehicle/default';
    const cpfB64 = safeBase64Encode(cpfDigits);
    const url = new URL(base);
    url.searchParams.set('cpf', cpfB64);
    url.searchParams.set('plate', plate.toUpperCase());
    return url.toString() + '#/';
  }

  function onlyDigits(str) {
    return (str || '').replace(/\D/g, '');
  }

  return {
    ALLOWED_HOSTS,
    validateOfficialUrl,
    safeBase64Decode,
    safeBase64Encode,
    parseSemobLink,
    formatCpf,
    buildSemobLink,
    onlyDigits,
  };
})();
