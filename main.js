const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Cấu hình đường dẫn userData riêng biệt để tránh lỗi Access is denied (0x5) trên Windows
const userDataPath = path.join(__dirname, 'electron_data');
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}
app.setPath('userData', userDataPath);

// Tắt bộ nhớ đệm GPU và tăng tốc phần cứng để khắc phục lỗi khởi tạo Cache của Chromium
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-cache');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-compositing');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: "AI Game Translator Pro - Premium Edition (RPGMaker & Ren'Py)",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ==========================================
// IPC HANDLERS (GIAO TIẾP VỚI NATIVE OS & FILE SYSTEM)
// ==========================================

// Chọn file
ipcMain.handle('select-file', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }]
  });
  return result;
});

// Chọn thư mục
ipcMain.handle('select-directory', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result;
});

// Đọc danh sách file trong thư mục (đơn cấp)
ipcMain.handle('read-dir', async (event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) return { success: false, error: 'Thư mục không tồn tại' };
    const files = fs.readdirSync(dirPath);
    return { success: true, files };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Đọc danh sách file đệ quy (Recursive) - Đặc biệt quan trọng cho Ren'Py (.rpy nằm trong các thư mục con)
function getAllFilesRecursive(dirPath, arrayOfFiles = [], baseDir = dirPath) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFilesRecursive(fullPath, arrayOfFiles, baseDir);
    } else {
      arrayOfFiles.push({
        name: file,
        fullPath: fullPath,
        relativePath: path.relative(baseDir, fullPath)
      });
    }
  });

  return arrayOfFiles;
}

ipcMain.handle('read-dir-recursive', async (event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) return { success: false, error: 'Thư mục không tồn tại' };
    const files = getAllFilesRecursive(dirPath);
    return { success: true, files };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Đọc nội dung file
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) return { success: false, error: 'File không tồn tại' };
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Ghi nội dung vào file
ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Kiểm tra đường dẫn tồn tại
ipcMain.handle('check-exists', async (event, targetPath) => {
  return fs.existsSync(targetPath);
});
