// Xử lý kết nối API AI, Streaming, Proxy, AI Terminology Extraction & Batch Translation
class APIManager {
  constructor() {
    this.bindEvents();
  }

  bindEvents() {
    const btnConnect = document.getElementById('btn-connect');
    const btnLoadModels = document.getElementById('btn-load-models');
    const modelSelect = document.getElementById('model-select');
    const customModelInput = document.getElementById('custom-model-input');

    if (modelSelect) {
      modelSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
          customModelInput.classList.remove('hidden');
        } else {
          customModelInput.classList.add('hidden');
        }
        if (window.settingsManager) window.settingsManager.saveSettings(true);
      });
    }

    if (btnConnect) btnConnect.addEventListener('click', () => this.testConnection());
    if (btnLoadModels) btnLoadModels.addEventListener('click', () => this.loadModelList());
  }

  getProxyConfig() {
    if (window.settingsManager) window.settingsManager.saveSettings(true);
    const url = document.getElementById('api-url').value.trim() || 'https://gcli.ggchan.dev/';
    const key = document.getElementById('api-key').value.trim();
    const modelSelect = document.getElementById('model-select').value;
    const customModel = document.getElementById('custom-model-input').value.trim();
    const model = modelSelect === 'custom' ? customModel : modelSelect;
    
    return { url, key, model };
  }

  updateOnlineStatus(isOnline, text) {
    const dot = document.getElementById('proxy-online-dot');
    const label = document.getElementById('proxy-status-label');
    if (dot && label) {
      dot.className = `dot ${isOnline ? 'online' : 'offline'}`;
      label.textContent = text;
    }
  }

  async testConnection() {
    const banner = document.getElementById('connect-status-banner');
    const statusText = document.getElementById('connect-status-text');
    const config = this.getProxyConfig();

    if (!config.url) {
      banner.className = 'status-banner error';
      statusText.textContent = "Kết nối thất bại: Vui lòng nhập URL Proxy.";
      this.updateOnlineStatus(false, "Proxy: Lỗi URL");
      return;
    }

    banner.className = 'status-banner';
    statusText.textContent = "Đang kiểm tra kết nối đến Proxy...";

    try {
      const isGeminiPath = config.url.includes('gemini') || config.url.includes('generativelanguage');
      let endpoint = config.url;
      if (!endpoint.endsWith('/')) endpoint += '/';

      let fetchUrl = endpoint;
      let payload = {};
      let headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.key}`
      };

      if (isGeminiPath || config.url.includes('ggchan.dev')) {
        fetchUrl += `v1beta/models/${config.model}:generateContent?key=${config.key}`;
        payload = {
          contents: [{ parts: [{ text: "Hello" }] }],
          generationConfig: { maxOutputTokens: 10 }
        };
        delete headers['Authorization'];
      } else {
        fetchUrl += 'v1/chat/completions';
        payload = {
          model: config.model,
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 10
        };
      }

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        banner.className = 'status-banner success';
        statusText.textContent = `Kết nối thành công tới proxy: ${config.url} (Model: ${config.model})`;
        this.updateOnlineStatus(true, "Proxy: Đã kết nối");
        if (window.appManager) window.appManager.showToast('success', 'Kiểm tra kết nối Proxy thành công!');
      } else {
        const errText = await response.text();
        banner.className = 'status-banner error';
        statusText.textContent = `Kết nối thất bại (${response.status}): ${errText || response.statusText}`;
        this.updateOnlineStatus(false, "Proxy: Kết nối thất bại");
        if (window.appManager) window.appManager.showToast('error', `Kết nối thất bại: ${response.status}`);
      }
    } catch (error) {
      banner.className = 'status-banner error';
      statusText.textContent = `Kết nối thất bại: ${error.message}`;
      this.updateOnlineStatus(false, "Proxy: Lỗi mạng");
      if (window.appManager) window.appManager.showToast('error', `Lỗi kết nối: ${error.message}`);
    }
  }

  async loadModelList() {
    const banner = document.getElementById('connect-status-banner');
    const statusText = document.getElementById('connect-status-text');
    const modelSelect = document.getElementById('model-select');
    const config = this.getProxyConfig();

    if (!config.url) {
      banner.className = 'status-banner error';
      statusText.textContent = "Không thể load model: Vui lòng nhập URL Proxy.";
      return;
    }

    banner.className = 'status-banner';
    statusText.textContent = "Đang tải danh sách model từ Proxy...";

    try {
      let endpoint = config.url;
      if (!endpoint.endsWith('/')) endpoint += '/';

      const isGeminiPath = endpoint.includes('gemini') || endpoint.includes('generativelanguage') || endpoint.includes('ggchan.dev');
      let fetchUrl = endpoint;
      let headers = { 'Content-Type': 'application/json' };

      if (isGeminiPath) {
        fetchUrl += `v1beta/models?key=${config.key}`;
      } else {
        fetchUrl += 'v1/models';
        headers['Authorization'] = `Bearer ${config.key}`;
      }

      const response = await fetch(fetchUrl, { method: 'GET', headers });

      if (response.ok) {
        const data = await response.json();
        let models = [];

        if (isGeminiPath && data.models) {
          models = data.models.map(m => m.name.replace('models/', ''));
        } else if (data.data) {
          models = data.data.map(m => m.id);
        }

        if (models.length > 0) {
          const currentSelected = config.model;
          modelSelect.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');
          modelSelect.innerHTML += `<option value="custom">-- Model tùy chỉnh khác... --</option>`;
          
          // Khôi phục model đã chọn trước đó nếu có trong danh sách
          if (models.includes(currentSelected)) {
            modelSelect.value = currentSelected;
          } else {
            modelSelect.value = models[0];
          }

          if (window.settingsManager) window.settingsManager.saveSettings(true);
          
          banner.className = 'status-banner success';
          statusText.textContent = `Tải thành công ${models.length} model từ Proxy!`;
          this.updateOnlineStatus(true, "Proxy: Đã kết nối");
          if (window.appManager) window.appManager.showToast('success', `Đã tải danh sách ${models.length} model!`);
        } else {
          banner.className = 'status-banner error';
          statusText.textContent = "Tải thành công nhưng danh sách model trống.";
        }
      } else {
        const errText = await response.text();
        banner.className = 'status-banner error';
        statusText.textContent = `Lỗi tải danh sách model (${response.status}): ${errText || response.statusText}`;
        if (window.appManager) window.appManager.showToast('error', `Lỗi load model: ${response.status}`);
      }
    } catch (error) {
      banner.className = 'status-banner error';
      statusText.textContent = `Lỗi tải danh sách model: ${error.message}`;
      if (window.appManager) window.appManager.showToast('error', `Lỗi load model: ${error.message}`);
    }
  }

  // AI TỰ ĐỘNG TRÍCH XUẤT THUẬT NGỮ & XƯNG HÔ (RPGMAKER)
  async extractTerminologyAI(sampleText, onComplete, onError) {
    const config = this.getProxyConfig();
    if (!config.key && !config.url.includes('localhost')) {
      onError("Vui lòng nhập API Key / Password tại màn hình Cài Đặt trước khi trích xuất.");
      return;
    }

    let endpoint = config.url;
    if (!endpoint.endsWith('/')) endpoint += '/';

    const isGeminiPath = endpoint.includes('gemini') || endpoint.includes('generativelanguage') || endpoint.includes('ggchan.dev');
    let fetchUrl = endpoint;
    let payload = {};
    let headers = { 'Content-Type': 'application/json' };

    const extractPrompt = `Dưới đây là các đoạn thoại gốc trong game. Hãy phân tích ngữ cảnh và trích xuất ra danh sách các nhân vật, tên riêng, thuật ngữ đặc thù, đồng thời xác định cặp xưng hô hoặc cách dịch phù hợp nhất trong tiếng Việt (ví dụ: Claire -> Claire (Cô/Em), Guardsman -> Lính canh (Hắn/Anh), My Lord -> Lãnh chúa (Ngài)).
TUYỆT ĐỐI CHỈ TRẢ VỀ CẤU TRÚC JSON MẢNG (Array) các object, mỗi object có đúng 2 key: "original" (từ gốc) và "replace" (nghĩa dịch / xưng hô). Không giải thích gì thêm, không bọc trong markdown \`\`\`json.`;

    if (isGeminiPath) {
      fetchUrl += `v1beta/models/${config.model}:generateContent?key=${config.key}`;
      payload = {
        systemInstruction: { parts: [{ text: extractPrompt }] },
        contents: [{ parts: [{ text: sampleText }] }],
        generationConfig: { temperature: 0.2 }
      };
    } else {
      fetchUrl += 'v1/chat/completions';
      headers['Authorization'] = `Bearer ${config.key}`;
      payload = {
        model: config.model,
        messages: [
          { role: "system", content: extractPrompt },
          { role: "user", content: sampleText }
        ],
        temperature: 0.2
      };
    }

    try {
      const response = await fetch(fetchUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
      if (!response.ok) {
        const errText = await response.text();
        onError(`Lỗi API (${response.status}): ${errText || response.statusText}`);
        return;
      }

      const data = await response.json();
      let resText = "";
      if (isGeminiPath) {
        resText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else {
        resText = data.choices?.[0]?.message?.content || "";
      }

      resText = resText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(resText);
      if (Array.isArray(parsed)) {
        onComplete(parsed);
      } else {
        onError("Dữ liệu trả về không phải là mảng JSON.");
      }
    } catch (error) {
      onError(`Lỗi phân tích JSON từ AI: ${error.message}`);
    }
  }

  // AI TỰ ĐỘNG TRÍCH XUẤT THUẬT NGỮ & TÓM TẮT THÔNG TIN / MỐI QUAN HỆ NHÂN VẬT (REN'PY)
  // [CẬP NHẬT MỚI]: Luôn tiêm toàn bộ prompt mặc định hiện tại (Persona Hana + Bảng thuật ngữ hiện tại) để AI đọc và thực hiện chuẩn xác
  async extractRenpyInfoAI(sampleText, onComplete, onError) {
    const config = this.getProxyConfig();
    const terminologyAndCharInfo = window.renpyTerminologyManager ? window.renpyTerminologyManager.getTerminologyAndCharacterString() : "";
    const baseSystemInstruction = window.promptManager ? window.promptManager.getRenpySystemInstruction(terminologyAndCharInfo) : "";

    if (!config.key && !config.url.includes('localhost')) {
      onError("Vui lòng nhập API Key / Password tại màn hình Cài Đặt trước khi trích xuất.");
      return;
    }

    let endpoint = config.url;
    if (!endpoint.endsWith('/')) endpoint += '/';

    const isGeminiPath = endpoint.includes('gemini') || endpoint.includes('generativelanguage') || endpoint.includes('ggchan.dev');
    let fetchUrl = endpoint;
    let payload = {};
    let headers = { 'Content-Type': 'application/json' };

    const extractPrompt = `${baseSystemInstruction}\n\n=== YÊU CẦU BÓC TÁCH THUẬT NGỮ & NHÂN VẬT ===\nDưới đây là các đoạn thoại gốc trong game visual novel Ren'Py. Hãy đọc kỹ toàn bộ bối cảnh Persona ở trên và thực hiện 2 nhiệm vụ sau:
1. Trích xuất QUY TẮC XƯNG HÔ NHÂN VẬT (ví dụ: cô ấy, anh ấy, lão, v.v.) và CÁC ĐỊA ĐIỂM/THUẬT NGỮ THỰC SỰ ĐẶC BIỆT, NHẠY CẢM HOẶC KHÓ DỊCH (ví dụ: 'CUNT-Hunter College' phải được ghi nhận để dịch thống nhất là 'Trường Cao đẳng Săn Lồn' để tránh bị dịch sai lệch). Tuyệt đối KHÔNG trích xuất các danh từ riêng địa điểm thông thường (như New York, Apartment 69D, v.v.) hay các từ vựng tiếng Anh thông thường. CHỈ NHỮNG TỪ QUAN TRỌNG NHẤT ẢNH HƯỞNG TỚI BỐI CẢNH MỚI ĐƯỢC ĐƯA VÀO.
2. Tóm tắt thông tin chi tiết về các nhân vật xuất hiện (bao gồm giới tính, tính cách, đặc điểm hoặc mối quan hệ giữa họ với nhau).

TUYỆT ĐỐI CHỈ TRẢ VỀ CẤU TRÚC JSON LÀ MỘT OBJECT CÓ ĐÚNG 2 KEY:
{
  "terms": [ {"original": "từ gốc đặc biệt", "replace": "nghĩa dịch / xưng hô"} ],
  "characters": [ {"name": "Tên nhân vật", "info": "Thông tin tóm tắt chi tiết (giới tính, tính cách, vai trò, mối quan hệ...)"} ]
}
Không giải thích gì thêm, không bọc trong markdown \`\`\`json.`;

    if (isGeminiPath) {
      fetchUrl += `v1beta/models/${config.model}:generateContent?key=${config.key}`;
      payload = {
        systemInstruction: { parts: [{ text: extractPrompt }] },
        contents: [{ parts: [{ text: sampleText }] }],
        generationConfig: { temperature: 0.2 }
      };
    } else {
      fetchUrl += 'v1/chat/completions';
      headers['Authorization'] = `Bearer ${config.key}`;
      payload = {
        model: config.model,
        messages: [
          { role: "system", content: extractPrompt },
          { role: "user", content: sampleText }
        ],
        temperature: 0.2
      };
    }

    try {
      const response = await fetch(fetchUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
      if (!response.ok) {
        const errText = await response.text();
        onError(`Lỗi API (${response.status}): ${errText || response.statusText}`);
        return;
      }

      const data = await response.json();
      let resText = "";
      if (isGeminiPath) {
        resText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else {
        resText = data.choices?.[0]?.message?.content || "";
      }

      resText = resText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(resText);
      if (parsed && (parsed.terms || parsed.characters)) {
        onComplete(parsed);
      } else {
        onError("Dữ liệu trả về không khớp cấu trúc JSON yêu cầu.");
      }
    } catch (error) {
      onError(`Lỗi phân tích JSON từ AI: ${error.message}`);
    }
  }

  // DỊCH STREAMING CHO RPGMAKER
  async translateStreaming(textToTranslate, onChunk, onComplete, onError) {
    const config = this.getProxyConfig();
    const settings = window.settingsManager.getSettings();
    const terminology = window.terminologyManager.getTerminologyString();
    const systemInstruction = window.promptManager.getSystemInstruction(terminology);

    if (!config.key && !config.url.includes('localhost')) {
      onError("Vui lòng nhập API Key / Password tại màn hình Cài Đặt trước khi dịch.");
      return;
    }

    let endpoint = config.url;
    if (!endpoint.endsWith('/')) endpoint += '/';

    const isGeminiPath = endpoint.includes('gemini') || endpoint.includes('generativelanguage') || endpoint.includes('ggchan.dev');
    let fetchUrl = endpoint;
    let payload = {};
    let headers = { 'Content-Type': 'application/json' };

    if (isGeminiPath) {
      const streamEndpoint = settings.streaming ? 'streamGenerateContent?alt=sse&' : 'generateContent?';
      fetchUrl += `v1beta/models/${config.model}:${streamEndpoint}key=${config.key}`;
      
      payload = {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: textToTranslate }] }],
        generationConfig: {
          temperature: settings.temperature,
          topK: settings.topK,
          topP: settings.topP,
          maxOutputTokens: settings.maxTokens
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
          { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'OFF' }
        ]
      };
    } else {
      fetchUrl += 'v1/chat/completions';
      headers['Authorization'] = `Bearer ${config.key}`;
      payload = {
        model: config.model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: textToTranslate }
        ],
        temperature: settings.temperature,
        top_p: settings.topP,
        max_tokens: settings.maxTokens,
        stream: settings.streaming
      };
    }

    try {
      const response = await fetch(fetchUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
      if (!response.ok) {
        const errText = await response.text();
        onError(`Lỗi API (${response.status}): ${errText || response.statusText}`);
        return;
      }

      if (!settings.streaming) {
        const data = await response.json();
        let fullText = "";
        if (isGeminiPath) fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        else fullText = data.choices?.[0]?.message?.content || "";
        onChunk(fullText); onComplete(fullText);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = ""; let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.substring(5).trim();
          if (dataStr === '[DONE]') continue;
          if (!dataStr) continue;

          try {
            const parsed = JSON.parse(dataStr);
            let chunkText = "";
            if (isGeminiPath) chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
            else chunkText = parsed.choices?.[0]?.delta?.content || "";
            if (chunkText) {
              accumulatedText += chunkText;
              onChunk(accumulatedText);
            }
          } catch (e) {}
        }
      }
      onComplete(accumulatedText);
    } catch (error) {
      onError(`Lỗi kết nối API: ${error.message}`);
    }
  }

  // DỊCH GỘP BATCH (BATCH TRANSLATION) CHO REN'PY - TỐI ƯU TỐC ĐỘ VÀ CHỐNG LAG
  async translateBatchRenpy(batchEvents, onComplete, onError) {
    const config = this.getProxyConfig();
    const settings = window.settingsManager.getSettings();
    const terminologyAndCharInfo = window.renpyTerminologyManager.getTerminologyAndCharacterString();
    const systemInstruction = window.promptManager.getRenpySystemInstruction(terminologyAndCharInfo);

    if (!config.key && !config.url.includes('localhost')) {
      onError("Vui lòng nhập API Key / Password tại màn hình Cài Đặt trước khi dịch.");
      return;
    }

    let endpoint = config.url;
    if (!endpoint.endsWith('/')) endpoint += '/';

    const isGeminiPath = endpoint.includes('gemini') || endpoint.includes('generativelanguage') || endpoint.includes('ggchan.dev');
    let fetchUrl = endpoint;
    let payload = {};
    let headers = { 'Content-Type': 'application/json' };

    // Xây dựng nội dung gộp lô (batch)
    let batchPrompt = `Dưới đây là một lô (batch) các câu thoại trong game Ren'Py. Hãy dịch toàn bộ chúng sang tiếng Việt, tuân thủ tuyệt đối bảng thuật ngữ, xưng hô và thông tin nhân vật đã cung cấp.
ĐỊNH DẠNG BẮT BUỘC: Trả về kết quả dưới dạng chuỗi JSON là một mảng (Array) các object, mỗi object có đúng 2 key: "id" (giữ nguyên id gốc của câu thoại) và "translation" (kết quả dịch tiếng Việt).
Không giải thích thêm, không kèm code block \`\`\`json.

[DANH SÁCH THOẠI CẦN DỊCH]:\n`;

    batchEvents.forEach(ev => {
      batchPrompt += `ID: ${ev.id} | Speaker: ${ev.speaker || 'Narrator'} | Original: ${ev.original}\n`;
    });

    if (isGeminiPath) {
      fetchUrl += `v1beta/models/${config.model}:generateContent?key=${config.key}`;
      payload = {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: batchPrompt }] }],
        generationConfig: {
          temperature: settings.temperature,
          topK: settings.topK,
          topP: settings.topP,
          maxOutputTokens: settings.maxTokens
        }
      };
    } else {
      fetchUrl += 'v1/chat/completions';
      headers['Authorization'] = `Bearer ${config.key}`;
      payload = {
        model: config.model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: batchPrompt }
        ],
        temperature: settings.temperature,
        top_p: settings.topP,
        max_tokens: settings.maxTokens,
        stream: false
      };
    }

    try {
      const response = await fetch(fetchUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
      if (!response.ok) {
        const errText = await response.text();
        onError(`Lỗi API (${response.status}): ${errText || response.statusText}`);
        return;
      }

      const data = await response.json();
      let resText = "";
      if (isGeminiPath) resText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      else resText = data.choices?.[0]?.message?.content || "";

      resText = resText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
        const parsed = JSON.parse(resText);
        if (Array.isArray(parsed)) {
          onComplete(parsed);
          return;
        }
      } catch (parseErr) {
        // CƠ CHẾ UNBREAKABLE FALLBACK: Dùng Regex quét bóc tách từng ID và Translation nếu JSON bị lỗi cú pháp nhẹ
        const regex = /"id"\s*:\s*"([^"]+)"\s*,\s*"translation"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;
        const fallbackItems = [];
        let match;
        while ((match = regex.exec(resText)) !== null) {
          fallbackItems.push({ id: match[1], translation: match[2].replace(/\\"/g, '"') });
        }
        if (fallbackItems.length > 1) {
          onComplete(fallbackItems);
          return;
        }
        onError("Không thể phân tích kết quả JSON từ AI.");
      }
    } catch (error) {
      onError(`Lỗi kết nối API Batch: ${error.message}`);
    }
  }
}

window.apiManager = new APIManager();
