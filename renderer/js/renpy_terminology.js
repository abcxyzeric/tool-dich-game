// Quản lý Thuật ngữ, Xưng hô & Tóm tắt Thông tin/Mối quan hệ nhân vật cho Ren'Py - HỖ TRỢ CHỈNH SỬA TRỰC TIẾP (INLINE EDIT), CẬP NHẬT TRÙNG LẶP & PHÂN TRANG
class RenpyTerminologyManager {
  constructor() {
    this.terms = [];       // Danh sách thuật ngữ & xưng hô
    this.characters = [];  // Danh sách thông tin & mối quan hệ nhân vật
    
    // Pagination state
    this.currentPageTerms = 1;
    this.currentPageChars = 1;
    this.itemsPerPage = 10;
    
    // Search state
    this.searchQueryTerms = '';
    this.searchQueryChars = '';
    
    this.init();
  }

  init() {
    this.loadData();
    this.bindEvents();
  }

  loadData() {
    const saved = localStorage.getItem('ai_translator_renpy_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.terms = parsed.terms || [];
        this.characters = parsed.characters || [];
      } catch (e) {
        this.terms = [];
        this.characters = [];
      }
    }
    this.renderAll();
  }

  saveData() {
    const data = { terms: this.terms, characters: this.characters };
    localStorage.setItem('ai_translator_renpy_data', JSON.stringify(data));
  }

  bindEvents() {
    // Thêm thuật ngữ thủ công
    const btnAddTerm = document.getElementById('renpy-btn-add-term');
    const inputOrig = document.getElementById('renpy-term-original');
    const inputRep = document.getElementById('renpy-term-replace');

    if (btnAddTerm && inputOrig && inputRep) {
      btnAddTerm.addEventListener('click', () => {
        const orig = inputOrig.value.trim();
        const rep = inputRep.value.trim();
        if (!orig || !rep) {
          if (window.appManager) window.appManager.showToast('warning', 'Vui lòng nhập đầy đủ Từ gốc và Nghĩa dịch.');
          return;
        }
        const existing = this.terms.find(t => t.original.toLowerCase() === orig.toLowerCase());
        if (existing) existing.replace = rep;
        else {
          this.terms.unshift({ original: orig, replace: rep }); // Add to top
          this.currentPageTerms = 1; // Go to first page
        }

        this.saveData();
        this.renderTerms();
        inputOrig.value = ''; inputRep.value = '';
        if (window.appManager) window.appManager.showToast('success', `Đã thêm thuật ngữ Ren'Py: ${orig}`);
      });
    }

    // Thêm thông tin nhân vật thủ công
    const btnAddChar = document.getElementById('renpy-btn-add-char');
    const inputCharName = document.getElementById('renpy-char-name');
    const inputCharInfo = document.getElementById('renpy-char-info');

    if (btnAddChar && inputCharName && inputCharInfo) {
      btnAddChar.addEventListener('click', () => {
        const name = inputCharName.value.trim();
        const info = inputCharInfo.value.trim();
        if (!name || !info) {
          if (window.appManager) window.appManager.showToast('warning', 'Vui lòng nhập đầy đủ Tên nhân vật và Thông tin.');
          return;
        }
        const existing = this.characters.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (existing) existing.info = info;
        else {
          this.characters.unshift({ name: name, info: info }); // Add to top
          this.currentPageChars = 1; // Go to first page
        }

        this.saveData();
        this.renderCharacters();
        inputCharName.value = ''; inputCharInfo.value = '';
        if (window.appManager) window.appManager.showToast('success', `Đã thêm thông tin nhân vật: ${name}`);
      });
    }

    // Tìm kiếm thuật ngữ
    const searchTermInput = document.getElementById('renpy-search-term');
    if (searchTermInput) {
      let termTimeout;
      searchTermInput.addEventListener('input', (e) => {
        clearTimeout(termTimeout);
        termTimeout = setTimeout(() => {
          this.searchQueryTerms = e.target.value.toLowerCase().trim();
          this.currentPageTerms = 1;
          this.renderTerms();
        }, 300);
      });
    }

    // Tìm kiếm nhân vật
    const searchCharInput = document.getElementById('renpy-search-char');
    if (searchCharInput) {
      let charTimeout;
      searchCharInput.addEventListener('input', (e) => {
        clearTimeout(charTimeout);
        charTimeout = setTimeout(() => {
          this.searchQueryChars = e.target.value.toLowerCase().trim();
          this.currentPageChars = 1;
          this.renderCharacters();
        }, 300);
      });
    }
  }

  // Gộp dữ liệu trích xuất tự động từ AI
  mergeAiExtractedData(data) {
    let termCount = 0;
    let charCount = 0;
    let updateCount = 0;

    // 1. Cập nhật bảng Thuật ngữ
    if (Array.isArray(data.terms)) {
      data.terms.forEach(item => {
        if (!item.original || !item.replace) return;
        const origClean = item.original.trim().toLowerCase();
        const existing = this.terms.find(t => t.original.trim().toLowerCase() === origClean);
        if (existing) {
          if (existing.replace !== item.replace.trim()) {
            existing.replace = item.replace.trim();
            updateCount++;
          }
        } else {
          this.terms.unshift({ original: item.original.trim(), replace: item.replace.trim() });
          termCount++;
        }
      });
    }

    // 2. Cập nhật bảng Thông tin nhân vật
    if (Array.isArray(data.characters)) {
      data.characters.forEach(item => {
        if (!item.name || !item.info) return;
        let nameInput = item.name.trim();
        let infoInput = item.info.trim();

        const matchSymbol = nameInput.match(/([\/\-\(\[])(.*)/);
        if (matchSymbol) {
          const extraInfo = matchSymbol[2].replace(/[\)\]]/g, '').trim();
          nameInput = nameInput.substring(0, matchSymbol.index).trim();
          if (extraInfo && !infoInput.toLowerCase().includes(extraInfo.toLowerCase())) {
            infoInput = `Vai trò / Mối quan hệ: ${extraInfo}. ${infoInput}`;
          }
        }
        
        const getRootName = (str) => str.split(/[\/\-\(\[]/)[0].trim().toLowerCase();
        const rootInput = getRootName(nameInput);

        const existing = this.characters.find(c => {
          const rootExisting = getRootName(c.name);
          return rootExisting === rootInput || 
                 (rootExisting.length >= 3 && rootInput.includes(rootExisting)) ||
                 (rootInput.length >= 3 && rootExisting.includes(rootInput));
        });

        if (existing) {
          if (existing.info !== infoInput) {
            existing.info = infoInput;
            updateCount++;
          }
        } else {
          this.characters.unshift({ name: nameInput, info: infoInput });
          charCount++;
        }
      });
    }

    if (termCount > 0 || charCount > 0 || updateCount > 0) {
      this.saveData();
      this.renderAll();
    }
    return { termCount, charCount, updateCount };
  }

  renderAll() {
    this.renderTerms();
    this.renderCharacters();
  }

  renderTerms() {
    const tbody = document.getElementById('renpy-term-tbody');
    const paginationContainer = document.getElementById('renpy-term-pagination');
    if (!tbody) return;

    let filteredTerms = this.terms.map((t, idx) => ({ ...t, _origIdx: idx }));
    if (this.searchQueryTerms) {
      const q = this.searchQueryTerms;
      filteredTerms = filteredTerms.filter(t => 
        (t.original && t.original.toLowerCase().includes(q)) || 
        (t.replace && t.replace.toLowerCase().includes(q))
      );
    }

    if (filteredTerms.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center empty-table">Không tìm thấy thuật ngữ nào phù hợp.</td></tr>`;
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    const totalPages = Math.ceil(filteredTerms.length / this.itemsPerPage) || 1;
    if (this.currentPageTerms > totalPages) this.currentPageTerms = totalPages;
    if (this.currentPageTerms < 1) this.currentPageTerms = 1;

    const startIndex = (this.currentPageTerms - 1) * this.itemsPerPage;
    const paginatedTerms = filteredTerms.slice(startIndex, startIndex + this.itemsPerPage);

    tbody.innerHTML = paginatedTerms.map((t) => {
      const realIndex = t._origIdx;
      return `
        <tr>
          <td>
            <input type="text" class="edit-renpy-term-orig input-inline" data-index="${realIndex}" value="${t.original}" title="Nhấn để sửa từ gốc">
          </td>
          <td>
            <input type="text" class="edit-renpy-term-replace input-inline" data-index="${realIndex}" value="${t.replace}" title="Nhấn để sửa nghĩa dịch / xưng hô">
          </td>
          <td class="col-actions">
            <button class="btn-delete" data-type="term" data-index="${realIndex}" title="Xóa"><i class="fa-solid fa-trash-can"></i></button>
          </td>
        </tr>
      `;
    }).join('');

    // Pagination UI
    if (paginationContainer) {
      if (totalPages > 1) {
        paginationContainer.innerHTML = `
          <button id="btn-term-prev" class="btn btn-sm btn-secondary" ${this.currentPageTerms === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>
          <span class="page-info-text">Trang ${this.currentPageTerms} / ${totalPages}</span>
          <button id="btn-term-next" class="btn btn-sm btn-secondary" ${this.currentPageTerms === totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>
        `;
        const btnPrev = document.getElementById('btn-term-prev');
        const btnNext = document.getElementById('btn-term-next');
        if (btnPrev) btnPrev.addEventListener('click', () => { if (this.currentPageTerms > 1) { this.currentPageTerms--; this.renderTerms(); }});
        if (btnNext) btnNext.addEventListener('click', () => { if (this.currentPageTerms < totalPages) { this.currentPageTerms++; this.renderTerms(); }});
      } else {
        paginationContainer.innerHTML = '';
      }
    }

    // Lắng nghe sự kiện sửa trực tiếp
    tbody.querySelectorAll('.edit-renpy-term-orig').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        this.terms[idx].original = e.currentTarget.value.trim();
        this.saveData();
      });
    });

    tbody.querySelectorAll('.edit-renpy-term-replace').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        this.terms[idx].replace = e.currentTarget.value.trim();
        this.saveData();
      });
    });

    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        this.terms.splice(idx, 1);
        this.saveData(); this.renderTerms();
      });
    });
  }

  renderCharacters() {
    const tbody = document.getElementById('renpy-char-tbody');
    const paginationContainer = document.getElementById('renpy-char-pagination');
    if (!tbody) return;

    let filteredChars = this.characters.map((c, idx) => ({ ...c, _origIdx: idx }));
    if (this.searchQueryChars) {
      const q = this.searchQueryChars;
      filteredChars = filteredChars.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) || 
        (c.info && c.info.toLowerCase().includes(q))
      );
    }

    if (filteredChars.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center empty-table">Không tìm thấy nhân vật nào phù hợp.</td></tr>`;
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    const totalPages = Math.ceil(filteredChars.length / this.itemsPerPage) || 1;
    if (this.currentPageChars > totalPages) this.currentPageChars = totalPages;
    if (this.currentPageChars < 1) this.currentPageChars = 1;

    const startIndex = (this.currentPageChars - 1) * this.itemsPerPage;
    const paginatedChars = filteredChars.slice(startIndex, startIndex + this.itemsPerPage);

    tbody.innerHTML = paginatedChars.map((c) => {
      const realIndex = c._origIdx;
      return `
        <tr>
          <td>
            <input type="text" class="edit-char-name input-inline" data-index="${realIndex}" value="${c.name}" title="Nhấn để sửa tên nhân vật">
          </td>
          <td>
            <textarea class="edit-char-info input-inline-textarea" data-index="${realIndex}" rows="2" title="Nhấn để sửa thông tin & mối quan hệ">${c.info}</textarea>
          </td>
          <td class="col-actions">
            <button class="btn-delete" data-type="char" data-index="${realIndex}" title="Xóa"><i class="fa-solid fa-trash-can"></i></button>
          </td>
        </tr>
      `;
    }).join('');

    // Pagination UI
    if (paginationContainer) {
      if (totalPages > 1) {
        paginationContainer.innerHTML = `
          <button id="btn-char-prev" class="btn btn-sm btn-secondary" ${this.currentPageChars === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>
          <span class="page-info-text">Trang ${this.currentPageChars} / ${totalPages}</span>
          <button id="btn-char-next" class="btn btn-sm btn-secondary" ${this.currentPageChars === totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>
        `;
        const btnPrev = document.getElementById('btn-char-prev');
        const btnNext = document.getElementById('btn-char-next');
        if (btnPrev) btnPrev.addEventListener('click', () => { if (this.currentPageChars > 1) { this.currentPageChars--; this.renderCharacters(); }});
        if (btnNext) btnNext.addEventListener('click', () => { if (this.currentPageChars < totalPages) { this.currentPageChars++; this.renderCharacters(); }});
      } else {
        paginationContainer.innerHTML = '';
      }
    }

    // Lắng nghe sự kiện sửa trực tiếp
    tbody.querySelectorAll('.edit-char-name').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        this.characters[idx].name = e.currentTarget.value.trim();
        this.saveData();
      });
    });

    tbody.querySelectorAll('.edit-char-info').forEach(textarea => {
      textarea.addEventListener('change', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        this.characters[idx].info = e.currentTarget.value.trim();
        this.saveData();
      });
    });

    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        this.characters.splice(idx, 1);
        this.saveData(); this.renderCharacters();
      });
    });
  }

  getTerminologyAndCharacterString() {
    let result = "";
    if (this.terms.length > 0) {
      result += `\n\n=== BẢNG THUẬT NGỮ ĐẶC BIỆT & QUY TẮC XƯNG HÔ ===\n`;
      result += this.terms.map(t => `- "${t.original}" -> dịch là / xưng hô là: "${t.replace}"`).join('\n');
    }
    if (this.characters.length > 0) {
      result += `\n\n=== TÓM TẮT THÔNG TIN & MỐI QUAN HỆ NHÂN VẬT (DÙNG ĐỂ NẮM RÕ BỐI CẢNH) ===\n`;
      result += this.characters.map(c => `- Nhân vật [${c.name}]: ${c.info}`).join('\n');
    }
    return result;
  }
}

window.renpyTerminologyManager = new RenpyTerminologyManager();
