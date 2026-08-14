// Parser chuyên sâu cho RPGMaker MV/MZ - ĐẢM BẢO CỘT DỊCH BẮT ĐẦU HOÀN TOÀN TRỐNG
class RPGMakerParser {
  constructor() {}

  // Bóc tách và GOM NHÓM text theo từng Event, đặt translation rỗng ban đầu
  parseEvents(fileContent, fileName) {
    let data;
    try {
      data = JSON.parse(fileContent);
    } catch (e) {
      return { success: false, error: 'File JSON không hợp lệ' };
    }

    const translatableEvents = [];

    // 1. ACTORS
    if (fileName === 'Actors.json') {
      data.forEach((actor) => {
        if (!actor) return;
        const lines = [];
        const commands = [];

        if (actor.name) {
          lines.push(actor.name);
          commands.push({ type: 'actor', obj: actor, key: 'name' });
        }
        if (actor.profile) {
          lines.push(actor.profile);
          commands.push({ type: 'actor', obj: actor, key: 'profile' });
        }

        if (lines.length > 0) {
          const originalText = lines.join('\n');
          translatableEvents.push({
            id: `Actor_${actor.id}`,
            code: 'Actor',
            original: originalText,
            translation: "", // ĐẢM BẢO TRỐNG KHI MỚI IMPORT
            commands: commands
          });
        }
      });
      return { success: true, events: translatableEvents, parsedData: data };
    }

    // 2. MAP FILES (GOM NHÓM THEO TỪNG EVENT)
    if (fileName.startsWith('Map') && fileName !== 'MapInfos.json') {
      if (!data.events) return { success: true, events: [], parsedData: data };
      
      data.events.forEach(event => {
        if (!event || !event.pages) return;
        
        const lines = [];
        const commands = [];

        event.pages.forEach((page) => {
          if (!page.list) return;
          page.list.forEach((cmd) => {
            if (cmd.code === 401 || cmd.code === 405) { // Lời thoại & Cuộn text
              lines.push(cmd.parameters[0]);
              commands.push({ type: 'dialogue', obj: cmd, paramIndex: 0 });
            } else if (cmd.code === 102) { // Lựa chọn
              cmd.parameters[0].forEach((choice, choiceIdx) => {
                lines.push(choice);
                commands.push({ type: 'choices', obj: cmd, paramIndex: 0, choiceIndex: choiceIdx });
              });
            }
          });
        });

        if (lines.length > 0) {
          const originalText = lines.join('\n');
          translatableEvents.push({
            id: `Event_${event.id}`,
            code: `Event ${event.id} (${event.name || ''})`,
            original: originalText,
            translation: "", // ĐẢM BẢO TRỐNG KHI MỚI IMPORT
            commands: commands
          });
        }
      });
      return { success: true, events: translatableEvents, parsedData: data };
    }

    // 3. COMMON EVENTS
    if (fileName === 'CommonEvents.json') {
      data.forEach(event => {
        if (!event || !event.list) return;
        
        const lines = [];
        const commands = [];

        event.list.forEach((cmd) => {
          if (cmd.code === 401 || cmd.code === 405) {
            lines.push(cmd.parameters[0]);
            commands.push({ type: 'dialogue', obj: cmd, paramIndex: 0 });
          } else if (cmd.code === 102) {
            cmd.parameters[0].forEach((choice, choiceIdx) => {
              lines.push(choice);
              commands.push({ type: 'choices', obj: cmd, paramIndex: 0, choiceIndex: choiceIdx });
            });
          }
        });

        if (lines.length > 0) {
          const originalText = lines.join('\n');
          translatableEvents.push({
            id: `CommonEvent_${event.id}`,
            code: `Common Event ${event.id} (${event.name || ''})`,
            original: originalText,
            translation: "", // ĐẢM BẢO TRỐNG KHI MỚI IMPORT
            commands: commands
          });
        }
      });
      return { success: true, events: translatableEvents, parsedData: data };
    }

    // 4. CÁC FILE HỆ THỐNG KHÁC (Items, Weapons, Skills...)
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (!item) return;
        const lines = [];
        const commands = [];

        if (item.name) {
          lines.push(item.name);
          commands.push({ type: 'system', obj: item, key: 'name' });
        }
        if (item.description) {
          lines.push(item.description);
          commands.push({ type: 'system', obj: item, key: 'description' });
        }

        if (lines.length > 0) {
          const originalText = lines.join('\n');
          translatableEvents.push({
            id: `Item_${item.id}`,
            code: `Item ${item.id}`,
            original: originalText,
            translation: "", // ĐẢM BẢO TRỐNG KHI MỚI IMPORT
            commands: commands
          });
        }
      });
      return { success: true, events: translatableEvents, parsedData: data };
    }

    return { success: true, events: [], parsedData: data };
  }

  // Lắp ráp lại text đã dịch vào cấu trúc JSON ban đầu (Fallback về original nếu translation trống)
  reconstructJSON(parsedData, translatedEvents) {
    translatedEvents.forEach(ev => {
      if (!ev.commands || ev.commands.length === 0) return;

      // Nếu người dùng chưa dịch (translation trống rỗng), giữ nguyên văn bản gốc để game không bị lỗi
      const textToUse = (ev.translation && ev.translation.trim().length > 0) ? ev.translation : ev.original;
      const translatedLines = textToUse.split('\n');

      ev.commands.forEach((cmdObj, idx) => {
        const textToAssign = translatedLines[idx] !== undefined ? translatedLines[idx] : (translatedLines[translatedLines.length - 1] || '');

        if (cmdObj.type === 'dialogue') {
          cmdObj.obj.parameters[cmdObj.paramIndex] = textToAssign;
        } else if (cmdObj.type === 'choices') {
          cmdObj.obj.parameters[cmdObj.paramIndex][cmdObj.choiceIndex] = textToAssign;
        } else if (cmdObj.type === 'actor' || cmdObj.type === 'system') {
          cmdObj.obj[cmdObj.key] = textToAssign;
        }
      });
    });

    return JSON.stringify(parsedData, null, 2);
  }
}

window.rpgmakerParser = new RPGMakerParser();
