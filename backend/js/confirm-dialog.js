(function () {
  let confirmModal = null;
  let confirmTitle = null;
  let confirmMessage = null;
  let confirmCallback = null;
  let isOpen = false;

  function init() {
    confirmModal = document.getElementById('confirm-dialog');
    confirmTitle = document.getElementById('confirm-dialog-title');
    confirmMessage = document.getElementById('confirm-dialog-message');
    const confirmBtn = document.getElementById('confirm-dialog-confirm');
    const cancelBtn = document.getElementById('confirm-dialog-cancel');
    const closeBtn = document.getElementById('confirm-dialog-close');

    if (!confirmModal) {
      console.error('Confirm dialog modal not found in DOM');
      return;
    }

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', close);
    closeBtn.addEventListener('click', close);

    confirmModal.addEventListener('click', function (event) {
      if (event.target === confirmModal) {
        close();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen) {
        close();
      }
    });
  }

  function handleConfirm() {
    if (confirmCallback) {
      confirmCallback();
    }
    close();
  }

  function open(title, message, callback) {
    if (isOpen) {
      console.warn('Confirm dialog is already open');
      return;
    }

    if (!confirmModal) {
      init();
      if (!confirmModal) {
        console.error('Failed to initialize confirm dialog');
        return;
      }
    }

    if (confirmTitle) {
      confirmTitle.textContent = title || 'Confirm Action';
    }
    if (confirmMessage) {
      confirmMessage.textContent = message || 'Are you sure you want to proceed?';
    }
    confirmCallback = callback;

    confirmModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    isOpen = true;
  }

  function close() {
    if (!confirmModal || !isOpen) {
      return;
    }

    confirmModal.classList.add('hidden');
    document.body.style.overflow = '';
    confirmCallback = null;
    isOpen = false;
  }

  window.ConfirmDialog = {
    show: open,
    close: close
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
