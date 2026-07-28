(function () {
  const ANNOUNCEMENTS_TABLE_BODY_ID = 'announcements-tbody';
  const ANNOUNCEMENT_MODAL_ID = 'announcement-modal';
  const ANNOUNCEMENT_FORM_ID = 'announcement-form';
  const ANNOUNCEMENT_FORM_ERROR_ID = 'announcement-form-error';
  const ANNOUNCEMENT_MODAL_TITLE_ID = 'announcement-modal-title';
  const OPEN_ANNOUNCEMENT_BTN_ID = 'open-new-announcement';
  const CLOSE_ANNOUNCEMENT_BTN_ID = 'close-announcement-modal';
  const CANCEL_ANNOUNCEMENT_BTN_ID = 'cancel-announcement-modal';

  let announcementsCache = [];

  async function fetchAnnouncements(filter = { status: 'Active' }) {
    try {
      const query = new URLSearchParams(filter).toString();
      const response = await fetch(`/api/announcements?${query}`);
      if (!response.ok) {
        throw new Error(`Failed to load announcements (${response.status})`);
      }
      announcementsCache = await response.json();
    } catch (error) {
      console.error('Unable to load announcements:', error);
      announcementsCache = [];
    }
    return announcementsCache;
  }

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(value) {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function getAnnouncementById(id) {
    return announcementsCache.find((item) => item._id === id);
  }

  async function renderAnnouncementsTable() {
    const tableBody = document.getElementById(ANNOUNCEMENTS_TABLE_BODY_ID);
    if (!tableBody) {
      return;
    }

    await fetchAnnouncements();
    const announcements = announcementsCache.slice().sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    if (!announcements.length) {
      tableBody.innerHTML = '<tr><td colspan="7" class="empty-row">No announcements have been created yet.</td></tr>';
      return;
    }

    tableBody.innerHTML = announcements
      .map((announcement) => {
        const priorityClass =
          announcement.priority === 'Urgent' ? 'status-paid' : announcement.priority === 'Important' ? 'status-pending' : 'status-pill';
        const statusClass = announcement.status === 'Active' ? 'status-paid' : 'status-pending';
        return `
          <tr>
            <td>${escapeHtml(announcement._id.slice(0, 8))}</td>
            <td>${escapeHtml(announcement.title)}</td>
            <td>${escapeHtml(announcement.category)}</td>
            <td>${escapeHtml(formatDate(announcement.publishedAt))}</td>
            <td><span class="status-pill ${priorityClass}">${escapeHtml(announcement.priority)}</span></td>
            <td><span class="status-pill ${statusClass}">${escapeHtml(announcement.status)}</span></td>
            <td>
              <div class="table-actions">
                <button type="button" class="action-button" data-action="view" data-id="${announcement._id}">View</button>
                <button type="button" class="action-button" data-action="edit" data-id="${announcement._id}">Edit</button>
                <button type="button" class="action-button" data-action="delete" data-id="${announcement._id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  function toggleModal(modal, show) {
    if (!modal) {
      return;
    }
    modal.classList.toggle('hidden', !show);
    document.body.style.overflow = show ? 'hidden' : '';
  }

  function resetForm(form) {
    if (!form) {
      return;
    }
    form.reset();
    const error = form.querySelector('.form-error');
    if (error) {
      error.textContent = '';
    }
  }

  function setFormMode(form, mode) {
    const saveButton = document.getElementById('save-announcement-btn');
    Array.from(form.elements).forEach((field) => {
      if (field.tagName.toLowerCase() === 'button') {
        return;
      }
      field.disabled = mode === 'view';
    });
    if (saveButton) {
      saveButton.hidden = mode === 'view';
    }
  }

  function populateAnnouncementForm(announcement) {
    const form = document.getElementById(ANNOUNCEMENT_FORM_ID);
    if (!form || !announcement) {
      return;
    }

    form.elements.title.value = announcement.title || '';
    form.elements.category.value = announcement.category || '';
    form.elements.priority.value = announcement.priority || 'Normal';
    form.elements.content.value = announcement.message || '';
    form.elements.publishDate.value = announcement.publishedAt ? announcement.publishedAt.split('T')[0] : new Date().toISOString().split('T')[0];
    form.elements.statusActive.checked = announcement.status === 'Active';
  }

  function openAnnouncementModal(mode, announcementId) {
    const modal = document.getElementById(ANNOUNCEMENT_MODAL_ID);
    const title = document.getElementById(ANNOUNCEMENT_MODAL_TITLE_ID);
    const form = document.getElementById(ANNOUNCEMENT_FORM_ID);
    if (!modal || !title || !form) {
      return;
    }

    form.dataset.mode = mode;
    form.dataset.announcementId = announcementId || '';

    if (mode === 'edit') {
      title.textContent = 'Edit Announcement';
      const announcement = getAnnouncementById(announcementId);
      if (announcement) {
        populateAnnouncementForm(announcement);
      }
      setFormMode(form, 'edit');
    } else if (mode === 'view') {
      title.textContent = 'View Announcement';
      const announcement = getAnnouncementById(announcementId);
      if (announcement) {
        populateAnnouncementForm(announcement);
      }
      setFormMode(form, 'view');
    } else {
      title.textContent = 'New Announcement';
      resetForm(form);
      form.elements.publishDate.value = new Date().toISOString().split('T')[0];
      form.elements.priority.value = 'Normal';
      form.elements.category.value = '';
      form.elements.statusActive.checked = true;
      setFormMode(form, 'add');
    }

    toggleModal(modal, true);
  }

  function closeAnnouncementModal() {
    const modal = document.getElementById(ANNOUNCEMENT_MODAL_ID);
    const form = document.getElementById(ANNOUNCEMENT_FORM_ID);
    toggleModal(modal, false);
    if (form) {
      delete form.dataset.mode;
      delete form.dataset.announcementId;
      resetForm(form);
    }
  }

  function getAnnouncementFormValues(form) {
    if (!form) {
      return null;
    }

    return {
      title: form.elements.title.value.trim(),
      message: form.elements.content.value.trim(),
      category: form.elements.category.value,
      priority: form.elements.priority.value,
      status: form.elements.statusActive.checked ? 'Active' : 'Inactive',
    };
  }

  function validateAnnouncementForm(values) {
    const errors = [];
    if (!values.title) {
      errors.push('Title is required.');
    }
    if (!values.message) {
      errors.push('Content is required.');
    }
    if (!values.category) {
      errors.push('Category is required.');
    }
    return errors;
  }

  async function handleAnnouncementFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    if (!form || form.id !== ANNOUNCEMENT_FORM_ID) {
      return;
    }

    const mode = form.dataset.mode || 'add';
    const currentId = form.dataset.announcementId;
    const values = getAnnouncementFormValues(form);
    const errorEl = document.getElementById(ANNOUNCEMENT_FORM_ERROR_ID);
    const errors = validateAnnouncementForm(values);

    if (errorEl) {
      errorEl.textContent = errors.join(' ');
    }
    if (errors.length) {
      return;
    }

    try {
      const method = mode === 'edit' ? 'PUT' : 'POST';
      const url = mode === 'edit' ? `/api/announcements/${currentId}` : '/api/announcements';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        if (errorEl) {
          errorEl.textContent = error.error || 'An error occurred.';
        }
        return;
      }

      closeAnnouncementModal();
      await renderAnnouncementsTable();
    } catch (error) {
      console.error('Error saving announcement:', error);
      if (errorEl) {
        errorEl.textContent = 'An error occurred while saving the announcement.';
      }
    }
  }

  async function handleTableActions(event) {
    const button = event.target.closest('[data-action]');
    if (!button) {
      return;
    }

    const action = button.dataset.action;
    const id = button.dataset.id;
    if (!action || !id) {
      return;
    }

    if (action === 'view') {
      openAnnouncementModal('view', id);
      return;
    }
    if (action === 'edit') {
      openAnnouncementModal('edit', id);
      return;
    }
    if (action === 'delete') {
      if (window.confirm('Are you sure you want to delete this announcement?')) {
        try {
          const response = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
          if (!response.ok) {
            throw new Error('Failed to delete announcement');
          }
          await renderAnnouncementsTable();
        } catch (error) {
          console.error('Error deleting announcement:', error);
          alert('Failed to delete announcement.');
        }
      }
    }
  }

  async function setupAnnouncementsPage() {
    const addButton = document.getElementById(OPEN_ANNOUNCEMENT_BTN_ID);
    const modal = document.getElementById(ANNOUNCEMENT_MODAL_ID);
    const closeButton = document.getElementById(CLOSE_ANNOUNCEMENT_BTN_ID);
    const cancelButton = document.getElementById(CANCEL_ANNOUNCEMENT_BTN_ID);
    const tableBody = document.getElementById(ANNOUNCEMENTS_TABLE_BODY_ID);
    const form = document.getElementById(ANNOUNCEMENT_FORM_ID);

    if (addButton) {
      addButton.addEventListener('click', function () {
        openAnnouncementModal('add');
      });
    }

    if (closeButton) {
      closeButton.addEventListener('click', closeAnnouncementModal);
    }

    if (cancelButton) {
      cancelButton.addEventListener('click', closeAnnouncementModal);
    }

    if (modal) {
      modal.addEventListener('click', function (event) {
        if (event.target === modal) {
          closeAnnouncementModal();
        }
      });
    }

    if (form) {
      form.addEventListener('submit', handleAnnouncementFormSubmit);
    }

    if (tableBody) {
      tableBody.addEventListener('click', handleTableActions);
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeAnnouncementModal();
      }
    });

    await renderAnnouncementsTable();
  }

  function initializePage() {
    if (document.getElementById(ANNOUNCEMENTS_TABLE_BODY_ID)) {
      setupAnnouncementsPage();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
  } else {
    initializePage();
  }
})();
