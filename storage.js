/**
 * AFAU Digital — storage.js
 * Toda a persistência é local (LocalStorage). Nenhum dado sai do
 * dispositivo. Histórico limitado a 100 registros (mais antigo é
 * descartado automaticamente).
 */

const AfauStorage = (() => {
  const KEYS = {
    HISTORY: 'afau.history',
    FAVORITES: 'afau.favorites',
    SETTINGS: 'afau.settings',
  };
  const HISTORY_LIMIT = 100;

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('[storage] falha ao ler', key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('[storage] falha ao gravar', key, e);
      return false;
    }
  }

  // ---------- Settings ----------
  const defaultSettings = {
    theme: 'auto',       // light | dark | auto
    sound: true,
    vibrate: true,
  };

  function getSettings() {
    return { ...defaultSettings, ...read(KEYS.SETTINGS, {}) };
  }

  function setSetting(key, value) {
    const current = getSettings();
    current[key] = value;
    write(KEYS.SETTINGS, current);
    return current;
  }

  // ---------- History ----------
  function getHistory() {
    return read(KEYS.HISTORY, []);
  }

  /**
   * @param {{cpf, cpfBase64, plate, url, source: 'qr'|'imagem'|'manual'}} entry
   */
  function addHistoryEntry(entry) {
    const list = getHistory();
    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      cpf: entry.cpf,
      cpfBase64: entry.cpfBase64 || '',
      plate: entry.plate,
      url: entry.url,
      source: entry.source || 'manual',
      timestamp: new Date().toISOString(),
    };
    list.unshift(record);
    if (list.length > HISTORY_LIMIT) list.length = HISTORY_LIMIT;
    write(KEYS.HISTORY, list);
    return record;
  }

  function clearHistory() {
    write(KEYS.HISTORY, []);
  }

  // ---------- Favorites ----------
  function getFavorites() {
    return read(KEYS.FAVORITES, []);
  }

  function isFavorite(plate, cpf) {
    return getFavorites().some(f => f.plate === plate && f.cpf === cpf);
  }

  function addFavorite(entry) {
    const list = getFavorites();
    if (isFavorite(entry.plate, entry.cpf)) return list;
    list.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      cpf: entry.cpf,
      cpfBase64: entry.cpfBase64 || '',
      plate: entry.plate,
      url: entry.url,
      note: entry.note || '',
      timestamp: new Date().toISOString(),
    });
    write(KEYS.FAVORITES, list);
    return list;
  }

  function removeFavorite(id) {
    const list = getFavorites().filter(f => f.id !== id);
    write(KEYS.FAVORITES, list);
    return list;
  }

  function updateFavoriteNote(id, note) {
    const list = getFavorites();
    const item = list.find(f => f.id === id);
    if (item) item.note = note;
    write(KEYS.FAVORITES, list);
    return list;
  }

  // ---------- Backup ----------
  function exportBackup() {
    return {
      exportedAt: new Date().toISOString(),
      version: 1,
      history: getHistory(),
      favorites: getFavorites(),
      settings: getSettings(),
    };
  }

  function importBackup(data) {
    if (!data || typeof data !== 'object') throw new Error('Backup inválido');
    if (Array.isArray(data.history)) write(KEYS.HISTORY, data.history.slice(0, HISTORY_LIMIT));
    if (Array.isArray(data.favorites)) write(KEYS.FAVORITES, data.favorites);
    if (data.settings) write(KEYS.SETTINGS, { ...defaultSettings, ...data.settings });
  }

  function clearAll() {
    localStorage.removeItem(KEYS.HISTORY);
    localStorage.removeItem(KEYS.FAVORITES);
    localStorage.removeItem(KEYS.SETTINGS);
  }

  return {
    getSettings, setSetting,
    getHistory, addHistoryEntry, clearHistory,
    getFavorites, isFavorite, addFavorite, removeFavorite, updateFavoriteNote,
    exportBackup, importBackup, clearAll,
    HISTORY_LIMIT,
  };
})();
