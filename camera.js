/**
 * AFAU Digital — camera.js
 * Leitura de QR Code a partir de uma imagem escolhida na galeria
 * (sem acessar a câmera). Usa Html5Qrcode.scanFileV2, da mesma lib
 * do scanner por câmera — não precisa de uma segunda dependência.
 */

const AfauImageReader = (() => {

  /**
   * @param {File} file
   * @returns {Promise<{ok: boolean, text?: string, reason?: string}>}
   */
  async function readFromFile(file) {
    if (typeof Html5Qrcode === 'undefined') {
      return { ok: false, reason: 'lib_missing' };
    }
    if (!file || !file.type.startsWith('image/')) {
      return { ok: false, reason: 'invalid_file' };
    }

    // Precisa de um container temporário no DOM (a lib usa um <div> real,
    // mesmo em modo "arquivo") — criamos um invisível e removemos depois.
    const tempId = 'qr-file-reader-temp';
    let tempEl = document.getElementById(tempId);
    if (!tempEl) {
      tempEl = document.createElement('div');
      tempEl.id = tempId;
      tempEl.style.display = 'none';
      document.body.appendChild(tempEl);
    }

    const reader = new Html5Qrcode(tempId, { verbose: false });
    try {
      const result = await reader.scanFileV3
        ? await reader.scanFileV3(file, false)
        : await reader.scanFile(file, false);
      const text = typeof result === 'string' ? result : result?.decodedText;
      return { ok: true, text };
    } catch (err) {
      return { ok: false, reason: 'no_qr_found', error: err };
    } finally {
      try { await reader.clear(); } catch (e) { /* ignore */ }
    }
  }

  return { readFromFile };
})();
