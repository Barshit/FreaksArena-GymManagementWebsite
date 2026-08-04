(function () {
  const PAYMENTS_TBODY_ID = 'payments-tbody';
  const PAYMENT_MODAL_ID = 'payment-modal';
  const PAYMENT_FORM_ID = 'payment-form';
  const PAYMENT_FORM_ERROR_ID = 'payment-form-error';
  const PAYMENT_MEMBER_SEARCH_ID = 'payment-member-search';
  const PAYMENT_MODAL_TITLE_ID = 'payment-modal-title';

  let membersCache = [];
  let paymentsCache = [];
  let currentEditingPaymentId = null;

  async function fetchMembers() {
    try {
      const response = await fetch('/api/members');
      if (!response.ok) {
        throw new Error(`Failed to load members (${response.status})`);
      }
      membersCache = await response.json();
    } catch (error) {
      console.error('Unable to load members for payments page:', error);
      membersCache = [];
    }
    return membersCache;
  }

  async function fetchPayments() {
    try {
     const response = await fetch('/api/payments');
     if (!response.ok) {
       throw new Error(`Failed to load payments (${response.status})`);
     }
     paymentsCache = await response.json();
    } catch (error) {
     console.error('Unable to load payments:', error);
     paymentsCache = [];
    }
    return paymentsCache;
  }

  async function fetchPayment(paymentId) {
    try {
      const response = await fetch(`/api/payments/${paymentId}`);
      if (!response.ok) {
        throw new Error(`Failed to load payment (${response.status})`);
      }
      return await response.json();
    } catch (error) {
      console.error('Unable to fetch payment:', error);
      return null;
    }
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

  function formatDateForInput(value) {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString().split('T')[0];
  }

  function escapeHtml(text) {
    return String(text)
     .replace(/&/g, '&amp;')
     .replace(/</g, '&lt;')
     .replace(/>/g, '&gt;')
     .replace(/"/g, '&quot;')
     .replace(/'/g, '&#039;');
  }

  function getMemberName(memberId, members) {
    const member = members.find((item) => String(item._id) === String(memberId));
    return member ? member.fullName : 'Unknown member';
  }

  function getStatusClass(status) {
    const normalizedStatus = String(status || '').toLowerCase();
    return normalizedStatus === 'completed' ? 'paid' : 'pending';
  }

  function getMemberById(memberId) {
    return membersCache.find((member) => String(member._id) === String(memberId));
  }

  function getStatusDisplay(status) {
    const normalizedStatus = String(status || '').toLowerCase();
    return normalizedStatus === 'completed' ? 'Paid' : 'Pending';
  }

  async function renderPayments() {
    const tableBody = document.getElementById(PAYMENTS_TBODY_ID);
    if (!tableBody) {
     return;
    }

    await fetchPayments();
    const members = membersCache;
    const payments = paymentsCache.slice().sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));

    if (!payments.length) {
     tableBody.innerHTML = '<tr><td colspan="7" class="empty-row">No payment records are available yet.</td></tr>';
     return;
    }

    tableBody.innerHTML = payments
     .map((payment) => {
       const memberData = payment.member || {};
       const memberName = memberData.fullName || 'Unknown member';
       const memberId = memberData.memberId || '—';
       const statusClass = getStatusClass(payment.status);
       const paymentIdStr = escapeHtml(String(payment._id || ''));
       const statusDisplay = getStatusDisplay(payment.status);
       return `
         <tr>
           <td>${escapeHtml(memberId)}</td>
           <td>${escapeHtml(memberName)}</td>
           <td>₹${escapeHtml(parseFloat(payment.amount).toFixed(2))}</td>
           <td>${escapeHtml(payment.method || '—')}</td>
           <td>${escapeHtml(formatDate(payment.paidAt))}</td>
           <td><span class="payment-status ${statusClass}">${escapeHtml(statusDisplay)}</span></td>
           <td>
             <div class="action-buttons">
               <button type="button" class="edit-payment" data-payment-id="${paymentIdStr}" title="Edit payment">✎</button>
               <button type="button" class="delete-payment" data-payment-id="${paymentIdStr}" title="Delete payment">🗑</button>
             </div>
           </td>
         </tr>
       `;
     })
     .join('');

    // Attach event listeners to action buttons
    attachActionListeners();
  }

  function attachActionListeners() {
    const editButtons = document.querySelectorAll('.edit-payment');
    const deleteButtons = document.querySelectorAll('.delete-payment');

    editButtons.forEach((btn) => {
      btn.addEventListener('click', function () {
        const paymentId = this.getAttribute('data-payment-id');
        openPaymentModalForEdit(paymentId);
      });
    });

    deleteButtons.forEach((btn) => {
      btn.addEventListener('click', function () {
        const paymentId = this.getAttribute('data-payment-id');
        if (window.ConfirmDialog) {
          window.ConfirmDialog.show(
            'Delete Payment',
            'Are you sure you want to delete this payment?',
            function () {
              deletePaymentRecord(paymentId);
            }
          );
        } else {
          console.error('ConfirmDialog not available');
        }
      });
    });
  }

  async function deletePaymentRecord(paymentId) {
    try {
      const response = await csrfFetch(`/api/payments/${paymentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        window.alert(errorData.error || 'Unable to delete payment.');
        return;
      }

      await renderPayments();
    } catch (error) {
      console.error('Delete error:', error);
      window.alert('Unable to delete payment. Please try again.');
    }
  }

  function toggleModal(modal, show) {
    if (!modal) {
     return;
    }
    modal.classList.toggle('hidden', !show);
    document.body.style.overflow = show ? 'hidden' : '';
  }

  function resetPaymentForm(form) {
    if (!form) {
     return;
    }
    form.reset();
    const error = form.querySelector('.form-error');
    if (error) {
     error.textContent = '';
    }
    if (form.elements.date) {
     form.elements.date.value = new Date().toISOString().split('T')[0];
    }
    currentEditingPaymentId = null;
  }

  function populatePaymentMembers(form, members) {
    if (!form) {
      return;
    }
    const memberSelect = form.elements.memberId;
    if (!memberSelect) {
     return;
    }
    memberSelect.innerHTML = '<option value="">Select member</option>';
    members.forEach((member) => {
     const option = document.createElement('option');
     option.value = String(member._id);
     option.textContent = `${member.memberId || '—'} · ${member.fullName} — ${member.phone || 'No phone'}`;
     option.dataset.name = member.fullName.toLowerCase();
     option.dataset.phone = String(member.phone || '').toLowerCase();
     option.dataset.memberId = String(member.memberId || '').toLowerCase();
     memberSelect.appendChild(option);
    });
  }

  function filterPaymentMembers(searchInput, form) {
    if (!form || !searchInput) {
     return;
    }
    const searchTerm = searchInput.value.trim().toLowerCase();
    const memberSelect = form.elements.memberId;
    if (!memberSelect) {
     return;
    }
    Array.from(memberSelect.options).forEach((option) => {
     if (!option.value) {
       option.hidden = false;
       return;
     }
     const matches =
       option.dataset.name.includes(searchTerm) ||
       option.dataset.phone.includes(searchTerm) ||
       (option.dataset.memberId || '').includes(searchTerm);
     option.hidden = !!searchTerm && !matches;
    });
  }

  function updateSelectedMemberInfo(form) {
    const infoPanel = document.getElementById('payment-member-info');
    const nameEl = document.getElementById('payment-member-name');
    const phoneEl = document.getElementById('payment-member-phone');
    const planEl = document.getElementById('payment-member-plan');
    const expiryEl = document.getElementById('payment-member-expiry');
    if (!form || !infoPanel || !nameEl || !phoneEl || !planEl || !expiryEl) {
     return;
    }
    const memberId = form.elements.memberId.value;
    if (!memberId) {
     infoPanel.classList.add('hidden');
     return;
    }
    const member = getMemberById(memberId);
    if (!member) {
     infoPanel.classList.add('hidden');
     return;
    }
    nameEl.textContent = `Member: ${member.fullName}`;
    phoneEl.textContent = `Phone: ${member.phone || '—'}`;
    planEl.textContent = `Plan: ${member.plan || '—'}`;
    expiryEl.textContent = `Expiry: ${formatDate(member.expiryDate)}`;
    infoPanel.classList.remove('hidden');
  }

  function validatePaymentForm(values) {
    const errors = [];
    if (!values.memberId) {
     errors.push('Please select a member.');
    }
    const amount = parseFloat(values.amount);
    if (Number.isNaN(amount) || amount <= 0) {
     errors.push('Payment Amount must be greater than zero.');
    }
    if (!values.date) {
     errors.push('Payment Date is required.');
    }
    if (!values.method) {
     errors.push('Payment Method is required.');
    }
    if (!values.type) {
     errors.push('Payment Type is required.');
    }
    if (!values.status) {
     errors.push('Payment Status is required.');
    }
    return errors;
  }

  async function handlePaymentFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    if (!form || form.id !== PAYMENT_FORM_ID) {
     return;
    }

    const values = {
     memberId: form.elements.memberId.value,
     amount: form.elements.amount.value.trim(),
     paidAt: form.elements.date.value,
     date: form.elements.date.value,
     method: form.elements.method.value.toLowerCase(),
     membershipPlan: form.elements.type.value,
     type: form.elements.type.value,
     status: form.elements.status.value,
     notes: form.elements.notes.value.trim(),
    };

    const errorEl = document.getElementById(PAYMENT_FORM_ERROR_ID);
    const errors = validatePaymentForm(values);
    if (errorEl) {
     errorEl.textContent = errors.join(' ');
    }
    if (errors.length) {
     return;
    }

    try {
     let response;
     if (currentEditingPaymentId) {
       response = response = await csrfFetch(`/api/payments/${currentEditingPaymentId}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(values),
       });
     } else {
       response = await csrfFetch('/api/payments', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(values),
       });
     }

     if (!response.ok) {
       const errorData = await response.json();
       if (errorEl) {
         errorEl.textContent = errorData.error || 'Unable to save payment. Please try again.';
       }
       return;
     }

     const payment = await response.json();

     if (values.membershipPlan === 'Membership Renewal' && values.memberId) {
       try {
         const renewResponse = await csrfFetch(
           `/api/members/${encodeURIComponent(values.memberId)}/renew`,
           {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({}),
           }
         );
         if (!renewResponse.ok) {
           throw new Error(`Unable to renew membership (${renewResponse.status})`);
         }
         await renewResponse.json();
       } catch (error) {
         console.error('Membership renewal failed:', error);
         window.alert('Payment recorded, but the membership renewal could not be applied.');
       }
     }

     closePaymentModal();
     await renderPayments();
    } catch (error) {
     console.error('Payment submission error:', error);
     if (errorEl) {
       errorEl.textContent = 'Unable to save payment. Please try again.';
     }
    }
  }

  async function openPaymentModal() {
    const modal = document.getElementById(PAYMENT_MODAL_ID);
    const form = document.getElementById(PAYMENT_FORM_ID);
    if (!modal || !form) {
     return;
    }

    await fetchMembers();
    if (!membersCache.length) {
     window.alert('No members are available. Add a member before recording a payment.');
     return;
    }

    resetPaymentForm(form);
    populatePaymentMembers(form, membersCache);
    filterPaymentMembers(document.getElementById(PAYMENT_MEMBER_SEARCH_ID), form);
    updateSelectedMemberInfo(form);
    updateModalTitle('Record a new payment');
    toggleModal(modal, true);
  }

  async function openPaymentModalForEdit(paymentId) {
    const modal = document.getElementById(PAYMENT_MODAL_ID);
    const form = document.getElementById(PAYMENT_FORM_ID);
    if (!modal || !form) {
     return;
    }

    await fetchMembers();
    const payment = await fetchPayment(paymentId);

    if (!payment) {
      window.alert('Unable to load payment details.');
      return;
    }

    currentEditingPaymentId = paymentId;
    resetPaymentForm(form);
    populatePaymentMembers(form, membersCache);

    // Populate form with payment data
    form.elements.memberId.value = String(payment.member._id || payment.member);
    form.elements.amount.value = payment.amount;
    form.elements.date.value = formatDateForInput(payment.paidAt);
    form.elements.method.value = payment.method;
    form.elements.type.value = payment.membershipPlan || '';
    form.elements.status.value = payment.status;
    form.elements.notes.value = payment.notes || '';

    updateSelectedMemberInfo(form);
    updateModalTitle('Edit payment');
    toggleModal(modal, true);
  }

  function updateModalTitle(text) {
    const titleEl = document.getElementById(PAYMENT_MODAL_TITLE_ID);
    if (titleEl) {
      titleEl.textContent = text;
    }
  }

  function closePaymentModal() {
    const modal = document.getElementById(PAYMENT_MODAL_ID);
    const form = document.getElementById(PAYMENT_FORM_ID);
    toggleModal(modal, false);
    if (form) {
     form.reset();
     const error = document.getElementById(PAYMENT_FORM_ERROR_ID);
     if (error) {
       error.textContent = '';
     }
    }
    currentEditingPaymentId = null;
  }

  function setupPaymentsPage() {
    const openPaymentButton = document.getElementById('open-record-payment');
    const closePaymentModalButton = document.getElementById('close-payment-modal');
    const cancelPaymentButton = document.getElementById('cancel-payment-modal');
    const paymentModal = document.getElementById(PAYMENT_MODAL_ID);
    const paymentForm = document.getElementById(PAYMENT_FORM_ID);
    const paymentSearch = document.getElementById(PAYMENT_MEMBER_SEARCH_ID);

    if (openPaymentButton) {
     openPaymentButton.addEventListener('click', openPaymentModal);
    }
    if (closePaymentModalButton) {
     closePaymentModalButton.addEventListener('click', closePaymentModal);
    }
    if (cancelPaymentButton) {
     cancelPaymentButton.addEventListener('click', closePaymentModal);
    }
    if (paymentForm) {
     paymentForm.addEventListener('submit', handlePaymentFormSubmit);
     paymentForm.elements.memberId?.addEventListener('change', function () {
       updateSelectedMemberInfo(paymentForm);
     });
    }
    if (paymentSearch && paymentForm) {
     paymentSearch.addEventListener('input', function () {
       filterPaymentMembers(paymentSearch, paymentForm);
     });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderPayments();
    setupPaymentsPage();
  });
})();
