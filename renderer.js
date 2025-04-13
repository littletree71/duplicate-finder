const { ipcRenderer, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let selectedFolders = [];
let allResults = [];

document.getElementById('selectBtn').addEventListener('click', async () => {
  const newFolders = await ipcRenderer.invoke('select-folders');
  
  // 避免重複加入相同的資料夾
  newFolders.forEach(folder => {
    if (!selectedFolders.includes(folder)) {
      selectedFolders.push(folder);
    }
  });

  updateFolderList();
});

document.getElementById('scanBtn').addEventListener('click', async () => {
  if (selectedFolders.length === 0) {
    alert('Please select folders first!');
    return;
  }
  
  // 顯示 Loading 訊息
  document.getElementById('loadingMessage').style.display = 'block';
  document.getElementById('result').innerHTML = '';

  const useDate = document.getElementById('useDate').checked;
  const useHash = document.getElementById('useHash').checked;
  const extFilterRaw = document.getElementById('extFilter').value;
  const extFilter = extFilterRaw
    .split(',')
    .map(x => x.trim().toLowerCase())
    .filter(x => x.startsWith('.'));

  const config = { folders: selectedFolders, useDate, useHash, extFilter };
  const duplicates = await ipcRenderer.invoke('find-duplicates', config);
  allResults = duplicates;
  renderResults(duplicates);
  
  // 隱藏 Loading 訊息
  document.getElementById('loadingMessage').style.display = 'none';
});

document.getElementById('filterInput').addEventListener('input', debounce(() => {
  const keyword = document.getElementById('filterInput').value.trim().toLowerCase();
  const filtered = allResults.filter(group =>
    group.files.some(file => file.toLowerCase().includes(keyword))
  );
  renderResults(filtered);
}, 300));


function renderResults(groups) {
  const result = document.getElementById('result');
  result.innerHTML = '';

  if (groups.length === 0) {
    result.innerHTML = '<li>No matching duplicates found.</li>';
    return;
  }

  for (const group of groups) {
    const li = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = `Duplicate Group: ${group.key}`;
    li.appendChild(title);

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'separate';
    table.style.borderSpacing = '1rem';

    let row;

    group.files.forEach((file, index) => {
      if (index % 2 === 0) {
        row = document.createElement('tr');
        table.appendChild(row);
      }

      const td = document.createElement('td');
      td.style.verticalAlign = 'top';
      td.style.background = '#f9f9f9';
      td.style.border = '1px solid #ddd';
      td.style.padding = '0.5rem';
      td.style.borderRadius = '6px';
      td.style.width = '50%';

      const stats = fs.statSync(file);
      const date = new Date(stats.mtimeMs).toLocaleString();
      const size = formatSize(stats.size);

      const pathLine = document.createElement('div');
      pathLine.textContent = file;

      const folderLink = document.createElement('a');
      folderLink.href = '#';
      folderLink.textContent = ' [Open Folder]';
      folderLink.style.marginLeft = '0.5rem';
      folderLink.addEventListener('click', (e) => {
        e.preventDefault();
        shell.showItemInFolder(file);
      });
      pathLine.appendChild(folderLink);

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑️';
      deleteBtn.title = 'Delete this file';
      deleteBtn.style.marginLeft = '0.5rem';
      deleteBtn.style.color = 'red';
      deleteBtn.style.border = 'none';
      deleteBtn.style.background = 'transparent';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.addEventListener('click', () => {
        deleteFile(file);
      });
      pathLine.appendChild(deleteBtn);


      const metaLine = document.createElement('div');
      metaLine.style.fontSize = '0.9em';
      metaLine.style.color = '#666';
      metaLine.textContent = `Last Modified: ${date} | Size: ${size}`;

      td.appendChild(pathLine);
      td.appendChild(metaLine);

      const ext = path.extname(file).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext)) {
        const img = document.createElement('img');
        img.src = `file://${file}`;
        img.className = 'thumb';
        td.appendChild(img);
      }

      row.appendChild(td);
    });

    li.appendChild(table);
    result.appendChild(li);
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function updateFolderList() {
  const list = document.getElementById('folderList');
  list.innerHTML = '';

  if (selectedFolders.length === 0) {
    list.textContent = 'No folders selected.';
    return;
  }

  selectedFolders.forEach((folder, index) => {
    const badge = document.createElement('span');
    badge.textContent = folder;
    badge.className = 'folder-badge';

    // 新增刪除按鈕
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '❌';
    removeBtn.title = 'Remove this folder';
    removeBtn.style.marginLeft = '0.5rem';
    removeBtn.style.color = 'red';
    removeBtn.style.border = 'none';
    removeBtn.style.background = 'transparent';
    removeBtn.style.cursor = 'pointer';

    removeBtn.addEventListener('click', () => {
      selectedFolders.splice(index, 1); // 移除該資料夾
      updateFolderList(); // 更新列表
    });

    badge.appendChild(removeBtn);
    list.appendChild(badge);
  });
}

async function deleteFile(filePath) {
  const confirmed = confirm(`Are you sure you want to move this file to the Recycle Bin?\n\n${filePath}`);
  if (!confirmed) return;

  try {
    await shell.trashItem(filePath);
    logDeletion(filePath);

    alert('File moved to Recycle Bin.');

    // 從 allResults 中移除該檔案並重新 render
    allResults.forEach(group => {
      group.files = group.files.filter(f => f !== filePath);
    });
    allResults = allResults.filter(group => group.files.length > 1);
    renderResults(allResults);
  } catch (err) {
    alert(`Failed to delete file:\n\n${err.message}`);
  }
}

const logPath = path.join(__dirname, 'delete-log.txt');

function logDeletion(filePath) {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const line = `[${now}] Deleted: ${filePath}\n`;
  fs.appendFile(getLogPath(), line, (err) => {
    if (err) console.error('Failed to log deletion:', err);
  });
}

function getLogPath() {
  const today = new Date().toISOString().substring(0, 10); // 2025-04-14
  return path.join(__dirname, `delete-log-${today}.txt`);
}

document.getElementById('viewLogBtn').addEventListener('click', () => {
  const logFile = getLogPath();
  if (!fs.existsSync(logFile)) {
    alert('No log file for today yet.');
    return;
  }
  shell.openPath(logFile);
});
