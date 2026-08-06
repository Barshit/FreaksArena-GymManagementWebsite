const pages = {
  'admin-login': {
    view: 'admin-login',
    data: {
      title: 'Admin Login | Freaks Arena Gym',
      styles: ['/css/dashboard.css'],
      scripts: [],
      bodyClass: 'admin-login-page',
    },
  },
  dashboard: {
    view: 'dashboard',
    data: {
      title: 'Admin Dashboard | Freaks Arena Gym',
      styles: ['/css/dashboard.css'],
      scripts: ['/js/dashboard.js', '/js/dashboard-stats.js'],
      bodyClass: 'admin-dashboard',
      active: 'dashboard',
      eyebrow: 'Admin dashboard',
      heading: 'Dashboard',
    },
  },
  members: {
    view: 'members',
    data: {
      title: 'Members | Freaks Arena Gym',
      styles: ['/css/dashboard.css', '/css/members.css'],
      scripts: ['/js/dashboard.js', '/js/members.js', '/js/confirm-dialog.js'],
      bodyClass: 'admin-members',
      active: 'members',
      eyebrow: 'Admin dashboard',
      heading: 'Members',
    },
  },
  'member-details': {
    view: 'member-details',
    data: {
      title: 'Member Details | Freaks Arena Gym',
      styles: ['/css/dashboard.css', '/css/members.css'],
      scripts: ['/js/dashboard.js', '/js/members.js', '/js/confirm-dialog.js'],
      bodyClass: 'admin-member-details',
      active: 'members',
      eyebrow: 'Admin dashboard',
      heading: 'Member details',
    },
  },
  payments: {
    view: 'payments',
    data: {
      title: 'Payments | Freaks Arena Gym',
      styles: ['/css/dashboard.css', '/css/payments.css'],
      scripts: ['/js/dashboard.js', '/js/payments.js', '/js/confirm-dialog.js'],
      bodyClass: 'admin-payments',
      active: 'payments',
      eyebrow: 'Admin dashboard',
      heading: 'Payments',
    },
  },
  reports: {
    view: 'reports',
    data: {
      title: 'Reports | Freaks Arena Gym',
      styles: ['/css/dashboard.css', '/css/reports.css'],
      scripts: ['/js/dashboard.js', '/js/reports.js'],
      bodyClass: 'admin-reports',
      active: 'reports',
      eyebrow: 'Admin dashboard',
      heading: 'Reports',
    },
  },
  announcements: {
    view: 'announcements',
    data: {
      title: 'Announcements | Freaks Arena Gym',
      styles: ['/css/dashboard.css'],
      scripts: ['/js/dashboard.js', '/js/announcements.js', '/js/confirm-dialog.js'],
      bodyClass: 'admin-announcements',
      active: 'announcements',
      eyebrow: 'Admin dashboard',
      heading: 'Announcements',
    },
  },
  settings: {
    view: 'settings',
    data: {
      title: 'Settings | Freaks Arena Gym',
      styles: ['/css/dashboard.css'],
      scripts: ['/js/dashboard.js', '/js/settings.js'],
      bodyClass: 'admin-settings',
      active: 'settings',
      eyebrow: 'Admin settings',
      heading: 'Settings',
    },
  },
  profile: {
    view: 'profile',
    data: {
      title: 'Profile | Freaks Arena Gym',
      styles: ['/css/dashboard.css'],
      scripts: ['/js/dashboard.js', '/js/profile.js'],
      bodyClass: 'admin-profile',
      active: 'settings',
      eyebrow: 'Admin settings',
      heading: 'Profile',
    },
  },
  account: {
    view: 'account',
    data: {
      title: 'Account | Freaks Arena Gym',
      styles: ['/css/dashboard.css'],
      scripts: ['/js/dashboard.js', '/js/account.js'],
      bodyClass: 'admin-account',
      active: 'settings',
      eyebrow: 'Admin settings',
      heading: 'Account',
    },
  },
  'activity-logs': {
    view: 'activity-logs',
    data: {
      title: 'Activity Logs | Freaks Arena Gym',
      styles: ['/css/dashboard.css'],
      scripts: ['/js/dashboard.js', '/js/activity-logs.js'],
      bodyClass: 'admin-activity-logs',
      active: 'activity-logs',
      eyebrow: 'Admin dashboard',
      heading: 'Activity Logs',
    },
  },
};

module.exports = pages;
