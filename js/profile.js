(function () {
  const defaultProfile = {
    name: 'Admin',
    email: 'admin@freaksarena.com',
    phone: '',
    role: 'admin',
    status: 'active',
    profilePictureUrl: null,
    createdAt: new Date().toISOString(),
    lastLogin: null,
  };

  function initProfilePage() {
    const editButton = document.getElementById('edit-profile-btn');
    const profileModal = document.getElementById('profile-modal');
    const closeProfileModal = document.getElementById('close-profile-modal');
    const cancelProfileModal = document.getElementById('cancel-profile-modal');
    const profileForm = document.getElementById('profile-form');
    const profileFormError = document.getElementById('profile-form-error');

    const profileAvatarLarge = document.getElementById('profile-avatar-large');
    const profileNameDisplay = document.getElementById('profile-name-display');
    const profileEmailDisplay = document.getElementById('profile-email-display');
    const profilePhoneDisplay = document.getElementById('profile-phone-display');
    const topbarProfileNames = Array.from(document.querySelectorAll('.profile-name'));

    if (!profileForm || !profileModal || !editButton) {
      return;
    }

    function getInitials(name) {
      if (!name) return 'A';
      const parts = name.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return 'A';
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    async function fetchProfile() {
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
          throw new Error('Failed to fetch profile');
        }

        return await response.json();
      } catch (error) {
        console.error('Error fetching profile:', error);
        return { ...defaultProfile };
      }
    }

    async function renderProfile(profile) {
      profileNameDisplay.textContent = profile.name;
      profileEmailDisplay.textContent = profile.email;
      profilePhoneDisplay.textContent = profile.phone || 'N/A';
      
      // Display role and status
      const roleDisplay = document.getElementById('profile-role-display');
      const statusDisplay = document.getElementById('profile-status-display');
      const createdDisplay = document.getElementById('profile-created-display');
      const lastLoginDisplay = document.getElementById('profile-last-login-display');
      
      if (roleDisplay) roleDisplay.textContent = profile.role || 'admin';
      if (statusDisplay) statusDisplay.textContent = profile.status || 'active';
      
      // Format dates
      if (createdDisplay && profile.createdAt) {
        const createdDate = new Date(profile.createdAt);
        createdDisplay.textContent = createdDate.toLocaleDateString() + ' ' + createdDate.toLocaleTimeString();
      }
      
      if (lastLoginDisplay) {
        if (profile.lastLogin) {
          const lastLoginDate = new Date(profile.lastLogin);
          lastLoginDisplay.textContent = lastLoginDate.toLocaleDateString() + ' ' + lastLoginDate.toLocaleTimeString();
        } else {
          lastLoginDisplay.textContent = 'N/A';
        }
      }

      topbarProfileNames.forEach((element) => {
        element.textContent = profile.name;
      });

      if (profile.profilePictureUrl) {
        profileAvatarLarge.innerHTML = '';
        const image = document.createElement('img');
        image.src = profile.profilePictureUrl;
        image.alt = `${profile.name} profile photo`;
        image.addEventListener('error', function () {
          profileAvatarLarge.textContent = getInitials(profile.name);
        });
        profileAvatarLarge.appendChild(image);
      } else {
        profileAvatarLarge.innerHTML = getInitials(profile.name);
      }
    }

    async function openProfileModal(profile) {
      profileForm.elements.name.value = profile.name;
      profileForm.elements.email.value = profile.email;
      profileForm.elements.phone.value = profile.phone || '';
      profileForm.elements.photoUrl.value = profile.profilePictureUrl || '';
      profileFormError.textContent = '';
      profileModal.classList.remove('hidden');
    }

    function closeModal() {
      profileModal.classList.add('hidden');
      profileFormError.textContent = '';
    }

    function validateProfile(profile) {
      if (!profile.name.trim() || !profile.email.trim()) {
        return 'Please fill in all required fields.';
      }
      if (profile.phone && profile.phone.trim()) {
        const phoneRegex = /^[0-9+\-() ]{7,20}$/;
        if (!phoneRegex.test(profile.phone.trim())) {
          return 'Please enter a valid phone number.';
        }
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profile.email.trim())) {
        return 'Please enter a valid email address.';
      }
      return '';
    }

    document.body.addEventListener('click', function (event) {
      if (event.target.closest('#edit-profile-btn')) {
        fetchProfile().then((profile) => openProfileModal(profile));
      }
    });

    closeProfileModal?.addEventListener('click', closeModal);
    cancelProfileModal?.addEventListener('click', closeModal);

    profileForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      const profileData = {
        name: profileForm.elements.name.value.trim(),
        email: profileForm.elements.email.value.trim(),
        phone: profileForm.elements.phone.value.trim(),
      };

      const validationError = validateProfile(profileData);
      if (validationError) {
        profileFormError.textContent = validationError;
        return;
      }

      try {
        const response = await csrfFetch('/api/admin/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(profileData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          profileFormError.textContent = errorData.error || 'Failed to update profile.';
          return;
        }

        const result = await response.json();

        // Update profile picture if provided
        if (profileForm.elements.photoUrl.value.trim()) {
          const pictureResponse = await csrfFetch('/api/admin/profile/picture', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              profilePictureUrl: profileForm.elements.photoUrl.value.trim(),
            }),
          });

          if (!pictureResponse.ok) {
            const picError = await pictureResponse.json();
            console.warn('Failed to update picture:', picError.error);
          } else {
            result.admin.profilePictureUrl = profileForm.elements.photoUrl.value.trim();
          }
        }

        renderProfile(result.admin);
        closeModal();
      } catch (error) {
        console.error('Error updating profile:', error);
        profileFormError.textContent = 'Unable to update profile. Please try again later.';
      }
    });

    document.addEventListener('click', function (event) {
      if (event.target.closest('#edit-profile-btn')) {
        return;
      }
      if (!profileModal.classList.contains('hidden') && !profileModal.querySelector('.modal-panel').contains(event.target)) {
        closeModal();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeModal();
      }
    });

    // Initial load
    fetchProfile().then((profile) => renderProfile(profile));
  }

  initProfilePage();
})();
