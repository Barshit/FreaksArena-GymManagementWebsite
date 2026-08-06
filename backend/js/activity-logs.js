(function () {
  const logsContainer = document.getElementById('logs-container');
  const paginationContainer = document.getElementById('pagination-container');
  const errorContainer = document.getElementById('error-container');
  const searchInput = document.getElementById('search-input');
  const actionFilter = document.getElementById('action-filter');
  const moduleFilter = document.getElementById('module-filter');
  const startDateFilter = document.getElementById('start-date-filter');
  const endDateFilter = document.getElementById('end-date-filter');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');

  let currentPage = 1;
  const limit = 50;

  function getActionBadgeClass(action) {
    if (action.includes('login') || action.includes('add') || action.includes('renewed')) {
      return 'action-login';
    }
    if (action.includes('logout') || action.includes('delete') || action.includes('paused')) {
      return 'action-logout';
    }
    if (action.includes('password')) {
      return 'action-password';
    }
    if (action.includes('update')) {
      return 'action-update';
    }
    return 'action-update';
  }

  function formatAction(action) {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function formatModule(module) {
    return module.charAt(0).toUpperCase() + module.slice(1);
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  function renderLogs(data) {
    if (!data.logs || data.logs.length === 0) {
      logsContainer.innerHTML = '<div class="empty-state">No activity logs found.</div>';
      paginationContainer.style.display = 'none';
      return;
    }

    let html = '<table class="logs-table"><thead><tr>';
    html += '<th>Date & Time</th>';
    html += '<th>Admin</th>';
    html += '<th>Action</th>';
    html += '<th>Module</th>';
    html += '<th>Record ID</th>';
    html += '<th>Description</th>';
    html += '<th>Status</th>';
    html += '</tr></thead><tbody>';

    data.logs.forEach((log) => {
      const badgeClass = getActionBadgeClass(log.action);
      const statusClass = log.status === 'success' ? 'status-success' : 'status-failed';
      const adminName = log.admin?.name || 'Unknown';

      html += '<tr>';
      html += `<td>${formatDate(log.createdAt)}</td>`;
      html += `<td>${adminName}</td>`;
      html += `<td><span class="action-badge ${badgeClass}">${formatAction(log.action)}</span></td>`;
      html += `<td><span class="module-badge">${formatModule(log.module)}</span></td>`;
      html += `<td>${log.recordId || '-'}</td>`;
      html += `<td>${log.description || '-'}</td>`;
      html += `<td><span class="${statusClass}">${log.status}</span></td>`;
      html += '</tr>';
    });

    html += '</tbody></table>';
    logsContainer.innerHTML = html;

    renderPagination(data.pagination);
  }

  function renderPagination(pagination) {
    if (pagination.totalPages <= 1) {
      paginationContainer.style.display = 'none';
      return;
    }

    paginationContainer.style.display = 'flex';
    paginationContainer.innerHTML = '';

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Previous';
    prevBtn.disabled = pagination.page <= 1;
    prevBtn.addEventListener('click', () => {
      if (pagination.page > 1) {
        currentPage = pagination.page - 1;
        fetchLogs();
      }
    });
    paginationContainer.appendChild(prevBtn);

    for (let i = 1; i <= pagination.totalPages; i++) {
      if (
        i === 1 ||
        i === pagination.totalPages ||
        (i >= pagination.page - 1 && i <= pagination.page + 1)
      ) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-number ${i === pagination.page ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.disabled = i === pagination.page;
        pageBtn.addEventListener('click', () => {
          currentPage = i;
          fetchLogs();
        });
        paginationContainer.appendChild(pageBtn);
      } else if (i === pagination.page - 2 || i === pagination.page + 2) {
        const dots = document.createElement('span');
        dots.className = 'page-number';
        dots.textContent = '...';
        paginationContainer.appendChild(dots);
      }
    }

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next →';
    nextBtn.disabled = pagination.page >= pagination.totalPages;
    nextBtn.addEventListener('click', () => {
      if (pagination.page < pagination.totalPages) {
        currentPage = pagination.page + 1;
        fetchLogs();
      }
    });
    paginationContainer.appendChild(nextBtn);
  }

  function showError(message) {
    errorContainer.innerHTML = `<div class="error-message">${message}</div>`;
  }

  function clearError() {
    errorContainer.innerHTML = '';
  }

  async function fetchLogs() {
    try {
      clearError();
      logsContainer.innerHTML = '<div class="loading">Loading activity logs...</div>';

      const params = new URLSearchParams({
        page: currentPage,
        limit: limit,
      });

      if (searchInput.value.trim()) {
        params.append('search', searchInput.value.trim());
      }

      if (actionFilter.value) {
        params.append('action', actionFilter.value);
      }

      if (moduleFilter.value) {
        params.append('module', moduleFilter.value);
      }

      if (startDateFilter.value) {
        params.append('startDate', startDateFilter.value);
      }

      if (endDateFilter.value) {
        params.append('endDate', endDateFilter.value);
      }

      const response = await fetch(`/api/activity-logs?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/admin-login';
          return;
        }
        throw new Error('Failed to fetch activity logs');
      }

      const data = await response.json();
      renderLogs(data);
    } catch (error) {
      console.error('Error fetching logs:', error);
      showError('Unable to load activity logs. Please try again later.');
      logsContainer.innerHTML = '';
    }
  }

  function setupEventListeners() {
    searchInput.addEventListener('change', () => {
      currentPage = 1;
      fetchLogs();
    });

    actionFilter.addEventListener('change', () => {
      currentPage = 1;
      fetchLogs();
    });

    moduleFilter.addEventListener('change', () => {
      currentPage = 1;
      fetchLogs();
    });

    startDateFilter.addEventListener('change', () => {
      currentPage = 1;
      fetchLogs();
    });

    endDateFilter.addEventListener('change', () => {
      currentPage = 1;
      fetchLogs();
    });

    clearFiltersBtn.addEventListener('click', () => {
      searchInput.value = '';
      actionFilter.value = '';
      moduleFilter.value = '';
      startDateFilter.value = '';
      endDateFilter.value = '';
      currentPage = 1;
      fetchLogs();
    });
  }

  function init() {
    if (!logsContainer) {
      return;
    }

    setupEventListeners();
    fetchLogs();
  }

  init();
})();
