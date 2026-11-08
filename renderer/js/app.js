// Kết nối trực tiếp Rust Native Backend (Tauri v2)
const ipcRenderer = (typeof window !== 'undefined' && window.ipcRenderer) || {
  async invoke() { return null; }
};

const path = {
  join(...args) {
    return args.map((part, i) => {
      if (typeof part !== 'string') return '';
      if (i === 0) return part.trim().replace(/[\/\\]+$/, '');
      return part.trim().replace(/^[\/\\]+/, '').replace(/[\/\\]+$/, '');
    }).filter(x => x.length > 0).join('\\');
  },
  basename(filePath) {
    if (!filePath) return '';
    const norm = filePath.replace(/\\/g, '/');
    return norm.substring(norm.lastIndexOf('/') + 1);
  },
  dirname(filePath) {
    if (!filePath) return '';
    const norm = filePath.replace(/\\/g, '/');
    const idx = norm.lastIndexOf('/');
    return idx === -1 ? '' : filePath.substring(0, idx);
  },
  relative(from, to) {
    if (!from || !to) return to || '';
    const normFrom = from.replace(/\\/g, '/').replace(/\/+$/, '');
    const normTo = to.replace(/\\/g, '/');
    if (normTo.startsWith(normFrom)) {
      return normTo.substring(normFrom.length).replace(/^\/+/, '').replace(/\//g, '\\');
    }
    return to;
  }
};


class AppManager {
  constructor() {
    this.saveCacheTimers = {};
    // RPGMaker Workspaces
    this.workspaces = {};
    this.activeWorkspaceId = 'default';
    this.workspaceCount = 1;

    // Ren'Py Workspaces
    this.renpyWorkspaces = {};
    this.activeRenpyWorkspaceId = 'renpy_default';
    this.renpyWorkspaceCount = 1;

    this.init();
  }

  async init() {
    // CƠ CHẾ KHÔI PHỤC WORKSPACE TỰ ĐỘNG (PERSISTENCE)
    const savedRpgWorkspaces = localStorage.getItem('ai_translator_rpg_workspaces');
    const savedRpgActiveId = localStorage.getItem('ai_translator_rpg_active_id');
    const savedRenpyWorkspaces = localStorage.getItem('ai_translator_renpy_workspaces');
    const savedRenpyActiveId = localStorage.getItem('ai_translator_renpy_active_id');

    let loadedRpg = false;
    if (savedRpgWorkspaces) {
      try {
        const parsed = JSON.parse(savedRpgWorkspaces);
        if (Object.keys(parsed).length > 0) {
          this.workspaces = parsed;
          this.activeWorkspaceId = savedRpgActiveId || Object.keys(parsed)[0];
          this.workspaceCount = Object.keys(parsed).length;
          loadedRpg = true;
        }
      } catch (e) { console.error("Lỗi khôi phục RPG Workspaces:", e); }
    }

    if (!loadedRpg) {
      this.workspaces['default'] = { id: 'default', title: 'Workspace 1', gamePath: '', files: [], selectedFileIndex: -1, isTranslating: false, activeView: 'filelist' };
      this.activeWorkspaceId = 'default';
    }

    let loadedRenpy = false;
    if (savedRenpyWorkspaces) {
      try {
        const parsed = JSON.parse(savedRenpyWorkspaces);
        if (Object.keys(parsed).length > 0) {
          this.renpyWorkspaces = parsed;
          this.activeRenpyWorkspaceId = savedRenpyActiveId || Object.keys(parsed)[0];
          this.renpyWorkspaceCount = Object.keys(parsed).length;
          loadedRenpy = true;
        }
      } catch (e) { console.error("Lỗi khôi phục RenPy Workspaces:", e); }
    }

    if (!loadedRenpy) {
      this.renpyWorkspaces['renpy_default'] = { id: 'renpy_default', title: 'RenPy WS 1', gamePath: '', files: [], selectedFileIndex: -1, isTranslating: false, activeView: 'filelist', currentPage: 1, linesPerPage: 100 };
      this.activeRenpyWorkspaceId = 'renpy_default';
    }

    this.bindEvents();
    this.renderTabs();
    this.renderRenpyTabs();

    // Tự động khôi phục dữ liệu cache từ đĩa cho các Workspace đã import
    await this.restoreAllWorkspaceCaches();
  }

  get currentWorkspace() { return this.workspaces[this.activeWorkspaceId]; }
  get currentRenpyWorkspace() { return this.renpyWorkspaces[this.activeRenpyWorkspaceId]; }

  // CƠ CHẾ LƯU VÀ KHÔI PHỤC CACHE (UNBREAKABLE PERSISTENCE)
  saveWorkspacesState() {
    // Lưu danh sách metadata nhẹ vào localStorage
    const rpgSnapshot = {};
    for (const [id, ws] of Object.entries(this.workspaces)) {
      rpgSnapshot[id] = { id: ws.id, title: ws.title, gamePath: ws.gamePath, activeView: ws.activeView, selectedFileIndex: ws.selectedFileIndex, isTranslating: false };
    }
    localStorage.setItem('ai_translator_rpg_workspaces', JSON.stringify(rpgSnapshot));
    localStorage.setItem('ai_translator_rpg_active_id', this.activeWorkspaceId);

    const renpySnapshot = {};
    for (const [id, ws] of Object.entries(this.renpyWorkspaces)) {
      renpySnapshot[id] = { id: ws.id, title: ws.title, gamePath: ws.gamePath, activeView: ws.activeView, selectedFileIndex: ws.selectedFileIndex, currentPage: ws.currentPage || 1, linesPerPage: ws.linesPerPage || 100, renpyFilterMode: ws.renpyFilterMode || 'all', isTranslating: false };
    }
    localStorage.setItem('ai_translator_renpy_workspaces', JSON.stringify(renpySnapshot));
    localStorage.setItem('ai_translator_renpy_active_id', this.activeRenpyWorkspaceId);
  }

  async saveWorkspaceCache(ws) {
    this.saveWorkspacesState();
    if (!ws || !ws.gamePath) return;
    
    if (this.saveCacheTimers[ws.id]) {
      clearTimeout(this.saveCacheTimers[ws.id]);
    }
    
    this.saveCacheTimers[ws.id] = setTimeout(async () => {
      try {
        const cachePath = path.join(ws.gamePath, '.ai_translator_cache.json');
        await ipcRenderer.invoke('write-file', cachePath, JSON.stringify(ws.files));
      } catch (e) { console.error("Lỗi lưu cache workspace:", e); }
    }, 1500); // Tối ưu: Debounce 1.5 giây để chống lag khi gõ text
  }

  async restoreAllWorkspaceCaches() {
    // Khôi phục RPGMaker
    for (const ws of Object.values(this.workspaces)) {
      if (ws.gamePath) {
        try {
          const cachePath = path.join(ws.gamePath, '.ai_translator_cache.json');
          const res = await ipcRenderer.invoke('read-file', cachePath);
          if (res.success) {
            ws.files = JSON.parse(res.content);
            if (ws.id === this.activeWorkspaceId) this.refreshWorkspaceUI();
          }
        } catch (e) { console.error("Lỗi khôi phục file cache RPG:", e); }
      }
    }

    // Khôi phục Ren'Py
    for (const ws of Object.values(this.renpyWorkspaces)) {
      if (ws.gamePath) {
        try {
          const cachePath = path.join(ws.gamePath, '.ai_translator_cache.json');
          const res = await ipcRenderer.invoke('read-file', cachePath);
          if (res.success) {
            ws.files = JSON.parse(res.content);
            if (ws.id === this.activeRenpyWorkspaceId) this.refreshRenpyWorkspaceUI();
          }
        } catch (e) { console.error("Lỗi khôi phục file cache RenPy:", e); }
      }
    }

    if (window.studioManager) {
      window.studioManager.renderProjectHub();
    }
  }

  bindEvents() {
    // 1. COLLAPSIBLE SIDEBAR TOGGLE
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const mainSidebar = document.getElementById('main-sidebar');
    if (btnToggleSidebar && mainSidebar) {
      btnToggleSidebar.addEventListener('click', () => {
        mainSidebar.classList.toggle('collapsed');
      });
    }

    // 2. SIDEBAR NAVIGATION
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page-section');

    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        navItems.forEach(nav => nav.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const targetPage = e.currentTarget.getAttribute('data-page');

        pages.forEach(page => page.classList.remove('active'));
        const pageEl = document.getElementById(`page-${targetPage}`);
        if (pageEl) pageEl.classList.add('active');
      });
    });

    // 3. SUB-NAVIGATION TRONG DỊCH RPGMAKER
    const subNavBtns = document.querySelectorAll('.btn-subnav');
    const subViews = document.querySelectorAll('.subview-panel');
    const btnAiTranslate = document.getElementById('btn-ai-translate');
    const btnStopTranslate = document.getElementById('btn-stop-translate');

    subNavBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        subNavBtns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const targetView = e.currentTarget.getAttribute('data-view');

        subViews.forEach(v => v.classList.remove('active'));
        const viewEl = document.getElementById(`view-${targetView}`);
        if (viewEl) viewEl.classList.add('active');
        this.currentWorkspace.activeView = targetView;
        this.saveWorkspacesState();

        if (targetView === 'translation') {
          if (this.currentWorkspace.isTranslating) {
            if (btnAiTranslate) btnAiTranslate.style.display = 'none';
            if (btnStopTranslate) btnStopTranslate.style.display = 'inline-flex';
          } else {
            if (btnAiTranslate) btnAiTranslate.style.display = 'inline-flex';
            if (btnStopTranslate) btnStopTranslate.style.display = 'none';
          }
        } else {
          if (btnAiTranslate) btnAiTranslate.style.display = 'none';
          if (btnStopTranslate) btnStopTranslate.style.display = 'none';
        }
      });
    });

    // 3.1. SUB-NAVIGATION TRONG DỊCH REN'PY
    const renpySubNavBtns = document.querySelectorAll('.renpy-btn-subnav');
    const renpySubViews = document.querySelectorAll('.renpy-subview-panel');
    const renpyBtnAiTranslate = document.getElementById('renpy-btn-ai-translate');
    const renpyBtnStopTranslate = document.getElementById('renpy-btn-stop-translate');

    renpySubNavBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        renpySubNavBtns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const targetView = e.currentTarget.getAttribute('data-view');

        renpySubViews.forEach(v => v.classList.remove('active'));
        const viewEl = document.getElementById(`renpy-view-${targetView}`);
        if (viewEl) viewEl.classList.add('active');
        this.currentRenpyWorkspace.activeView = targetView;
        this.saveWorkspacesState();

        if (targetView === 'translation') {
          if (this.currentRenpyWorkspace.isTranslating) {
            if (renpyBtnAiTranslate) renpyBtnAiTranslate.style.display = 'none';
            if (renpyBtnStopTranslate) renpyBtnStopTranslate.style.display = 'inline-flex';
          } else {
            if (renpyBtnAiTranslate) renpyBtnAiTranslate.style.display = 'inline-flex';
            if (renpyBtnStopTranslate) renpyBtnStopTranslate.style.display = 'none';
          }
        } else {
          if (renpyBtnAiTranslate) renpyBtnAiTranslate.style.display = 'none';
          if (renpyBtnStopTranslate) renpyBtnStopTranslate.style.display = 'none';
        }
      });
    });

    // 4. RPGMAKER ACTIONS
    const btnNewWorkspace = document.getElementById('btn-new-workspace');
    const btnImportGame = document.getElementById('btn-import-game');
    const btnExportFile = document.getElementById('btn-export-file');
    const searchFileInput = document.getElementById('search-file-input');
    const btnBackFilelist = document.getElementById('btn-back-filelist');

    if (btnNewWorkspace) btnNewWorkspace.addEventListener('click', () => this.createNewWorkspace());
    if (btnImportGame) btnImportGame.addEventListener('click', () => this.importGame());
    if (btnAiTranslate) btnAiTranslate.addEventListener('click', () => this.startAiTranslation());
    if (btnStopTranslate) {
      btnStopTranslate.addEventListener('click', () => {
        this.currentWorkspace.isTranslating = false;
        if (btnStopTranslate) btnStopTranslate.style.display = 'none';
        if (btnAiTranslate) btnAiTranslate.style.display = 'inline-flex';
        this.updateTabStatus(this.activeWorkspaceId, 'stopped');
        this.showToast('warning', 'Đã nhận lệnh dừng tiến trình dịch thuật RPGMaker!', this.activeWorkspaceId);
      });
    }
    if (btnExportFile) btnExportFile.addEventListener('click', () => this.exportCurrentFile());
    if (searchFileInput) searchFileInput.addEventListener('input', () => this.renderFileList());
    if (btnBackFilelist) btnBackFilelist.addEventListener('click', () => this.switchSubView('filelist'));

    const btnDeleteSelected = document.getElementById('btn-delete-selected');
    if (btnDeleteSelected) {
      btnDeleteSelected.addEventListener('click', () => {
        const ws = this.currentWorkspace;
        const tbody = document.getElementById('file-list-tbody');
        if (!tbody) return;
        const checkboxes = tbody.querySelectorAll('.file-select-cb:checked');
        if (checkboxes.length === 0) return;
        
        if (confirm(`Bạn có chắc chắn muốn xóa ${checkboxes.length} file đã chọn khỏi Workspace?`)) {
           const indicesToDelete = Array.from(checkboxes).map(cb => parseInt(cb.getAttribute('data-index'), 10)).sort((a,b) => b - a);
           indicesToDelete.forEach(idx => {
               ws.files.splice(idx, 1);
           });
           ws.selectedFileIndex = -1;
           this.saveWorkspaceCache(ws);
           this.renderFileList();
           this.showToast('success', `Đã xóa ${checkboxes.length} file.`, ws.id);
           btnDeleteSelected.style.display = 'none';
        }
      });
    }

    // 5. REN'PY ACTIONS & PAGINATION
    const renpyBtnNewWorkspace = document.getElementById('renpy-btn-new-workspace');
    const renpyBtnImportGame = document.getElementById('renpy-btn-import-game');
    const renpyBtnImportFile = document.getElementById('renpy-btn-import-file');
    const renpyBtnExportFile = document.getElementById('renpy-btn-export-file');
    const renpySearchFileInput = document.getElementById('renpy-search-file-input');
    const renpyBtnBackFilelist = document.getElementById('renpy-btn-back-filelist');

    const inputLinesPerPage = document.getElementById('renpy-lines-per-page');
    const inputCurrentPage = document.getElementById('renpy-current-page-input');
    const btnPrevPage = document.getElementById('renpy-btn-prev-page');
    const btnNextPage = document.getElementById('renpy-btn-next-page');

    if (renpyBtnNewWorkspace) renpyBtnNewWorkspace.addEventListener('click', () => this.createNewRenpyWorkspace());
    if (renpyBtnImportGame) renpyBtnImportGame.addEventListener('click', () => this.importRenpyGame());
    if (renpyBtnImportFile) renpyBtnImportFile.addEventListener('click', () => this.importRenpyFile());
    if (renpyBtnAiTranslate) renpyBtnAiTranslate.addEventListener('click', () => this.startAiTranslationRenpy());
    if (renpyBtnStopTranslate) {
      renpyBtnStopTranslate.addEventListener('click', () => {
        this.currentRenpyWorkspace.isTranslating = false;
        if (renpyBtnStopTranslate) renpyBtnStopTranslate.style.display = 'none';
        if (renpyBtnAiTranslate) renpyBtnAiTranslate.style.display = 'inline-flex';
        this.updateRenpyTabStatus(this.activeRenpyWorkspaceId, 'stopped');
        this.showToast('warning', 'Đã nhận lệnh dừng tiến trình dịch thuật Ren\'Py!', this.activeRenpyWorkspaceId);
      });
    }
    if (renpyBtnExportFile) renpyBtnExportFile.addEventListener('click', () => this.exportCurrentRenpyFile());
    if (renpySearchFileInput) renpySearchFileInput.addEventListener('input', () => this.renderRenpyFileList());
    if (renpyBtnBackFilelist) renpyBtnBackFilelist.addEventListener('click', () => this.switchRenpySubView('filelist'));

    const renpyBtnDeleteSelected = document.getElementById('renpy-btn-delete-selected');
    if (renpyBtnDeleteSelected) {
      renpyBtnDeleteSelected.addEventListener('click', () => {
        const ws = this.currentRenpyWorkspace;
        const tbody = document.getElementById('renpy-file-list-tbody');
        if (!tbody) return;
        const checkboxes = tbody.querySelectorAll('.file-select-cb:checked');
        if (checkboxes.length === 0) return;
        
        if (confirm(`Bạn có chắc chắn muốn xóa ${checkboxes.length} file đã chọn khỏi Workspace?`)) {
           const indicesToDelete = Array.from(checkboxes).map(cb => parseInt(cb.getAttribute('data-index'), 10)).sort((a,b) => b - a);
           indicesToDelete.forEach(idx => {
               ws.files.splice(idx, 1);
           });
           ws.selectedFileIndex = -1;
           this.saveWorkspaceCache(ws);
           this.renderRenpyFileList();
           this.showToast('success', `Đã xóa ${checkboxes.length} file.`, ws.id);
           renpyBtnDeleteSelected.style.display = 'none';
        }
      });
    }

    if (inputLinesPerPage) {
      inputLinesPerPage.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val > 0) {
          this.currentRenpyWorkspace.linesPerPage = val;
          this.currentRenpyWorkspace.currentPage = 1;
          this.saveWorkspacesState();
          this.renderRenpyTranslationTable();
        }
      });
    }

    const renpyFilterMode = document.getElementById('renpy-filter-mode');
    if (renpyFilterMode) {
      renpyFilterMode.addEventListener('change', (e) => {
        this.currentRenpyWorkspace.renpyFilterMode = e.target.value;
        this.currentRenpyWorkspace.currentPage = 1;
        this.saveWorkspacesState();
        this.renderRenpyTranslationTable();
      });
    }

    const renpySearchTranslation = document.getElementById('renpy-search-translation');
    if (renpySearchTranslation) {
      let searchTimeout;
      renpySearchTranslation.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.currentRenpyWorkspace.renpySearchQuery = e.target.value.toLowerCase().trim();
          this.currentRenpyWorkspace.currentPage = 1;
          this.saveWorkspacesState();
          this.renderRenpyTranslationTable();
        }, 300);
      });
    }

    // XỬ LÝ SỰ KIỆN NHẬP TRỰC TIẾP TRANG MUỐN ĐẾN (NHẢY CÓC BẤT KỲ)
    if (inputCurrentPage) {
      inputCurrentPage.addEventListener('change', (e) => {
        const ws = this.currentRenpyWorkspace;
        if (ws.selectedFileIndex < 0) return;
        const currentFile = ws.files[ws.selectedFileIndex];
        
        let targetEvents = currentFile.events;
        if (ws.renpyFilterMode === 'untranslated') {
            targetEvents = currentFile.events.filter(ev => !ev.translation || ev.translation.trim() === '');
        }
        
        const totalPages = Math.ceil(targetEvents.length / (ws.linesPerPage || 100)) || 1;
        
        let val = parseInt(e.target.value, 10);
        if (isNaN(val) || val < 1) val = 1;
        if (val > totalPages) val = totalPages;

        ws.currentPage = val;
        e.target.value = val;
        this.saveWorkspacesState();
        this.renderRenpyTranslationTable();
        this.showToast('info', `Đã chuyển thẳng tới Trang ${val} / ${totalPages}`, ws.id);
      });
    }

    if (btnPrevPage) {
      btnPrevPage.addEventListener('click', () => {
        if (this.currentRenpyWorkspace.currentPage > 1) {
          this.currentRenpyWorkspace.currentPage--;
          this.saveWorkspacesState();
          this.renderRenpyTranslationTable();
        }
      });
    }

    if (btnNextPage) {
      btnNextPage.addEventListener('click', () => {
        const ws = this.currentRenpyWorkspace;
        if (ws.selectedFileIndex < 0) return;
        const currentFile = ws.files[ws.selectedFileIndex];
        
        let targetEvents = currentFile.events;
        if (ws.renpyFilterMode === 'untranslated') {
            targetEvents = currentFile.events.filter(ev => !ev.translation || ev.translation.trim() === '');
        }
        
        const totalPages = Math.ceil(targetEvents.length / ws.linesPerPage);
        if (ws.currentPage < totalPages) {
          ws.currentPage++;
          this.saveWorkspacesState();
          this.renderRenpyTranslationTable();
        }
      });
    }
  }

  // ==========================================
  // QUẢN LÝ WORKSPACE & SUBVIEW RPGMAKER
  // ==========================================
  switchSubView(viewName) {
    const subNavBtns = document.querySelectorAll('.btn-subnav');
    const subViews = document.querySelectorAll('.subview-panel');
    const btnAiTranslate = document.getElementById('btn-ai-translate');
    const btnStopTranslate = document.getElementById('btn-stop-translate');

    subNavBtns.forEach(b => b.classList.remove('active'));
    const targetBtn = document.querySelector(`.btn-subnav[data-view="${viewName}"]`);
    if (targetBtn) targetBtn.classList.add('active');

    subViews.forEach(v => v.classList.remove('active'));
    const viewEl = document.getElementById(`view-${viewName}`);
    if (viewEl) viewEl.classList.add('active');
    this.currentWorkspace.activeView = viewName;
    this.saveWorkspacesState();

    if (viewName === 'translation') {
      if (this.currentWorkspace.isTranslating) {
        if (btnAiTranslate) btnAiTranslate.style.display = 'none';
        if (btnStopTranslate) btnStopTranslate.style.display = 'inline-flex';
      } else {
        if (btnAiTranslate) btnAiTranslate.style.display = 'inline-flex';
        if (btnStopTranslate) btnStopTranslate.style.display = 'none';
      }
    } else {
      if (btnAiTranslate) btnAiTranslate.style.display = 'none';
      if (btnStopTranslate) btnStopTranslate.style.display = 'none';
    }
  }

  createNewWorkspace() {
    this.workspaceCount++;
    const newId = `ws_${Date.now()}`;
    this.workspaces[newId] = {
      id: newId, title: `Workspace ${this.workspaceCount}`, gamePath: '', files: [], selectedFileIndex: -1, isTranslating: false, activeView: 'filelist'
    };
    this.activeWorkspaceId = newId;
    this.saveWorkspacesState();
    this.renderTabs(); this.refreshWorkspaceUI();
    this.showToast('info', `Đã tạo ${this.workspaces[newId].title}`);
  }

  renderTabs() {
    const tabsContainer = document.getElementById('tabs-list');
    if (!tabsContainer) return;

    tabsContainer.innerHTML = Object.values(this.workspaces).map(ws => `
      <div class="workspace-tab ${ws.id === this.activeWorkspaceId ? 'active' : ''}" data-id="${ws.id}">
        <i class="fa-solid fa-gamepad tab-icon"></i>
        <span class="tab-title">${ws.title}</span>
        <span class="tab-status-dot ${ws.isTranslating ? 'busy' : ''}"></span>
        <i class="fa-solid fa-xmark btn-delete-tab" title="Xóa Workspace" data-id="${ws.id}"></i>
      </div>
    `).join('');

    tabsContainer.querySelectorAll('.workspace-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (id !== this.activeWorkspaceId) {
          this.activeWorkspaceId = id; this.saveWorkspacesState(); this.renderTabs(); this.refreshWorkspaceUI();
        }
      });
    });

    tabsContainer.querySelectorAll('.btn-delete-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.getAttribute('data-id');
        if (Object.keys(this.workspaces).length <= 1) {
          this.showToast('warning', 'Không thể xóa Workspace duy nhất còn lại!');
          return;
        }
        const targetWs = this.workspaces[id];
        if (confirm(`Bạn có chắc chắn muốn xóa ${targetWs.title}? Dữ liệu chưa xuất sẽ bị xóa khỏi ứng dụng.`)) {
          delete this.workspaces[id];
          if (this.activeWorkspaceId === id) {
            this.activeWorkspaceId = Object.keys(this.workspaces)[0];
          }
          this.saveWorkspacesState();
          this.renderTabs();
          this.refreshWorkspaceUI();
          this.showToast('success', `Đã xóa thành công ${targetWs.title}!`);
        }
      });
    });
  }

  updateTabStatus(wsId, status) {
    const ws = this.workspaces[wsId];
    if (!ws) return;
    ws.isTranslating = (status === 'busy'); this.renderTabs();
  }

  async importGame() {
    const ws = this.currentWorkspace;
    const result = await ipcRenderer.invoke('select-directory');
    if (result.canceled || result.filePaths.length === 0) return;

    const selectedPath = result.filePaths[0];
    let targetDataDir = selectedPath;

    const wwwDataExists = await ipcRenderer.invoke('check-exists', path.join(selectedPath, 'www', 'data'));
    const dataExists = await ipcRenderer.invoke('check-exists', path.join(selectedPath, 'data'));

    if (wwwDataExists) targetDataDir = path.join(selectedPath, 'www', 'data');
    else if (dataExists) targetDataDir = path.join(selectedPath, 'data');

    this.showToast('info', `Đang tải dữ liệu từ: ${targetDataDir}`, ws.id);
    const dirResult = await ipcRenderer.invoke('read-dir', targetDataDir);

    if (!dirResult.success) { this.showToast('error', `Lỗi đọc thư mục: ${dirResult.error}`, ws.id); return; }

    const jsonFiles = dirResult.files.filter(f => f.endsWith('.json'));
    ws.gamePath = targetDataDir; ws.title = path.basename(selectedPath); ws.files = [];

    for (const fileName of jsonFiles) {
      const filePath = path.join(targetDataDir, fileName);
      const fileRes = await ipcRenderer.invoke('read-file', filePath);
      if (fileRes.success) {
        const parseRes = window.rpgmakerParser.parseEvents(fileRes.content, fileName);
        if (parseRes.success && parseRes.events.length > 0) {
          ws.files.push({ name: fileName, path: filePath, content: fileRes.content, parsedData: parseRes.parsedData, events: parseRes.events, status: 'wait' });
        }
      }
    }

    ws.selectedFileIndex = ws.files.length > 0 ? 0 : -1;
    await this.saveWorkspaceCache(ws);
    this.renderTabs(); this.refreshWorkspaceUI();
    this.showToast('success', `Đã tải thành công ${ws.files.length} file chứa text!`, ws.id);
    this.switchSubView('filelist');
  }

  refreshWorkspaceUI() {
    const ws = this.currentWorkspace;
    const fileTbody = document.getElementById('file-list-tbody');
    if (ws.files.length === 0) {
      if (fileTbody) fileTbody.innerHTML = `<tr><td colspan="5" class="text-center empty-table">Chưa import game nào. Hãy nhấn Import Game (F1) để bắt đầu.</td></tr>`;
      return;
    }
    this.renderFileList(); this.renderTranslationTable();
  }

  renderFileList() {
    const ws = this.currentWorkspace;
    const tbody = document.getElementById('file-list-tbody');
    if (!tbody) return;

    const searchVal = (document.getElementById('search-file-input')?.value || '').toLowerCase();
    const filteredFiles = ws.files.filter(f => f.name.toLowerCase().includes(searchVal));

    if (filteredFiles.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center empty-table">Không tìm thấy file nào khớp với từ khóa tìm kiếm.</td></tr>`; return;
    }

    tbody.innerHTML = filteredFiles.map((f) => {
      const actualIndex = ws.files.findIndex(item => item.name === f.name);
      const statusHtml = f.status === 'done' 
        ? `<span class="status-tag done"><i class="fa-solid fa-check"></i> Hoàn thành</span>` 
        : `<span class="status-tag wait"><i class="fa-solid fa-clock"></i> Chưa dịch</span>`;

      return `
        <tr>
          <td class="col-checkbox" style="text-align: center;">
            <input type="checkbox" class="file-select-cb" data-index="${actualIndex}">
          </td>
          <td class="col-file-name">${f.name}</td>
          <td class="col-event-count">${f.events.length} Events (Đã gom nhóm)</td>
          <td class="col-status">${statusHtml}</td>
          <td class="col-actions">
            <button class="btn btn-icon btn-open-translate" data-index="${actualIndex}"><i class="fa-solid fa-eye"></i> Mở Dịch</button>
          </td>
        </tr>
      `;
    }).join('');

    // Xử lý Checkbox Chọn Tất Cả
    const selectAllCb = document.getElementById('select-all-files');
    const updateDeleteBtn = () => {
      const btnDeleteSelected = document.getElementById('btn-delete-selected');
      if (btnDeleteSelected) {
        const anyChecked = Array.from(tbody.querySelectorAll('.file-select-cb')).some(cb => cb.checked);
        btnDeleteSelected.style.display = anyChecked ? 'inline-flex' : 'none';
      }
    };

    if (selectAllCb) {
      selectAllCb.checked = false;
      selectAllCb.onchange = (e) => {
        tbody.querySelectorAll('.file-select-cb').forEach(cb => cb.checked = e.target.checked);
        updateDeleteBtn();
      };
    }

    tbody.querySelectorAll('.file-select-cb').forEach(cb => {
      cb.addEventListener('change', updateDeleteBtn);
    });

    tbody.querySelectorAll('.btn-open-translate').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        ws.selectedFileIndex = idx; this.saveWorkspacesState(); this.renderTranslationTable();
        const tabTranslationView = document.getElementById('tab-translation-view');
        if (tabTranslationView) tabTranslationView.style.display = 'inline-flex';
        this.switchSubView('translation');
      });
    });
  }

  autoResizeTextarea(textarea) {
    textarea.style.height = 'auto'; textarea.style.height = textarea.scrollHeight + 'px';
  }

  renderTranslationTable() {
    const ws = this.currentWorkspace;
    const tbody = document.getElementById('translation-tbody');
    const headerTitle = document.getElementById('current-translating-file');
    if (!tbody || ws.selectedFileIndex < 0) return;

    const currentFile = ws.files[ws.selectedFileIndex];
    if (headerTitle) headerTitle.textContent = `Tên File: ${currentFile.name}`;
    
    tbody.innerHTML = currentFile.events.map(ev => `
      <tr id="row-${ev.id}">
        <td class="col-event-id">${ev.id}<br><small class="text-muted">${ev.code}</small></td>
        <td class="col-original-text">${ev.original}</td>
        <td class="col-translated-text">
          <textarea class="editable-translation" data-id="${ev.id}">${ev.translation}</textarea>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.editable-translation').forEach(textarea => {
      setTimeout(() => this.autoResizeTextarea(textarea), 10);
      textarea.addEventListener('input', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const ev = currentFile.events.find(item => item.id === id);
        if (ev) { ev.translation = e.currentTarget.value; this.saveWorkspaceCache(ws); }
        this.autoResizeTextarea(e.currentTarget);
      });
    });
  }

  async startAiTranslation() {
    const ws = this.currentWorkspace;
    if (ws.selectedFileIndex < 0) { this.showToast('error', 'Hãy chọn một file từ Danh Sách File để dịch.', ws.id); return; }
    if (ws.isTranslating) { this.showToast('warning', 'Workspace này đang trong tiến trình dịch ngầm.', ws.id); return; }

    const currentFile = ws.files[ws.selectedFileIndex];
    const wsId = ws.id; this.updateTabStatus(wsId, 'busy');

    const btnAiTranslate = document.getElementById('btn-ai-translate');
    const btnStopTranslate = document.getElementById('btn-stop-translate');
    if (btnAiTranslate) btnAiTranslate.style.display = 'none';
    if (btnStopTranslate) btnStopTranslate.style.display = 'inline-flex';

    this.showToast('info', `AI đang tự động bóc tách Thuật Ngữ & Xưng Hô cho file ${currentFile.name}...`, wsId);
    let sampleText = "";
    for (const ev of currentFile.events) {
      if (sampleText.length < 15000) sampleText += `\n[${currentFile.name}] ${ev.original}`;
      else break;
    }

    await new Promise((resolve) => {
      window.apiManager.extractTerminologyAI(
        sampleText,
        (extractedTerms) => {
          const res = window.terminologyManager.mergeAiExtractedTerms(extractedTerms);
          if (res.addedCount > 0 || res.updatedCount > 0) {
            this.showToast('success', `AI đã tự động bổ sung ${res.addedCount} thuật ngữ mới & cập nhật ${res.updatedCount} thuật ngữ cũ!`, wsId);
          }
          resolve();
        },
        (errMsg) => { this.showToast('warning', `Bỏ qua bóc tách tự động: ${errMsg}. Đang tiến hành dịch...`, wsId); resolve(); }
      );
    });

    this.showToast('info', `Bắt đầu dịch tự động AI (Streaming) cho file ${currentFile.name}...`, wsId);

    for (const ev of currentFile.events) {
      if (!this.workspaces[wsId].isTranslating) {
        this.showToast('warning', 'Tiến trình dịch đã được dừng lại bởi người dùng.', wsId);
        break;
      }
      const textToTranslate = ev.original;
      
      // [RESUME THÔNG MINH & BẢO VỆ SỬA TAY] Bỏ qua nếu rỗng, đã dịch, đã sửa tay hoặc đã bấm bỏ qua
      if (!textToTranslate.trim() || (ev.translation && ev.translation.trim() !== '') || ev.manualEdited || ev.isSkipped) continue;

      await new Promise((resolve) => {
        window.apiManager.translateStreaming(
          textToTranslate,
          (chunkText) => {
            ev.translation = chunkText;
            if (this.activeWorkspaceId === wsId) {
              const textarea = document.querySelector(`textarea[data-id="${ev.id}"]`);
              if (textarea) { textarea.value = chunkText; this.autoResizeTextarea(textarea); }
            }
          },
          (finalText) => {
            ev.translation = finalText;
            if (this.activeWorkspaceId === wsId) {
              const textarea = document.querySelector(`textarea[data-id="${ev.id}"]`);
              if (textarea) { textarea.value = finalText; this.autoResizeTextarea(textarea); }
            }
            this.saveWorkspaceCache(this.workspaces[wsId]);
            resolve();
          },
          (errMsg) => { this.showToast('error', `Lỗi dịch [${ev.id}]: ${errMsg}`, wsId); resolve(); }
        );
      });
    }

    if (this.workspaces[wsId].isTranslating) {
      currentFile.status = 'done'; this.updateTabStatus(wsId, 'done'); this.renderFileList();
      this.showToast('success', `Hoàn thành dịch tự động AI cho file ${currentFile.name}!`, wsId);
    }

    if (btnStopTranslate) btnStopTranslate.style.display = 'none';
    if (btnAiTranslate) btnAiTranslate.style.display = 'inline-flex';
  }

  // CƠ CHẾ XUẤT FILE HÀNG LOẠT (BATCH EXPORT) BẰNG CHECKBOX CHO RPGMAKER
  async exportCurrentFile() {
    const ws = this.currentWorkspace;
    // BƯỚC 1: Lấy danh sách các Checkbox đã tích chọn trong Danh Sách File
    const selectedIndexes = Array.from(document.querySelectorAll('#view-filelist .file-select-cb:checked'))
      .map(cb => parseInt(cb.getAttribute('data-index'), 10));

    // BƯỚC 2: Nếu có chọn checkbox, tiến hành xuất hàng loạt (Batch Export)
    if (selectedIndexes.length > 0) {
      this.showToast('info', `Đang xuất hàng loạt ${selectedIndexes.length} file...`, ws.id);
      let successCount = 0;

      for (const idx of selectedIndexes) {
        const fileObj = ws.files[idx];
        const updatedJSON = window.rpgmakerParser.reconstructJSON(fileObj.parsedData, fileObj.events);
        const writeRes = await ipcRenderer.invoke('write-file', fileObj.path, updatedJSON);
        if (writeRes.success) successCount++;
      }

      this.showToast('success', `Đã lưu & xuất thành công ${successCount} file được chọn vào thư mục game!`, ws.id);
      return;
    }

    // BƯỚC 3: Nếu không chọn checkbox nào, kiểm tra xem có đang mở file trong Bảng Dịch Thuật không
    if (ws.selectedFileIndex >= 0) {
      const currentFile = ws.files[ws.selectedFileIndex];
      const updatedJSON = window.rpgmakerParser.reconstructJSON(currentFile.parsedData, currentFile.events);

      const writeRes = await ipcRenderer.invoke('write-file', currentFile.path, updatedJSON);
      if (writeRes.success) this.showToast('success', `Đã lưu & xuất file thành công vào: ${currentFile.path}`, ws.id);
      else this.showToast('error', `Lỗi lưu file: ${writeRes.error}`, ws.id);
      return;
    }

    // Nếu không có cả hai, hiển thị cảnh báo
    this.showToast('warning', 'Hãy tích chọn các file trong Danh Sách File hoặc mở một file để xuất.', ws.id);
  }

  // ==========================================
  // QUẢN LÝ WORKSPACE & SUBVIEW REN'PY
  // ==========================================
  switchRenpySubView(viewName) {
    const subNavBtns = document.querySelectorAll('.renpy-btn-subnav');
    const subViews = document.querySelectorAll('.renpy-subview-panel');
    const btnAiTranslate = document.getElementById('renpy-btn-ai-translate');
    const btnStopTranslate = document.getElementById('renpy-btn-stop-translate');

    subNavBtns.forEach(b => b.classList.remove('active'));
    const targetBtn = document.querySelector(`.renpy-btn-subnav[data-view="${viewName}"]`);
    if (targetBtn) targetBtn.classList.add('active');

    subViews.forEach(v => v.classList.remove('active'));
    const viewEl = document.getElementById(`renpy-view-${viewName}`);
    if (viewEl) viewEl.classList.add('active');
    this.currentRenpyWorkspace.activeView = viewName;
    this.saveWorkspacesState();

    if (viewName === 'translation') {
      if (this.currentRenpyWorkspace.isTranslating) {
        if (btnAiTranslate) btnAiTranslate.style.display = 'none';
        if (btnStopTranslate) btnStopTranslate.style.display = 'inline-flex';
      } else {
        if (btnAiTranslate) btnAiTranslate.style.display = 'inline-flex';
        if (btnStopTranslate) btnStopTranslate.style.display = 'none';
      }
    } else {
      if (btnAiTranslate) btnAiTranslate.style.display = 'none';
      if (btnStopTranslate) btnStopTranslate.style.display = 'none';
    }
  }

  createNewRenpyWorkspace() {
    this.renpyWorkspaceCount++;
    const newId = `renpy_ws_${Date.now()}`;
    this.renpyWorkspaces[newId] = {
      id: newId, title: `RenPy WS ${this.renpyWorkspaceCount}`, gamePath: '', files: [], selectedFileIndex: -1, isTranslating: false, activeView: 'filelist', currentPage: 1, linesPerPage: 100, renpyFilterMode: 'all'
    };
    this.activeRenpyWorkspaceId = newId;
    this.saveWorkspacesState();
    this.renderRenpyTabs(); this.refreshRenpyWorkspaceUI();
    this.showToast('info', `Đã tạo ${this.renpyWorkspaces[newId].title}`);
  }

  renderRenpyTabs() {
    const tabsContainer = document.getElementById('renpy-tabs-list');
    if (!tabsContainer) return;

    tabsContainer.innerHTML = Object.values(this.renpyWorkspaces).map(ws => `
      <div class="workspace-tab ${ws.id === this.activeRenpyWorkspaceId ? 'active' : ''}" data-id="${ws.id}">
        <i class="fa-solid fa-book-open tab-icon"></i>
        <span class="tab-title">${ws.title}</span>
        <span class="tab-status-dot ${ws.isTranslating ? 'busy' : ''}"></span>
        <i class="fa-solid fa-xmark btn-delete-tab" title="Xóa Workspace" data-id="${ws.id}"></i>
      </div>
    `).join('');

    tabsContainer.querySelectorAll('.workspace-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (id !== this.activeRenpyWorkspaceId) {
          this.activeRenpyWorkspaceId = id; this.saveWorkspacesState(); this.renderRenpyTabs(); this.refreshRenpyWorkspaceUI();
        }
      });
    });

    tabsContainer.querySelectorAll('.btn-delete-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.getAttribute('data-id');
        if (Object.keys(this.renpyWorkspaces).length <= 1) {
          this.showToast('warning', 'Không thể xóa Workspace Ren\'Py duy nhất còn lại!');
          return;
        }
        const targetWs = this.renpyWorkspaces[id];
        if (confirm(`Bạn có chắc chắn muốn xóa ${targetWs.title}? Dữ liệu chưa xuất sẽ bị xóa khỏi ứng dụng.`)) {
          delete this.renpyWorkspaces[id];
          if (this.activeRenpyWorkspaceId === id) {
            this.activeRenpyWorkspaceId = Object.keys(this.renpyWorkspaces)[0];
          }
          this.saveWorkspacesState();
          this.renderRenpyTabs();
          this.refreshRenpyWorkspaceUI();
          this.showToast('success', `Đã xóa thành công ${targetWs.title}!`);
        }
      });
    });
  }

  updateRenpyTabStatus(wsId, status) {
    const ws = this.renpyWorkspaces[wsId];
    if (!ws) return;
    ws.isTranslating = (status === 'busy'); this.renderRenpyTabs();
  }

  async importRenpyFile() {
    const ws = this.currentRenpyWorkspace;
    const result = await ipcRenderer.invoke('select-file', {
      filters: [{ name: 'RenPy Script', extensions: ['rpy'] }]
    });
    if (result.canceled || result.filePaths.length === 0) return;

    const selectedPath = result.filePaths[0];
    const fileObj = {
      name: path.basename(selectedPath),
      fullPath: selectedPath,
      relativePath: path.basename(selectedPath)
    };

    if (!ws.gamePath) {
      ws.gamePath = path.dirname(selectedPath);
      ws.title = path.basename(ws.gamePath);
    }

    this.showToast('info', `Đang đọc file .rpy: ${fileObj.name}`, ws.id);

    const fileRes = await ipcRenderer.invoke('read-file', fileObj.fullPath);
    if (fileRes.success) {
      // Đọc file sidecar chứa bản gốc (nếu có)
      let sidecarData = null;
      const sidecarRes = await ipcRenderer.invoke('read-file', fileObj.fullPath + '.orig.json');
      if (sidecarRes.success) {
         try { sidecarData = JSON.parse(sidecarRes.content); } catch(e) { console.error('Lỗi parse sidecar', e); }
      }

      const parseRes = window.renpyParser.parseLines(fileRes.content, fileObj.name, sidecarData);
      if (parseRes.success && parseRes.events.length > 0) {
        const existingIdx = ws.files.findIndex(f => f.path === fileObj.fullPath);
        const newFileData = {
          name: fileObj.name,
          relativePath: fileObj.relativePath,
          path: fileObj.fullPath,
          content: fileRes.content,
          rawLines: parseRes.rawLines,
          events: parseRes.events,
          status: 'wait'
        };

        if (existingIdx >= 0) {
           ws.files[existingIdx] = newFileData;
        } else {
           ws.files.push(newFileData);
        }
        
        ws.selectedFileIndex = existingIdx >= 0 ? existingIdx : ws.files.length - 1;
        ws.currentPage = 1;
        await this.saveWorkspaceCache(ws);
        this.renderRenpyTabs(); this.refreshRenpyWorkspaceUI();
        this.showToast('success', `Đã import thành công file ${fileObj.name}!`, ws.id);
        this.switchRenpySubView('filelist');
      } else {
        this.showToast('warning', `File ${fileObj.name} không chứa câu thoại nào hợp lệ!`, ws.id);
      }
    } else {
       this.showToast('error', `Lỗi đọc file: ${fileRes.error}`, ws.id);
    }
  }

  async importRenpyGame() {
    const ws = this.currentRenpyWorkspace;
    const result = await ipcRenderer.invoke('select-directory');
    if (result.canceled || result.filePaths.length === 0) return;

    const selectedPath = result.filePaths[0];
    let targetGameDir = selectedPath;

    const gameFolderExists = await ipcRenderer.invoke('check-exists', path.join(selectedPath, 'game'));
    if (gameFolderExists) targetGameDir = path.join(selectedPath, 'game');

    this.showToast('info', `Đang quét toàn bộ file .rpy từ: ${targetGameDir}`, ws.id);
    const dirResult = await ipcRenderer.invoke('read-dir-recursive', targetGameDir);

    if (!dirResult.success) { this.showToast('error', `Lỗi đọc thư mục Ren'Py: ${dirResult.error}`, ws.id); return; }

    const rpyFiles = dirResult.files.filter(f => f.name.endsWith('.rpy'));
    ws.gamePath = targetGameDir; ws.title = path.basename(selectedPath); ws.files = [];

    for (const fileObj of rpyFiles) {
      const fileRes = await ipcRenderer.invoke('read-file', fileObj.fullPath);
      if (fileRes.success) {
        // Đọc file sidecar chứa bản gốc (nếu có)
        let sidecarData = null;
        const sidecarRes = await ipcRenderer.invoke('read-file', fileObj.fullPath + '.orig.json');
        if (sidecarRes.success) {
           try { sidecarData = JSON.parse(sidecarRes.content); } catch(e) {}
        }

        const parseRes = window.renpyParser.parseLines(fileRes.content, fileObj.name, sidecarData);
        if (parseRes.success && parseRes.events.length > 0) {
          ws.files.push({
            name: fileObj.name,
            relativePath: fileObj.relativePath,
            path: fileObj.fullPath,
            content: fileRes.content,
            rawLines: parseRes.rawLines,
            events: parseRes.events,
            status: 'wait'
          });
        }
      }
    }

    ws.selectedFileIndex = ws.files.length > 0 ? 0 : -1;
    ws.currentPage = 1;
    await this.saveWorkspaceCache(ws);
    this.renderRenpyTabs(); this.refreshRenpyWorkspaceUI();
    this.showToast('success', `Đã tải thành công ${ws.files.length} file .rpy chứa thoại!`, ws.id);
    this.switchRenpySubView('filelist');
  }

  refreshRenpyWorkspaceUI() {
    const ws = this.currentRenpyWorkspace;
    const fileTbody = document.getElementById('renpy-file-list-tbody');
    if (ws.files.length === 0) {
      if (fileTbody) fileTbody.innerHTML = `<tr><td colspan="5" class="text-center empty-table">Chưa import game Ren'Py nào. Hãy nhấn Import Ren'Py Game (F4) để bắt đầu.</td></tr>`;
      return;
    }
    this.renderRenpyFileList(); this.renderRenpyTranslationTable();
  }

  renderRenpyFileList() {
    const ws = this.currentRenpyWorkspace;
    const tbody = document.getElementById('renpy-file-list-tbody');
    if (!tbody) return;

    const searchVal = (document.getElementById('renpy-search-file-input')?.value || '').toLowerCase();
    const filteredFiles = ws.files.filter(f => f.relativePath.toLowerCase().includes(searchVal));

    if (filteredFiles.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center empty-table">Không tìm thấy file .rpy nào khớp với từ khóa.</td></tr>`; return;
    }

    tbody.innerHTML = filteredFiles.map((f) => {
      const actualIndex = ws.files.findIndex(item => item.path === f.path);
      const statusHtml = f.status === 'done' 
        ? `<span class="status-tag done"><i class="fa-solid fa-check"></i> Hoàn thành</span>` 
        : `<span class="status-tag wait"><i class="fa-solid fa-clock"></i> Chưa dịch</span>`;

      return `
        <tr>
          <td class="col-checkbox" style="text-align: center;">
            <input type="checkbox" class="file-select-cb" data-index="${actualIndex}">
          </td>
          <td class="col-file-name">${f.relativePath}</td>
          <td class="col-event-count">${f.events.length} Dòng thoại (Line-by-line)</td>
          <td class="col-status">${statusHtml}</td>
          <td class="col-actions">
            <button class="btn btn-icon renpy-btn-open-translate" data-index="${actualIndex}"><i class="fa-solid fa-eye"></i> Mở Dịch</button>
          </td>
        </tr>
      `;
    }).join('');

    // Xử lý Checkbox Chọn Tất Cả Ren'Py
    const selectAllCb = document.getElementById('renpy-select-all-files');
    const updateDeleteBtn = () => {
      const renpyBtnDeleteSelected = document.getElementById('renpy-btn-delete-selected');
      if (renpyBtnDeleteSelected) {
        const anyChecked = Array.from(tbody.querySelectorAll('.file-select-cb')).some(cb => cb.checked);
        renpyBtnDeleteSelected.style.display = anyChecked ? 'inline-flex' : 'none';
      }
    };

    if (selectAllCb) {
      selectAllCb.checked = false;
      selectAllCb.onchange = (e) => {
        tbody.querySelectorAll('.file-select-cb').forEach(cb => cb.checked = e.target.checked);
        updateDeleteBtn();
      };
    }

    tbody.querySelectorAll('.file-select-cb').forEach(cb => {
      cb.addEventListener('change', updateDeleteBtn);
    });

    tbody.querySelectorAll('.renpy-btn-open-translate').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        ws.selectedFileIndex = idx; ws.currentPage = 1; this.saveWorkspacesState(); this.renderRenpyTranslationTable();
        const tabTranslationView = document.getElementById('renpy-tab-translation-view');
        if (tabTranslationView) tabTranslationView.style.display = 'inline-flex';
        this.switchRenpySubView('translation');
      });
    });
  }

  renderRenpyTranslationTable() {
    const ws = this.currentRenpyWorkspace;
    const tbody = document.getElementById('renpy-translation-tbody');
    const headerTitle = document.getElementById('renpy-current-translating-file');
    const pageInput = document.getElementById('renpy-current-page-input');
    const totalPagesInfo = document.getElementById('renpy-total-pages-info');
    const filterSelect = document.getElementById('renpy-filter-mode');
    if (!tbody || ws.selectedFileIndex < 0) return;

    if (filterSelect) filterSelect.value = ws.renpyFilterMode || 'all';

    const currentFile = ws.files[ws.selectedFileIndex];
    if (headerTitle) headerTitle.textContent = `Tên File: ${currentFile.relativePath}`;
    
    let eventsToDisplay = currentFile.events;
    if (ws.renpyFilterMode === 'untranslated') {
      eventsToDisplay = currentFile.events.filter(ev => !ev.translation || ev.translation.trim() === '');
    } else if (ws.renpyFilterMode === 'suspected_english') {
      const vietnameseRegex = /[áàảãạâấầẩẫậăắằẳẵặđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ]/i;
      eventsToDisplay = currentFile.events.filter(ev => {
        const isUntranslated = (!ev.translation || ev.translation.trim() === '');
        const isEnglish = !vietnameseRegex.test(ev.original);
        return isUntranslated && isEnglish;
      });
    }

    if (ws.renpySearchQuery) {
      const query = ws.renpySearchQuery;
      eventsToDisplay = eventsToDisplay.filter(ev => {
        const speakerMatch = ev.speaker && ev.speaker.toLowerCase().includes(query);
        const originalMatch = ev.original && ev.original.toLowerCase().includes(query);
        const transMatch = ev.translation && ev.translation.toLowerCase().includes(query);
        const idMatch = ev.id && ev.id.toLowerCase().includes(query);
        return speakerMatch || originalMatch || transMatch || idMatch;
      });
    }

    // Tính toán phân trang
    const totalEvents = eventsToDisplay.length;
    const linesPerPage = ws.linesPerPage || 100;
    const totalPages = Math.ceil(totalEvents / linesPerPage) || 1;
    if (ws.currentPage > totalPages) ws.currentPage = totalPages;
    if (ws.currentPage < 1) ws.currentPage = 1;

    if (pageInput) pageInput.value = ws.currentPage;
    if (totalPagesInfo) totalPagesInfo.textContent = `/ ${totalPages}`;

    const startIndex = (ws.currentPage - 1) * linesPerPage;
    const endIndex = Math.min(startIndex + linesPerPage, totalEvents);
    const paginatedEvents = eventsToDisplay.slice(startIndex, endIndex);

    tbody.innerHTML = paginatedEvents.map(ev => `
      <tr id="renpy-row-${ev.id}">
        <td class="col-checkbox" style="text-align: center;">
            <input type="checkbox" class="trans-select-cb" data-id="${ev.id}" ${ev._manualChecked ? 'checked' : ''}>
        </td>
        <td class="col-event-id">${ev.id}<br><small class="text-highlight">${ev.speaker ? `Speaker: ${ev.speaker}` : 'Narrator'}</small></td>
        <td class="col-original-text">${ev.original}</td>
        <td class="col-translated-text">
          <textarea class="editable-translation renpy-editable-translation" data-id="${ev.id}">${ev.translation}</textarea>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.renpy-editable-translation').forEach(textarea => {
      setTimeout(() => this.autoResizeTextarea(textarea), 10);
      textarea.addEventListener('input', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const ev = currentFile.events.find(item => item.id === id);
        if (ev) { ev.translation = e.currentTarget.value; this.saveWorkspaceCache(ws); }
        this.autoResizeTextarea(e.currentTarget);
      });
    });

    const selectAllCb = document.getElementById('renpy-trans-select-all');
    if (selectAllCb) {
      selectAllCb.checked = paginatedEvents.length > 0 && paginatedEvents.every(ev => ev._manualChecked);
      selectAllCb.onchange = (e) => {
        const isChecked = e.target.checked;
        paginatedEvents.forEach(ev => ev._manualChecked = isChecked);
        const cbs = tbody.querySelectorAll('.trans-select-cb');
        cbs.forEach(cb => cb.checked = isChecked);
      };
    }

    tbody.querySelectorAll('.trans-select-cb').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        const ev = currentFile.events.find(item => item.id === id);
        if (ev) {
          ev._manualChecked = e.target.checked;
        }
        if (selectAllCb) {
           selectAllCb.checked = paginatedEvents.every(item => item._manualChecked);
        }
      });
    });
  }

  // TIẾN TRÌNH DỊCH GỘP BATCH CHO REN'PY (HỖ TRỢ GIỚI HẠN BATCH & DỪNG DỊCH)
  // [CẬP NHẬT MỚI]: Luồng 2 bước cho TỪNG BATCH: Tiêm toàn bộ prompt mặc định & trích xuất liên tục trước mỗi batch
  async startAiTranslationRenpy() {
    const ws = this.currentRenpyWorkspace;
    if (ws.selectedFileIndex < 0) { this.showToast('error', 'Hãy chọn một file từ Danh Sách File .rpy để dịch.', ws.id); return; }
    if (ws.isTranslating) { this.showToast('warning', 'Workspace Ren\'Py này đang trong tiến trình dịch ngầm.', ws.id); return; }

    const currentFile = ws.files[ws.selectedFileIndex];
    const wsId = ws.id; this.updateRenpyTabStatus(wsId, 'busy');

    const btnAiTranslate = document.getElementById('renpy-btn-ai-translate');
    const btnStopTranslate = document.getElementById('renpy-btn-stop-translate');
    if (btnAiTranslate) btnAiTranslate.style.display = 'none';
    if (btnStopTranslate) btnStopTranslate.style.display = 'inline-flex';

    const batchSizeInput = document.getElementById('renpy-batch-size');
    const maxBatchesInput = document.getElementById('renpy-max-batches');
    const batchSize = batchSizeInput ? (parseInt(batchSizeInput.value, 10) || 50) : 50;
    const maxBatches = maxBatchesInput ? (parseInt(maxBatchesInput.value, 10) || 0) : 0;
    
    // ƯU TIÊN 1: Lấy danh sách các dòng ĐƯỢC TÍCH CHỌN THỦ CÔNG TRONG TOÀN BỘ FILE
    const checkedEvents = currentFile.events.filter(ev => ev._manualChecked);
    let targetEvents = [];
    
    if (checkedEvents.length > 0) {
        // Chỉ dịch những dòng được tích
        targetEvents = checkedEvents;
        this.showToast('info', `Đã tìm thấy ${targetEvents.length} dòng được tích chọn thủ công. Sẽ chỉ dịch các dòng này!`, wsId);
    } else {
        // ƯU TIÊN 2: Dịch các dòng đang hiển thị theo bộ lọc
        targetEvents = currentFile.events;
        if (ws.renpyFilterMode === 'untranslated') {
            targetEvents = currentFile.events.filter(ev => !ev.translation || ev.translation.trim() === '');
        } else if (ws.renpyFilterMode === 'suspected_english') {
            const vietnameseRegex = /[áàảãạâấầẩẫậăắằẳẵặđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ]/i;
            targetEvents = currentFile.events.filter(ev => {
                return (!ev.translation || ev.translation.trim() === '') && !vietnameseRegex.test(ev.original);
            });
        }

        if (ws.renpySearchQuery) {
            const query = ws.renpySearchQuery;
            targetEvents = targetEvents.filter(ev => {
                const speakerMatch = ev.speaker && ev.speaker.toLowerCase().includes(query);
                const originalMatch = ev.original && ev.original.toLowerCase().includes(query);
                const transMatch = ev.translation && ev.translation.toLowerCase().includes(query);
                const idMatch = ev.id && ev.id.toLowerCase().includes(query);
                return speakerMatch || originalMatch || transMatch || idMatch;
            });
        }

        // BẢO VỆ TUYỆT ĐỐI CÔNG SỨC: Không bao giờ AI tự ý ghi đè lên các câu người dùng đã sửa tay hoặc đã bấm bỏ qua
        targetEvents = targetEvents.filter(ev => !ev.manualEdited && !ev.isSkipped);
        
        if (targetEvents.length === 0) {
            this.showToast('info', 'Không có dòng nào phù hợp với điều kiện để dịch.', wsId);
            if (btnStopTranslate) btnStopTranslate.style.display = 'none';
            if (btnAiTranslate) btnAiTranslate.style.display = 'inline-flex';
            this.updateRenpyTabStatus(wsId, 'stopped');
            return;
        }
    }
    
    const totalEvents = targetEvents.length;
    const totalBatches = Math.ceil(totalEvents / batchSize);
    let batchesProcessed = 0;

    this.showToast('info', `Bắt đầu tiến trình dịch Batch AI 2 bước (Tiêm Prompt & Trích xuất liên tục trước mỗi Batch)...`, wsId);

    for (let i = 0; i < totalEvents; i += batchSize) {
      if (!this.renpyWorkspaces[wsId].isTranslating) {
        this.showToast('warning', 'Tiến trình dịch đã được dừng lại bởi người dùng.', wsId);
        break;
      }
      const batchEvents = targetEvents.slice(i, i + batchSize);
      const currentBatchNum = Math.floor(i / batchSize) + 1;

      // [RESUME THÔNG MINH] Kiểm tra xem TOÀN BỘ batch này đã được dịch chưa
      const isBatchFullyTranslated = batchEvents.every(ev => ev.translation && ev.translation.trim() !== '');
      if (isBatchFullyTranslated) {
        console.log(`[Batch ${currentBatchNum}] Đã dịch đủ, tự động bỏ qua (Skip).`);
        continue; // Nhảy cóc ngay sang Batch tiếp theo!
      }

      // BƯỚC 1 CỦA BATCH: TIÊM TOÀN BỘ PROMPT MẶC ĐỊNH & TRÍCH XUẤT THUẬT NGỮ, NHÂN VẬT CHO LÔ NÀY
      this.showToast('info', `[Batch ${currentBatchNum}/${totalBatches}] Đang tiêm toàn bộ Prompt mặc định & bóc tách Thuật ngữ/Nhân vật...`, wsId);
      let batchTextSample = "";
      for (const ev of batchEvents) {
        batchTextSample += `\n[Speaker: ${ev.speaker || 'Narrator'}] ${ev.original}`;
      }

      await new Promise((resolve) => {
        window.apiManager.extractRenpyInfoAI(
          batchTextSample,
          (extractedData) => {
            const added = window.renpyTerminologyManager.mergeAiExtractedData(extractedData);
            if (added.termCount > 0 || added.charCount > 0 || added.updateCount > 0) {
              this.showToast('success', `[Batch ${currentBatchNum}] AI đã tự động bổ sung ${added.termCount} thuật ngữ & ${added.charCount} nhân vật mới (Cập nhật ${added.updateCount} thông tin cũ)!`, wsId);
            }
            resolve();
          },
          (errMsg) => { this.showToast('warning', `[Batch ${currentBatchNum}] Bỏ qua bóc tách tự động: ${errMsg}. Đang tiến hành dịch...`, wsId); resolve(); }
        );
      });

      if (!this.renpyWorkspaces[wsId].isTranslating) break;

      // BƯỚC 2 CỦA BATCH: TIẾN HÀNH DỊCH GỘP BATCH SỬ DỤNG BỘ THUẬT NGỮ & NHÂN VẬT VỪA CẬP NHẬT
      let retryCount = 0;
      let batchSuccess = false;

      while (retryCount < 3 && !batchSuccess && this.renpyWorkspaces[wsId].isTranslating) {
        this.showToast('info', `[Batch ${currentBatchNum}/${totalBatches}] Đang tiến hành dịch sang tiếng Việt...${retryCount > 0 ? ` (Thử lại lần ${retryCount}/3)` : ''}`, wsId);

        // Cập nhật khay tiến trình AI nổi
        const drawerTitle = document.getElementById('drawer-title-status');
        const drawerBatchBadge = document.getElementById('drawer-batch-badge');
        const drawerFile = document.getElementById('drawer-current-file');
        const drawerLog = document.getElementById('drawer-log-box');
        if (drawerTitle) drawerTitle.textContent = `Tiến trình AI: Đang dịch lô ${currentBatchNum}/${totalBatches}`;
        if (drawerBatchBadge) drawerBatchBadge.textContent = `Lô ${currentBatchNum}/${totalBatches}`;
        if (drawerFile) drawerFile.textContent = currentFile.fileName;
        if (drawerLog) {
          const entry = document.createElement('div');
          entry.className = 'log-entry';
          entry.textContent = `[${new Date().toLocaleTimeString()}] Đang dịch lô ${currentBatchNum}/${totalBatches} (${batchEvents.length} dòng)`;
          drawerLog.appendChild(entry);
          drawerLog.scrollTop = drawerLog.scrollHeight;
        }
        if (window.studioManager) {
          window.studioManager.updateStudioProgressBar();
        }

        await new Promise((resolve) => {
          window.apiManager.translateBatchRenpy(
            batchEvents,
            (translatedItems) => {
              translatedItems.forEach(item => {
                const ev = currentFile.events.find(e => e.id === item.id);
                if (ev) {
                  ev.translation = item.translation;
                  ev._manualChecked = false; // Bỏ tích chọn sau khi dịch xong
                  
                  if (this.activeRenpyWorkspaceId === wsId) {
                    const textarea = document.querySelector(`textarea.renpy-editable-translation[data-id="${ev.id}"]`);
                    if (textarea) { textarea.value = item.translation; this.autoResizeTextarea(textarea); }
                    
                    const checkbox = document.querySelector(`input.trans-select-cb[data-id="${ev.id}"]`);
                    if (checkbox) checkbox.checked = false;
                  }
                }
              });
              
              if (this.activeRenpyWorkspaceId === wsId) {
                const selectAllCb = document.getElementById('renpy-trans-select-all');
                if (selectAllCb) selectAllCb.checked = false;
              }
              
              this.saveWorkspaceCache(this.renpyWorkspaces[wsId]);
              batchSuccess = true;
              resolve();
            },
            (errMsg) => { 
              this.showToast('error', `[Batch ${currentBatchNum}] Lỗi dịch: ${errMsg}`, wsId); 
              retryCount++;
              resolve(); 
            }
          );
        });

        if (!batchSuccess && this.renpyWorkspaces[wsId].isTranslating && retryCount < 3) {
          // Delay 2s trước khi thử lại để tránh spam API
          await new Promise(res => setTimeout(res, 2000));
        }
      }

      if (!batchSuccess) {
        this.showToast('warning', `[Batch ${currentBatchNum}] Dịch thất bại sau 3 lần thử. Tự động bỏ qua batch này và tiếp tục...`, wsId);
      }

      batchesProcessed++;
      if (maxBatches > 0 && batchesProcessed >= maxBatches) {
        this.showToast('info', `Đã hoàn thành giới hạn dịch ${maxBatches} batch. Tạm dừng tiến trình!`, wsId);
        break;
      }
    }

    if (this.renpyWorkspaces[wsId].isTranslating && (maxBatches === 0 || batchesProcessed < maxBatches)) {
      currentFile.status = 'done'; this.updateRenpyTabStatus(wsId, 'done'); this.renderRenpyFileList();
      this.showToast('success', `Hoàn thành dịch gộp Batch AI cho file ${currentFile.relativePath}!`, wsId);
    } else {
      this.updateRenpyTabStatus(wsId, 'stopped');
    }

    if (btnStopTranslate) btnStopTranslate.style.display = 'none';
    if (btnAiTranslate) btnAiTranslate.style.display = 'inline-flex';
  }

  // CƠ CHẾ XUẤT FILE HÀNG LOẠT (BATCH EXPORT) BẰNG CHECKBOX CHO REN'PY
  async exportCurrentRenpyFile() {
    const ws = this.currentRenpyWorkspace;
    // BƯỚC 1: Lấy danh sách các Checkbox đã tích chọn trong Danh Sách File Ren'Py
    const selectedIndexes = Array.from(document.querySelectorAll('#renpy-view-filelist .file-select-cb:checked'))
      .map(cb => parseInt(cb.getAttribute('data-index'), 10));

    // BƯỚC 2: Nếu có chọn checkbox, tiến hành xuất hàng loạt
    if (selectedIndexes.length > 0) {
      this.showToast('info', `Đang xuất hàng loạt ${selectedIndexes.length} file script Ren'Py...`, ws.id);
      let successCount = 0;

      for (const idx of selectedIndexes) {
        const fileObj = ws.files[idx];
        const updatedRPY = window.renpyParser.reconstructRPY(fileObj.rawLines, fileObj.events);
        const writeRes = await ipcRenderer.invoke('write-file', fileObj.path, updatedRPY);
        if (writeRes.success) {
          successCount++;
          // Cập nhật trạng thái thành done nếu có lưu thành công
          fileObj.status = 'done';
          
          // Lưu file sidecar backup tiếng anh
          const sidecarData = {};
          fileObj.events.forEach(ev => { sidecarData[ev.id] = ev.original; });
          await ipcRenderer.invoke('write-file', fileObj.path + '.orig.json', JSON.stringify(sidecarData, null, 2));
        }
      }

      this.showToast('success', `Đã lưu & xuất thành công ${successCount} file script Ren'Py được chọn!`, ws.id);
      return;
    }

    // BƯỚC 3: Nếu không chọn checkbox nào, kiểm tra xem có đang mở file trong Bảng Dịch Thuật không
    if (ws.selectedFileIndex >= 0) {
      const currentFile = ws.files[ws.selectedFileIndex];
      const updatedRPY = window.renpyParser.reconstructRPY(currentFile.rawLines, currentFile.events);

      const writeRes = await ipcRenderer.invoke('write-file', currentFile.path, updatedRPY);
      if (writeRes.success) {
         currentFile.status = 'done';
         this.renderRenpyFileList(); // Update trạng thái Checkmark

         // Lưu file sidecar backup tiếng anh
         const sidecarData = {};
         currentFile.events.forEach(ev => { sidecarData[ev.id] = ev.original; });
         await ipcRenderer.invoke('write-file', currentFile.path + '.orig.json', JSON.stringify(sidecarData, null, 2));

         this.showToast('success', `Đã lưu & xuất script Ren'Py thành công vào: ${currentFile.path}`, ws.id);
      } else {
         this.showToast('error', `Lỗi lưu file Ren'Py: ${writeRes.error}`, ws.id);
      }
      return;
    }

    // Nếu không có cả hai, hiển thị cảnh báo
    this.showToast('warning', 'Hãy tích chọn các file script trong Danh Sách File hoặc mở một file để xuất.', ws.id);
  }

  // ==========================================
  // TIỆN ÍCH CHUNG
  // ==========================================
  showToast(type, message, wsId = null) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-xmark';

    let wsTitle = wsId;
    if (this.workspaces[wsId]) wsTitle = this.workspaces[wsId].title;
    else if (this.renpyWorkspaces[wsId]) wsTitle = this.renpyWorkspaces[wsId].title;

    const wsTag = wsId ? `<div class="toast-workspace-tag">[${wsTitle}]</div>` : '';

    toast.innerHTML = `
      <i class="fa-solid ${icon} toast-icon"></i>
      <div class="toast-content">
        ${wsTag}
        <div>${message}</div>
      </div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

window.appManager = new AppManager();
