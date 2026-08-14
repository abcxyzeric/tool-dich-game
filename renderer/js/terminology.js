// Quản lý Thuật ngữ & Xưng hô - HỖ TRỢ CHỈNH SỬA TRỰC TIẾP (INLINE EDIT) & CẬP NHẬT TRÙNG LẶP
class TerminologyManager {
  constructor() {
    this.terms = [];
    this.init();
  }

  init() {
    this.loadTerms();
    this.bindEvents();
  }

  loadTerms() {
    const saved = localStorage.getItem('ai_translator_terminology_pro');
    if (saved) {
      try {
        this.terms = JSON.parse(saved);
      } catch (e) {
        this.terms = [];
      }
    }
    this.renderTerms();
  }

  saveTerms() {
    localStorage.setItem('ai_translator_terminology_pro', JSON.stringify(this.terms));
  }

  bindEvents() {
    const btnAdd = document.getElementById('btn-add-term');
    const inputOrig = document.getElementById('term-original');
    const inputRep = document.getElementById('term-replace');

    if (btnAdd && inputOrig && inputRep) {
      btnAdd.addEventListener('click', () => {
        const orig = inputOrig.value.trim();
        const rep = inputRep.value.trim();

        if (!orig || !rep) {
          if (window.appManager) window.appManager.showToast('warning', 'Vui lòng nhập đầy đủ Từ gốc và Nghĩa dịch.');
          return;
        }

        // Kiểm tra trùng
        const existing = this.terms.find(t => t.original.toLowerCase() === orig.toLowerCase());
        if (existing) {
          existing.replace = rep;
        } else {
          this.terms.push({ original: orig, replace: rep });
        }

        this.saveTerms();
        this.renderTerms();
        inputOrig.value = '';
        inputRep.value = '';
        if (window.appManager) window.appManager.showToast('success', `Đã thêm thuật ngữ: ${orig} -> ${rep}`);
      });
    }
  }

  // Phương thức gộp danh sách thuật ngữ trích xuất tự động từ AI - CẬP NHẬT TRỰC TIẾP THÔNG TIN CŨ KHI TRÙNG
  mergeAiExtractedTerms(newTerms) {
    let addedCount = 0;
    let updatedCount = 0;
    newTerms.forEach(item => {
      if (!item.original || !item.replace) return;
      const origClean = item.original.trim().toLowerCase();
      const existing = this.terms.find(t => t.original.trim().toLowerCase() === origClean);
      if (existing) {
        if (existing.replace !== item.replace.trim()) {
          existing.replace = item.replace.trim();
          updatedCount++;
        }
      } else {
        this.terms.push({ original: item.original.trim(), replace: item.replace.trim() });
        addedCount++;
      }
    });

    if (addedCount > 0 || updatedCount > 0) {
      this.saveTerms();
      this.renderTerms();
    }
    return { addedCount, updatedCount };
  }

  renderTerms() {
    const tbody = document.getElementById('term-tbody');
    if (!tbody) return;

    if (this.terms.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center empty-table">Chưa có thuật ngữ nào. AI sẽ tự động trích xuất trước khi dịch.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.terms.map((t, index) => `
      <tr>
        <td>
          <input type="text" class="edit-term-orig input-inline" data-index="${index}" value="${t.original}" title="Nhấn để sửa từ gốc">
        </td>
        <td>
          <input type="text" class="edit-term-replace input-inline" data-index="${index}" value="${t.replace}" title="Nhấn để sửa nghĩa dịch / xưng hô">
        </td>
        <td class="col-actions">
          <button class="btn-delete" data-index="${index}" title="Xóa"><i class="fa-solid fa-trash-can"></i></button>
        </td>
      </tr>
    `).join('');

    // Lắng nghe sự kiện sửa trực tiếp (Inline Edit)
    tbody.querySelectorAll('.edit-term-orig').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        this.terms[idx].original = e.currentTarget.value.trim();
        this.saveTerms();
      });
    });

    tbody.querySelectorAll('.edit-term-replace').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        this.terms[idx].replace = e.currentTarget.value.trim();
        this.saveTerms();
      });
    });

    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        const removed = this.terms.splice(idx, 1);
        this.saveTerms();
        this.renderTerms();
        if (window.appManager) window.appManager.showToast('info', `Đã xóa thuật ngữ: ${removed[0].original}`);
      });
    });
  }

  getTerminologyString() {
    if (this.terms.length === 0) return "";
    return this.terms.map(t => `- "${t.original}" -> dịch là / xưng hô là: "${t.replace}"`).join('\n');
  }
}

window.terminologyManager = new TerminologyManager();
