(function () {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  let currentFilter = 'month';
  let customStartDate = null;
  let customEndDate = null;

  function initializeYearDropdown() {
    const yearSelect = document.getElementById('revenue-year');
    if (!yearSelect) return;

    for (let year = currentYear - 5; year <= currentYear + 5; year++) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      if (year === currentYear) {
        option.selected = true;
      }
      yearSelect.appendChild(option);
    }
  }

  function initializeMonthDropdown() {
    const monthSelect = document.getElementById('revenue-month');
    if (monthSelect) {
      monthSelect.value = currentMonth;
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

  let monthlyRevenueChart = null;
  let memberGrowthChart = null;
  let planDistributionChart = null;
  let paymentMethodChart = null;

  function destroyChart(chart) {
    if (chart) {
      chart.destroy();
    }
  }

  // Fetch Monthly Revenue Report
  async function fetchMonthlyRevenueReport() {
    try {
      const month = document.getElementById('revenue-month').value;
      const year = document.getElementById('revenue-year').value;

      const response = await fetch(`/api/reports/monthly-revenue?month=${month}&year=${year}`);
      if (!response.ok) {
        throw new Error('Failed to fetch monthly revenue report');
      }

      const data = await response.json();
      renderMonthlyRevenueCards(data);
    } catch (error) {
      console.error('Error fetching monthly revenue report:', error);
      renderMonthlyRevenueError();
    }
  }

  function renderMonthlyRevenueCards(data) {
    const container = document.getElementById('monthly-revenue-cards');
    if (!container) return;

    const monthName = new Date(2024, parseInt(data.month) - 1, 1).toLocaleString('default', { month: 'long' });

    container.innerHTML = `
      <div class="report-card revenue">
        <div class="card-icon">💰</div>
        <div class="card-label">Total Revenue</div>
        <div class="card-value">${formatCurrency(data.totalRevenue)}</div>
        <div class="card-subtext">${monthName} ${data.year}</div>
      </div>
      <div class="report-card revenue">
        <div class="card-icon">📊</div>
        <div class="card-label">Total Payments</div>
        <div class="card-value">${data.totalPayments}</div>
        <div class="card-subtext">Completed payments</div>
      </div>
    `;
  }

  function renderMonthlyRevenueError() {
    const container = document.getElementById('monthly-revenue-cards');
    if (!container) return;

    container.innerHTML = `
      <div class="report-card error">
        <div class="card-label">Error</div>
        <div class="card-value">Unable to load report</div>
        <div class="card-subtext">Please try again later</div>
      </div>
    `;
  }

  // Fetch Revenue Report (with date range)
  async function fetchRevenueReport() {
    try {
      const params = new URLSearchParams({
        filter: currentFilter,
        ...(currentFilter === 'custom' && customStartDate && customEndDate && {
          startDate: customStartDate,
          endDate: customEndDate,
        }),
      });

      const response = await fetch(`/api/reports/revenue?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch revenue report');
      }

      const data = await response.json();
      renderRevenueCards(data);
    } catch (error) {
      console.error('Error fetching revenue report:', error);
      renderRevenueError();
    }
  }

  function renderRevenueCards(data) {
    const container = document.getElementById('revenue-cards');
    if (!container) return;

    container.innerHTML = `
      <div class="report-card revenue">
        <div class="card-icon">💰</div>
        <div class="card-label">Total Revenue</div>
        <div class="card-value">${formatCurrency(data.revenue.total)}</div>
        <div class="card-subtext">${data.filter}</div>
      </div>
      <div class="report-card revenue">
        <div class="card-icon">📊</div>
        <div class="card-label">Total Payments</div>
        <div class="card-value">${data.revenue.payments}</div>
        <div class="card-subtext">Completed payments</div>
      </div>
      <div class="report-card revenue">
        <div class="card-icon">📈</div>
        <div class="card-label">All-Time Revenue</div>
        <div class="card-value">${formatCurrency(data.allTimeRevenue)}</div>
        <div class="card-subtext">Total since beginning</div>
      </div>
    `;
  }

  function renderRevenueError() {
    const container = document.getElementById('revenue-cards');
    if (!container) return;

    container.innerHTML = `
      <div class="report-card error">
        <div class="card-label">Error</div>
        <div class="card-value">Unable to load report</div>
        <div class="card-subtext">Please try again later</div>
      </div>
    `;
  }

  async function fetchReportCharts() {
    try {
      const response = await fetch('/api/reports/charts');
      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }

      const data = await response.json();
      renderMonthlyRevenueChart(data.labels, data.monthlyRevenue);
      renderMemberGrowthChart(data.labels, data.memberGrowth);
      renderPlanDistributionChart(data.planDistribution);
      renderPaymentMethodChart(data.paymentMethodDistribution);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      renderChartErrors();
    }
  }

  function renderChartErrors() {
    const chartIds = [
      'monthly-revenue-chart',
      'member-growth-chart',
      'plan-distribution-chart',
      'payment-method-chart',
    ];

    chartIds.forEach(id => {
      const canvas = document.getElementById(id);
      if (canvas) {
        const context = canvas.getContext('2d');
        if (context) {
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.font = '14px Arial';
          context.fillStyle = '#4b5563';
          context.fillText('Unable to load chart', 10, 20);
        }
      }
    });
  }

  function renderMonthlyRevenueChart(labels, values) {
    const canvas = document.getElementById('monthly-revenue-chart');
    if (!canvas) return;
    destroyChart(monthlyRevenueChart);

    monthlyRevenueChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Revenue (₹)',
            data: values,
            backgroundColor: 'rgba(16, 185, 129, 0.7)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { ticks: { color: '#374151' } },
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => formatCurrency(value),
              color: '#374151',
            },
          },
        },
      },
    });
  }

  function renderMemberGrowthChart(labels, values) {
    const canvas = document.getElementById('member-growth-chart');
    if (!canvas) return;
    destroyChart(memberGrowthChart);

    memberGrowthChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'New Members',
            data: values,
            fill: true,
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: 'rgba(59, 130, 246, 1)',
            tension: 0.3,
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: '#374151' } },
          y: {
            beginAtZero: true,
            ticks: { color: '#374151' },
          },
        },
      },
    });
  }

  function renderPlanDistributionChart(data) {
    const canvas = document.getElementById('plan-distribution-chart');
    if (!canvas) return;
    destroyChart(planDistributionChart);

    const labels = Object.keys(data);
    const values = Object.values(data);

    planDistributionChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: ['#0284c7', '#7c3aed', '#0ea5e9', '#a1a1aa'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#374151' } },
        },
      },
    });
  }

  function renderPaymentMethodChart(data) {
    const canvas = document.getElementById('payment-method-chart');
    if (!canvas) return;
    destroyChart(paymentMethodChart);

    const labels = Object.keys(data);
    const values = Object.values(data);

    paymentMethodChart = new Chart(canvas, {
      type: 'pie',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: ['#f97316', '#f59e0b', '#10b981', '#3b82f6', '#818cf8'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#374151' } },
        },
      },
    });
  }

  // Fetch Membership Report
  async function fetchMembershipReport() {
    try {
      const response = await fetch('/api/reports/membership');
      if (!response.ok) {
        throw new Error('Failed to fetch membership report');
      }

      const data = await response.json();
      renderMembershipCards(data);
    } catch (error) {
      console.error('Error fetching membership report:', error);
      renderMembershipError();
    }
  }

  function renderMembershipCards(data) {
    const container = document.getElementById('membership-cards');
    if (!container) return;

    container.innerHTML = `
      <div class="report-card active">
        <div class="card-icon">✅</div>
        <div class="card-label">Active Members</div>
        <div class="card-value">${data.active}</div>
        <div class="card-subtext">Currently active</div>
      </div>
      <div class="report-card expired">
        <div class="card-icon">❌</div>
        <div class="card-label">Expired Members</div>
        <div class="card-value">${data.expired}</div>
        <div class="card-subtext">Needs renewal</div>
      </div>
      <div class="report-card paused">
        <div class="card-icon">⏸</div>
        <div class="card-label">Paused Members</div>
        <div class="card-value">${data.paused}</div>
        <div class="card-subtext">Currently paused</div>
      </div>
      <div class="report-card expiring">
        <div class="card-icon">⏰</div>
        <div class="card-label">Expiring Soon</div>
        <div class="card-value">${data.expiringIn7Days}</div>
        <div class="card-subtext">Within 7 days</div>
      </div>
    `;
  }

  function renderMembershipError() {
    const container = document.getElementById('membership-cards');
    if (!container) return;

    container.innerHTML = `
      <div class="report-card error">
        <div class="card-label">Error</div>
        <div class="card-value">Unable to load report</div>
        <div class="card-subtext">Please try again later</div>
      </div>
    `;
  }

  // Fetch Payment Report
  async function fetchPaymentReport() {
    try {
      const params = new URLSearchParams({
        filter: currentFilter,
        ...(currentFilter === 'custom' && customStartDate && customEndDate && {
          startDate: customStartDate,
          endDate: customEndDate,
        }),
      });

      const response = await fetch(`/api/reports/payment?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch payment report');
      }

      const data = await response.json();
      renderPaymentCards(data);
    } catch (error) {
      console.error('Error fetching payment report:', error);
      renderPaymentError();
    }
  }

  function renderPaymentCards(data) {
    const container = document.getElementById('payment-cards');
    if (!container) return;

    container.innerHTML = `
      <div class="report-card completed">
        <div class="card-icon">📦</div>
        <div class="card-label">Total Payments</div>
        <div class="card-value">${data.totalPayments}</div>
        <div class="card-subtext">All payment records</div>
      </div>
      <div class="report-card completed">
        <div class="card-icon">✓</div>
        <div class="card-label">Completed Payments</div>
        <div class="card-value">${data.completed.count}</div>
        <div class="card-subtext">${formatCurrency(data.completed.total)}</div>
      </div>
      <div class="report-card pending">
        <div class="card-icon">⏳</div>
        <div class="card-label">Pending Payments</div>
        <div class="card-value">${data.pending.count}</div>
        <div class="card-subtext">${formatCurrency(data.pending.total)}</div>
      </div>
      <div class="report-card failed">
        <div class="card-icon">✗</div>
        <div class="card-label">Failed Payments</div>
        <div class="card-value">${data.failed.count}</div>
        <div class="card-subtext">${formatCurrency(data.failed.total)}</div>
      </div>
    `;
  }

  function renderPaymentError() {
    const container = document.getElementById('payment-cards');
    if (!container) return;

    container.innerHTML = `
      <div class="report-card error">
        <div class="card-label">Error</div>
        <div class="card-value">Unable to load report</div>
        <div class="card-subtext">Please try again later</div>
      </div>
    `;
  }

  // Load all reports
  function loadAllReports() {
    fetchMonthlyRevenueReport();
    fetchRevenueReport();
    fetchMembershipReport();
    fetchPaymentReport();
  }

  // Handle filter change
  function handleFilterChange(event) {
    currentFilter = event.target.value;
    const customDateRange = document.getElementById('custom-date-range');
    
    if (currentFilter === 'custom') {
      customDateRange.style.display = 'flex';
    } else {
      customDateRange.style.display = 'none';
    }
    
    fetchRevenueReport();
    fetchPaymentReport();
  }

  // Handle custom date range
  function handleCustomDateChange() {
    const startInput = document.getElementById('custom-start-date');
    const endInput = document.getElementById('custom-end-date');
    
    if (startInput && endInput) {
      customStartDate = startInput.value;
      customEndDate = endInput.value;
      
      if (customStartDate && customEndDate && currentFilter === 'custom') {
        fetchRevenueReport();
        fetchPaymentReport();
      }
    }
  }

  // Export as PDF
  function exportAsPDF(type) {
    const params = new URLSearchParams({
      type: type,
      filter: currentFilter,
      ...(currentFilter === 'custom' && customStartDate && customEndDate && {
        startDate: customStartDate,
        endDate: customEndDate,
      }),
    });
    
    window.location.href = `/api/reports/export/pdf?${params}`;
  }

  // Export as Excel
  function exportAsExcel(type) {
    const params = new URLSearchParams({
      type: type,
      filter: currentFilter,
      ...(currentFilter === 'custom' && customStartDate && customEndDate && {
        startDate: customStartDate,
        endDate: customEndDate,
      }),
    });
    
    window.location.href = `/api/reports/export/excel?${params}`;
  }

  // Initialize event listeners
  function initializeEventListeners() {
    const monthSelect = document.getElementById('revenue-month');
    const yearSelect = document.getElementById('revenue-year');
    const refreshBtn = document.getElementById('refresh-reports');
    const filterSelect = document.getElementById('report-filter');
    const startDateInput = document.getElementById('custom-start-date');
    const endDateInput = document.getElementById('custom-end-date');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const exportExcelBtn = document.getElementById('export-excel-btn');

    if (monthSelect) {
      monthSelect.addEventListener('change', fetchMonthlyRevenueReport);
    }

    if (yearSelect) {
      yearSelect.addEventListener('change', fetchMonthlyRevenueReport);
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', loadAllReports);
    }

    if (filterSelect) {
      filterSelect.addEventListener('change', handleFilterChange);
    }

    if (startDateInput) {
      startDateInput.addEventListener('change', handleCustomDateChange);
    }

    if (endDateInput) {
      endDateInput.addEventListener('change', handleCustomDateChange);
    }

    if (exportPdfBtn) {
      exportPdfBtn.addEventListener('click', () => exportAsPDF('all'));
    }
 
    if (exportExcelBtn) {
      exportExcelBtn.addEventListener('click', () => exportAsExcel('all'));
    }
  }

  // Initialize page
  function init() {
    initializeYearDropdown();
    initializeMonthDropdown();
    initializeEventListeners();
    loadAllReports();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
