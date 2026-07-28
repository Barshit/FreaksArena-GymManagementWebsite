(function () {
  const SUMMARY_CARDS_ID = 'summary-cards';
  const ANNOUNCEMENTS_LIST_ID = 'dashboard-announcements';

  async function fetchDashboardStats() {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) {
        throw new Error(`Failed to load dashboard statistics (${response.status})`);
      }
      return await response.json();
    } catch (error) {
      console.error('Unable to load dashboard statistics:', error);
      return null;
    }
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function renderDashboardStats() {
    const container = document.getElementById(SUMMARY_CARDS_ID);
    if (!container) {
      return;
    }

    const stats = await fetchDashboardStats();

    if (!stats) {
      container.innerHTML = '<p style="color: var(--muted); text-align: center; grid-column: 1/-1;">Unable to load statistics. Please refresh the page.</p>';
      return;
    }

    const cards = [
      {
        label: 'Monthly Revenue',
        value: formatCurrency(stats.monthlyRevenue),
        icon: '💰',
      },
      {
        label: 'Expiring in 7 Days',
        value: stats.expiringIn7Days,
        unit: 'members',
        icon: '⏰',
      },
      {
        label: 'Expired Memberships',
        value: stats.expiredMemberships,
        unit: 'members',
        icon: '❌',
      },
      {
        label: 'Pending Payments',
        value: stats.pendingPayments,
        unit: 'payments',
        icon: '📋',
      },
      {
        label: "Today's Birthdays",
        value: stats.birthdaysToday,
        unit: 'members',
        icon: '🎂',
      },
    ];

    container.innerHTML = cards
      .map(
        (card) => `
        <div class="summary-card">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">${card.icon}</div>
          <div class="card-label">${card.label}</div>
          <div class="card-value${typeof card.value === 'number' && card.value > 99 ? ' large' : ''}">${card.value}</div>
          ${card.unit ? `<div class="card-unit">${card.unit}</div>` : ''}
        </div>
      `
      )
      .join('');

    // Render announcements
    const announcementsContainer = document.getElementById(ANNOUNCEMENTS_LIST_ID);
    if (announcementsContainer && stats.announcements && stats.announcements.length > 0) {
      announcementsContainer.innerHTML = stats.announcements
        .map(
          (ann) => `
          <div class="announcement-item">
            <div class="announcement-info">
              <div class="announcement-title">${escapeHtml(ann.title)}</div>
              <div class="announcement-meta">
                <span class="category">${escapeHtml(ann.category)}</span>
                <span class="date">${formatDate(ann.publishedAt)}</span>
              </div>
            </div>
            ${ann.priority === 'Urgent' || ann.priority === 'Important' ? `<span class="priority-badge ${ann.priority === 'Urgent' ? 'urgent' : 'important'}">${escapeHtml(ann.priority)}</span>` : ''}
          </div>
        `
        )
        .join('');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderDashboardStats();
  });
})();
