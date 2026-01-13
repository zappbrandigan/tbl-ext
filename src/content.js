chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTables') {
    const tables = extractTablesFromPage();
    sendResponse({ tables });
    return true;
  }
  if (request.action === 'getTableByIndex') {
    const tables = extractTablesFromPage();
    const table = tables[request.tableIndex] || null;
    sendResponse({ table });
  }
  return true;
});

const TABLE_FILTER_CONFIG = {
  domainSuffix: '.umusic.net',
  skipColumnClass: 'mat-column-select',
  skipTfoot: true
};

function extractTablesFromPage() {
  const tables = document.querySelectorAll('table');
  const tablesData = [];

  tables.forEach((table, index) => {
    if (!isVisibleTable(table)) {
      return;
    }

    const tableData = extractTableData(table);

    if (tableData.data.length > 0 && tableData.data[0].length > 0) {
      const title = getTableTitle(table, index);

      tablesData.push({
        title,
        rows: tableData.data.length,
        cols: tableData.data[0].length,
        data: tableData.data
      });
    }
  });

  return tablesData;
}

function isVisibleTable(table) {
  const style = window.getComputedStyle(table);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  const rect = table.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return false;
  }

  return true;
}

function extractTableData(table) {
  const data = [];
  const rows = getTableRows(table, window.location.hostname);
  const skipColumns = getSkipColumns(table, window.location.hostname);

  rows.forEach((row) => {
    const rowData = [];
    const cells = row.querySelectorAll('th, td');
    let colIndex = 0;

    cells.forEach((cell) => {
      const colspan = parseInt(cell.getAttribute('colspan')) || 1;
      const cellText = cell.innerText.trim();

      for (let i = 0; i < colspan; i++) {
        if (!skipColumns.has(colIndex + i)) {
          rowData.push(cellText);
        }
      }
      colIndex += colspan;
    });

    if (rowData.length > 0) {
      data.push(rowData);
    }
  });

  normalizeTableData(data);

  return { data };
}

function getTableRows(table, hostname) {
  const rows = table.querySelectorAll('tr');

  if (!shouldApplyDomainFilters(hostname) || !TABLE_FILTER_CONFIG.skipTfoot) {
    return rows;
  }

  return Array.from(rows).filter((row) => row.closest('tfoot') === null);
}

function getSkipColumns(table, hostname) {
  const skipColumns = new Set();

  if (!shouldApplyDomainFilters(hostname)) {
    return skipColumns;
  }

  const rows = table.querySelectorAll('tr');
  rows.forEach((row) => {
    const cells = row.querySelectorAll('th, td');
    let colIndex = 0;

    cells.forEach((cell) => {
      const colspan = parseInt(cell.getAttribute('colspan')) || 1;
      if (cell.classList.contains(TABLE_FILTER_CONFIG.skipColumnClass)) {
        for (let i = 0; i < colspan; i++) {
          skipColumns.add(colIndex + i);
        }
      }
      colIndex += colspan;
    });
  });

  return skipColumns;
}

function shouldApplyDomainFilters(hostname) {
  return hostname === TABLE_FILTER_CONFIG.domainSuffix.slice(1)
    || hostname.endsWith(TABLE_FILTER_CONFIG.domainSuffix);
}

function normalizeTableData(data) {
  if (data.length === 0) return;

  const maxCols = Math.max(...data.map(row => row.length));

  data.forEach(row => {
    while (row.length < maxCols) {
      row.push('');
    }
  });
}

function getTableTitle(table, index) {
  let title = '';

  const caption = table.querySelector('caption');
  if (caption) {
    title = caption.innerText.trim();
  }

  if (!title) {
    const prevHeading = findPreviousHeading(table);
    if (prevHeading) {
      title = prevHeading.innerText.trim();
    }
  }

  if (!title) {
    const ariaLabel = table.getAttribute('aria-label');
    if (ariaLabel) {
      title = ariaLabel.trim();
    }
  }

  if (!title) {
    const id = table.getAttribute('id');
    if (id) {
      title = id.replace(/[-_]/g, ' ').trim();
    }
  }

  if (!title) {
    title = `Table ${index + 1}`;
  }

  return title;
}

function findPreviousHeading(element) {
  let current = element.previousElementSibling;

  while (current) {
    if (/^H[1-6]$/.test(current.tagName)) {
      return current;
    }
    current = current.previousElementSibling;
  }

  const parent = element.parentElement;
  if (parent && parent !== document.body) {
    const parentPrev = parent.previousElementSibling;
    if (parentPrev && /^H[1-6]$/.test(parentPrev.tagName)) {
      return parentPrev;
    }
  }

  return null;
}
