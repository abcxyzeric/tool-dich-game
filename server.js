const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3000;
const RENDERER_DIR = path.join(__dirname, 'renderer');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

// Mở hộp thoại chọn thư mục chuẩn Windows native qua PowerShell
function selectDirectory() {
  return new Promise((resolve) => {
    const psScript = `
[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null
$f = New-Object System.Windows.Forms.FolderBrowserDialog
$f.Description = 'Chọn thư mục game (chứa thư mục data hoặc file game)'
$f.ShowNewFolderButton = $false
if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $f.SelectedPath
}
`;
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
    exec(`powershell -NoProfile -EncodedCommand ${encoded}`, (err, stdout) => {
      if (err || !stdout.trim()) {
        resolve({ canceled: true, filePaths: [] });
      } else {
        resolve({ canceled: false, filePaths: [stdout.trim()] });
      }
    });
  });
}

// Mở hộp thoại chọn file chuẩn Windows native qua PowerShell
function selectFile(filters) {
  return new Promise((resolve) => {
    let filterStr = 'All Files (*.*)|*.*';
    if (filters && filters.length > 0) {
      filterStr = filters.map(f => `${f.name} (*.${f.extensions.join('; *.')})|*.${f.extensions.join('; *.')}`).join('|');
    }
    const psScript = `
[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null
$f = New-Object System.Windows.Forms.OpenFileDialog
$f.Filter = '${filterStr}'
$f.Multiselect = $false
if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $f.FileName
}
`;
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
    exec(`powershell -NoProfile -EncodedCommand ${encoded}`, (err, stdout) => {
      if (err || !stdout.trim()) {
        resolve({ canceled: true, filePaths: [] });
      } else {
        resolve({ canceled: false, filePaths: [stdout.trim()] });
      }
    });
  });
}

// Quét thư mục đệ quy cho Ren'Py
async function readDirRecursive(dir) {
  const results = [];
  async function scan(currentDir, relativePrefix) {
    const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = relativePrefix ? path.join(relativePrefix, entry.name) : entry.name;
      if (entry.isDirectory()) {
        // Bỏ qua thư mục ẩn và cache
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await scan(fullPath, relPath);
        }
      } else {
        results.push({
          name: entry.name,
          fullPath: fullPath,
          relativePath: relPath
        });
      }
    }
  }
  await scan(dir, '');
  return results;
}

// Xử lý API requests từ Renderer
async function handleApi(req, res, channel, args) {
  try {
    switch (channel) {
      case 'select-directory': {
        const result = await selectDirectory();
        return res.end(JSON.stringify(result));
      }
      case 'select-file': {
        const filters = args[0]?.filters || [];
        const result = await selectFile(filters);
        return res.end(JSON.stringify(result));
      }
      case 'check-exists': {
        const targetPath = args[0];
        const exists = fs.existsSync(targetPath);
        return res.end(JSON.stringify(exists));
      }
      case 'read-file': {
        const filePath = args[0];
        try {
          const content = await fs.promises.readFile(filePath, 'utf-8');
          return res.end(JSON.stringify({ success: true, content }));
        } catch (e) {
          return res.end(JSON.stringify({ success: false, error: e.message }));
        }
      }
      case 'write-file': {
        const filePath = args[0];
        const content = args[1];
        try {
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) {
            await fs.promises.mkdir(dir, { recursive: true });
          }
          await fs.promises.writeFile(filePath, content, 'utf-8');
          return res.end(JSON.stringify({ success: true }));
        } catch (e) {
          return res.end(JSON.stringify({ success: false, error: e.message }));
        }
      }
      case 'read-dir': {
        const dirPath = args[0];
        try {
          const files = await fs.promises.readdir(dirPath);
          return res.end(JSON.stringify({ success: true, files }));
        } catch (e) {
          return res.end(JSON.stringify({ success: false, error: e.message }));
        }
      }
      case 'read-dir-recursive': {
        const dirPath = args[0];
        try {
          const files = await readDirRecursive(dirPath);
          return res.end(JSON.stringify({ success: true, files }));
        } catch (e) {
          return res.end(JSON.stringify({ success: false, error: e.message }));
        }
      }
      default:
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: `Kênh API không hỗ trợ: ${channel}` }));
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: err.message }));
  }
}

// Máy chủ HTTP chính
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Routing API
  if (req.url.startsWith('/api/')) {
    const channel = req.url.substring(5);
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      let args = [];
      try {
        if (bodyStr) args = JSON.parse(bodyStr);
      } catch (e) {}
      res.writeHead(200, { 'Content-Type': 'application/json' });
      await handleApi(req, res, channel, args);
    });
    return;
  }

  // Static files từ renderer
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.join(RENDERER_DIR, decodeURIComponent(reqPath));

  // Chống Directory Traversal
  if (!filePath.startsWith(RENDERER_DIR)) {
    res.writeHead(403);
    return res.end('Truy cập bị từ chối');
  }

  try {
    const stat = await fs.promises.stat(filePath);
    if (stat.isDirectory()) {
      res.writeHead(403);
      return res.end('Directory listing disabled');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Không tìm thấy tệp tin: ' + reqPath);
  }
});

// Khởi động server và mở cửa sổ ứng dụng
server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n======================================================`);
  console.log(`🚀 AI Game Translator Pro - Server đang chạy tại: ${url}`);
  console.log(`⚡ Giao diện Studio & Project Hub sẵn sàng!`);
  console.log(`======================================================\n`);

  // Tự động mở cửa sổ ứng dụng desktop (App Mode không thanh địa chỉ)
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  if (fs.existsSync(edgePath)) {
    exec(`"${edgePath}" --app=${url}`);
  } else if (fs.existsSync(chromePath)) {
    exec(`"${chromePath}" --app=${url}`);
  } else {
    exec(`start ${url}`);
  }
});
