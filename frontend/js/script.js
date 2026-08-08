// Backend URL configuration
const BACKEND_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://freaksarena-gymmanagementwebsite-1.onrender.com";

const topBtn = document.getElementById("topBtn");
const navbar = document.querySelector(".navbar");

/* ============================
   Triple-click Admin Login shortcut on "UNLEASH" text
   ============================ */
(function initTripleClickAdminShortcut() {
  const unleashText = document.getElementById("unleash-text");
  if (!unleashText) return;

  let clickCount = 0;
  let clickTimer = null;
  const CLICK_TIMEOUT = 1000; // 1 second window for triple-click
  const REQUIRED_CLICKS = 3;

  unleashText.addEventListener("click", function (e) {
    // Prevent default behavior only on triple-click
    clickCount++;

    // Clear previous timer if exists
    if (clickTimer) {
      clearTimeout(clickTimer);
    }

    // Set new timer to reset click count
    clickTimer = setTimeout(() => {
      clickCount = 0;
    }, CLICK_TIMEOUT);

    // Check if triple-click achieved
    if (clickCount === REQUIRED_CLICKS) {
      // Reset click count
      clickCount = 0;
      if (clickTimer) {
        clearTimeout(clickTimer);
      }

      // Redirect to admin login
      window.open(
        `${BACKEND_URL}/admin-login`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  });
})();

// Single scroll listener drives both the "scroll to top" button visibility
// and the navbar's scrolled-state background.
window.addEventListener("scroll", () => {
  if (topBtn) topBtn.style.display = window.scrollY > 300 ? "block" : "none";
  if (navbar) navbar.classList.toggle("active-nav", window.scrollY > 80);
});

if (topBtn) {
  topBtn.onclick = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };
}

const faders = document.querySelectorAll(".fade");

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("show");
    }
  });
});

faders.forEach((section) => {
  observer.observe(section);
});

/* ============================
   Announcements: fetch and render on home page
   ============================ */
async function fetchAndRenderAnnouncements() {
  const container = document.getElementById("announcements-list");
  if (!container) return;

  try {
    const response = await fetch(`${BACKEND_URL}/api/announcements/active`);
    if (!response.ok) throw new Error("Failed to fetch announcements");
    const announcements = await response.json();

    if (!announcements.length) {
      container.innerHTML = "<p>No new announcements at this time.</p>";
      return;
    }

    container.innerHTML = announcements
      .map(
        (a) => `
<div class="announcement-item">

    <div class="announcement-header">

        <span class="announcement-category ${String(a.category || "General").toLowerCase()}">
            ${a.category || "General"}
        </span>

        <span class="announcement-date">
            ${new Date(a.publishedAt).toLocaleDateString()}
        </span>

    </div>

    <h3 class="announcement-title">
        ${a.title}
    </h3>

    <p class="announcement-content">
        ${a.message}
    </p>

    <div class="announcement-footer">

        <span class="announcement-priority ${String(a.priority || "Normal").toLowerCase()}">
            ${a.priority || "Normal"}
        </span>

    </div>

</div>
`,
      )
      .join("");
  } catch (error) {
    console.error("Error loading announcements:", error);
    container.innerHTML = "<p>Unable to load announcements.</p>";
  }
}

fetchAndRenderAnnouncements();

/* ============================
   Membership inquiry form: validation + toast feedback
   ============================ */
const form = document.getElementById("membershipForm");
const submitBtn = document.getElementById("submitBtn");

const nameField = document.getElementById("name");
const emailField = document.getElementById("email");
const phoneField = document.getElementById("phone");
const goalField = document.getElementById("goal");
const planField = document.getElementById("plan");

// Each validator returns an error string, or "" if the field is valid
const validators = {
  name: (value) => {
    if (!value.trim()) return "Please enter your full name.";
    if (value.trim().length < 2) return "Name looks too short.";
    return "";
  },
  email: (value) => {
    if (!value.trim()) return "Please enter your email address.";
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value.trim())) return "Enter a valid email address.";
    return "";
  },
  phone: (value) => {
    const digitsOnly = value.replace(/\D/g, "");
    if (!digitsOnly) return "Please enter your phone number.";
    if (digitsOnly.length < 10) return "Enter a valid 10-digit phone number.";
    return "";
  },
  goal: (value) => (value ? "" : "Please select a fitness goal."),
  plan: (value) => (value ? "" : "Please select a membership plan."),
};

function showFieldError(field, message) {
  if (!field) return true;
  const errorEl = document.getElementById(`${field.id}Error`);
  field.classList.remove("valid", "invalid");

  if (message) {
    field.classList.add("invalid");
    if (errorEl) errorEl.textContent = message;
    return false;
  }

  field.classList.add("valid");
  if (errorEl) errorEl.textContent = "";
  return true;
}

function validateField(field) {
  if (!field) return true;
  const validator = validators[field.id];
  if (!validator) return true;
  const message = validator(field.value);
  return showFieldError(field, message);
}

// Validate as the user interacts
[nameField, emailField, phoneField].forEach((field) => {
  if (!field) return;
  field.addEventListener("blur", () => validateField(field));
  field.addEventListener("input", () => {
    if (field.classList.contains("invalid")) validateField(field);
  });
});

[goalField, planField].forEach((field) => {
  if (!field) return;
  field.addEventListener("change", () => validateField(field));
});

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show ${type}`;

  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}

if (form) {
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const fieldsToValidate = [
      nameField,
      emailField,
      phoneField,
      goalField,
      planField,
    ].filter(Boolean);
    const results = fieldsToValidate.map(validateField);
    const isFormValid = results.every(Boolean);

    if (!isFormValid) {
      showToast(
        "Please fix the highlighted fields before submitting.",
        "error",
      );
      const firstInvalid = fieldsToValidate.find((field) =>
        field.classList.contains("invalid"),
      );
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const messageField = document.getElementById("message");
    const member = {
      name: nameField.value.trim(),
      email: emailField.value.trim(),
      phone: phoneField.value.trim(),
      goal: goalField.value,
      plan: planField.value,
      message: messageField ? messageField.value.trim() : "",
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      const btnLabel = submitBtn.querySelector(".btn-label");
      if (btnLabel) btnLabel.textContent = "Submitting…";
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/enquiries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(member),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to submit enquiry.");
      }

      showToast(
        "Thanks! Your inquiry has been received — we'll be in touch soon.",
        "success",
      );

      form.reset();

      fieldsToValidate.forEach((field) =>
        field.classList.remove("valid", "invalid"),
      );
    } catch (error) {
      console.error(error);

      showToast("Unable to submit your enquiry. Please try again.", "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;

        const btnLabel = submitBtn.querySelector(".btn-label");

        if (btnLabel) {
          btnLabel.textContent = "Submit Inquiry";
        }
      }
    }
  });
}

/* ============================
   Scroll-spy: highlight the nav link for the section in view
   ============================ */
const spySections = ["home", "about", "plans", "gallery", "contact"]
  .map((id) => document.getElementById(id))
  .filter(Boolean);

const navLinkMap = new Map();
document.querySelectorAll(".nav-links a").forEach((link) => {
  const href = link.getAttribute("href");
  if (href && href.startsWith("#")) {
    const id = href.replace("#", "");
    navLinkMap.set(id, link);
  }
});

function setActiveNavLink(id) {
  navLinkMap.forEach((link, linkId) => {
    const isActive = linkId === id;
    link.classList.toggle("active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

const spyObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        setActiveNavLink(entry.target.id);
      }
    });
  },
  { rootMargin: "-45% 0px -50% 0px" },
);

spySections.forEach((section) => spyObserver.observe(section));

/* ============================
   Mobile navigation (animated)
   ============================ */
const menuBtn = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");

function closeMobileMenu() {
  if (!menuBtn || !navLinks) return;
  menuBtn.classList.remove("active");
  navLinks.classList.remove("active");
  menuBtn.setAttribute("aria-expanded", "false");
  document.body.classList.remove("nav-open");
}

function toggleMobileMenu() {
  if (!menuBtn || !navLinks) return;
  const isOpen = navLinks.classList.toggle("active");
  menuBtn.classList.toggle("active", isOpen);
  menuBtn.setAttribute("aria-expanded", String(isOpen));
  document.body.classList.toggle("nav-open", isOpen);
}

if (menuBtn) {
  menuBtn.addEventListener("click", toggleMobileMenu);
}

if (navLinks) {
  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMobileMenu);
  });
}

document.addEventListener("click", (e) => {
  if (!navLinks || !menuBtn) return;
  const isMenuOpen = navLinks.classList.contains("active");
  const clickedInsideNav =
    navLinks.contains(e.target) || menuBtn.contains(e.target);

  if (isMenuOpen && !clickedInsideNav) {
    closeMobileMenu();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 768) {
    closeMobileMenu();
  }
});

/* ============================
   BMI Calculator
   ============================ */
const bmiHeight = document.getElementById("bmiHeight");
const bmiWeight = document.getElementById("bmiWeight");
const bmiCalcBtn = document.getElementById("bmiCalcBtn");
const bmiError = document.getElementById("bmiError");
const bmiScore = document.getElementById("bmiScore");
const bmiCategory = document.getElementById("bmiCategory");
const bmiScaleFill = document.getElementById("bmiScaleFill");

function getBmiCategory(bmi) {
  if (bmi < 18.5) return { label: "Underweight", color: "#3b82f6" };
  if (bmi < 25) return { label: "Normal weight", color: "#22c55e" };
  if (bmi < 30) return { label: "Overweight", color: "#ff6b00" };
  return { label: "Obese", color: "#ef4444" };
}

function resetBmiResult(message) {
  if (bmiScore) bmiScore.textContent = "--";
  if (bmiCategory) {
    bmiCategory.textContent = message;
    bmiCategory.style.color = "";
  }
  if (bmiScaleFill) bmiScaleFill.style.left = "0%";
}

function calculateBmi() {
  if (!bmiHeight || !bmiWeight) return;
  const heightCm = parseFloat(bmiHeight.value);
  const weightKg = parseFloat(bmiWeight.value);

  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    if (bmiError)
      bmiError.textContent =
        "Please enter a valid height and weight to calculate your BMI.";
    resetBmiResult("Enter your height and weight");
    return;
  }

  if (heightCm < 100 || heightCm > 250) {
    if (bmiError)
      bmiError.textContent = "Height should be between 100cm and 250cm.";
    resetBmiResult("Enter a valid height");
    return;
  }

  if (weightKg < 20 || weightKg > 300) {
    if (bmiError)
      bmiError.textContent = "Weight should be between 20kg and 300kg.";
    resetBmiResult("Enter a valid weight");
    return;
  }

  if (bmiError) bmiError.textContent = "";

  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const { label, color } = getBmiCategory(bmi);

  if (bmiScore) bmiScore.textContent = bmi.toFixed(1);
  if (bmiCategory) {
    bmiCategory.textContent = label;
    bmiCategory.style.color = color;
  }

  if (bmiScaleFill) {
    const clamped = Math.min(Math.max(bmi, 15), 40);
    const percent = ((clamped - 15) / (40 - 15)) * 100;
    bmiScaleFill.style.left = `${percent}%`;
  }
}

if (bmiCalcBtn) {
  bmiCalcBtn.addEventListener("click", calculateBmi);
}

[bmiHeight, bmiWeight].forEach((field) => {
  if (!field) return;
  field.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      calculateBmi();
    }
  });
});

/* ============================
   Live Open Now / Closed indicator
   ============================ */

/* ============================
   Live Open Now / Closed indicator
   ============================ */

// Split business hours based on image: Monday(1) to Saturday(6). Sunday(0) is null (Off).
const BUSINESS_HOURS = {
  0: null, // Sunday off
  1: {
    morningOpen: "05:00",
    morningClose: "08:00",
    eveningOpen: "16:30",
    eveningClose: "21:00",
  }, // Monday
  2: {
    morningOpen: "05:00",
    morningClose: "08:00",
    eveningOpen: "16:30",
    eveningClose: "21:00",
  }, // Tuesday
  3: {
    morningOpen: "05:00",
    morningClose: "08:00",
    eveningOpen: "16:30",
    eveningClose: "21:00",
  }, // Wednesday
  4: {
    morningOpen: "05:00",
    morningClose: "08:00",
    eveningOpen: "16:30",
    eveningClose: "21:00",
  }, // Thursday
  5: {
    morningOpen: "05:00",
    morningClose: "08:00",
    eveningOpen: "16:30",
    eveningClose: "21:00",
  }, // Friday
  6: {
    morningOpen: "05:00",
    morningClose: "08:00",
    eveningOpen: "16:30",
    eveningClose: "21:00",
  }, // Saturday
};

function timeToMinutes(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

const GYM_TIMEZONE = "Asia/Kolkata";
const WEEKDAY_SHORT_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getGymLocalTime() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: GYM_TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(new Date());
  const lookup = {};
  parts.forEach(({ type, value }) => {
    lookup[type] = value;
  });

  return {
    dayIndex: WEEKDAY_SHORT_NAMES.indexOf(lookup.weekday),
    minutes: Number(lookup.hour) * 60 + Number(lookup.minute),
  };
}

function updateOpenStatus() {
  const badge = document.getElementById("statusBadge");
  const text = document.getElementById("statusText");
  if (!badge || !text) return;

  const { dayIndex, minutes: nowMinutes } = getGymLocalTime();
  const today = BUSINESS_HOURS[dayIndex];

  // If it's Sunday (today === null)
  if (!today) {
    badge.classList.remove("open");
    badge.classList.add("closed");
    text.textContent = "Closed · Opens Monday 5:00 AM (IST)";
    return;
  }

  const mOpen = timeToMinutes(today.morningOpen);
  const mClose = timeToMinutes(today.morningClose);
  const eOpen = timeToMinutes(today.eveningOpen);
  const eClose = timeToMinutes(today.eveningClose);

  // Check if currently inside morning session
  if (nowMinutes >= mOpen && nowMinutes < mClose) {
    badge.classList.remove("closed");
    badge.classList.add("open");
    text.textContent = `Open Now · Closes ${formatTime(today.morningClose)} (IST)`;
  }
  // Check if currently inside evening session
  else if (nowMinutes >= eOpen && nowMinutes < eClose) {
    badge.classList.remove("closed");
    badge.classList.add("open");
    text.textContent = `Open Now · Closes ${formatTime(today.eveningClose)} (IST)`;
  }
  // Otherwise, it is closed
  else {
    badge.classList.remove("open");
    badge.classList.add("closed");

    if (nowMinutes < mOpen) {
      text.textContent = `Closed · Opens ${formatTime(today.morningOpen)} (IST)`;
    } else if (nowMinutes < eOpen) {
      text.textContent = `Closed · Opens ${formatTime(today.eveningOpen)} (IST)`;
    } else {
      // If it's Saturday night, next open is Monday. Otherwise, tomorrow morning.
      if (dayIndex === 6) {
        text.textContent = "Closed · Opens Monday 5:00 AM (IST)";
      } else {
        text.textContent = `Closed · Opens tomorrow ${formatTime(today.morningOpen)} (IST)`;
      }
    }
  }
}

function formatTime(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

updateOpenStatus();
setInterval(updateOpenStatus, 60 * 1000);
/* ============================
   Gallery lightbox
   ============================ */
const galleryImages = Array.from(
  document.querySelectorAll(".gallery-grid img"),
);
galleryImages.forEach((img) => {
  const markImageLoaded = () => img.classList.add("loaded");

  if (img.complete && img.naturalWidth !== 0) {
    markImageLoaded();
  } else {
    img.addEventListener("load", markImageLoaded, { once: true });
  }
});
const lightbox = document.querySelector(".lightbox");
const lightboxImg = document.querySelector(".lightbox-img");
const closeBtn = document.querySelector(".close");
const prevBtn = document.querySelector(".lightbox-prev");
const nextBtn = document.querySelector(".lightbox-next");
const lightboxCounter = document.getElementById("lightboxCounter");

let currentImageIndex = 0;
let lastFocusedElement = null;

function openLightbox(index) {
  if (!lightbox || galleryImages.length === 0) return;
  currentImageIndex = index;
  lastFocusedElement = document.activeElement;
  updateLightboxImage();
  lightbox.classList.add("active");
  if (closeBtn) closeBtn.focus();
}

function updateLightboxImage() {
  const img = galleryImages[currentImageIndex];
  if (!img) return;
  if (lightboxImg) {
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt || "";
  }
  if (lightboxCounter) {
    lightboxCounter.textContent = `${currentImageIndex + 1} / ${galleryImages.length}`;
  }
}

function showNextImage() {
  if (galleryImages.length === 0) return;
  currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
  updateLightboxImage();
}

function showPrevImage() {
  if (galleryImages.length === 0) return;
  currentImageIndex =
    (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
  updateLightboxImage();
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.remove("active");
  if (lastFocusedElement) lastFocusedElement.focus();
}

galleryImages.forEach((img, index) => {
  img.addEventListener("click", () => openLightbox(index));
});

if (closeBtn) closeBtn.onclick = closeLightbox;

if (nextBtn) {
  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showNextImage();
  });
}

if (prevBtn) {
  prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showPrevImage();
  });
}

if (lightbox) {
  lightbox.onclick = (e) => {
    if (e.target === lightbox) {
      closeLightbox();
    }
  };
}

document.addEventListener("keydown", (e) => {
  if (!lightbox || !lightbox.classList.contains("active")) return;

  if (e.key === "Escape") {
    closeLightbox();
  } else if (e.key === "ArrowRight") {
    showNextImage();
  } else if (e.key === "ArrowLeft") {
    showPrevImage();
  } else if (e.key === "Tab") {
    const focusable = [closeBtn, prevBtn, nextBtn].filter(Boolean);
    if (focusable.length === 0) return;
    const currentIdx = focusable.indexOf(document.activeElement);
    e.preventDefault();
    const nextIdx = e.shiftKey
      ? currentIdx <= 0
        ? focusable.length - 1
        : currentIdx - 1
      : currentIdx === -1 || currentIdx === focusable.length - 1
        ? 0
        : currentIdx + 1;
    focusable[nextIdx].focus();
  }
});

// Stats counter animation
const statNumbers = document.querySelectorAll(".stat-number");

const statsObserver = new IntersectionObserver(
    (entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            const counter = entry.target;
            const target = Number(counter.dataset.target);
            const duration = 1200;
            const startTime = performance.now();

            function updateCounter(currentTime) {
                const progress = Math.min(
                    (currentTime - startTime) / duration,
                    1
                );

                // Smooth ease-out effect
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                const currentValue = Math.floor(target * easedProgress);

                counter.textContent =
                    currentValue.toLocaleString() +
                    (target === 6 ? "" : "+");

                if (progress < 1) {
                    requestAnimationFrame(updateCounter);
                }
            }

            requestAnimationFrame(updateCounter);

            // Run only once
            observer.unobserve(counter);
        });
    },
    {
        threshold: 0.5
    }
);

statNumbers.forEach((counter) => {
    statsObserver.observe(counter);
});