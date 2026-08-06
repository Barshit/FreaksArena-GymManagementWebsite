(function () {
  const API_BASE = "/api/members";
  const MEMBERS_TABLE_BODY_ID = "members-tbody";
  const MEMBER_MODAL_ID = "member-modal";
  const RENEW_MODAL_ID = "renew-modal";
  const MEMBER_FORM_ID = "member-form";
  const RENEW_FORM_ID = "renew-form";
  const MEMBER_MODAL_TITLE_ID = "member-modal-title";
  const MEMBER_FORM_ERROR_ID = "member-form-error";
  const RENEW_FORM_ERROR_ID = "renew-form-error";

  let membersCache = [];

  async function fetchJson(url, options = {}) {
    const method = (options.method || "GET").toUpperCase();

    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const csrfToken = document.querySelector('input[name="_csrf"]')?.value;

      options.headers = {
        ...(options.headers || {}),
        "x-csrf-token": csrfToken,
      };
    }

    const response = await fetch(url, options);

    const contentType = response.headers.get("content-type") || "";
    let body = null;

    if (contentType.includes("application/json")) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    if (!response.ok) {
      const errorMessage =
        body && body.error ? body.error : body.message || body;
      throw new Error(errorMessage || "Request failed.");
    }

    return body;
  }

  async function fetchMembers(searchTerm = "") {
    const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : "";
    const members = await fetchJson(`${API_BASE}${query}`);
    membersCache = members;
    return members;
  }

  async function fetchMemberById(memberId) {
    const member = await fetchJson(
      `${API_BASE}/${encodeURIComponent(memberId)}`,
    );
    return member;
  }

  async function createMember(data) {
    return fetchJson(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async function updateMember(memberId, data) {
    return fetchJson(`${API_BASE}/${encodeURIComponent(memberId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async function deleteMember(memberId) {
    return fetchJson(`${API_BASE}/${encodeURIComponent(memberId)}`, {
      method: "DELETE",
    });
  }

  async function renewMember(memberId, paymentData) {
    return fetchJson(`${API_BASE}/${encodeURIComponent(memberId)}/renew`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData),
    });
  }

  async function pauseMembership(memberId, data) {
    return fetchJson(`${API_BASE}/${encodeURIComponent(memberId)}/pause`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async function unpauseMembership(memberId) {
    return fetchJson(`${API_BASE}/${encodeURIComponent(memberId)}/unpause`, {
      method: "POST",
    });
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  function formatDateTime(value) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getStatusClass(status) {
    return status === "Paid" ? "status-paid" : "status-pending";
  }

  async function renderMembersTable(searchTerm = "") {
    const tableBody = document.getElementById(MEMBERS_TABLE_BODY_ID);
    if (!tableBody) {
      return;
    }

    let members = [];
    try {
      members = await fetchMembers(searchTerm);
    } catch (error) {
      tableBody.innerHTML = `<tr><td colspan="9" class="empty-row">Unable to load members. ${escapeHtml(error.message)}</td></tr>`;
      return;
    }

    const today = new Date();

    if (!members.length) {
      const message = searchTerm
        ? "No members match your search."
        : "No members have been added yet. Use the Add Member button to start.";
      tableBody.innerHTML = `<tr><td colspan="9" class="empty-row">${message}</td></tr>`;
      return;
    }

    tableBody.innerHTML = members
      .map((member) => {
        const statusClass = getStatusClass(member.paymentStatus);
        let rowClass = "";
        let namePrefix = "";
        if (member.birthday) {
          const bd = new Date(member.birthday);
          if (
            !Number.isNaN(bd.getTime()) &&
            bd.getDate() === today.getDate() &&
            bd.getMonth() === today.getMonth()
          ) {
            rowClass = "birthday-row";
            namePrefix = "🎂 ";
          }
        }
        return `
          <tr class="${rowClass}">
            <td>${escapeHtml(member.memberId || "—")}</td>
            <td>${namePrefix}${escapeHtml(member.fullName)}${rowClass ? ' <span class="birthday-badge">Birthday Today</span>' : ""}</td>
            <td>${escapeHtml(member.phone)}</td>
            <td>${escapeHtml(member.plan)}</td>
            <td>${escapeHtml(formatDate(member.birthday))}</td>
            <td>${escapeHtml(formatDate(member.joiningDate))}</td>
            <td>${escapeHtml(formatDate(member.expiryDate))}</td>
            <td><span class="status-pill ${statusClass}">${escapeHtml(member.paymentStatus)}</span></td>
            <td>
              <div class="table-actions">
                <a href="member-details.html?id=${encodeURIComponent(member._id)}" class="action-button">View</a>
                <button type="button" class="action-button" data-action="edit" data-id="${member._id}">Edit</button>
                <button type="button" class="action-button" data-action="renew" data-id="${member._id}">Renew</button>
                <button type="button" class="action-button" data-action="pause" data-id="${member._id}">Pause</button>
                <button type="button" class="action-button" data-action="delete" data-id="${member._id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  async function findMember(memberId) {
    const cached = membersCache.find(
      (member) => String(member._id) === String(memberId),
    );
    if (cached) {
      return cached;
    }
    try {
      const member = await fetchMemberById(memberId);
      return member;
    } catch (error) {
      return null;
    }
  }

  function toggleModal(modal, show) {
    if (!modal) {
      return;
    }
    modal.classList.toggle("hidden", !show);
    document.body.style.overflow = show ? "hidden" : "";
  }

  function resetForm(form) {
    if (!form) {
      return;
    }
    form.reset();
    const error = form.querySelector(".form-error");
    if (error) {
      error.textContent = "";
    }
  }

  function populateMemberForm(member) {
    const form = document.getElementById(MEMBER_FORM_ID);
    if (!form) {
      return;
    }

    form.elements.memberId.value = member.memberId || "";
    form.elements.fullName.value = member.fullName || "";
    form.elements.phone.value = member.phone || "";
    form.elements.gender.value = member.gender || "";
    form.elements.plan.value = member.plan || "";
    form.elements.joiningDate.value = member.joiningDate
      ? member.joiningDate.split("T")[0]
      : "";
    form.elements.expiryDate.value = member.expiryDate
      ? member.expiryDate.split("T")[0]
      : "";
    form.elements.birthday.value = member.birthday
      ? member.birthday.split("T")[0]
      : "";
    form.elements.amountPaid.value = member.amountPaid ?? "";
    form.elements.paymentMethod.value = member.paymentMethod || "";
    form.elements.paymentStatus.value = member.paymentStatus || "";
  }

  async function openMemberModal(mode, memberId) {
    const modal = document.getElementById(MEMBER_MODAL_ID);
    const title = document.getElementById(MEMBER_MODAL_TITLE_ID);
    const form = document.getElementById(MEMBER_FORM_ID);
    if (!modal || !title || !form) {
      return;
    }

    form.dataset.mode = mode;
    form.dataset.memberId = memberId || "";
    title.textContent = mode === "edit" ? "Edit Member" : "Add Member";

    if (mode === "edit" && memberId) {
      const member = await findMember(memberId);
      if (!member) {
        window.alert("Unable to find this member. It may have been removed.");
        return;
      }
      populateMemberForm(member);
      if (form.elements.sendWhatsapp) {
        form.elements.sendWhatsapp.checked = false;
      }
    } else {
      resetForm(form);
      if (form.elements.sendWhatsapp) {
        form.elements.sendWhatsapp.checked = true;
      }
    }

    toggleModal(modal, true);
  }

  function closeMemberModal() {
    const modal = document.getElementById(MEMBER_MODAL_ID);
    const form = document.getElementById(MEMBER_FORM_ID);
    toggleModal(modal, false);
    resetForm(form);
    if (form) {
      delete form.dataset.mode;
      delete form.dataset.memberId;
    }
  }

  async function openRenewModal(memberId) {
    const modal = document.getElementById(RENEW_MODAL_ID);
    const form = document.getElementById(RENEW_FORM_ID);
    if (!modal || !form) {
      return;
    }

    const member = await findMember(memberId);
    if (!member) {
      window.alert("Unable to renew this member. Member not found.");
      return;
    }

    form.dataset.memberId = memberId;
    form.reset();
    const error = document.getElementById(RENEW_FORM_ERROR_ID);
    if (error) {
      error.textContent = "";
    }
    toggleModal(modal, true);
  }

  function closeRenewModal() {
    const modal = document.getElementById(RENEW_MODAL_ID);
    const form = document.getElementById(RENEW_FORM_ID);
    toggleModal(modal, false);
    if (form) {
      delete form.dataset.memberId;
      form.reset();
    }
  }

  async function openPauseModal(memberId) {
    const modal = document.getElementById("pause-modal");
    const form = document.getElementById("pause-form");
    if (!modal || !form) {
      return;
    }

    const member = await findMember(memberId);
    if (!member) {
      window.alert("Unable to pause this member. Member not found.");
      return;
    }

    form.dataset.memberId = memberId;
    form.reset();
    const error = document.getElementById("pause-form-error");
    if (error) {
      error.textContent = "";
    }
    toggleModal(modal, true);
  }

  function closePauseModal() {
    const modal = document.getElementById("pause-modal");
    const form = document.getElementById("pause-form");
    toggleModal(modal, false);
    if (form) {
      delete form.dataset.memberId;
      form.reset();
    }
  }

  function validateMemberForm(values, currentMemberId) {
    const errors = [];
    if (!values.memberId.trim()) {
      errors.push("Member ID is required.");
    }
    if (!values.fullName.trim()) {
      errors.push("Full Name is required.");
    }
    if (!values.phone.trim()) {
      errors.push("Phone Number is required.");
    }
    if (!values.gender) {
      errors.push("Gender is required.");
    }
    if (!values.plan) {
      errors.push("Membership Plan is required.");
    }
    if (!values.joiningDate) {
      errors.push("Joining Date is required.");
    }
    if (!values.expiryDate) {
      errors.push("Expiry Date is required.");
    }
    if (values.joiningDate && values.expiryDate) {
      const join = new Date(values.joiningDate);
      const expiry = new Date(values.expiryDate);
      if (join > expiry) {
        errors.push("Expiry Date must be the same day or after Joining Date.");
      }
    }
    const amount = parseFloat(values.amountPaid);
    if (Number.isNaN(amount) || amount < 0) {
      errors.push("Amount Paid must be a valid number.");
    }
    if (!values.paymentMethod) {
      errors.push("Payment Method is required.");
    }
    if (!values.paymentStatus) {
      errors.push("Payment Status is required.");
    }
    return errors;
  }

  function isWhatsAppPhoneValid(phone) {
    const cleaned = String(phone).replace(/\D/g, "");
    return /^[0-9]{10,15}$/.test(cleaned);
  }

  function generateWhatsappMessage(member) {
  const expiryDate = new Date(member.expiryDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `🏋️ Welcome to Freaks Arena, ${member.fullName}! 💪

We're thrilled to have you as a part of the Freaks Arena family.

Your transformation journey begins today.
Train hard, stay focused, and become the best version of yourself.

Let's crush your fitness goals together! 🔥

📅 Membership: ${member.plan}
⏳ Valid Until: ${expiryDate}

If you have any questions about your membership, we're here to help.

⭐ We value every member's feedback.

Whenever you feel comfortable sharing your experience, we'd be grateful if you could leave us a Google Review.

🌟 Leave us a Google Review:
https://g.page/r/CRCdZn5sHbnTEBM/review

— Team Freaks Arena 🧡`;
}

  function openWhatsApp(member) {
    const phone = String(member.phone || "").replace(/\D/g, "");

if (!isWhatsAppPhoneValid(phone))  {
      window.alert(
        "Member was saved, but WhatsApp could not be opened because the phone number is invalid.",
      );
      return;
    }
    const message = generateWhatsappMessage(member);

const whatsappUrl = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;

window.open(whatsappUrl, "_blank");
  }

  async function handleMemberFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    if (!form || form.id !== MEMBER_FORM_ID) {
      return;
    }

    const values = {
      memberId: form.elements.memberId.value.trim(),
      fullName: form.elements.fullName.value.trim(),
      phone: form.elements.phone.value.trim(),
      gender: form.elements.gender.value,
      plan: form.elements.plan.value,
      joiningDate: form.elements.joiningDate.value,
      expiryDate: form.elements.expiryDate.value,
      birthday: form.elements.birthday ? form.elements.birthday.value : "",
      amountPaid: form.elements.amountPaid.value.trim(),
      paymentMethod: form.elements.paymentMethod.value,
      paymentStatus: form.elements.paymentStatus.value,
      sendWhatsapp: form.elements.sendWhatsapp
        ? form.elements.sendWhatsapp.checked
        : false,
    };

    const errorEl = document.getElementById(MEMBER_FORM_ERROR_ID);
    const mode = form.dataset.mode || "add";
    const memberId = form.dataset.memberId;
    const errors = validateMemberForm(
      values,
      mode === "edit" ? memberId : null,
    );
    if (errorEl) {
      errorEl.textContent = errors.join(" ");
    }
    if (errors.length) {
      return;
    }

    const payload = {
      memberId: values.memberId,
      fullName: values.fullName,
      phone: values.phone,
      gender: values.gender,
      plan: values.plan,
      joiningDate: values.joiningDate,
      expiryDate: values.expiryDate,
      birthday: values.birthday || undefined,
      amountPaid: values.amountPaid,
      paymentMethod: values.paymentMethod,
      paymentStatus: values.paymentStatus,
    };

    try {
      if (mode === "edit" && memberId) {
        await updateMember(memberId, payload);
      } else {
        const createdMember = await createMember(payload);
        if (values.sendWhatsapp) {
          openWhatsApp(createdMember);
        }
      }
      closeMemberModal();
      await renderMembersTable();
    } catch (error) {
      if (errorEl) {
        errorEl.textContent = error.message;
      } else {
        window.alert(`Unable to save member: ${error.message}`);
      }
    }
  }

  async function handleRenewFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    if (!form || form.id !== RENEW_FORM_ID) {
      return;
    }

    const memberId = form.dataset.memberId;
    const errorEl = document.getElementById(RENEW_FORM_ERROR_ID);
    if (!memberId) {
      if (errorEl) {
        errorEl.textContent = "Unable to renew this member.";
      }
      return;
    }

    const formData = new FormData(form);
    const paymentData = {
      amountPaid: parseFloat(formData.get("amountPaid")) || 0,
      paymentMethod: formData.get("paymentMethod") || "Cash",
      paymentStatus: formData.get("paymentStatus") || "Paid",
    };

    try {
      await renewMember(memberId, paymentData);
      closeRenewModal();
      await renderMembersTable();
    } catch (error) {
      if (errorEl) {
        errorEl.textContent = error.message;
      } else {
        window.alert(`Unable to renew member: ${error.message}`);
      }
    }
  }

  async function handlePauseFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    if (!form || form.id !== "pause-form") {
      return;
    }

    const memberId = form.dataset.memberId;
    const errorEl = document.getElementById("pause-form-error");
    if (!memberId) {
      if (errorEl) {
        errorEl.textContent = "Unable to pause this member.";
      }
      return;
    }

    const startDate = form.elements.pauseStartDate.value;
    const endDate = form.elements.pauseEndDate.value;
    const reason = form.elements.pauseReason.value.trim();

    const errors = [];
    if (!startDate) {
      errors.push("Pause start date is required.");
    }
    if (!endDate) {
      errors.push("Pause end date is required.");
    }
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) {
        errors.push(
          "Pause end date must be same day or after pause start date.",
        );
      }
    }

    if (errorEl) {
      errorEl.textContent = errors.join(" ");
    }
    if (errors.length) {
      return;
    }

    try {
      await pauseMembership(memberId, {
        startDate,
        endDate,
        reason: reason || undefined,
      });
      closePauseModal();
      await renderMembersTable();
    } catch (error) {
      if (errorEl) {
        errorEl.textContent = error.message;
      } else {
        window.alert(`Unable to pause member: ${error.message}`);
      }
    }
  }

  async function handleTableActions(event) {
    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }

    const action = button.dataset.action;
    const memberId = button.dataset.id;
    if (!action || !memberId) {
      return;
    }

    if (action === "edit") {
      await openMemberModal("edit", memberId);
    }

    if (action === "renew") {
      openRenewModal(memberId);
    }

    if (action === "renew") {
      openRenewModal(memberId);
    }

    if (action === "pause") {
      openPauseModal(memberId);
    }

    if (action === "delete") {
      if (window.ConfirmDialog) {
        window.ConfirmDialog.show(
          "Delete Member",
          "Are you sure you want to delete this member?",
          async function () {
            try {
              await deleteMember(memberId);
              await renderMembersTable();
            } catch (error) {
              window.alert(`Unable to delete member: ${error.message}`);
            }
          },
        );
      } else {
        console.error("ConfirmDialog not available");
      }
    }
  }

  function setupMembersPage() {
    const addMemberButton = document.getElementById("open-add-member");
    const memberModal = document.getElementById(MEMBER_MODAL_ID);
    const closeMemberModalButton =
      document.getElementById("close-member-modal");
    const cancelMemberButton = document.getElementById("cancel-member-modal");
    const renewModal = document.getElementById(RENEW_MODAL_ID);
    const closeRenewModalButton = document.getElementById("close-renew-modal");
    const cancelRenewButton = document.getElementById("cancel-renew-modal");
    const pauseModal = document.getElementById("pause-modal");
    const closePauseModalButton = document.getElementById("close-pause-modal");
    const cancelPauseButton = document.getElementById("cancel-pause-modal");
    const tableBody = document.getElementById(MEMBERS_TABLE_BODY_ID);
    const memberForm = document.getElementById(MEMBER_FORM_ID);
    const renewForm = document.getElementById(RENEW_FORM_ID);
    const pauseForm = document.getElementById("pause-form");
    const searchInput = document.getElementById("member-search");

    if (addMemberButton) {
      addMemberButton.addEventListener("click", function () {
        openMemberModal("add");
      });
    }

    if (closeMemberModalButton) {
      closeMemberModalButton.addEventListener("click", closeMemberModal);
    }
    if (cancelMemberButton) {
      cancelMemberButton.addEventListener("click", closeMemberModal);
    }
    if (closeRenewModalButton) {
      closeRenewModalButton.addEventListener("click", closeRenewModal);
    }
    if (cancelRenewButton) {
      cancelRenewButton.addEventListener("click", closeRenewModal);
    }
    if (closePauseModalButton) {
      closePauseModalButton.addEventListener("click", closePauseModal);
    }
    if (cancelPauseButton) {
      cancelPauseButton.addEventListener("click", closePauseModal);
    }

    if (memberModal) {
      memberModal.addEventListener("click", function (event) {
        if (event.target === memberModal) {
          closeMemberModal();
        }
      });
    }

    if (renewModal) {
      renewModal.addEventListener("click", function (event) {
        if (event.target === renewModal) {
          closeRenewModal();
        }
      });
    }

    if (pauseModal) {
      pauseModal.addEventListener("click", function (event) {
        if (event.target === pauseModal) {
          closePauseModal();
        }
      });
    }

    if (memberForm) {
      memberForm.addEventListener("submit", handleMemberFormSubmit);
    }

    if (renewForm) {
      renewForm.addEventListener("submit", handleRenewFormSubmit);
    }

    if (pauseForm) {
      pauseForm.addEventListener("submit", handlePauseFormSubmit);
    }

    if (tableBody) {
      tableBody.addEventListener("click", handleTableActions);
    }

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        renderMembersTable(searchInput.value);
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMemberModal();
        closeRenewModal();
        closePauseModal();
      }
    });

    renderMembersTable();
  }

  function parseQueryParams() {
    const search = window.location.search.substring(1);
    return search.split("&").reduce((params, part) => {
      const [key, value] = part.split("=");
      if (!key) {
        return params;
      }
      params[decodeURIComponent(key)] = decodeURIComponent(value || "");
      return params;
    }, {});
  }

  async function loadMemberDetailsPage() {
    const params = parseQueryParams();
    const memberId = params.id;
    const detailsGrid = document.getElementById("member-details-grid");
    const notice = document.getElementById("details-notice");
    const header = document.getElementById("details-header");

    if (!memberId) {
      if (header) {
        header.textContent = "Member not found";
      }
      if (notice) {
        notice.classList.remove("hidden");
        notice.textContent = "No member was selected for this page.";
      }
      if (detailsGrid) {
        detailsGrid.classList.add("hidden");
      }
      return;
    }

    let member;
    try {
      member = await fetchMemberById(memberId);
    } catch (error) {
      if (header) {
        header.textContent = "Member not found";
      }
      if (notice) {
        notice.classList.remove("hidden");
        notice.textContent = `Unable to load member details: ${error.message}`;
      }
      if (detailsGrid) {
        detailsGrid.classList.add("hidden");
      }
      return;
    }

    if (header) {
      header.textContent = member.fullName;
    }

    if (notice) {
      notice.classList.add("hidden");
    }

    if (detailsGrid) {
      detailsGrid.classList.remove("hidden");
    }

    const fields = {
      "detail-name": member.fullName,
      "detail-phone": member.phone,
      "detail-gender": member.gender,
      "detail-plan": member.plan,
      "detail-joining": formatDate(member.joiningDate),
      "detail-expiry": formatDate(member.expiryDate),
      "detail-birthday": member.birthday ? formatDate(member.birthday) : "—",
      "detail-payment-status": member.paymentStatus,
      "detail-amount-paid":
        member.amountPaid != null ? `₹${member.amountPaid}` : "—",
    };
    const detailMemberId = document.getElementById("detail-member-id");
    if (detailMemberId) {
      detailMemberId.textContent = `Member ID: ${member.memberId || "—"}`;
    }

    Object.keys(fields).forEach((fieldId) => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.textContent = fields[fieldId];
      }
    });

    const sendBirthdayBtn = document.getElementById("send-birthday-wishes");
    const sendReminderBtn = document.getElementById("send-payment-reminder");

    if (sendBirthdayBtn) {
      sendBirthdayBtn.addEventListener("click", function () {
        const phone = String(member.phone || "").replace(/\D/g, "");
        if (!/^[0-9]{10,15}$/.test(phone)) {
          window.alert("Cannot open WhatsApp. Member phone number is invalid.");
          return;
        }
        const message = `🏋️ Welcome to Freaks Arena, ${member.fullName}! 💪

The entire Freaks Arena family warmly welcomes you!

Your fitness journey begins today. Stay dedicated, train hard, and keep pushing your limits to become the strongest version of yourself.

We're excited to be a part of your transformation. Let's achieve your fitness goals together! 🔥

— Team Freaks Arena 🧡`;
       const url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
window.open(url, '_blank');
      });
    }

    if (sendReminderBtn) {
      sendReminderBtn.addEventListener("click", function () {
        const phone = String(member.phone || "").replace(/\D/g, "");
        if (!/^[0-9]{10,15}$/.test(phone)) {
          window.alert("Cannot open WhatsApp. Member phone number is invalid.");
          return;
        }
        const message = `Hello ${member.fullName},\n\nThis is a friendly reminder from Freaks Arena that your membership payment is due.\n\nMembership Plan:\n${member.plan}\n\nExpiry Date:\n${member.expiryDate}\n\nPlease visit the gym or contact us to renew your membership and continue your fitness journey without interruption.\n\nThank you for being a part of Freaks Arena.\n\n— Team Freaks Arena 🧡`;
        const url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
        window.open(url, "_blank");
      });
    }

    // Add pause/unpause button functionality
    const pauseUnpauseBtn = document.getElementById("pause-unpause-btn");
    const pauseStatusContainer = document.getElementById(
      "pause-status-container",
    );
    const pauseStatusEl = document.getElementById("detail-pause-status");
    const pauseModal = document.getElementById("pause-modal");
    const pauseForm = document.getElementById("pause-form-details");
    const closePauseModalBtn = document.getElementById("close-pause-modal");
    const cancelPauseBtn = document.getElementById("cancel-pause-modal");

    if (pauseUnpauseBtn) {
      // Determine current pause status
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      let activePause = null;
      if (member.pauseHistory && member.pauseHistory.length > 0) {
        activePause = member.pauseHistory.find((pause) => {
          const pauseStart = new Date(pause.startDate);
          const pauseEnd = new Date(pause.endDate);
          pauseStart.setUTCHours(0, 0, 0, 0);
          pauseEnd.setUTCHours(23, 59, 59, 999);
          return pauseStart <= today && today <= pauseEnd;
        });
      }

      if (activePause) {
        // Show unpause button and status
        pauseUnpauseBtn.textContent = "⏸ Unpause Membership";
        pauseUnpauseBtn.style.display = "inline-block";
        pauseStatusContainer.style.display = "block";
        pauseStatusEl.textContent = "Paused";
        pauseStatusEl.style.color = "var(--warning)";

        pauseUnpauseBtn.addEventListener("click", async function () {
          if (window.ConfirmDialog) {
            window.ConfirmDialog.show(
              "Unpause Membership",
              "Are you sure you want to unpause this membership? The expiry date will be extended by the pause duration.",
              async function () {
                try {
                  await unpauseMembership(memberId);
                  location.reload();
                } catch (error) {
                  window.alert(
                    `Unable to unpause membership: ${error.message}`,
                  );
                }
              },
            );
          } else {
            console.error("ConfirmDialog not available");
          }
        });
      } else {
        // Check if membership is expired
        const expiryDate = new Date(member.expiryDate);
        expiryDate.setUTCHours(23, 59, 59, 999);

        if (today > expiryDate) {
          pauseUnpauseBtn.textContent = "⏸ Cannot Pause (Expired)";
          pauseUnpauseBtn.disabled = true;
          pauseUnpauseBtn.style.display = "inline-block";
        } else {
          // Show pause button
          pauseUnpauseBtn.textContent = "⏸ Pause Membership";
          pauseUnpauseBtn.style.display = "inline-block";

          pauseUnpauseBtn.addEventListener("click", function () {
            if (pauseForm) {
              pauseForm.dataset.memberId = memberId;
              pauseForm.reset();
              const error = document.getElementById("pause-form-error");
              if (error) {
                error.textContent = "";
              }
              if (pauseModal) {
                pauseModal.classList.remove("hidden");
                document.body.style.overflow = "hidden";
              }
            }
          });
        }
      }
    }

    // Add modal event listeners for member-details page
    if (closePauseModalBtn) {
      closePauseModalBtn.addEventListener("click", function () {
        if (pauseModal) {
          pauseModal.classList.add("hidden");
          document.body.style.overflow = "";
        }
      });
    }

    if (cancelPauseBtn) {
      cancelPauseBtn.addEventListener("click", function () {
        if (pauseModal) {
          pauseModal.classList.add("hidden");
          document.body.style.overflow = "";
        }
      });
    }

    if (pauseModal) {
      pauseModal.addEventListener("click", function (event) {
        if (event.target === pauseModal) {
          pauseModal.classList.add("hidden");
          document.body.style.overflow = "";
        }
      });
    }

    if (pauseForm) {
      pauseForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const memberId = pauseForm.dataset.memberId;
        const errorEl = document.getElementById("pause-form-error");
        if (!memberId) {
          if (errorEl) {
            errorEl.textContent = "Unable to pause this member.";
          }
          return;
        }

        const startDate = pauseForm.elements.pauseStartDate.value;
        const endDate = pauseForm.elements.pauseEndDate.value;
        const reason = pauseForm.elements.pauseReason.value.trim();

        const errors = [];
        if (!startDate) {
          errors.push("Pause start date is required.");
        }
        if (!endDate) {
          errors.push("Pause end date is required.");
        }
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          if (start > end) {
            errors.push(
              "Pause end date must be same day or after pause start date.",
            );
          }
        }

        if (errorEl) {
          errorEl.textContent = errors.join(" ");
        }
        if (errors.length) {
          return;
        }

        try {
          await pauseMembership(memberId, {
            startDate,
            endDate,
            reason: reason || undefined,
          });
          if (pauseModal) {
            pauseModal.classList.add("hidden");
            document.body.style.overflow = "";
          }
          location.reload();
        } catch (error) {
          if (errorEl) {
            errorEl.textContent = error.message;
          } else {
            window.alert(`Unable to pause member: ${error.message}`);
          }
        }
      });
    }
  }

  function initializePage() {
    if (document.getElementById(MEMBERS_TABLE_BODY_ID)) {
      setupMembersPage();
      const params = parseQueryParams();
      if (params.renew) {
        setTimeout(function () {
          openRenewModal(params.renew);
        }, 50);
      }
    }
    if (document.getElementById("member-details-grid")) {
      loadMemberDetailsPage();
    }
  }

  initializePage();
})();
