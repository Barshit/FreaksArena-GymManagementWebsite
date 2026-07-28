const pageData = require('../utils/pageData');

const renderPage = (pageKey) => (req, res) => {
  console.log(`renderPage called with pageKey: ${pageKey}`);
  const page = pageData[pageKey];
  console.log(`page data found: ${page ? 'yes' : 'no'}`);
  if (!page) {
    console.log(`pageData keys available: ${Object.keys(pageData).join(', ')}`);
    return res.status(404).send('Not Found');
  }

  return res.render(page.view, {
    extraHead: '',
    ...page.data,
  });
};

module.exports = {
  renderIndex: renderPage('index'),
  renderAdminLogin: renderPage('admin-login'),
  renderDashboard: renderPage('dashboard'),
  renderMembers: renderPage('members'),
  renderMemberDetails: renderPage('member-details'),
  renderPayments: renderPage('payments'),
  renderReports: renderPage('reports'),
  renderAnnouncements: renderPage('announcements'),
  renderSettings: renderPage('settings'),
  renderProfile: renderPage('profile'),
  renderAccount: renderPage('account'),
  renderActivityLogs: renderPage('activity-logs'),
};
