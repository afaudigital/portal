/**
 * AFAU Digital — camera.js
 * Leitura de QR Code a partir de uma imagem escolhida na galeria
 * (sem acessar a câmera). Usa Html5Qrcode.scanFileV2, da mesma lib
 * do scanner por câmera — não precisa de uma segunda dependência.
 */

const AfauImageReader = (() => {

  /**
   * O Safari/iOS impõe um limite de área de canvas bem mais baixo que
   * Chrome (Mac/Android). Fotos de câmeras modernas (12–48 MP) podem
   * estourar esse limite: o canvas interno da lib fica em branco/cortado
   * ao desenhar a imagem, e a decodificação falha silenciosamente — o
   * usuário só vê "nenhum QR Code encontrado", mesmo com a foto nítida.
   *
   * Correção: sempre redesenhar a imagem numa escala menor antes de
   * tentar decodificar, bem abaixo de qualquer limite conhecido de
   * canvas em navegadores móveis.
   */
  const MAX_DIMENSION_ATTEMPTS = [1600, 1000, 2400]; // ordem: tamanho "seguro" primeiro, depois alternativas

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { resolve(img); };
      img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    });
  }

  function resizeToBlob(img, maxDimension) {
    return new Promise((resolve, reject) => {
      const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob); else reject(new Error('toBlob falhou'));
      }, 'image/jpeg', 0.92);
    });
  }

  /**
   * Decodifica um Blob/File usando a lib, via um container temporário
   * (a lib exige um elemento real no DOM mesmo em modo "arquivo").
   */
  async function decodeBlob(blob, filename) {
    const tempId = 'qr-file-reader-temp';
    let tempEl = document.getElementById(tempId);
    if (!tempEl) {
      tempEl = document.createElement('div');
      tempEl.id = tempId;
      tempEl.style.display = 'none';
      document.body.appendChild(tempEl);
    }
    const fileObj = blob instanceof File ? blob : new File([blob], filename, { type: 'image/jpeg' });
    const reader = new Html5Qrcode(tempId, { verbose: false });
    try {
      const result = reader.scanFileV3
        ? await reader.scanFileV3(fileObj, false)
        : await reader.scanFile(fileObj, false);
      return typeof result === 'string' ? result : result?.decodedText;
    } finally {
      try { await reader.clear(); } catch (e) { /* ignore */ }
    }
  }

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

    let img;
    try {
      img = await loadImage(file);
    } catch (e) {
      return { ok: false, reason: 'invalid_file' };
    }

    // Tenta em algumas escalas diferentes — cobre tanto o caso de fotos
    // enormes (que precisam ser reduzidas) quanto QR muito pequenos na
    // imagem (que se beneficiam de uma escala maior).
    for (const maxDim of MAX_DIMENSION_ATTEMPTS) {
      try {
        const blob = await resizeToBlob(img, maxDim);
        const text = await decodeBlob(blob, `qr-${maxDim}.jpg`);
        if (text) return { ok: true, text };
      } catch (err) {
        // tenta a próxima escala
      }
    }

    return { ok: false, reason: 'no_qr_found' };
  }

  return { readFromFile };
})();
