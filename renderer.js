const { ipcRenderer, shell } = require('electron');
const path = require('path');
const fs = require('fs');
let selectedFolders = [];

document.getElementById('selectBtn').addEventListener('click', async () => {
  selectedFolders = await ipcRenderer.invoke('select-folders');
  alert(`Selected:\n${selectedFolders.join('\n')}`);
});

document.getElementById('scanBtn').addEventListener('click', async () => {
  if (selectedFolders.length === 0) {
    alert('Please select folders first!');
    return;
  }

  const useDate = document.getElementById('useDate').checked;
  const useHash = document.getElementById('useHash').checked;
  const extFilterRaw = document.getElementById('extFilter').value;
  const extFilter = extFilterRaw
    .split(',')
    .map(x => x.trim().toLowerCase())
    .filter(x => x.startsWith('.'));

  const config = { folders: selectedFolders, useDate, useHash, extFilter };
  const duplicates = await ipcRenderer.invoke('find-duplicates', config);
  const result = document.getElementById('result');
  result.innerHTML = '';

  if (duplicates.length === 0) {
    result.innerHTML = '<li>No duplicates found.</li>';
    return;
  }

  for (const group of duplicates) {
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
      folderLink.textContent = '[Open Folder]';
      folderLink.style.marginLeft = '0.5rem';
      folderLink.addEventListener('click', (e) => {
        e.preventDefault();
        shell.showItemInFolder(file);
      });
      pathLine.appendChild(folderLink);

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
});

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
