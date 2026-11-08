// =============================================================================
// STUDIO MANAGER: ĐIỀU PHỐI GIAO DIỆN PROJECT HUB & BÀN DỊCH THUẬT STUDIO
// Chuẩn thiết kế Vân Thư Cẩm Uyên: Dark Teal Grid, 4 Tab Studio, Lọc Label/Event,
// Thống kê Token, Kiểm tra an toàn, Khóa sửa tay & Nhập/Xuất CSV
// =============================================================================

class StudioManager {
  constructor(appManager) {
    this.app = appManager;
    this.currentProjectEngine = 'renpy'; // 'renpy' hoặc 'rpgmaker'
    this.currentProjectId = 'renpy_default';
    this.activeStudioTab = 'dialogue'; // 'dialogue', 'characters', 'terms', 'settings'
    this.filterEventLabel = '';
    this.filterStatus = 'all';
    this.filterFileScope = 'current';
    this.searchText = '';
    this.selectedLineIds = new Set();
    this.isDrawerExpanded = false;

    this.init();
  }

  init() {
    this.bindEvents();
    // Khởi tạo Project Hub ban đầu
    this.renderProjectHub();
  }

  // Lấy dữ liệu Workspace / Dự án hiện tại
  get currentProject() {
    if (this.currentProjectEngine === 'renpy') {
      return this.app.renpyWorkspaces[this.currentProjectId] || this.app.currentRenpyWorkspace;
    } else {
      return this.app.workspaces[this.currentProjectId] || this.app.currentWorkspace;
    }
  }

  // Lấy file đang được chọn trong dự án
  get currentFile() {
    const proj = this.currentProject;
    if (!proj || !proj.files || proj.selectedFileIndex < 0 || proj.selectedFileIndex >= proj.files.length) {
      return null;
    }
    return proj.files[proj.selectedFileIndex];
  }

  // ===========================================================================
  // 1. TRUNG TÂM DỰ ÁN (PROJECT HUB / DASHBOARD)
  // ===========================================================================
  renderProjectHub() {
    const gridEl = document.getElementById('project-cards-grid');
    const countEl = document.getElementById('hub-project-count');
    if (!gridEl) return;

    gridEl.innerHTML = '';
    const allProjects = [];

    // Gom toàn bộ dự án Ren'Py
    if (this.app.renpyWorkspaces) {
      for (const [id, ws] of Object.entries(this.app.renpyWorkspaces)) {
        allProjects.push({ ...ws, engine: 'renpy' });
      }
    }

    // Gom toàn bộ dự án RPGMaker
    if (this.app.workspaces) {
      for (const [id, ws] of Object.entries(this.app.workspaces)) {
        allProjects.push({ ...ws, engine: 'rpgmaker' });
      }
    }

    if (countEl) {
      countEl.textContent = `${allProjects.length} dự án đang quản lý`;
    }

    if (allProjects.length === 0) {
      gridEl.innerHTML = `
        <div class="empty-state-studio" style="grid-column: 1 / -1; padding: 40px;">
          <i class="fa-solid fa-gamepad empty-icon"></i>
          <p>Chưa có dự án nào được tạo. Hãy nhấn <strong>+ Dự án Ren'Py</strong> hoặc <strong>+ Dự án RPGMaker</strong> ở góc trên để bắt đầu!</p>
        </div>
      `;
      return;
    }

    allProjects.forEach(proj => {
      // Đếm số dòng đã dịch và tổng số dòng
      let totalLines = 0;
      let translatedLines = 0;
      let errorLines = 0;

      if (proj.files && Array.isArray(proj.files)) {
        proj.files.forEach(f => {
          if (f.events && Array.isArray(f.events)) {
            totalLines += f.events.length;
            f.events.forEach(ev => {
              if (ev.translation && ev.translation.trim() !== '') translatedLines++;
              if (ev.hasError) errorLines++;
            });
          }
        });
      }

      const percent = totalLines > 0 ? Math.round((translatedLines / totalLines) * 100) : 0;
      const engineName = proj.engine === 'renpy' ? "Ren'Py (.rpy)" : "RPG Maker (JSON)";
      const isLive = proj.isTranslating;

      const card = document.createElement('div');
      card.className = 'project-card';
      card.innerHTML = `
        <div>
          <div class="card-top">
            <div class="card-icon"><i class="fa-solid fa-gamepad"></i></div>
            <span class="tag-pill engine">${engineName}</span>
          </div>
          <div class="card-info">
            <h4>${proj.title || 'Dự án không tên'}</h4>
            <div class="card-tags">
              <span class="tag-pill">${proj.files ? proj.files.length : 0} file</span>
              <span class="tag-pill">${isLive ? '<span class="pulse-ring" style="display:inline-block; margin-right:4px;"></span>Đang dịch AI' : 'Sẵn sàng'}</span>
              ${errorLines > 0 ? `<span class="tag-pill" style="color:#f87171; border-color:rgba(239,68,68,0.4);">${errorLines} lỗi</span>` : ''}
            </div>
          </div>
        </div>
        <div class="card-progress-box">
          <div class="card-progress-labels">
            <span>Tiến độ: ${translatedLines}/${totalLines} dòng</span>
            <span style="font-weight:700; color:${percent === 100 ? '#1ae6a2' : '#94a3b8'};">${percent}%</span>
          </div>
          <div class="card-progress-track">
            <div class="card-progress-fill" style="width: ${percent}%;"></div>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.openStudio(proj.id, proj.engine);
      });

      gridEl.appendChild(card);
    });
  }

  // Chuyển sang màn hình Trung Tâm Dự Án
  openProjectHub() {
    const pages = document.querySelectorAll('.page-section');
    pages.forEach(p => p.classList.remove('active'));
    const hubPage = document.getElementById('page-hub');
    if (hubPage) hubPage.classList.add('active');

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(n => n.classList.remove('active'));
    const hubNav = document.querySelector('.nav-item[data-page="hub"]');
    if (hubNav) hubNav.classList.add('active');

    this.renderProjectHub();
  }

  // Mở Bàn Làm Việc Studio cho một dự án cụ thể
  openStudio(projectId, engine = 'renpy') {
    this.currentProjectId = projectId;
    this.currentProjectEngine = engine;

    if (engine === 'renpy') {
      this.app.activeRenpyWorkspaceId = projectId;
    } else {
      this.app.activeWorkspaceId = projectId;
    }

    const pages = document.querySelectorAll('.page-section');
    pages.forEach(p => p.classList.remove('active'));
    const studioPage = document.getElementById('page-studio');
    if (studioPage) studioPage.classList.add('active');

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(n => n.classList.remove('active'));
    const studioNav = document.querySelector('.nav-item[data-page="studio"]');
    if (studioNav) studioNav.classList.add('active');

    this.refreshStudioUI();
  }

  // ===========================================================================
  // 2. BÀN LÀM VIỆC STUDIO (4 TABS & KHÔNG GIAN DỊCH THUẬT)
  // ===========================================================================
  refreshStudioUI() {
    const proj = this.currentProject;
    if (!proj) return;

    // Cập nhật tiêu đề và thông tin dự án ở thanh Header
    const titleEl = document.getElementById('studio-project-title');
    const subtitleEl = document.getElementById('studio-project-subtitle');
    const statusEl = document.getElementById('studio-project-status');
    const fileCount = proj.files ? proj.files.length : 0;
    const engineName = this.currentProjectEngine === 'renpy' ? "Ren'Py" : "RPG Maker";

    if (titleEl) titleEl.textContent = proj.title || 'Dự Án Game';
    if (subtitleEl) subtitleEl.textContent = `Việt hoá game · ${fileCount} file · ${engineName}`;
    if (statusEl) {
      if (proj.isTranslating) {
        statusEl.textContent = 'Đang dịch AI';
        statusEl.style.color = '#1ae6a2';
        statusEl.style.borderColor = 'rgba(26,230,162,0.4)';
      } else {
        statusEl.textContent = 'Sẵn sàng';
        statusEl.style.color = '#94a3b8';
        statusEl.style.borderColor = 'rgba(255,255,255,0.1)';
      }
    }

    // Cập nhật huy hiệu số lượng trên 4 Tab
    this.updateTabBadges();

    // Hiển thị danh sách file ở cột trái
    this.renderStudioFilesList();

    // Hiển thị bảng dịch ở cột phải
    this.renderStudioTranslationTable();

    // Cập nhật thanh tiến độ tổng quát
    this.updateStudioProgressBar();
  }

  // Cập nhật số đếm trên các Tab
  updateTabBadges() {
    const charBadge = document.getElementById('badge-char-count');
    const termBadge = document.getElementById('badge-term-count');

    let charCount = 0;
    let termCount = 0;

    if (window.renpyTerminologyManager && window.renpyTerminologyManager.characters) {
      charCount = window.renpyTerminologyManager.characters.length;
    }
    if (window.renpyTerminologyManager && window.renpyTerminologyManager.terms) {
      termCount = window.renpyTerminologyManager.terms.length;
    } else if (window.terminologyManager && window.terminologyManager.terms) {
      termCount = window.terminologyManager.terms.length;
    }

    if (charBadge) charBadge.textContent = charCount;
    if (termBadge) termBadge.textContent = termCount;
  }

  // Hiển thị danh sách file ở cột trái
  renderStudioFilesList() {
    const container = document.getElementById('studio-file-items-list');
    const countEl = document.getElementById('studio-files-count');
    const proj = this.currentProject;
    if (!container || !proj) return;

    container.innerHTML = '';
    const files = proj.files || [];
    if (countEl) countEl.textContent = files.length;

    if (files.length === 0) {
      container.innerHTML = `<div class="empty-state-studio" style="height: 120px;"><p style="font-size: 11px;">Chưa có file nào.</p></div>`;
      return;
    }

    files.forEach((file, idx) => {
      let translated = 0;
      let errors = 0;
      const total = file.events ? file.events.length : 0;

      if (file.events) {
        file.events.forEach(ev => {
          if (ev.translation && ev.translation.trim() !== '') translated++;
          if (ev.hasError) errors++;
        });
      }

      const isActive = idx === proj.selectedFileIndex;
      const itemEl = document.createElement('div');
      itemEl.className = `studio-file-item ${isActive ? 'active' : ''}`;
      itemEl.innerHTML = `
        <div class="studio-file-name" title="${file.fileName}">${file.fileName}</div>
        <div class="studio-file-meta">
          <span>${translated}/${total} dòng</span>
          ${errors > 0 ? `<span style="color:#f87171; font-weight:700;">${errors} lỗi</span>` : `<span>${total > 0 && translated === total ? 'Xong' : ''}</span>`}
        </div>
      `;

      itemEl.addEventListener('click', () => {
        proj.selectedFileIndex = idx;
        proj.currentPage = 1;
        this.selectedLineIds.clear();
        this.refreshStudioUI();
      });

      container.appendChild(itemEl);
    });
  }

  // Hiển thị bảng dịch thuật ở cột phải
  renderStudioTranslationTable() {
    const container = document.getElementById('studio-translation-rows');
    const eventSelect = document.getElementById('studio-filter-event-label');
    const totalLinesLabel = document.getElementById('studio-total-lines-label');
    const curFile = this.currentFile;
    if (!container) return;

    container.innerHTML = '';
    if (!curFile || !curFile.events || curFile.events.length === 0) {
      container.innerHTML = `
        <div class="empty-state-studio">
          <i class="fa-solid fa-folder-open empty-icon"></i>
          <p>Chưa có file nào được mở hoặc file không có lời thoại. Hãy chọn một file từ danh sách bên trái để xem nội dung.</p>
        </div>
      `;
      if (totalLinesLabel) totalLinesLabel.textContent = '0 dòng';
      return;
    }

    // 1. Cập nhật Dropdown lọc theo Phân cảnh (Label / Event)
    if (eventSelect) {
      const currentSelected = eventSelect.value;
      const uniqueEvents = new Set();
      curFile.events.forEach(ev => {
        const lbl = ev.label || ev.context || (ev.code ? ev.code : '');
        if (lbl && lbl.trim()) uniqueEvents.add(lbl.trim());
      });

      eventSelect.innerHTML = `<option value="">Mọi phân cảnh / Label / Event</option>`;
      Array.from(uniqueEvents).sort().forEach(lbl => {
        const opt = document.createElement('option');
        opt.value = lbl;
        opt.textContent = lbl;
        if (lbl === currentSelected) opt.selected = true;
        eventSelect.appendChild(opt);
      });
    }

    // 2. Lọc danh sách dòng thoại theo các tiêu chí đa chiều
    let filtered = curFile.events.filter(ev => {
      // Lọc theo văn bản tìm kiếm
      if (this.searchText && this.searchText.trim()) {
        const q = this.searchText.trim().toLowerCase();
        const orig = (ev.original || '').toLowerCase();
        const trans = (ev.translation || '').toLowerCase();
        const spk = (ev.speaker || '').toLowerCase();
        const lbl = (ev.label || ev.context || '').toLowerCase();
        if (!orig.includes(q) && !trans.includes(q) && !spk.includes(q) && !lbl.includes(q)) {
          return false;
        }
      }

      // Lọc theo Phân cảnh (Label / Event)
      if (this.filterEventLabel && this.filterEventLabel.trim()) {
        const lbl = ev.label || ev.context || (ev.code ? ev.code : '');
        if (!lbl || !lbl.includes(this.filterEventLabel.trim())) {
          return false;
        }
      }

      // Lọc theo trạng thái
      if (this.filterStatus === 'untranslated') {
        return !ev.translation || ev.translation.trim() === '';
      } else if (this.filterStatus === 'translated') {
        return ev.translation && ev.translation.trim() !== '';
      } else if (this.filterStatus === 'error') {
        return !!ev.hasError;
      } else if (this.filterStatus === 'manual') {
        return !!ev.manualEdited;
      } else if (this.filterStatus === 'skipped') {
        return !!ev.isSkipped;
      } else if (this.filterStatus === 'suspected') {
        const vietnameseRegex = /[áàảãạâấầẩẫậăắằẳẵặđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ]/i;
        return (!ev.translation || ev.translation.trim() === '') && !vietnameseRegex.test(ev.original);
      }

      return true;
    });

    if (totalLinesLabel) {
      totalLinesLabel.textContent = `${filtered.length} dòng`;
    }

    // 3. Phân trang ảo chống lag
    const linesPerPageInput = document.getElementById('studio-lines-per-page');
    const pageInput = document.getElementById('studio-current-page-input');
    const totalPagesSpan = document.getElementById('studio-total-pages-span');

    const linesPerPage = linesPerPageInput ? (parseInt(linesPerPageInput.value, 10) || 100) : 100;
    const totalPages = Math.max(1, Math.ceil(filtered.length / linesPerPage));
    const curPage = Math.min(Math.max(1, pageInput ? parseInt(pageInput.value, 10) || 1 : 1), totalPages);

    if (pageInput) pageInput.value = curPage;
    if (totalPagesSpan) totalPagesSpan.textContent = totalPages;

    const startIndex = (curPage - 1) * linesPerPage;
    const endIndex = Math.min(startIndex + linesPerPage, filtered.length);
    const pageItems = filtered.slice(startIndex, endIndex);

    if (pageItems.length === 0) {
      container.innerHTML = `<div class="empty-state-studio"><p>Không tìm thấy dòng thoại nào khớp với bộ lọc.</p></div>`;
      return;
    }

    // 4. Render từng dòng thoại gắn nhãn ngữ cảnh
    pageItems.forEach(item => {
      const isChecked = this.selectedLineIds.has(item.id);
      const isDone = item.translation && item.translation.trim() !== '';
      const isManual = !!item.manualEdited;
      const isSkipped = !!item.isSkipped;
      const hasErr = !!item.hasError;

      // Xây dựng nhãn ngữ cảnh (VD: Thoại · m label rep_scene_8...)
      let contextTag = '';
      if (this.currentProjectEngine === 'renpy') {
        const spk = item.speaker ? item.speaker : '';
        const lbl = item.label ? `label ${item.label}` : '';
        contextTag = `Thoại${spk ? ' · ' + spk : ''}${lbl ? ' ' + lbl : ''}`;
      } else {
        contextTag = item.label || item.code || `Event ${item.id}`;
      }

      const rowEl = document.createElement('div');
      rowEl.className = `line-row-card ${hasErr ? 'has-error' : ''} ${isManual ? 'manual-edited' : ''}`;
      rowEl.id = `row-${item.id}`;

      rowEl.innerHTML = `
        <div class="line-meta-header">
          <div class="line-meta-left">
            <input type="checkbox" class="line-select-check" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
            <span class="line-context-tag">${contextTag}</span>
            <span style="font-size: 10px; color: var(--text-muted); font-family: var(--font-mono);">${item.id}</span>
          </div>
          <div class="line-badges">
            ${hasErr ? `<span class="status-pill error" title="${item.errorDetails ? item.errorDetails.join(', ') : 'Sai mã điều khiển'}">Lỗi</span>` : ''}
            ${isManual ? `<span class="status-pill manual" title="Dòng này đã được sửa tay — AI dịch hàng loạt sẽ không ghi đè">Đã sửa tay</span>` : ''}
            ${isSkipped ? `<span class="status-pill skipped">Bỏ qua</span>` : ''}
            ${isDone && !hasErr ? `<span class="status-pill done">Xong</span>` : ''}
          </div>
        </div>
        <div class="line-content-split">
          <div class="line-original-box">${this.escapeHTML(item.original || '')}</div>
          <div class="line-translation-box">
            <textarea class="line-translation-textarea" data-id="${item.id}" placeholder="Nhập bản dịch tiếng Việt...">${this.escapeHTML(item.translation || '')}</textarea>
          </div>
        </div>
      `;

      // Checkbox lắng nghe chọn dòng
      const checkEl = rowEl.querySelector('.line-select-check');
      if (checkEl) {
        checkEl.addEventListener('change', (e) => {
          if (e.target.checked) {
            this.selectedLineIds.add(item.id);
            item._manualChecked = true;
          } else {
            this.selectedLineIds.delete(item.id);
            item._manualChecked = false;
          }
          this.updateTokenEstimator();
        });
      }

      // Textarea lắng nghe gõ phím -> KHÓA SỬA TAY (manualEdited)
      const textarea = rowEl.querySelector('.line-translation-textarea');
      if (textarea) {
        // Tự động co giãn theo chiều cao
        setTimeout(() => {
          textarea.style.height = 'auto';
          textarea.style.height = `${Math.max(48, textarea.scrollHeight)}px`;
        }, 0);

        textarea.addEventListener('input', (e) => {
          item.translation = e.target.value;
          item.manualEdited = true; // Đánh dấu đã sửa tay, AI không được ghi đè!
          item.isSkipped = false;
          
          // Re-validate an toàn
          if (window.safetyChecker) {
            const check = window.safetyChecker.validateLine(item.original, item.translation, this.currentProjectEngine);
            item.hasError = !check.isSafe;
            item.errorDetails = check.errors;
          }

          // Cập nhật giao diện thẻ
          rowEl.classList.add('manual-edited');
          if (item.hasError) rowEl.classList.add('has-error');
          else rowEl.classList.remove('has-error');

          textarea.style.height = 'auto';
          textarea.style.height = `${Math.max(48, textarea.scrollHeight)}px`;

          // Lưu cache ngầm có debounce
          this.app.saveWorkspaceCache(this.currentProject);
          this.updateStudioProgressBar();
        });
      }

      container.appendChild(rowEl);
    });

    this.updateTokenEstimator();
  }

  // Cập nhật thanh tiến trình tổng thể
  updateStudioProgressBar() {
    const curFile = this.currentFile;
    const progressFill = document.getElementById('studio-main-progressbar');
    const lineProgressText = document.getElementById('stat-line-progress');
    const errorBadge = document.getElementById('stat-error-badge');
    const batchStatus = document.getElementById('stat-batch-status');

    if (!curFile || !curFile.events) return;

    let translated = 0;
    let errors = 0;
    const total = curFile.events.length;

    curFile.events.forEach(ev => {
      if (ev.translation && ev.translation.trim() !== '') translated++;
      if (ev.hasError) errors++;
    });

    const percent = total > 0 ? Math.round((translated / total) * 100) : 0;
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (lineProgressText) lineProgressText.textContent = `${translated}/${total} dòng (${percent}%)`;

    if (errorBadge) {
      if (errors > 0) {
        errorBadge.style.display = 'inline-block';
        errorBadge.textContent = `Lỗi (${errors})`;
      } else {
        errorBadge.style.display = 'none';
      }
    }

    const proj = this.currentProject;
    if (batchStatus) {
      if (proj && proj.isTranslating) {
        batchStatus.textContent = 'Đang dịch AI...';
        batchStatus.style.color = '#1ae6a2';
      } else {
        batchStatus.textContent = percent === 100 ? 'Đã hoàn thành' : 'Sẵn sàng';
        batchStatus.style.color = '#94a3b8';
      }
    }
  }

  // Cập nhật bộ ước tính Token khi tích chọn các dòng
  updateTokenEstimator() {
    const tokenStatsEl = document.getElementById('studio-token-stats');
    const curFile = this.currentFile;
    if (!tokenStatsEl || !curFile || !curFile.events) return;

    let selectedCount = 0;
    let totalChars = 0;

    curFile.events.forEach(ev => {
      if (this.selectedLineIds.has(ev.id)) {
        selectedCount++;
        totalChars += (ev.original || '').length;
      }
    });

    // Ước tính token: ~ 3 ký tự / token tiếng Anh & tiếng Việt
    const estimatedTokens = Math.round(totalChars / 3);
    tokenStatsEl.textContent = `Đã chọn ${selectedCount} dòng · ${totalChars.toLocaleString()} ký tự · ~ ${estimatedTokens.toLocaleString()} token nguồn`;
  }

  // ===========================================================================
  // 3. THAO TÁC HÀNG LOẠT & TÍNH NĂNG CHUYÊN SÂU
  // ===========================================================================

  // Chạy kiểm tra an toàn mã điều khiển cho toàn bộ file
  runSafetyCheck() {
    const curFile = this.currentFile;
    if (!curFile || !curFile.events) {
      this.app.showToast('error', 'Chưa có file nào được mở để kiểm tra an toàn.');
      return;
    }

    if (!window.safetyChecker) {
      this.app.showToast('error', 'Module SafetyChecker chưa sẵn sàng.');
      return;
    }

    const result = window.safetyChecker.validateAllLines(curFile.events, this.currentProjectEngine);
    curFile.events = result.lines;

    this.renderStudioTranslationTable();
    this.updateStudioProgressBar();

    if (result.errorCount > 0) {
      this.app.showToast('error', `Phát hiện ${result.errorCount} dòng có nguy cơ làm lỗi game (lệch mã điều khiển / ngoặc)!`);
      // Gợi ý người dùng bật bộ lọc lỗi
      const statusSelect = document.getElementById('studio-filter-status');
      if (statusSelect) {
        statusSelect.value = 'error';
        this.filterStatus = 'error';
        this.renderStudioTranslationTable();
      }
    } else {
      this.app.showToast('success', `Tuyệt vời! Toàn bộ ${result.totalLines} dòng đều an toàn với mã điều khiển game.`);
    }
  }

  // Xuất bảng dịch CSV cho Excel
  async exportCSV() {
    const curFile = this.currentFile;
    if (!curFile || !curFile.events || curFile.events.length === 0) {
      this.app.showToast('warning', 'File hiện tại không có dữ liệu để xuất CSV.');
      return;
    }

    try {
      const csvData = window.csvUtils.generateCSV(curFile.events, this.currentProjectEngine);
      const proj = this.currentProject;
      const defaultName = `${curFile.fileName.replace(/\.[^/.]+$/, "")}-bang-dich.csv`;

      // Tạo Blob và tự động tải xuống
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", defaultName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.app.showToast('success', `Đã xuất bảng dịch "${defaultName}" thành công! Có thể mở bằng Excel để soát lỗi.`);
    } catch (e) {
      console.error(e);
      this.app.showToast('error', `Lỗi xuất CSV: ${e.message}`);
    }
  }

  // Nhập bảng dịch CSV từ Excel vào lại tool
  async importCSV() {
    const curFile = this.currentFile;
    if (!curFile || !curFile.events) {
      this.app.showToast('warning', 'Hãy mở một file trước khi nhập bảng dịch CSV.');
      return;
    }

    try {
      const fileDialog = await window.nativeBridge.selectFile({
        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
      });

      if (fileDialog.canceled || !fileDialog.filePaths || fileDialog.filePaths.length === 0) return;

      const filePath = fileDialog.filePaths[0];
      const readRes = await window.nativeBridge.readFile(filePath);
      if (!readRes.success) {
        this.app.showToast('error', 'Không thể đọc file CSV.');
        return;
      }

      const parsedRows = window.csvUtils.parseCSV(readRes.content);
      if (parsedRows.length === 0) {
        this.app.showToast('warning', 'Tệp CSV trống hoặc sai định dạng.');
        return;
      }

      // Tạo map ID -> Bản dịch
      const translationMap = new Map();
      parsedRows.forEach(r => {
        if (r.id) translationMap.set(r.id, r.translation);
        else if (r.original) translationMap.set(r.original.trim(), r.translation);
      });

      let updatedCount = 0;
      curFile.events.forEach(ev => {
        let newTrans = translationMap.get(ev.id);
        if (newTrans === undefined && ev.original) {
          newTrans = translationMap.get(ev.original.trim());
        }

        if (newTrans !== undefined && newTrans !== '') {
          ev.translation = newTrans;
          ev.manualEdited = true; // Khóa sửa tay cho các dòng nhập từ CSV!
          updatedCount++;
        }
      });

      this.app.saveWorkspaceCache(this.currentProject);
      this.refreshStudioUI();
      this.app.showToast('success', `Đã nạp thành công ${updatedCount} câu dịch từ bảng CSV!`);
    } catch (e) {
      console.error(e);
      this.app.showToast('error', `Lỗi nhập CSV: ${e.message}`);
    }
  }

  // ===========================================================================
  // 4. LẮNG NGHE SỰ KIỆN GIAO DIỆN (BIND EVENTS)
  // ===========================================================================
  bindEvents() {
    // 1. Chuyển đổi 4 Tab trong Studio
    const tabBtns = document.querySelectorAll('.studio-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        tabBtns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const targetTab = e.currentTarget.getAttribute('data-tab');
        this.activeStudioTab = targetTab;

        const panes = document.querySelectorAll('.studio-tab-pane');
        panes.forEach(p => p.classList.remove('active'));
        const activePane = document.getElementById(`studio-tab-${targetTab}`);
        if (activePane) activePane.classList.add('active');
      });
    });

    // 2. Nút quay về Project Hub
    const btnBackToHub = document.getElementById('btn-back-to-hub');
    if (btnBackToHub) {
      btnBackToHub.addEventListener('click', () => this.openProjectHub());
    }

    // 3. Nút tạo dự án mới từ Project Hub
    const btnNewRenpy = document.getElementById('btn-hub-new-renpy');
    if (btnNewRenpy) {
      btnNewRenpy.addEventListener('click', async () => {
        const dir = await window.nativeBridge.selectDirectory();
        if (dir.canceled || !dir.filePaths || dir.filePaths.length === 0) return;
        const gamePath = dir.filePaths[0];

        // Tạo Ren'Py workspace mới trong appManager
        const newId = `renpy_proj_${Date.now()}`;
        const folderName = gamePath.replace(/\\/g, '/').split('/').pop() || 'Dự án RenPy';
        this.app.renpyWorkspaces[newId] = {
          id: newId,
          title: folderName,
          gamePath: gamePath,
          files: [],
          selectedFileIndex: -1,
          isTranslating: false,
          activeView: 'filelist',
          currentPage: 1,
          linesPerPage: 100
        };
        this.app.activeRenpyWorkspaceId = newId;

        // Quét đệ quy các file .rpy
        const scanRes = await window.nativeBridge.readDirRecursive(gamePath);
        if (scanRes.success && scanRes.files) {
          const rpyFiles = scanRes.files.filter(f => f.endsWith('.rpy'));
          for (const f of rpyFiles) {
            const contentRes = await window.nativeBridge.readFile(f);
            if (contentRes.success) {
              const parsed = window.renpyParser.parseLines(contentRes.content, f.replace(/\\/g, '/').split('/').pop());
              this.app.renpyWorkspaces[newId].files.push({
                fileName: f.replace(/\\/g, '/').split('/').pop(),
                filePath: f,
                events: parsed
              });
            }
          }
          if (this.app.renpyWorkspaces[newId].files.length > 0) {
            this.app.renpyWorkspaces[newId].selectedFileIndex = 0;
          }
        }

        this.app.saveWorkspacesState();
        this.openStudio(newId, 'renpy');
        this.app.showToast('success', `Đã tạo thành công dự án "${folderName}"!`);
      });
    }

    const btnNewRpgm = document.getElementById('btn-hub-new-rpgm');
    if (btnNewRpgm) {
      btnNewRpgm.addEventListener('click', async () => {
        const dir = await window.nativeBridge.selectDirectory();
        if (dir.canceled || !dir.filePaths || dir.filePaths.length === 0) return;
        const gamePath = dir.filePaths[0];

        const newId = `rpgm_proj_${Date.now()}`;
        const folderName = gamePath.replace(/\\/g, '/').split('/').pop() || 'Dự án RPGMaker';
        this.app.workspaces[newId] = {
          id: newId,
          title: folderName,
          gamePath: gamePath,
          files: [],
          selectedFileIndex: -1,
          isTranslating: false,
          activeView: 'filelist'
        };
        this.app.activeWorkspaceId = newId;

        this.app.saveWorkspacesState();
        this.openStudio(newId, 'rpgmaker');
        this.app.showToast('success', `Đã tạo dự án RPGMaker "${folderName}"!`);
      });
    }

    // 4. Các nút thao tác nghiệp vụ Studio
    const btnSafety = document.getElementById('studio-btn-safety-check');
    if (btnSafety) btnSafety.addEventListener('click', () => this.runSafetyCheck());

    const btnExportCSV = document.getElementById('studio-btn-export-csv');
    if (btnExportCSV) btnExportCSV.addEventListener('click', () => this.exportCSV());

    const btnImportCSV = document.getElementById('studio-btn-import-csv');
    if (btnImportCSV) btnImportCSV.addEventListener('click', () => this.importCSV());

    const btnExportGame = document.getElementById('studio-btn-export-file');
    if (btnExportGame) {
      btnExportGame.addEventListener('click', () => {
        if (this.currentProjectEngine === 'renpy') this.app.exportCurrentRenpyFile();
        else this.app.exportCurrentFile();
      });
    }

    const btnAiTranslate = document.getElementById('studio-btn-ai-translate');
    if (btnAiTranslate) {
      btnAiTranslate.addEventListener('click', () => {
        if (this.currentProjectEngine === 'renpy') this.app.startAiTranslationRenpy();
        else this.app.startAiTranslation();
      });
    }

    const btnStop = document.getElementById('studio-btn-stop');
    if (btnStop) {
      btnStop.addEventListener('click', () => {
        if (this.currentProject) this.currentProject.isTranslating = false;
        btnStop.style.display = 'none';
        if (btnAiTranslate) btnAiTranslate.style.display = 'inline-flex';
        this.app.showToast('warning', 'Đã yêu cầu dừng tiến trình dịch thuật!');
      });
    }

    // 5. Tìm kiếm & Bộ lọc
    const searchInput = document.getElementById('studio-search-text');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchText = e.target.value;
        this.renderStudioTranslationTable();
      });
    }

    const statusFilter = document.getElementById('studio-filter-status');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filterStatus = e.target.value;
        this.renderStudioTranslationTable();
      });
    }

    const eventFilter = document.getElementById('studio-filter-event-label');
    if (eventFilter) {
      eventFilter.addEventListener('change', (e) => {
        this.filterEventLabel = e.target.value;
        this.renderStudioTranslationTable();
      });
    }

    // 6. Tích chọn toàn bộ dòng đã lọc
    const selectAllCheck = document.getElementById('studio-select-all-lines');
    if (selectAllCheck) {
      selectAllCheck.addEventListener('change', (e) => {
        const curFile = this.currentFile;
        if (!curFile || !curFile.events) return;
        const checks = document.querySelectorAll('.line-select-check');
        checks.forEach(c => {
          c.checked = e.target.checked;
          const lineId = c.getAttribute('data-id');
          if (e.target.checked) this.selectedLineIds.add(lineId);
          else this.selectedLineIds.delete(lineId);
        });
        this.updateTokenEstimator();
      });
    }

    // 7. Thao tác trên dòng chọn (Bulk Actions)
    const btnSkipSelected = document.getElementById('studio-btn-skip-selected');
    if (btnSkipSelected) {
      btnSkipSelected.addEventListener('click', () => {
        const curFile = this.currentFile;
        if (!curFile || !curFile.events) return;
        let count = 0;
        curFile.events.forEach(ev => {
          if (this.selectedLineIds.has(ev.id)) {
            ev.isSkipped = true;
            ev.translation = ev.original; // Giữ nguyên bản gốc
            count++;
          }
        });
        this.renderStudioTranslationTable();
        this.app.saveWorkspaceCache(this.currentProject);
        this.app.showToast('info', `Đã đánh dấu bỏ qua (giữ chữ gốc) cho ${count} dòng.`);
      });
    }

    const btnResetSelected = document.getElementById('studio-btn-reset-selected');
    if (btnResetSelected) {
      btnResetSelected.addEventListener('click', () => {
        const curFile = this.currentFile;
        if (!curFile || !curFile.events) return;
        let count = 0;
        curFile.events.forEach(ev => {
          if (this.selectedLineIds.has(ev.id)) {
            ev.translation = "";
            ev.manualEdited = false;
            ev.isSkipped = false;
            ev.hasError = false;
            count++;
          }
        });
        this.renderStudioTranslationTable();
        this.app.saveWorkspaceCache(this.currentProject);
        this.app.showToast('info', `Đã đặt lại ${count} dòng về trạng thái chưa dịch.`);
      });
    }

    const btnClearSelection = document.getElementById('studio-btn-clear-selection');
    if (btnClearSelection) {
      btnClearSelection.addEventListener('click', () => {
        this.selectedLineIds.clear();
        this.renderStudioTranslationTable();
      });
    }

    // 8. Khay tiến trình AI Drawer Toggle
    const drawerHeader = document.getElementById('btn-toggle-ai-drawer');
    const drawerContent = document.getElementById('drawer-expand-content');
    if (drawerHeader && drawerContent) {
      drawerHeader.addEventListener('click', () => {
        this.isDrawerExpanded = !this.isDrawerExpanded;
        drawerContent.style.display = this.isDrawerExpanded ? 'block' : 'none';
        const icon = drawerHeader.querySelector('.drawer-toggle-icon');
        if (icon) {
          icon.style.transform = this.isDrawerExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
        }
      });
    }
  }

  escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

// Khởi tạo sau khi appManager sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    window.studioManager = new StudioManager(window.appManager);
  }, 100);
});
