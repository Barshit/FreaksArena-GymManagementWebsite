(function () {
  const accountForm = document.getElementById('account-form');
  const accountError = document.getElementById('account-form-error');
  const accountMessage = document.getElementById('account-message');
  const logoutBtn = document.getElementById('logout-btn');

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showError(message) {
    accountError.textContent = message;
    accountMessage.textContent = '';
  }

  function showMessage(message) {
    accountMessage.textContent = message;
    accountError.textContent = '';
  }

  if (!accountForm) {
    return;
  }

  async function loadAccountData() {
    try {
      const response = await fetch('/api/admin/profile', {
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
        throw new Error('Failed to fetch account data');
      }

      const data = await response.json();
      accountForm.elements.username.value = data.name;
      accountForm.elements.email.value = data.email;
      accountForm.elements.password.value = '';
      accountForm.elements.confirmPassword.value = '';
      accountError.textContent = '';
      accountMessage.textContent = '';
    } catch (error) {
      console.error('Error loading account data:', error);
      showError('Unable to load account data.');
    }
  }

  accountForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    const username = accountForm.elements.username.value.trim();
    const email = accountForm.elements.email.value.trim();
    const password = accountForm.elements.password.value;
    const confirmPassword = accountForm.elements.confirmPassword.value;
    const currentPassword = accountForm.elements.currentPassword ? accountForm.elements.currentPassword.value : '';

    if (!username) {
      showError('Username is required.');
      return;
    }

    if (!email || !validateEmail(email)) {
      showError('Please enter a valid email address.');
      return;
    }

    if (password || confirmPassword) {
      if (!currentPassword) {
        showError('Current password is required to change password.');
        return;
      }
      if (password !== confirmPassword) {
        showError('New passwords do not match.');
        return;
      }
      if (password.length < 8) {
        showError('New password must be at least 8 characters long.');
        return;
      }
      if (password.length > 128) {
        showError('New password must not exceed 128 characters.');
        return;
      }
      if (!password.trim()) {
        showError('Password cannot be empty or contain only whitespace.');
        return;
      }
    }

    try {
      // First, update profile (username and email)
      const profileUpdateResponse = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: username,
          email: email,
        }),
      });

      if (!profileUpdateResponse.ok) {
        const errorData = await profileUpdateResponse.json();
        showError(errorData.error || 'Failed to update account.');
        return;
      }

      // If password change is requested
      if (password && confirmPassword) {
        const passwordChangeResponse = await fetch('/api/settings/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentPassword: currentPassword,
            newPassword: password,
            confirmPassword: confirmPassword,
          }),
        });

        if (!passwordChangeResponse.ok) {
          const errorData = await passwordChangeResponse.json();
          showError(errorData.error || 'Failed to change password.');
          return;
        }

        accountForm.elements.password.value = '';
        accountForm.elements.confirmPassword.value = '';
        if (accountForm.elements.currentPassword) {
          accountForm.elements.currentPassword.value = '';
        }
        showMessage('Account updated and password changed successfully!');
      } else {
        showMessage('Account updated successfully!');
      }
    } catch (error) {
      console.error('Error updating account:', error);
      showError('Unable to update account. Please try again later.');
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      window.location.href = '/logout';
    });
  }

  // Load account data on page load
  loadAccountData();
})();
