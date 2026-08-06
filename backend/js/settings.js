(function () {
  const settingsForm = document.getElementById('settings-form');
  const settingsMessage = document.getElementById('settings-message');
  const settingsError = document.getElementById('settings-error');

  function showSuccess(message) {
    settingsMessage.textContent = message;
    settingsError.textContent = '';
    settingsMessage.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      settingsMessage.textContent = '';
    }, 5000);
  }

  function showError(message) {
    settingsError.textContent = message;
    settingsMessage.textContent = '';
    settingsError.scrollIntoView({ behavior: 'smooth' });
  }

  function clearMessages() {
    settingsMessage.textContent = '';
    settingsError.textContent = '';
  }

  function validateEmail(value) {
    return /^\S+@\S+\.\S+$/.test(value);
  }

  function validatePhone(value) {
    return /^[0-9+\-() ]{7,20}$/.test(value.trim());
  }

  // Fetch settings from API
  async function fetchSettings() {
    try {
      const response = await fetch('/api/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching settings:', error);
      showError('Unable to load settings. Please refresh the page.');
      return null;
    }
  }

  // Populate form with settings
  async function populateForm() {
    const settings = await fetchSettings();
    if (!settings) return;

    settingsForm.elements.gymName.value = settings.gymName || '';
    settingsForm.elements.ownerName.value = settings.ownerName || '';
    settingsForm.elements.phone.value = settings.phone || '';
    settingsForm.elements.email.value = settings.email || '';
    settingsForm.elements.address.value = settings.address || '';
    settingsForm.elements.openingTime.value = settings.openingTime || '06:00';
    settingsForm.elements.closingTime.value = settings.closingTime || '21:00';

    settingsForm.elements.defaultMembershipDuration.value = settings.defaultMembershipDuration || 30;
    settingsForm.elements.membershipExpiryReminderDays.value = settings.membershipExpiryReminderDays || 7;
    settingsForm.elements.maxMembershipPauseDays.value = settings.maxMembershipPauseDays || 30;
    settingsForm.elements.allowMembershipPause.checked = settings.allowMembershipPause !== false;

    settingsForm.elements.defaultCurrency.value = settings.defaultCurrency || 'INR';

    const paymentMethods = document.querySelectorAll('input[name="paymentMethods"]');
    paymentMethods.forEach(checkbox => {
      checkbox.checked = settings.acceptedPaymentMethods && settings.acceptedPaymentMethods.includes(checkbox.value);
    });

    settingsForm.elements.timezone.value = settings.timezone || 'Asia/Kolkata';
    settingsForm.elements.dateFormat.value = settings.dateFormat || 'DD/MM/YYYY';
    settingsForm.elements.autoUpdateExpiredMemberships.checked = settings.autoUpdateExpiredMemberships !== false;
  }

  // Save gym info
  async function saveGymInfo() {
    clearMessages();

    const gymName = settingsForm.elements.gymName.value.trim();
    const ownerName = settingsForm.elements.ownerName.value.trim();
    const phone = settingsForm.elements.phone.value.trim();
    const email = settingsForm.elements.email.value.trim();
    const address = settingsForm.elements.address.value.trim();
    const openingTime = settingsForm.elements.openingTime.value.trim();
    const closingTime = settingsForm.elements.closingTime.value.trim();

    if (!gymName || !ownerName || !phone || !email || !address || !openingTime || !closingTime) {
      showError('Please fill in all gym information fields.');
      return;
    }

    if (!validatePhone(phone)) {
      showError('Please enter a valid phone number.');
      return;
    }

    if (!validateEmail(email)) {
      showError('Please enter a valid email address.');
      return;
    }

    try {
      const response = await csrfFetch('/api/settings/gym-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymName,
          ownerName,
          phone,
          email,
          address,
          openingTime,
          closingTime,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save gym info');
      }

      showSuccess('Gym information saved successfully.');
    } catch (error) {
      console.error('Error saving gym info:', error);
      showError(error.message || 'Unable to save gym information.');
    }
  }

  // Save membership settings
  async function saveMembershipSettings() {
    clearMessages();

    const defaultMembershipDuration = parseInt(settingsForm.elements.defaultMembershipDuration.value, 10);
    const membershipExpiryReminderDays = parseInt(settingsForm.elements.membershipExpiryReminderDays.value, 10);
    const maxMembershipPauseDays = parseInt(settingsForm.elements.maxMembershipPauseDays.value, 10);
    const allowMembershipPause = settingsForm.elements.allowMembershipPause.checked;

    if (!defaultMembershipDuration || !membershipExpiryReminderDays || !maxMembershipPauseDays) {
      showError('Please fill in all membership settings.');
      return;
    }

    try {
      const response = await csrfFetch('/api/settings/membership', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultMembershipDuration,
          membershipExpiryReminderDays,
          maxMembershipPauseDays,
          allowMembershipPause,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save membership settings');
      }

      showSuccess('Membership settings saved successfully.');
    } catch (error) {
      console.error('Error saving membership settings:', error);
      showError(error.message || 'Unable to save membership settings.');
    }
  }

  // Save payment settings
  async function savePaymentSettings() {
    clearMessages();

    const defaultCurrency = settingsForm.elements.defaultCurrency.value;
    const acceptedPaymentMethods = Array.from(document.querySelectorAll('input[name="paymentMethods"]:checked')).map(
      cb => cb.value
    );

    if (!defaultCurrency || acceptedPaymentMethods.length === 0) {
      showError('Please select at least one payment method.');
      return;
    }

    try {
      const response = await csrfFetch('/api/settings/payment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultCurrency,
          acceptedPaymentMethods,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save payment settings');
      }

      showSuccess('Payment settings saved successfully.');
    } catch (error) {
      console.error('Error saving payment settings:', error);
      showError(error.message || 'Unable to save payment settings.');
    }
  }

  // Save system settings
  async function saveSystemSettings() {
    clearMessages();

    const timezone = settingsForm.elements.timezone.value.trim();
    const dateFormat = settingsForm.elements.dateFormat.value;
    const autoUpdateExpiredMemberships = settingsForm.elements.autoUpdateExpiredMemberships.checked;

    if (!timezone || !dateFormat) {
      showError('Please fill in all system settings.');
      return;
    }

    try {
      const response = await csrfFetch('/api/settings/system', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone,
          dateFormat,
          autoUpdateExpiredMemberships,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save system settings');
      }

      showSuccess('System settings saved successfully.');
    } catch (error) {
      console.error('Error saving system settings:', error);
      showError(error.message || 'Unable to save system settings.');
    }
  }

  // Change password
  async function changePassword() {
    clearMessages();

    const currentPassword = settingsForm.elements.currentPassword.value;
    const newPassword = settingsForm.elements.newPassword.value;
    const confirmPassword = settingsForm.elements.confirmPassword.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showError('Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('New password and confirm password do not match.');
      return;
    }

    if (newPassword.length < 8) {
      showError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword.length > 128) {
      showError('New password must not exceed 128 characters.');
      return;
    }

    if (!newPassword.trim()) {
      showError('Password cannot be empty or contain only whitespace.');
      return;
    }

    try {
      const response = await csrfFetch('/api/settings/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change password');
      }

      settingsForm.elements.currentPassword.value = '';
      settingsForm.elements.newPassword.value = '';
      settingsForm.elements.confirmPassword.value = '';

      showSuccess('Password changed successfully.');
    } catch (error) {
      console.error('Error changing password:', error);
      showError(error.message || 'Unable to change password.');
    }
  }

  // Event listeners
  if (settingsForm) {
    document.getElementById('save-gym-info').addEventListener('click', saveGymInfo);
    document.getElementById('save-membership-settings').addEventListener('click', saveMembershipSettings);
    document.getElementById('save-payment-settings').addEventListener('click', savePaymentSettings);
    document.getElementById('save-system-settings').addEventListener('click', saveSystemSettings);
    document.getElementById('change-password-btn').addEventListener('click', changePassword);
  }

  // Initialize page
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', populateForm);
  } else {
    populateForm();
  }
})();
