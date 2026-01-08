let tablesData = [];

document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const tableListEl = document.getElementById('tableList');
  const exportAllBtn = document.getElementById('exportAll');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, { action: 'getTables' }, (response) => {
      if (chrome.runtime.lastError) {
        statusEl.className = 'error';
        statusEl.textContent = 'Error: Unable to scan page. Try refreshing.';
        return;
      }

      if (response && response.tables) {
        tablesData = response.tables;
        displayTables(tablesData);
      } else {
        statusEl.className = 'error';
        statusEl.textContent = 'No tables found on this page';
        tableListEl.innerHTML = '<div class="no-tables"><div class="icon">📋</div><p>No tables detected on the current page</p></div>';
      }
    });
  } catch (error) {
    statusEl.className = 'error';
    statusEl.textContent = 'Error: ' + error.message;
  }

  exportAllBtn.addEventListener('click', () => {
    exportAllTables();
  });
});

function displayTables(tables) {
  const statusEl = document.getElementById('status');
  const tableListEl = document.getElementById('tableList');
  const exportAllBtn = document.getElementById('exportAll');

  if (tables.length === 0) {
    statusEl.className = 'error';
    statusEl.textContent = 'No tables found on this page';
    tableListEl.innerHTML = '<div class="no-tables"><div class="icon">📋</div><p>No tables detected on the current page</p></div>';
    return;
  }

  statusEl.className = 'success';
  statusEl.textContent = `Found ${tables.length} table${tables.length > 1 ? 's' : ''}`;

  if (tables.length > 1) {
    exportAllBtn.style.display = 'block';
  }

  tableListEl.innerHTML = '';

  tables.forEach((table, index) => {
    const tableItem = document.createElement('div');
    tableItem.className = 'table-item';

    const title = document.createElement('div');
    title.className = 'table-title';
    title.textContent = table.title || `Table ${index + 1}`;

    const info = document.createElement('div');
    info.className = 'table-info';
    info.textContent = `${table.rows} rows × ${table.cols} columns`;

    tableItem.appendChild(title);
    tableItem.appendChild(info);

    tableItem.addEventListener('click', () => {
      exportTable(table, index);
    });

    tableListEl.appendChild(tableItem);
  });
}

function exportTable(table, index) {
  const csv = arrayToCSV(table.data);
  const filename = sanitizeFilename(table.title || `table_${index + 1}`) + '.csv';
  downloadCSV(csv, filename);
}

function exportAllTables() {
  tablesData.forEach((table, index) => {
    setTimeout(() => {
      exportTable(table, index);
    }, index * 100);
  });
}

function arrayToCSV(data) {
  return data.map(row => {
    return row.map(cell => {
      const cellStr = String(cell || '');
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return '"' + cellStr.replace(/"/g, '""') + '"';
      }
      return cellStr;
    }).join(',');
  }).join('\n');
}

function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase()
    .substring(0, 50);
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
