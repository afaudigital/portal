/**
 * AFAU Digital — scanner.js
 * Leitura contínua de QR Code pela câmera traseira, usando a lib
 * html5-qrcode (carregada em /libs). Isolado do app.js para poder
 * ser religado/testado independentemente.
 */

const AfauScanner = (() => {
  let html5QrCode = null;
  let isRunning = false;
  let torchOn = false;
  let onDecodeCallback = null;

  const READER_ID = 'qr-reader';

  function isSupported() {
    return typeof Html5Qrcode !== 'undefined';
  }

  async function start(onDecode) {
    onDecodeCallback = onDecode;

    if (!isSupported()) {
      console.warn('[scanner] html5-qrcode não carregada — baixe libs/html5-qrcode.min.js');
      return { ok: false, reason: 'lib_missing' };
    }
    if (isRunning) return { ok: true };

    html5QrCode = new Html5Qrcode(READER_ID, { verbose: false });

    const config = {
      fps: 12,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.7);
        return { width: size, height: size };
      },
      aspectRatio: 1.0,
    };

    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => handleDecoded(decodedText),
        () => { /* erros de frame sem QR são esperados a cada frame; ignorar */ }
      );
      isRunning = true;
      return { ok: true };
    } catch (err) {
      console.error('[scanner] falha ao iniciar câmera', err);
      return { ok: false, reason: 'camera_denied', error: err };
    }
  }

  async function stop() {
    if (!isRunning || !html5QrCode) return;
    try {
      await html5QrCode.stop();
      await html5QrCode.clear();
    } catch (e) { /* já pode estar parado */ }
    isRunning = false;
    torchOn = false;
  }

  function handleDecoded(decodedText) {
    // Evita múltiplos disparos do mesmo QR em frames consecutivos.
    if (handleDecoded._last === decodedText && Date.now() - handleDecoded._lastAt < 2500) return;
    handleDecoded._last = decodedText;
    handleDecoded._lastAt = Date.now();

    if (typeof onDecodeCallback === 'function') {
      onDecodeCallback(decodedText);
    }
  }

  async function toggleTorch() {
    if (!html5QrCode || !isRunning) return false;
    try {
      const capabilities = html5QrCode.getRunningTrackCapabilities?.();
      if (!capabilities || !capabilities.torch) return false; // não suportado (ex: iOS Safari)
      torchOn = !torchOn;
      await html5QrCode.applyVideoConstraints({ advanced: [{ torch: torchOn }] });
      return torchOn;
    } catch (e) {
      console.warn('[scanner] lanterna não suportada neste aparelho', e);
      return false;
    }
  }

  return { start, stop, toggleTorch, isSupported, get isRunning() { return isRunning; } };
})();
