// =============================================================================
// CSV UTILS MODULE: XUẤT VÀ NHẬP BẢNG DỊCH CHO MICROSOFT EXCEL / GOOGLE SHEETS
// Định dạng chuẩn RFC 4180 có gắn BOM UTF-8 (\uFEFF) không bị lỗi font tiếng Việt
// =============================================================================

class CsvUtils {
  // Thoát ký tự chuẩn CSV RFC 4180
  escapeCsvField(field) {
    if (field === null || field === undefined) return '""';
    const str = String(field);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  }

  // Xuất mảng dòng thoại thành chuỗi CSV
  generateCSV(lines, engine = 'renpy') {
    const headers = [
      'ID',
      'Tệp',
      'Ngữ Cảnh (Label/Event)',
      'Người Nói',
      'Văn Bản Gốc',
      'Bản Dịch',
      'Đã Sửa Tay',
      'Trạng Thái'
    ];

    let csvContent = '\uFEFF'; // BOM UTF-8 cho Microsoft Excel
    csvContent += headers.map(h => this.escapeCsvField(h)).join(',') + '\r\n';

    lines.forEach(item => {
      const context = item.label || item.context || (item.eventId ? `Event_${item.eventId}` : '');
      const speaker = item.speaker || '';
      const original = item.original || '';
      const translation = item.translation || '';
      const manual = item.manualEdited ? 'Có' : 'Không';
      const status = item.hasError ? 'Lỗi' : (translation.trim() ? 'Đã dịch' : 'Chưa dịch');

      const row = [
        item.id || '',
        item.fileName || '',
        context,
        speaker,
        original,
        translation,
        manual,
        status
      ];

      csvContent += row.map(val => this.escapeCsvField(val)).join(',') + '\r\n';
    });

    return csvContent;
  }

  // Phân tích cú pháp chuỗi CSV thành mảng đối tượng
  parseCSV(csvText) {
    if (!csvText) return [];

    // Bỏ qua BOM nếu có
    let cleanText = csvText;
    if (cleanText.charCodeAt(0) === 0xFEFF) {
      cleanText = cleanText.slice(1);
    }

    const rows = [];
    let currentRow = [];
    let currentField = '';
    let insideQuotes = false;
    let i = 0;

    while (i < cleanText.length) {
      const char = cleanText[i];
      const nextChar = cleanText[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Thoát dấu nháy "" -> "
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Bật/tắt trạng thái bên trong dấu nháy
          insideQuotes = !insideQuotes;
          i++;
          continue;
        }
      }

      if (char === ',' && !insideQuotes) {
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      }

      if ((char === '\r' || char === '\n') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // Bỏ qua \n theo sau \r
        }
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.length > 0 && currentRow.some(f => f.trim().length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      }

      currentField += char;
      i++;
    }

    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField);
      rows.push(currentRow);
    }

    if (rows.length < 2) return [];

    // Hàng 0 là tiêu đề: ID, Tệp, Ngữ Cảnh, Người Nói, Văn Bản Gốc, Bản Dịch...
    const headerRow = rows[0].map(h => h.trim().toLowerCase());
    const idIdx = headerRow.findIndex(h => h.includes('id'));
    const fileIdx = headerRow.findIndex(h => h.includes('tệp') || h.includes('file'));
    const transIdx = headerRow.findIndex(h => h.includes('bản dịch') || h.includes('translation') || h.includes('dịch'));
    const origIdx = headerRow.findIndex(h => h.includes('gốc') || h.includes('original'));

    if (transIdx === -1) {
      throw new Error('Tệp CSV thiếu cột "Bản Dịch"');
    }

    const result = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (row.length === 0) continue;

      result.push({
        id: idIdx !== -1 ? (row[idIdx] || '').trim() : '',
        fileName: fileIdx !== -1 ? (row[fileIdx] || '').trim() : '',
        original: origIdx !== -1 ? (row[origIdx] || '') : '',
        translation: (row[transIdx] || '').trim()
      });
    }

    return result;
  }
}

// Khởi tạo đối tượng toàn cục
window.csvUtils = new CsvUtils();
