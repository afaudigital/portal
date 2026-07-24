/**
 * AFAU Digital — app.js
 * Orquestra navegação, estado da tela de resultado e integrações
 * com storage.js / utils.js / scanner.js / camera.js.
 */
(() => {
  const APP_VERSION = '1.0.0';
  let currentResult = null; // último resultado decodificado (para favoritar/compartilhar)
  let deferredInstallPrompt = null;

  // ---------------- Navegação ----------------
  function goTo(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('is-active'));
    const target = document.querySelector(`[data-view="${viewName}"]`);
    if (target) target.classList.add('is-active');

    document.querySelectorAll('.tabbar__item').forEach(btn => {
      btn.setAttribute('aria-current', btn.dataset.nav === viewName ? 'true' : 'false');
    });

    // Câmera só é ligada ao entrar na tela de scanner, e desligada ao sair
    // (evita permissão/consumo de bateria desnecessário nas outras telas).
    if (viewName === 'scanner') {
      AfauScanner.start(handleDecodedText);
    } else {
      AfauScanner.stop();
    }

    if (viewName === 'historico') renderHistory();
    if (viewName === 'favoritos') renderFavorites();
    if (viewName === 'estatisticas') renderStats();
    if (viewName === 'home') renderHomeStats();
    if (viewName === 'search') document.getElementById('search-historico')?.focus();
  }

  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => goTo(el.dataset.nav));
  });

  // ---------------- Toast ----------------
  let toastTimer = null;
  function toast(message) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2200);
  }

  // ---------------- Tema ----------------
  function applyTheme(mode) {
    const root = document.documentElement;
    let effective = mode;
    if (mode === 'auto') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    root.setAttribute('data-theme', effective);
    document.querySelectorAll('#theme-segmented button').forEach(b => {
      b.setAttribute('aria-selected', b.dataset.themeOpt === mode ? 'true' : 'false');
    });
  }

  function initTheme() {
    const { theme } = AfauStorage.getSettings();
    applyTheme(theme);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const current = AfauStorage.getSettings().theme;
      if (current === 'auto') applyTheme('auto');
    });
  }

  document.getElementById('btn-theme').addEventListener('click', () => {
    const order = ['light', 'dark', 'auto'];
    const current = AfauStorage.getSettings().theme;
    const next = order[(order.indexOf(current) + 1) % order.length];
    AfauStorage.setSetting('theme', next);
    applyTheme(next);
  });

  document.querySelectorAll('#theme-segmented button').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.themeOpt;
      AfauStorage.setSetting('theme', mode);
      applyTheme(mode);
    });
  });

  // ---------------- Resultado (núcleo de segurança) ----------------

  /**
   * Recebe o texto bruto decodificado (de QR câmera, QR imagem, ou link
   * montado manualmente) e SEMPRE passa pela validação de domínio antes
   * de exibir qualquer ação de "abrir".
   */
  function showResult(rawUrl, source) {
    const parsed = AfauUtils.parseSemobLink(rawUrl);
    const alertEl = document.getElementById('resultado-alert');
    const openBtn = document.getElementById('btn-open-official');

    if (!parsed.ok) {
      currentResult = null;
      alertEl.innerHTML = renderAlert('danger', domainErrorMessage(parsed.reason));
      document.getElementById('res-plate').textContent = '—';
      document.getElementById('res-cpf').textContent = '—';
      document.getElementById('res-cpf-b64').textContent = '—';
      document.getElementById('res-link').textContent = rawUrl || '—';
      openBtn.disabled = true;
      openBtn.classList.add('hidden');
      goTo('resultado');
      return;
    }

    currentResult = { ...parsed, source };
    alertEl.innerHTML = renderAlert('ok', 'Link verificado — domínio oficial da SEMOB-DF.');
    document.getElementById('res-plate').textContent = parsed.plate;
    document.getElementById('res-cpf').textContent = AfauUtils.formatCpf(parsed.cpf);
    document.getElementById('res-cpf-b64').textContent = parsed.cpfBase64;
    document.getElementById('res-link').textContent = parsed.url;
    openBtn.disabled = false;
    openBtn.classList.remove('hidden');

    updateFavoriteButton();

    AfauStorage.addHistoryEntry({
      cpf: parsed.cpf, cpfBase64: parsed.cpfBase64, plate: parsed.plate,
      url: parsed.url, source,
    });

    goTo('resultado');
  }

  function domainErrorMessage(reason) {
    switch (reason) {
      case 'domain_mismatch':
        return 'Este link NÃO pertence ao domínio oficial da SEMOB-DF. Pode ser um QR Code adulterado — não abra e reporte à fiscalização.';
      case 'not_https':
        return 'Link sem conexão segura (HTTPS). Por precaução, não foi aberto automaticamente.';
      case 'missing_params':
        return 'O link é do domínio oficial, mas não contém CPF/placa reconhecíveis.';
      default:
        return 'Não foi possível reconhecer um link válido neste QR Code.';
    }
  }

  function renderAlert(kind, message) {
    const icon = kind === 'danger'
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>';
    return `<div class="result-alert result-alert--${kind}">${icon}<span>${message}</span></div>`;
  }

  document.getElementById('btn-open-official').addEventListener('click', () => {
    if (!currentResult) return;
    window.open(currentResult.url, '_blank', 'noopener');
  });

  // Copiar campos
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetId = btn.dataset.copy;
      const text = document.getElementById(targetId).textContent;
      if (!text || text === '—') return;
      try {
        await navigator.clipboard.writeText(text);
        btn.classList.add('is-copied');
        setTimeout(() => btn.classList.remove('is-copied'), 1200);
        toast('Copiado');
      } catch (e) {
        toast('Não foi possível copiar');
      }
    });
  });

  // Compartilhar
  document.getElementById('btn-compartilhar').addEventListener('click', async () => {
    if (!currentResult) return;
    const shareData = {
      title: 'AFAU Digital — Consulta',
      text: `Placa: ${currentResult.plate}\nCPF: ${AfauUtils.formatCpf(currentResult.cpf)}`,
      url: currentResult.url,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (e) { /* usuário cancelou */ }
    } else {
      await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      toast('Link copiado (compartilhamento não suportado neste navegador)');
    }
  });

  // Favoritar
  function updateFavoriteButton() {
    const btn = document.getElementById('btn-favoritar');
    if (!currentResult) return;
    const fav = AfauStorage.isFavorite(currentResult.plate, currentResult.cpf);
    btn.textContent = fav ? '★ Favoritado' : '☆ Favoritar';
  }
  document.getElementById('btn-favoritar').addEventListener('click', () => {
    if (!currentResult) return;
    AfauStorage.addFavorite(currentResult);
    updateFavoriteButton();
    toast('Adicionado aos favoritos');
  });

  // ---------------- Scanner (câmera) ----------------
  function handleDecodedText(text) {
    const settings = AfauStorage.getSettings();
    if (settings.sound) playBeep();
    if (settings.vibrate && navigator.vibrate) navigator.vibrate(120); // no-op silencioso no iOS
    showResult(text, 'qr');
  }

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) { /* áudio não disponível */ }
  }

  document.getElementById('btn-torch').addEventListener('click', async (e) => {
    const on = await AfauScanner.toggleTorch();
    e.currentTarget.setAttribute('aria-pressed', String(on));
    if (!on) toast('Lanterna não suportada neste aparelho/navegador');
  });

  document.getElementById('btn-sound').addEventListener('click', (e) => {
    const settings = AfauStorage.getSettings();
    const next = !settings.sound;
    AfauStorage.setSetting('sound', next);
    e.currentTarget.setAttribute('aria-pressed', String(next));
  });

  // ---------------- Leitura por imagem ----------------
  document.getElementById('input-image-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const statusEl = document.getElementById('image-upload-status');
    statusEl.textContent = 'Lendo imagem…';
    const result = await AfauImageReader.readFromFile(file);
    statusEl.textContent = '';
    e.target.value = '';
    if (!result.ok) {
      toast(result.reason === 'lib_missing'
        ? 'Biblioteca de leitura não carregada'
        : 'Nenhum QR Code encontrado nessa imagem');
      return;
    }
    showResult(result.text, 'imagem');
  });

  // ---------------- Consulta manual ----------------
  document.getElementById('btn-manual-consult').addEventListener('click', () => {
    const cpfDigits = AfauUtils.onlyDigits(document.getElementById('input-cpf').value);
    const plate = document.getElementById('input-plate').value.trim().toUpperCase();

    if (cpfDigits.length !== 11) { toast('CPF inválido — informe os 11 dígitos'); return; }
    if (!/^[A-Z0-9]{6,7}$/.test(plate)) { toast('Placa inválida'); return; }

    const link = AfauUtils.buildSemobLink(cpfDigits, plate);
    showResult(link, 'manual');
  });

  document.getElementById('input-cpf').addEventListener('input', (e) => {
    const digits = AfauUtils.onlyDigits(e.target.value).slice(0, 11);
    e.target.value = AfauUtils.formatCpf(digits.padEnd(0, '')) || digits;
  });

  // ---------------- Histórico ----------------
  function sourceLabel(source) {
    return { qr: 'QR Code', imagem: 'Imagem', manual: 'Manual' }[source] || source;
  }

  function renderHistory(filter = '') {
    const list = AfauStorage.getHistory().filter(h =>
      !filter || h.plate.toLowerCase().includes(filter.toLowerCase()) || h.cpf.includes(filter)
    );
    const container = document.getElementById('historico-list');
    if (list.length === 0) {
      container.innerHTML = emptyState('📭', 'Nada por aqui ainda', 'Suas consultas aparecerão neste histórico automaticamente.');
      return;
    }
    container.innerHTML = list.map(h => `
      <div class="list-item">
        <div class="list-item__badge">${badgeIcon(h.source)}</div>
        <div class="list-item__main">
          <div class="list-item__plate">${h.plate}</div>
          <div class="list-item__meta">${AfauUtils.formatCpf(h.cpf)} · ${sourceLabel(h.source)} · ${formatDateTime(h.timestamp)}</div>
        </div>
        <div class="list-item__actions">
          <button class="icon-btn" data-reopen="${h.id}" aria-label="Abrir">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-reopen]').forEach(btn => {
      btn.addEventListener('click', () => {
        const entry = AfauStorage.getHistory().find(h => h.id === btn.dataset.reopen);
        if (entry) showResult(entry.url, entry.source);
      });
    });
  }

  function badgeIcon(source) {
    if (source === 'qr') return '📷';
    if (source === 'imagem') return '🖼️';
    return '⌨️';
  }

  function formatDateTime(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  document.getElementById('search-historico').addEventListener('input', (e) => renderHistory(e.target.value));

  // ---------------- Favoritos ----------------
  function renderFavorites(filter = '') {
    const list = AfauStorage.getFavorites().filter(f =>
      !filter || f.plate.toLowerCase().includes(filter.toLowerCase()) || f.cpf.includes(filter)
    );
    const container = document.getElementById('favoritos-list');
    if (list.length === 0) {
      container.innerHTML = emptyState('⭐', 'Sem favoritos', 'Toque em "Favoritar" na tela de resultado para salvar uma consulta aqui.');
      return;
    }
    container.innerHTML = list.map(f => `
      <div class="list-item">
        <div class="list-item__badge">⭐</div>
        <div class="list-item__main">
          <div class="list-item__plate">${f.plate}</div>
          <div class="list-item__meta">${AfauUtils.formatCpf(f.cpf)} · ${formatDateTime(f.timestamp)}</div>
        </div>
        <div class="list-item__actions">
          <button class="icon-btn" data-reopen-fav="${f.id}" aria-label="Abrir"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button>
          <button class="icon-btn" data-remove-fav="${f.id}" aria-label="Remover"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg></button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-reopen-fav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const entry = AfauStorage.getFavorites().find(f => f.id === btn.dataset.reopenFav);
        if (entry) showResult(entry.url, 'manual');
      });
    });
    container.querySelectorAll('[data-remove-fav]').forEach(btn => {
      btn.addEventListener('click', () => {
        AfauStorage.removeFavorite(btn.dataset.removeFav);
        renderFavorites(document.getElementById('search-favoritos').value);
        toast('Removido dos favoritos');
      });
    });
  }

  document.getElementById('search-favoritos').addEventListener('input', (e) => renderFavorites(e.target.value));

  function emptyState(icon, title, desc) {
    return `<div class="empty-state">
      <div class="empty-state__icon">${icon}</div>
      <div class="empty-state__title">${title}</div>
      <div class="empty-state__desc">${desc}</div>
    </div>`;
  }

  // ---------------- Estatísticas ----------------
  let chartInstance = null;
  function renderStats() {
    const history = AfauStorage.getHistory();
    const favorites = AfauStorage.getFavorites();
    const today = new Date(); today.setHours(0,0,0,0);
    const perDay = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      perDay[d.toISOString().slice(0,10)] = 0;
    }
    history.forEach(h => {
      const day = h.timestamp.slice(0,10);
      if (day in perDay) perDay[day]++;
    });
    const thisMonth = history.filter(h => h.timestamp.slice(0,7) === new Date().toISOString().slice(0,7)).length;

    document.getElementById('stats-grid').innerHTML = `
      <div class="stat-card"><div class="stat-card__value">${history.length}</div><div class="stat-card__label">Total de consultas</div></div>
      <div class="stat-card"><div class="stat-card__value">${thisMonth}</div><div class="stat-card__label">Este mês</div></div>
      <div class="stat-card"><div class="stat-card__value">${favorites.length}</div><div class="stat-card__label">Favoritos</div></div>
      <div class="stat-card"><div class="stat-card__value">${history[0] ? formatDateTime(history[0].timestamp) : '—'}</div><div class="stat-card__label" style="font-size:10px;">Última consulta</div></div>
    `;

    const ctx = document.getElementById('chart-daily');
    if (typeof Chart === 'undefined' || !ctx) return; // gráfico é opcional se a lib não estiver presente
    const labels = Object.keys(perDay).map(d => d.slice(8) + '/' + d.slice(5,7));
    const data = Object.values(perDay);
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ data, backgroundColor: '#2e86ff', borderRadius: 4 }] },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
  }

  function renderHomeStats() {
    const history = AfauStorage.getHistory();
    const favorites = AfauStorage.getFavorites();
    document.getElementById('home-stats').innerHTML = `
      <div class="stat-card"><div class="stat-card__value">${history.length}</div><div class="stat-card__label">Consultas</div></div>
      <div class="stat-card"><div class="stat-card__value">${favorites.length}</div><div class="stat-card__label">Favoritos</div></div>
    `;
  }

  // ---------------- Configurações: backup / import / clear ----------------
  document.getElementById('btn-export-json').addEventListener('click', () => {
    const data = AfauStorage.exportBackup();
    downloadFile(`afau-backup-${Date.now()}.json`, JSON.stringify(data, null, 2), 'application/json');
  });

  document.getElementById('btn-import-json').addEventListener('click', () => {
    document.getElementById('input-import-json').click();
  });
  document.getElementById('input-import-json').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      AfauStorage.importBackup(JSON.parse(text));
      toast('Backup importado');
      renderHomeStats();
    } catch (err) {
      toast('Arquivo de backup inválido');
    }
    e.target.value = '';
  });

  document.getElementById('btn-export-csv').addEventListener('click', () => {
    const rows = [['Data', 'Hora', 'Placa', 'CPF', 'Origem']];
    AfauStorage.getHistory().forEach(h => {
      const d = new Date(h.timestamp);
      rows.push([
        d.toLocaleDateString('pt-BR'),
        d.toLocaleTimeString('pt-BR'),
        h.plate,
        AfauUtils.formatCpf(h.cpf),
        sourceLabel(h.source),
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');
    downloadFile(`afau-historico-${Date.now()}.csv`, csv, 'text/csv');
  });

  document.getElementById('btn-clear-data').addEventListener('click', () => {
    if (!confirm('Apagar todo o histórico, favoritos e configurações deste dispositivo? Esta ação não pode ser desfeita.')) return;
    AfauStorage.clearAll();
    toast('Dados apagados');
    renderHomeStats();
  });

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---------------- Config: switches de som/vibração ----------------
  function initConfigInputs() {
    const settings = AfauStorage.getSettings();
    document.getElementById('cfg-sound').checked = settings.sound;
    document.getElementById('cfg-vibrate').checked = settings.vibrate;
    const vibrateSupported = 'vibrate' in navigator;
    document.getElementById('cfg-vibrate-desc').textContent = vibrateSupported
      ? 'Disponível neste aparelho'
      : 'Não suportado neste navegador (ex: Safari/iOS) — o app usa aviso visual/sonoro no lugar';
    document.getElementById('cfg-vibrate').disabled = !vibrateSupported;
  }
  document.getElementById('cfg-sound').addEventListener('change', (e) => AfauStorage.setSetting('sound', e.target.checked));
  document.getElementById('cfg-vibrate').addEventListener('change', (e) => AfauStorage.setSetting('vibrate', e.target.checked));

  // ---------------- Instalação PWA ----------------
  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }
  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    showInstallCard();
  });

  function showInstallCard() {
    if (isStandalone()) return;
    const card = document.getElementById('install-card');
    const instructions = document.getElementById('install-instructions');
    const btn = document.getElementById('btn-install');

    if (isIos()) {
      instructions.textContent = 'No iPhone: toque em Compartilhar (□↑) na barra do Safari e depois em "Adicionar à Tela de Início".';
      btn.classList.add('hidden');
      card.style.display = 'block';
    } else if (deferredInstallPrompt) {
      instructions.textContent = 'Instale o AFAU Digital para acesso rápido e uso offline completo.';
      btn.classList.remove('hidden');
      card.style.display = 'block';
      btn.onclick = async () => {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        card.style.display = 'none';
      };
    }
  }

  // ---------------- Service Worker ----------------
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch(err => {
          console.warn('[sw] falha ao registrar', err);
        });
      });
    }
  }

  // ---------------- Init ----------------
  function init() {
    document.getElementById('app-version').textContent = APP_VERSION;
    initTheme();
    initConfigInputs();
    renderHomeStats();
    showInstallCard();
    registerServiceWorker();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
