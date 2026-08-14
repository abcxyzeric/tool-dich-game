// Quản lý thông số AI nâng cao & Đảm bảo lưu tự động (Auto-save) 100% config
class SettingsManager {
  constructor() {
    this.defaultSettings = {
      contextWindow: 2000000,
      maxTokens: 65536,
      temperature: 1.00,
      topK: 100,
      topP: 0.95,
      reasoningEffort: 'AUT',
      streaming: true,
      url: 'https://gcli.ggchan.dev/',
      key: '',
      modelSelect: 'gemini-1.5-flash',
      customModel: ''
    };
    this.settings = { ...this.defaultSettings };
    this.init();
  }

  init() {
    this.loadSettings();
    this.bindEvents();
  }

  loadSettings() {
    const saved = localStorage.getItem('ai_translator_settings_pro');
    if (saved) {
      try {
        this.settings = { ...this.defaultSettings, ...JSON.parse(saved) };
      } catch (e) {
        console.error("Lỗi đọc settings:", e);
      }
    }
    this.reflectToUI();
  }

  reflectToUI() {
    if (document.getElementById('api-url')) document.getElementById('api-url').value = this.settings.url;
    if (document.getElementById('api-key')) document.getElementById('api-key').value = this.settings.key;
    
    const modelSelect = document.getElementById('model-select');
    if (modelSelect) {
      // Nếu model được chọn chưa có trong danh sách (do load động từ proxy), tự động thêm vào DOM
      if (!Array.from(modelSelect.options).some(opt => opt.value === this.settings.modelSelect)) {
        const newOpt = document.createElement('option');
        newOpt.value = this.settings.modelSelect;
        newOpt.textContent = this.settings.modelSelect;
        modelSelect.insertBefore(newOpt, modelSelect.firstChild);
      }
      modelSelect.value = this.settings.modelSelect;
    }

    if (document.getElementById('custom-model-input')) {
      document.getElementById('custom-model-input').value = this.settings.customModel;
      if (this.settings.modelSelect === 'custom') {
        document.getElementById('custom-model-input').classList.remove('hidden');
      }
    }
    
    if (document.getElementById('context-window')) document.getElementById('context-window').value = this.settings.contextWindow;
    if (document.getElementById('max-tokens')) document.getElementById('max-tokens').value = this.settings.maxTokens;
    if (document.getElementById('temperature')) document.getElementById('temperature').value = this.settings.temperature;
    if (document.getElementById('temp-val')) document.getElementById('temp-val').textContent = parseFloat(this.settings.temperature).toFixed(2);
    if (document.getElementById('top-k')) document.getElementById('top-k').value = this.settings.topK;
    if (document.getElementById('top-p')) document.getElementById('top-p').value = this.settings.topP;
    if (document.getElementById('reasoning-effort')) document.getElementById('reasoning-effort').value = this.settings.reasoningEffort;
    if (document.getElementById('streaming-toggle')) document.getElementById('streaming-toggle').checked = this.settings.streaming;
  }

  saveSettings(quiet = false) {
    if (document.getElementById('api-url')) this.settings.url = document.getElementById('api-url').value.trim();
    if (document.getElementById('api-key')) this.settings.key = document.getElementById('api-key').value.trim();
    if (document.getElementById('model-select')) this.settings.modelSelect = document.getElementById('model-select').value;
    if (document.getElementById('custom-model-input')) this.settings.customModel = document.getElementById('custom-model-input').value.trim();

    if (document.getElementById('context-window')) this.settings.contextWindow = parseInt(document.getElementById('context-window').value, 10);
    if (document.getElementById('max-tokens')) this.settings.maxTokens = parseInt(document.getElementById('max-tokens').value, 10);
    if (document.getElementById('temperature')) this.settings.temperature = parseFloat(document.getElementById('temperature').value);
    if (document.getElementById('top-k')) this.settings.topK = parseInt(document.getElementById('top-k').value, 10);
    if (document.getElementById('top-p')) this.settings.topP = parseFloat(document.getElementById('top-p').value);
    if (document.getElementById('reasoning-effort')) this.settings.reasoningEffort = document.getElementById('reasoning-effort').value;
    if (document.getElementById('streaming-toggle')) this.settings.streaming = document.getElementById('streaming-toggle').checked;

    localStorage.setItem('ai_translator_settings_pro', JSON.stringify(this.settings));
    
    if (!quiet && window.appManager) {
      window.appManager.showToast('success', 'Đã lưu toàn bộ cấu hình Hệ thống & AI thành công!');
    }
  }

  bindEvents() {
    const btnSave = document.getElementById('btn-save-settings');
    const tempInput = document.getElementById('temperature');
    const tempVal = document.getElementById('temp-val');

    if (tempInput && tempVal) {
      tempInput.addEventListener('input', (e) => {
        tempVal.textContent = parseFloat(e.target.value).toFixed(2);
        this.saveSettings(true); // Auto-save ngầm
      });
    }

    // Lắng nghe auto-save cho tất cả input
    const inputs = ['api-url', 'api-key', 'model-select', 'custom-model-input', 'context-window', 'max-tokens', 'top-k', 'top-p', 'reasoning-effort', 'streaming-toggle'];
    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => this.saveSettings(true));
        if (el.tagName === 'INPUT' && el.type === 'text') {
          el.addEventListener('input', () => this.saveSettings(true));
        }
      }
    });

    if (btnSave) {
      btnSave.addEventListener('click', () => this.saveSettings(false));
    }
  }

  getSettings() {
    return this.settings;
  }
}

window.settingsManager = new SettingsManager();
