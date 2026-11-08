// Parser chuyên sâu cho Ren'Py Visual Novel (.rpy) - BÓC TÁCH THEO TỪNG DÒNG (LINE-BY-LINE)
class RenpyParser {
  constructor() {
    // Các từ khóa ĐỨNG TRƯỚC CHUỖI thì 100% là code game (hình ảnh, âm thanh, thuộc tính UI...), KHÔNG PHẢI LÀ LỜI THOẠI
    this.ignoreSpeakers = new Set([
      'add', 'image', 'scene', 'show', 'hide', 'play', 'stop', 'music', 'sound', 'audio', 'voice', 
      'jump', 'call', 'window', 'id', 'style_prefix', 'font', 'color', 'hover_color', 'selected_color', 
      'outline', 'action', 'use', 'include', 'define', 'default', 'init', 'transform', 'screen', 'style',
      'background', 'idle', 'hover', 'selected_idle', 'selected_hover', 'insensitive', 'xalign', 'yalign',
      'align', 'xpos', 'ypos', 'pos', 'xsize', 'ysize', 'size', 'has', 'vbox', 'hbox', 'null', 'frame',
      'button', 'imagebutton', 'bar', 'vbar', 'viewport', 'vpgrid', 'grid', 'fixed', 'timer', 'key', 'on',
      'python', 'pass', 'return', 'label', 'menu', 'while', 'if', 'elif', 'else', 'with', 'camera', 'queue',
      'nvl', 'config', 'hotspot', 'hotbar', 'auto', 'spacing', 'xfill', 'yfill', 'margin', 'padding', 
      'xmargin', 'ymargin', 'thumb', 'left_bar', 'right_bar', 'bottom_bar', 'top_bar', 'focus_mask', 
      'mouse', 'unhovered', 'hovered', 'selected', 'sensitive', 'text_style', 'text_color', 
      'text_hover_color', 'text_selected_color', 'text_size', 'text_font', 'text_align', 'text_yalign', 
      'text_xalign', 'text_outlines', 'text_background', 'text_idle_color', 'value', 'range', 'adjustment',
      'xmaximum', 'ymaximum', 'xminimum', 'yminimum', 'child', 'outlines'
    ]);
  }

  // Bóc tách từng dòng thoại trong file .rpy
  parseLines(fileContent, fileName, sidecarData = null) {
    const rawLines = fileContent.split(/\r?\n/);
    const translatableLines = [];

    // Regex CHUẨN QUỐC TẾ hỗ trợ BỌC NHÁY NHÂN VẬT ("Driver" "Dialogue") VÀ MENU ("Take shortcut":)
    // Group 1: Khoảng trắng đầu dòng
    // Group 2: Khối Tên nhân vật hoặc từ khóa (kèm khoảng trắng phía sau) - TÙY CHỌN
    //   Group 3: Dấu nháy của Tên nhân vật (nếu tên nhân vật bị bọc nháy)
    //   Group 4: Tên nhân vật nằm trong ngoặc nháy
    //   Group 5: Tên nhân vật HOẶC từ khóa KHÔNG bọc nháy (VD: e, text, add)
    // Group 6: Dấu _( dùng cho translate (TÙY CHỌN)
    // Group 7: Dấu ngoặc nháy mở của NỘI DUNG (" hoặc ')
    // Group 8: NỘI DUNG VĂN BẢN
    // Group 9: Phần hậu tố còn lại (xoffset, action, with dissolve, dấu đóng ngoặc, dấu : ...)
    const linePattern = /^(\s*)((?:(["'])(.*?)(?<!\\)\3|([a-zA-Z0-9_\-\.]+))\s+)?(_\(\s*)?(["'])(.*?)(?<!\\)\7(\s*\)?.*)$/;

    rawLines.forEach((line, idx) => {
      const trimmed = line.trim();
      // Bỏ qua dòng trống và chú thích
      if (trimmed.length === 0 || trimmed.startsWith('#') || trimmed.startsWith('//')) return;

      const match = line.match(linePattern);
      if (match) {
        const prefixSpaces = match[1] || '';
        const speakerBlock = match[2] || '';
        const quotedSpeaker = match[4];
        const unquotedSpeaker = match[5];
        const translateMarker = match[6] || '';
        const quoteChar = match[7];
        const originalText = match[8] || '';
        const suffix = match[9] || '';

        // Bỏ qua nếu từ khóa (không có nháy) đứng trước chuỗi nằm trong danh sách cấm (là code UI/Game)
        if (unquotedSpeaker) {
          const spkLower = unquotedSpeaker.toLowerCase();
          if (this.ignoreSpeakers.has(spkLower)) {
            return;
          }
        }

        // Bỏ qua nếu string rỗng
        if (originalText.trim().length === 0) return;

        // Trích xuất tên nhân vật dùng để hiển thị trên UI
        let displaySpeaker = '';
        if (quotedSpeaker) {
          displaySpeaker = quotedSpeaker;
        } else if (unquotedSpeaker) {
          displaySpeaker = unquotedSpeaker;
        }

        const lineId = `Line_${idx + 1}`;
        let finalOriginalText = originalText;
        let finalTranslationText = "";

        // Nếu có sidecar data (file .orig.json), nghĩa là file này đã từng được dịch.
        // Chuỗi nằm trong ngoặc nháy hiện tại chính là bản dịch (tiếng Việt), 
        // còn bản gốc tiếng Anh sẽ được lấy từ sidecar file.
        if (sidecarData && sidecarData[lineId]) {
           finalTranslationText = originalText; // chuỗi trong file hiện tại là bản dịch
           finalOriginalText = sidecarData[lineId]; // lấy lại tiếng Anh từ file .orig.json
        }

        translatableLines.push({
          id: lineId,
          lineIndex: idx,
          speaker: displaySpeaker, 
          prefixSpaces: prefixSpaces,
          speakerBlock: speakerBlock,
          translateMarker: translateMarker,
          quoteChar: quoteChar,
          suffix: suffix,
          original: finalOriginalText,
          translation: finalTranslationText
        });
      }
    });

    return { success: true, events: translatableLines, rawLines: rawLines };
  }

  // Lắp ráp lại file .rpy sau khi dịch - BẢO VỆ TUYỆT ĐỐI CẤU TRÚC KÝ TỰ \n (KHÔNG GÂY LỖI REN'PY)
  reconstructRPY(rawLines, translatedEvents) {
    const updatedLines = [...rawLines];

    translatedEvents.forEach(item => {
      const lineIdx = item.lineIndex;
      if (lineIdx >= 0 && lineIdx < updatedLines.length) {
        if (item.translation && item.translation.trim().length > 0) {
          // Xử lý tương thích ngược cho file cache cũ (khi chưa có quoteChar, prefixSpaces)
          if (item.quoteChar === undefined) {
            let safeTranslation = item.translation.replace(/"/g, '\\"').replace(/\r?\n/g, '\\n');
            const prefix = item.prefix || '';
            const speaker = item.speaker ? item.speaker + ' ' : '';
            const suffix = item.suffix || '';
            updatedLines[lineIdx] = `${prefix}${speaker}"${safeTranslation}"${suffix}`;
          } else {
            // Thoát dấu ngoặc kép và CHUYỂN ĐỔI BẢO VỆ XUỐNG DÒNG VẬT LÝ VỀ CHUỖI '\n' LITERAL
            const isSingleQuote = item.quoteChar === "'";
            let safeTranslation = item.translation.replace(/\r?\n/g, '\\n');
            
            if (isSingleQuote) {
              safeTranslation = safeTranslation.replace(/'/g, "\\'");
            } else {
              safeTranslation = safeTranslation.replace(/"/g, '\\"');
            }

            // Lắp ráp lại chính xác tuyệt đối từng milimet code gốc của dòng đó!
            updatedLines[lineIdx] = `${item.prefixSpaces}${item.speakerBlock}${item.translateMarker}${item.quoteChar}${safeTranslation}${item.quoteChar}${item.suffix}`;
          }
        }
      }
    });

    return updatedLines.join('\n');
  }
}

window.renpyParser = new RenpyParser();
