/**
 * AFAU Digital — camera.js
 * Leitura de QR Code a partir de uma imagem escolhida na galeria.
 *
 * DECISÃO DE ARQUITETURA (v1.0.2):
 * A primeira versão usava `Html5Qrcode.scanFile()`, da mesma lib do
 * scanner de câmera. Isso funcionava no Mac, mas falhava no iPhone
 * mesmo com fotos nítidas e válidas — a suspeita, com base em relatos
 * conhecidos da própria lib, é que o caminho "arquivo" dela foi
 * pensado principalmente em torno do fluxo de vídeo/câmera, e tem
 * comportamento inconsistente no Safari mobile.
 *
 * A correção foi trocar, só para este fluxo de imagem, para a jsQR:
 * uma biblioteca pequena, sem dependências, que decodifica direto de
 * um ImageData de canvas — sem nenhum código voltado a vídeo/DOM no
 * meio do caminho. O scanner de câmera ao vivo continua usando a
 * html5-qrcode normalmente (nela, a lib funciona bem).
 */

const AfauImageReader = (() => {

  // Escalas tentadas em sequência: cobre tanto fotos muito grandes
  // (reduzir ajuda desempenho) quanto QR pequenos dentro da imagem
  // (aumentar ajuda a resolver os módulos do código).
  const SCALE_ATTEMPTS = [
    { maxDimension: 1200, upscale: false },
    { maxDimension: 2000, upscale: false },
    { maxDimension: 800, upscale: true },   // força um mínimo, útil p/ imagens pequenas tipo screenshot
  ];

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    });
  }

  function getImageDataAtScale(img, targetMaxDim, forceUpscale) {
    const naturalMax = Math.max(img.naturalWidth, img.naturalHeight);
    let scale = forceUpscale
      ? targetMaxDim / naturalMax               // sempre redimensiona (para cima ou para baixo) até o alvo
      : Math.min(1, targetMaxDim / naturalMax);  // só reduz, nunca amplia

    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  }

  /**
   * @param {File} file
   * @returns {Promise<{ok: boolean, text?: string, reason?: string}>}
   */
  async function readFromFile(file) {
    if (typeof jsQR === 'undefined') {
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

    for (const attempt of SCALE_ATTEMPTS) {
      try {
        const imageData = getImageDataAtScale(img, attempt.maxDimension, attempt.upscale);
        // "attemptBoth" tenta também a imagem com cores invertidas —
        // ajuda em fotos com pouco contraste ou QR claro sobre fundo escuro.
        const result = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });
        if (result && result.data) {
          return { ok: true, text: result.data };
        }
      } catch (err) {
        // tenta a próxima escala
      }
    }

    return { ok: false, reason: 'no_qr_found' };
  }

  return { readFromFile };
})();
