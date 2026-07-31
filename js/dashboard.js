(function () {
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileSidebar = document.getElementById('mobile-sidebar');
  const mobileSidebarClose = document.getElementById('mobile-sidebar-close');
  const mobileBackdrop = document.getElementById('mobile-sidebar-backdrop');
  const profileBtn = document.getElementById('profile-btn');
  const profileMenu = document.getElementById('profile-menu');
  const notificationsBtn = document.getElementById('notifications-btn');
  const notificationsMenu = document.getElementById('notifications-menu');
  const logoutBtn = document.getElementById('logout-btn');
  const currentDateEl = document.getElementById('current-date');

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function openMobileSidebar() {
    mobileSidebar?.classList.add('open');
    mobileBackdrop?.classList.add('visible');
    document.body.style.overflow = 'hidden';
    mobileSidebar?.setAttribute('aria-hidden', 'false');
  }

  function closeMobileSidebar() {
    mobileSidebar?.classList.remove('open');
    mobileBackdrop?.classList.remove('visible');
    document.body.style.overflow = '';
    mobileSidebar?.setAttribute('aria-hidden', 'true');
  }

  function closeDropdowns() {
    if (profileBtn) {
      profileBtn.setAttribute('aria-expanded', 'false');
    }
    if (notificationsBtn) {
      notificationsBtn.setAttribute('aria-expanded', 'false');
    }
    profileMenu?.classList.remove('visible');
    notificationsMenu?.classList.remove('visible');
  }

  function toggleDropdown(button, menu) {
    if (!button || !menu) {
      return;
    }
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    closeDropdowns();
    if (!isOpen) {
      button.setAttribute('aria-expanded', 'true');
      menu.classList.add('visible');
    }
  }

  function renderCurrentDate() {
    if (!currentDateEl) {
      return;
    }
    const now = new Date();
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    currentDateEl.textContent = now.toLocaleDateString(undefined, options);
  }

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', openMobileSidebar);
  }

  if (mobileSidebarClose) {
    mobileSidebarClose.addEventListener('click', closeMobileSidebar);
  }

  if (mobileBackdrop) {
    mobileBackdrop.addEventListener('click', closeMobileSidebar);
  }

  if (profileBtn && profileMenu) {
    profileBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      toggleDropdown(profileBtn, profileMenu);
    });
  }

  if (notificationsBtn && notificationsMenu) {
    // create badge element
    let badgeEl = notificationsBtn.querySelector('.notification-badge');
    if (!badgeEl) {
      badgeEl = document.createElement('span');
      badgeEl.className = 'notification-badge';
      notificationsBtn.appendChild(badgeEl);
    }

    let membersCache = [];
    let lastNotificationHash = '';

    async function fetchMembers() {
      try {
        const response = await fetch('/api/members?t=' + Date.now());
        if (!response.ok) {
          throw new Error(`Failed to load members (${response.status})`);
        }
        membersCache = await response.json();
      } catch (error) {
        console.error('Unable to load member notifications:', error);
        membersCache = [];
      }
      return membersCache;
    }

    function generateNotificationHash(birthdays, expiringSoon, expired) {
      const ids = [
        ...birthdays.map(m => m._id),
        ...expiringSoon.map(e => e.member._id + '|' + e.daysLeft),
        ...expired.map(e => e.member._id + '|' + e.daysSince)
      ].sort().join(',');
      return ids;
    }

    function getMembersFromCache() {
      return membersCache || [];
    }

    function parseDateOnly(value) {
      if (!value) return null;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    function daysBetween(a, b) {
      const _MS_PER_DAY = 1000 * 60 * 60 * 24;
      const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
      const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
      return Math.floor((utc2 - utc1) / _MS_PER_DAY);
    }

    function isBirthdayToday(birthday) {
      if (!birthday) return false;
      const d = new Date(birthday);
      if (Number.isNaN(d.getTime())) return false;
      const today = new Date();
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
    }

    async function buildNotificationMenu() {
      await fetchMembers();
      const members = getMembersFromCache();
      const today = new Date();

      function getBirthdayNotifications() {
        return members.filter((m) => isBirthdayToday(m.birthday));
      }

      function getExpiringSoonNotifications() {
        return members
          .map((m) => {
            if (!m.expiryDate) return null;
            const expiry = parseDateOnly(m.expiryDate);
            if (!expiry) return null;
            const diff = daysBetween(today, expiry);
            return { member: m, expiry, daysLeft: diff };
          })
          .filter((x) => x && x.daysLeft >= 0 && x.daysLeft <= 7);
      }

      function getExpiredNotifications() {
        return members
          .map((m) => {
            if (!m.expiryDate) return null;
            const expiry = parseDateOnly(m.expiryDate);
            if (!expiry) return null;
            const daysSince = daysBetween(expiry, today);
            return { member: m, expiry, daysSince };
          })
          .filter((x) => x && x.daysSince > 0);
      }

      const birthdays = getBirthdayNotifications();
      const expiringSoon = getExpiringSoonNotifications();
      const expired = getExpiredNotifications();

      const total = birthdays.length + expiringSoon.length + expired.length;

      // generate hash to detect changes
      const currentHash = generateNotificationHash(birthdays, expiringSoon, expired);

      // if hash hasn't changed, skip UI update (prevent duplicate renders)
      if (currentHash === lastNotificationHash) {
        return;
      }

      lastNotificationHash = currentHash;

      // update badge
      if (total > 0) {
        badgeEl.textContent = total;
        badgeEl.style.display = 'inline-block';
      } else {
        badgeEl.style.display = 'none';
      }

      // build HTML
      if (total === 0) {
        notificationsMenu.innerHTML = '<p class="dropdown-empty">No new notifications.</p>';
        return;
      }

      let html = '';

      if (birthdays.length) {
        html += `<div class="section-header"><strong>🎂 Birthdays Today</strong></div>`;
        birthdays.forEach((m) => {
          const id = m._id;
          html += `<div class="notification-item" data-id="${id}">
              <div class="notification-content">
              <div>
                  <div class="notification-title">${escapeHtml(m.fullName)}</div>
                  <div class="notification-subtitle">${m.birthday ? new Date(m.birthday).toLocaleDateString() : ''}</div>
              </div>
                <div class="notification-actions">
                <button class="secondary-btn send-wishes" data-id="${id}">Send Wishes</button>
                <a class="action-button view-member" href="/member-details.html?id=${encodeURIComponent(id)}">View Member</a>
              </div>
            </div>
          </div>`;
        });
      }

      if (expiringSoon.length) {
        html += `<div style="margin-top:10px" class="section-header"><strong>💰 Membership Expiring Soon</strong></div>`;
        expiringSoon.forEach((entry) => {
          const m = entry.member;
          const expiry = entry.expiry;
          const daysLeft = entry.daysLeft;
          const id = m._id;
          html += `<div class="notification-item" data-id="${id}">
              <div class="notification-content">
              <div>
                  <div class="notification-title">${escapeHtml(m.fullName)}</div>
                  <div class="notification-subtitle">Plan: ${escapeHtml(m.plan)} • Expires: ${expiry ? expiry.toLocaleDateString() : '—'} • ${daysLeft} day(s)</div>
              </div>
                <div class="notification-actions">
                <button class="primary-btn send-reminder" data-id="${id}">Send Reminder</button>
                <a class="action-button view-member" href="/member-details.html?id=${encodeURIComponent(id)}">View Member</a>
              </div>
            </div>
          </div>`;
        });
      }

      if (expired.length) {
        html += `<div style="margin-top:10px" class="section-header"><strong>❌ Expired Memberships</strong></div>`;
        expired.forEach((entry) => {
          const m = entry.member;
          const expiry = entry.expiry;
          const id = m._id;
          html += `<div class="notification-item" data-id="${id}">
              <div class="notification-content">
              <div>
                  <div class="notification-title">${escapeHtml(m.fullName)}</div>
                  <div class="notification-subtitle">Expired on: ${expiry ? expiry.toLocaleDateString() : '—'}</div>
              </div>
                <div class="notification-actions">
                <a class="action-button renew-membership" href="/members.html?renew=${encodeURIComponent(id)}">Renew Membership</a>
                <button class="primary-btn send-reminder" data-id="${id}">Send Reminder</button>
                <a class="action-button view-member" href="/member-details.html?id=${encodeURIComponent(id)}">View Member</a>
              </div>
            </div>
          </div>`;
        });
      }

      notificationsMenu.innerHTML = html;

      // attach handlers
      notificationsMenu.querySelectorAll('.send-wishes').forEach((btn) => {
        btn.addEventListener('click', function () {
          const id = btn.dataset.id;
          const member = getMembersFromCache().find((x) => x._id === id);
          if (!member) return;
          const phone = String(member.phone || '').replace(/\D/g, '');
          if (!/^[0-9]{10,15}$/.test(phone)) {
            window.alert('Cannot open WhatsApp. Member phone number is invalid.');
            return;
          }
          const message = `🎉 Happy Birthday, ${member.fullName}! 🎂\n\nThe entire Freaks Arena family wishes you a fantastic birthday filled with happiness, health, and success.\n\nMay this year bring you new personal records, stronger workouts, and endless motivation.\n\nStay strong, stay consistent, and keep chasing your fitness goals.\n\nHave an amazing day!\n\n— Team Freaks Arena 🧡`;
          const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
          window.open(url, '_blank');
        });
      });

      notificationsMenu.querySelectorAll('.send-reminder').forEach((btn) => {
        btn.addEventListener('click', function () {
          const id = btn.dataset.id;
          const member = getMembersFromCache().find((x) => x._id === id);
          if (!member) return;
          const phone = String(member.phone || '').replace(/\D/g, '');
          if (!/^[0-9]{10,15}$/.test(phone)) {
            window.alert('Cannot open WhatsApp. Member phone number is invalid.');
            return;
          }
          const message = `Hello ${member.fullName},\n\nThis is a friendly reminder from Freaks Arena that your membership payment is due.\n\nMembership Plan:\n${member.plan}\n\nExpiry Date:\n${member.expiryDate}\n\nPlease visit the gym or contact us to renew your membership and continue your fitness journey without interruption.\n\nThank you for being a part of Freaks Arena.\n\n— Team Freaks Arena 🧡`;
          const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
          window.open(url, '_blank');
        });
      });

      // view-member and renew-membership are anchors that navigate — no JS needed for view; renew uses URL param handled in members.js
    }

    // initial build
    buildNotificationMenu();

    notificationsBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      buildNotificationMenu().then(() => toggleDropdown(notificationsBtn, notificationsMenu));
    });

    // update on storage change (cross-tab)
    window.addEventListener('storage', function () {
      buildNotificationMenu();
    });

    // update on in-tab member changes via custom event
    window.addEventListener('members-updated', function () {
      buildNotificationMenu();
    });

    // automatic polling for notification updates every 25 seconds
    setInterval(function () {
      buildNotificationMenu();
    }, 25000);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function (event) {
      event.preventDefault();
      window.location.href = 'admin-login.html';
    });
  }

  document.addEventListener('click', function (event) {
    if (!profileBtn?.contains(event.target) && !profileMenu?.contains(event.target)) {
      profileMenu?.classList.remove('visible');
      profileBtn?.setAttribute('aria-expanded', 'false');
    }
    if (!notificationsBtn?.contains(event.target) && !notificationsMenu?.contains(event.target)) {
      notificationsMenu?.classList.remove('visible');
      notificationsBtn?.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeMobileSidebar();
      closeDropdowns();
    }
  });

  renderCurrentDate();
})();
