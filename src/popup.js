let tablesData = [];
let activeTabId = null;
let paginationSession = null;

document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const tableListEl = document.getElementById('tableList');
  const exportAllBtn = document.getElementById('exportAll');
  const modeRadios = document.querySelectorAll('input[name="mode"]');
  const startPaginationBtn = document.getElementById('startPagination');
  const capturePageBtn = document.getElementById('capturePage');
  const finishPaginationBtn = document.getElementById('finishPagination');
  const clearPaginationBtn = document.getElementById('clearPagination');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTabId = tab?.id ?? null;

    chrome.tabs.sendMessage(activeTabId, { action: 'getTables' }, async (response) => {
      if (chrome.runtime.lastError) {
        statusEl.className = 'error';
        statusEl.textContent = 'Error: Unable to scan page. Try refreshing.';
        return;
      }

      if (response && response.tables) {
        tablesData = response.tables;
        displayTables(tablesData);
        populateTableSelect(tablesData);
        await initPaginationState();
        applyDefaultMode();
      } else {
        statusEl.className = 'error';
        statusEl.textContent = 'No tables found on this page';
        tableListEl.innerHTML = '<div class="no-tables"><div class="icon">📋</div><p>No tables detected on the current page</p></div>';
        populateTableSelect([]);
        await initPaginationState();
        applyDefaultMode();
      }
    });
  } catch (error) {
    statusEl.className = 'error';
    statusEl.textContent = 'Error: ' + error.message;
  }

  exportAllBtn.addEventListener('click', () => {
    exportAllTables();
  });

  modeRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      setMode(radio.value);
    });
  });

  startPaginationBtn.addEventListener('click', () => {
    startPaginationCapture();
  });

  capturePageBtn.addEventListener('click', () => {
    captureCurrentPage();
  });

  finishPaginationBtn.addEventListener('click', () => {
    exportPaginationData();
  });

  clearPaginationBtn.addEventListener('click', () => {
    clearPaginationSession();
  });

  setMode(getCurrentMode());
});

function displayTables(tables) {
  const statusEl = document.getElementById('status');
  const tableListEl = document.getElementById('tableList');
  const exportAllBtn = document.getElementById('exportAll');

  if (tables.length === 0) {
    statusEl.className = 'error';
    statusEl.textContent = 'No tables found on this page';
    tableListEl.innerHTML = '<div class="no-tables"><div class="icon">📋</div><p>No tables detected on the current page</p></div>';
    exportAllBtn.style.display = 'none';
    return;
  }

  statusEl.className = 'success';
  statusEl.textContent = `Found ${tables.length} table${tables.length > 1 ? 's' : ''}`;

  if (tables.length > 1 && getCurrentMode() === 'single') {
    exportAllBtn.style.display = 'block';
  } else {
    exportAllBtn.style.display = 'none';
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
      if (getCurrentMode() === 'single') {
        exportTable(table, index);
      } else {
        const paginationTableSelect = document.getElementById('paginationTableSelect');
        paginationTableSelect.value = String(index);
      }
    });

    tableListEl.appendChild(tableItem);
  });
}

function populateTableSelect(tables) {
  const paginationTableSelect = document.getElementById('paginationTableSelect');
  paginationTableSelect.innerHTML = '';

  if (tables.length === 0) {
    const option = document.createElement('option');
    option.textContent = 'No tables detected';
    option.disabled = true;
    option.selected = true;
    paginationTableSelect.appendChild(option);
    return;
  }

  tables.forEach((table, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = table.title || `Table ${index + 1}`;
    paginationTableSelect.appendChild(option);
  });
}

function getCurrentMode() {
  const checked = document.querySelector('input[name="mode"]:checked');
  return checked ? checked.value : 'single';
}

function setModeSelection(mode) {
  const target = document.querySelector(`input[name="mode"][value="${mode}"]`);
  if (target) {
    target.checked = true;
  }
}

function applyDefaultMode() {
  if (paginationSession) {
    setModeSelection('pagination');
    setMode('pagination');
    return;
  }

  setModeSelection('single');
  setMode('single');
}

function setMode(mode) {
  const paginationControls = document.getElementById('paginationControls');
  const exportAllBtn = document.getElementById('exportAll');

  if (mode === 'pagination') {
    paginationControls.style.display = 'block';
    exportAllBtn.style.display = 'none';
  } else {
    paginationControls.style.display = 'none';
    exportAllBtn.style.display = tablesData.length > 1 ? 'block' : 'none';
  }
}

async function initPaginationState() {
  paginationSession = await loadPaginationSession(activeTabId);
  updatePaginationUI();
}

function setPaginationStatus(message, type) {
  const paginationStatusEl = document.getElementById('paginationStatus');
  paginationStatusEl.textContent = message;
  paginationStatusEl.className = type ? `pagination-status ${type}` : 'pagination-status';
}

function updatePaginationUI() {
  const paginationTableSelect = document.getElementById('paginationTableSelect');
  const startPaginationBtn = document.getElementById('startPagination');
  const capturePageBtn = document.getElementById('capturePage');
  const finishPaginationBtn = document.getElementById('finishPagination');
  const clearPaginationBtn = document.getElementById('clearPagination');

  const hasTables = tablesData.length > 0;

  if (!paginationSession) {
    paginationTableSelect.disabled = !hasTables;
    startPaginationBtn.disabled = !hasTables;
    capturePageBtn.disabled = true;
    finishPaginationBtn.disabled = true;
    clearPaginationBtn.disabled = true;
    setPaginationStatus(hasTables ? 'No capture session yet.' : 'No tables available for capture.', '');
    return;
  }

  paginationTableSelect.disabled = true;
  startPaginationBtn.disabled = true;
  capturePageBtn.disabled = false;
  finishPaginationBtn.disabled = paginationSession.data.length === 0;
  clearPaginationBtn.disabled = false;
  setPaginationStatus(`Capturing "${paginationSession.title}" • ${paginationSession.data.length} rows`, 'success');
}

async function startPaginationCapture() {
  if (!activeTabId) {
    setPaginationStatus('No active tab available.', 'error');
    return;
  }

  const paginationTableSelect = document.getElementById('paginationTableSelect');
  const tableIndex = Number.parseInt(paginationTableSelect.value, 10);
  const table = tablesData[tableIndex];

  if (!table) {
    setPaginationStatus('Select a table to capture.', 'error');
    return;
  }

  paginationSession = {
    tabId: activeTabId,
    tableIndex,
    title: table.title || `Table ${tableIndex + 1}`,
    data: []
  };

  await savePaginationSession(activeTabId, paginationSession);
  updatePaginationUI();
  captureCurrentPage();
}

function rowsEqual(left, right) {
  if (!left || !right || left.length !== right.length) {
    return false;
  }

  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) {
      return false;
    }
  }

  return true;
}

function mergePaginatedData(existing, incoming) {
  if (!incoming || incoming.length === 0) {
    return { merged: existing.slice(), addedRows: 0, skippedHeader: false };
  }

  if (existing.length === 0) {
    return { merged: incoming.slice(), addedRows: incoming.length, skippedHeader: false };
  }

  const shouldSkipHeader = rowsEqual(existing[0], incoming[0]);
  const startIndex = shouldSkipHeader ? 1 : 0;
  const merged = existing.concat(incoming.slice(startIndex));
  return { merged, addedRows: incoming.length - startIndex, skippedHeader: shouldSkipHeader };
}

function captureCurrentPage() {
  if (!paginationSession) {
    setPaginationStatus('Start a capture session first.', 'error');
    return;
  }

  chrome.tabs.sendMessage(
    activeTabId,
    { action: 'getTableByIndex', tableIndex: paginationSession.tableIndex },
    async (response) => {
      if (chrome.runtime.lastError) {
        setPaginationStatus('Error: Unable to scan page. Try refreshing.', 'error');
        return;
      }

      if (!response || !response.table) {
        setPaginationStatus('Unable to find the selected table on this page.', 'error');
        return;
      }

      const mergeResult = mergePaginatedData(paginationSession.data, response.table.data);
      paginationSession.data = mergeResult.merged;

      await savePaginationSession(activeTabId, paginationSession);
      updatePaginationUI();

      const headerNote = mergeResult.skippedHeader ? ' (header skipped)' : '';
      setPaginationStatus(
        `Captured ${mergeResult.addedRows} rows${headerNote}. Total ${paginationSession.data.length} rows.`,
        'success'
      );
    }
  );
}

function exportPaginationData() {
  if (!paginationSession || paginationSession.data.length === 0) {
    setPaginationStatus('Capture at least one page before exporting.', 'error');
    return;
  }

  const csv = arrayToCSV(paginationSession.data);
  const filename = sanitizeFilename(`${paginationSession.title}_paginated`) + '.csv';
  downloadCSV(csv, filename);
}

async function clearPaginationSession() {
  if (!activeTabId) {
    paginationSession = null;
    updatePaginationUI();
    return;
  }

  await deletePaginationSession(activeTabId);
  paginationSession = null;
  updatePaginationUI();
  setPaginationStatus('Capture session cleared.', '');
}

function getPaginationSessions() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['paginationSessions'], (result) => {
      resolve(result.paginationSessions || {});
    });
  });
}

async function loadPaginationSession(tabId) {
  if (!tabId) {
    return null;
  }

  const sessions = await getPaginationSessions();
  return sessions[String(tabId)] || null;
}

async function savePaginationSession(tabId, session) {
  if (!tabId) {
    return;
  }

  const sessions = await getPaginationSessions();
  sessions[String(tabId)] = session;
  chrome.storage.local.set({ paginationSessions: sessions });
}

async function deletePaginationSession(tabId) {
  const sessions = await getPaginationSessions();
  delete sessions[String(tabId)];
  chrome.storage.local.set({ paginationSessions: sessions });
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
