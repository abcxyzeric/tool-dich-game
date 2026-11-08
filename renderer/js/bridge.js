// =============================================================================
// NATIVE BRIDGE: KẾT NỐI GIỮA GIAO DIỆN VÀ RUST NATIVE BACKEND (TAURI V2)
// Hỗ trợ tự động fallback linh hoạt nếu mở trên môi trường khác
// =============================================================================

class NativeBridgeHandler {
  constructor() {
    this.isTauri = typeof window !== 'undefined' && 
                   typeof window.__TAURI__ !== 'undefined' && 
                   !!window.__TAURI__.core;
                   
    console.log(`[NativeBridge] Môi trường hoạt động: ${this.isTauri ? 'Rust (Tauri v2 Native)' : 'Web Browser'}`);
  }

  // Chọn file thông qua hộp thoại OS Native
  async selectFile(options = {}) {
    if (this.isTauri) {
      try {
        const filters = options?.filters?.map(f => ({
          name: f.name || 'All Files',
          extensions: (f.extensions || ['*']).map(ext => ext.replace(/^\*\./, '').replace(/^\*/, ''))
        })) || [];

        const path = await window.__TAURI__.core.invoke('select_file', { filters });
        return {
          canceled: !path,
          filePaths: path ? [path] : []
        };
      } catch (err) {
        console.error('[Tauri select_file error]', err);
        return { canceled: true, filePaths: [] };
      } }
    return { canceled: true, filePaths: [] };
  }

  // Chọn thư mục thông qua hộp thoại OS Native
  async selectDirectory() {
    if (this.isTauri) {
      try {
        const path = await window.__TAURI__.core.invoke('select_directory');
        return {
          canceled: !path,
          filePaths: path ? [path] : []
        };
      } catch (err) {
        console.error('[Tauri select_directory error]', err);
        return { canceled: true, filePaths: [] };
      } }
    return { canceled: true, filePaths: [] };
  }

  // Đọc danh sách file trong thư mục (đơn cấp)
  async readDir(dirPath) {
    if (this.isTauri) {
      try {
        const files = await window.__TAURI__.core.invoke('read_dir', { dirPath });
        return { success: true, files };
      } catch (err) {
        console.error('[Tauri read_dir error]', err);
        return { success: false, error: err.toString() };
      } }
    return { success: false, error: 'Không tìm thấy native backend' };
  }

  // Quét danh sách file đệ quy (Recursive) cho dự án Ren'Py (.rpy trong mọi thư mục con)
  async readDirRecursive(dirPath) {
    if (this.isTauri) {
      try {
        const files = await window.__TAURI__.core.invoke('read_dir_recursive', { dirPath });
        return { success: true, files };
      } catch (err) {
        console.error('[Tauri read_dir_recursive error]', err);
        return { success: false, error: err.toString() };
      } }
    return { success: false, error: 'Không tìm thấy native backend' };
  }

  // Đọc nội dung file UTF-8 an toàn bằng Rust
  async readFile(filePath) {
    if (this.isTauri) {
      try {
        const content = await window.__TAURI__.core.invoke('read_file', { filePath });
        return { success: true, content };
      } catch (err) {
        console.error('[Tauri read_file error]', err);
        return { success: false, error: err.toString() };
      } }
    return { success: false, error: 'Không tìm thấy native backend' };
  }

  // Ghi nội dung file UTF-8 an toàn bằng Rust
  async writeFile(filePath, content) {
    if (this.isTauri) {
      try {
        await window.__TAURI__.core.invoke('write_file', { filePath, content });
        return { success: true };
      } catch (err) {
        console.error('[Tauri write_file error]', err);
        return { success: false, error: err.toString() };
      } }
    return { success: false, error: 'Không tìm thấy native backend' };
  }

  // Kiểm tra đường dẫn tồn tại
  async checkExists(targetPath) {
    if (this.isTauri) {
      try {
        return await window.__TAURI__.core.invoke('check_exists', { targetPath });
      } catch (err) {
        return false;
      } }
    return false;
  }

  // Cầu nối gửi request tới Proxy AI bằng Rust (Reqwest) - Triệt tiêu lỗi CORS và Timeout
  async proxyRequest(url, method = 'POST', headers = {}, body = null) {
    if (this.isTauri) {
      try {
        const response = await window.__TAURI__.core.invoke('proxy_request', {
          url,
          method,
          headers,
          body
        });
        return response; // { ok, status, text, json }
      } catch (err) {
        console.error('[Tauri proxy_request error]', err);
        return { ok: false, status: 500, text: err.toString(), json: null };
      }
    }

    // Fallback: Fetch tiêu chuẩn trên trình duyệt / Electron
    try {
      const fetchOpts = {
        method,
        headers: { ...headers }
      };
      if (body && (method === 'POST' || method === 'PUT')) {
        fetchOpts.body = JSON.stringify(body);
      }
      const res = await fetch(url, fetchOpts);
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch (e) {}
      return { ok: res.ok, status: res.status, text, json };
    } catch (err) {
      return { ok: false, status: 0, text: err.toString(), json: null };
    }
  }
}

// Khởi tạo đối tượng toàn cục
window.nativeBridge = new NativeBridgeHandler();

// Bộ giả lập tương thích ngược ipcRenderer cho mã nguồn hiện tại
window.ipcRenderer = {
  async invoke(channel, ...args) {
    switch (channel) {
      case 'select-file':
        return await window.nativeBridge.selectFile(args[0]);
      case 'select-directory':
        return await window.nativeBridge.selectDirectory();
      case 'read-dir':
        return await window.nativeBridge.readDir(args[0]);
      case 'read-dir-recursive':
        return await window.nativeBridge.readDirRecursive(args[0]);
      case 'read-file':
        return await window.nativeBridge.readFile(args[0]);
      case 'write-file':
        return await window.nativeBridge.writeFile(args[0], args[1]);
      case 'check-exists':
        return await window.nativeBridge.checkExists(args[0]);
      default:
        console.warn(`[Bridge] Kênh IPC chưa được đăng ký: ${channel}`);
        return null;
    }
  }
};

