// =============================================================================
// SAFETY CHECK MODULE: KIỂM TRA TOÀN VẸN MÃ ĐIỀU KHIỂN GAME (RPGM & REN'PY)
// Ngăn chặn 100% tình trạng sập game (Crash) do AI dịch sai lệch cú pháp
// =============================================================================

class SafetyChecker {
  constructor() {
    // Biểu thức nhận diện mã điều khiển của Ren'Py
    // 1. Thẻ Ren'Py dạng {tag} hoặc {tag=value} hoặc {/tag}
    this.renpyTagPattern = /\{(\/?[a-zA-Z0-9_]+(?:=[^}]*)?)\}/g;
    // 2. Nội suy biến dạng [variable]
    this.renpyVarPattern = /\[([a-zA-Z0-9_\.\:]+)\]/g;

    // Biểu thức nhận diện mã điều khiển của RPG Maker
    // \V[n], \N[n], \P[n], \G, \C[n], \I[n], \., \|, \!, \>, \<, \^, \{, \}, \$
    this.rpgmakerCodePattern = /\\[VvNnPpCcIi]\[\d+\]|\\[\.\!\|\>\<\{\}\$\^Gg]/g;
  }

  // Trích xuất toàn bộ mã điều khiển từ chuỗi văn bản
  extractControlCodes(text, engine = 'renpy') {
    if (!text || typeof text !== 'string') return [];
    const codes = [];

    if (engine === 'renpy') {
      // Bắt các thẻ {tag}
      const tagMatches = text.match(this.renpyTagPattern) || [];
      codes.push(...tagMatches);

      // Bắt các biến nội suy [variable]
      const varMatches = text.match(this.renpyVarPattern) || [];
      codes.push(...varMatches);

      // Kiểm tra chuỗi \n literal
      const literalNewlines = text.match(/\\n/g) || [];
      codes.push(...literalNewlines);
    } else if (engine === 'rpgmaker') {
      // Bắt các mã \C[n], \V[n], v.v.
      const rpgMatches = text.match(this.rpgmakerCodePattern) || [];
      codes.push(...rpgMatches);
    }

    return codes;
  }

  // Thẩm định an toàn cho một cặp (câu gốc, câu dịch)
  validateLine(original, translation, engine = 'renpy') {
    // Nếu câu dịch rỗng (chưa dịch), coi như an toàn vì sẽ fallback câu gốc
    if (!translation || translation.trim() === '') {
      return { isSafe: true, errors: [] };
    }

    const errors = [];
    const origCodes = this.extractControlCodes(original, engine);
    const transCodes = this.extractControlCodes(translation, engine);

    // Đếm tần suất xuất hiện của từng mã điều khiển
    const countOccurrences = (arr) => {
      const counts = {};
      arr.forEach(c => {
        counts[c] = (counts[c] || 0) + 1;
      });
      return counts;
    };

    const origCounts = countOccurrences(origCodes);
    const transCounts = countOccurrences(transCodes);

    // Kiểm tra xem có mã nào trong câu gốc bị thiếu ở câu dịch không
    for (const [code, count] of Object.entries(origCounts)) {
      const transCount = transCounts[code] || 0;
      if (transCount < count) {
        errors.push(`Thiếu mã điều khiển "${code}" (Gốc có ${count}, Dịch có ${transCount})`);
      }
    }

    // Kiểm tra xem câu dịch có bị gõ sai cú pháp ngoặc nhọn hoặc ngoặc vuông không
    if (engine === 'renpy') {
      // Kiểm tra dấu ngoặc nhọn mở nhưng không đóng
      const openBraces = (translation.match(/\{/g) || []).length;
      const closeBraces = (translation.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        errors.push(`Lệch ngoặc nhọn {} trong câu dịch (Mở: ${openBraces}, Đóng: ${closeBraces})`);
      }

      // Kiểm tra dấu ngoặc vuông mở nhưng không đóng
      const openBrackets = (translation.match(/\[/g) || []).length;
      const closeBrackets = (translation.match(/\]/g) || []).length;
      if (openBrackets !== closeBrackets) {
        errors.push(`Lệch ngoặc vuông [] trong câu dịch (Mở: ${openBrackets}, Đóng: ${closeBrackets})`);
      }

      // Kiểm tra ký tự xuống dòng vật lý (nếu có xuống dòng vật lý thì sẽ làm vỡ code Ren'Py)
      if (/\r?\n/.test(translation)) {
        errors.push(`Chứa ký tự xuống dòng vật lý (Cần chuyển thành chuỗi \\n)`);
      }
    } else if (engine === 'rpgmaker') {
      // Kiểm tra dấu ngoặc vuông sau \V hay \C
      if (/\\[VvNnPpCcIi](?!\[\d+\])/.test(translation)) {
        errors.push(`Mã lệnh RPGMaker thiếu ngoặc vuông [n] (Ví dụ: \\C1 thay vì \\C[1])`);
      }
    }

    return {
      isSafe: errors.length === 0,
      errors: errors
    };
  }

  // Quét toàn bộ danh sách dòng thoại trong dự án
  validateAllLines(lines, engine = 'renpy') {
    let errorCount = 0;
    const validatedLines = lines.map(item => {
      const result = this.validateLine(item.original, item.translation, engine);
      if (!result.isSafe) {
        errorCount++;
      }
      return {
        ...item,
        hasError: !result.isSafe,
        errorDetails: result.errors
      };
    });

    return {
      totalLines: lines.length,
      errorCount: errorCount,
      lines: validatedLines
    };
  }
}

// Khởi tạo đối tượng toàn cục
window.safetyChecker = new SafetyChecker();
