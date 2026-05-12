// ── PUBLIC MARKET VENDOR REGISTRATION — SCRIPT ───────────────

let vendors = [];

// ── VALIDATION HELPERS ────────────────────────────────────────
function isValidPersonName(value) {
  const trimmed = String(value).trim();
  if (!trimmed) return false;
  // Letters (incl. accents/Ñ), spaces, commas. Must start/end with a letter.
  return /^[A-Za-zÀ-ÖØ-öø-ÿÑñ](?:[A-Za-zÀ-ÖØ-öø-ÿÑñ\s,]*[A-Za-zÀ-ÖØ-öø-ÿÑñ])?$/.test(trimmed);
}

// Business/stall name: allow letters/numbers, spaces, commas, periods, hyphens, and apostrophes.
// Blocks symbols like @#$ and injection-like characters.
function isValidBusinessName(value) {
  const trimmed = String(value).trim();
  if (!trimmed) return false;
  // No digits allowed
  return /^[A-Za-zÀ-ÖØ-öø-ÿÑñ][A-Za-zÀ-ÖØ-öø-ÿÑñ\s,\.\-']*$/.test(trimmed);
}

// Stall number: allow letters/numbers and hyphens (e.g., D-01)
function isValidStall(value) {
  const trimmed = String(value).trim();
  if (!trimmed) return false;
  return /^[A-Za-z0-9][A-Za-z0-9\-]*$/.test(trimmed);
}

// Permit number: allow letters/numbers and hyphens (common formats)
function isValidPermit(value) {
  const trimmed = String(value).trim();
  if (!trimmed) return false;
  return /^[A-Za-z0-9][A-Za-z0-9\-]*$/.test(trimmed);
}

// Contact: digits and hyphens only
function isValidContact(value) {
  const trimmed = String(value).trim();
  if (!trimmed) return false;
  // Standard PH mobile format: 09XX-XXX-XXXX
  return /^09\d{2}-\d{3}-\d{4}$/.test(trimmed);
}

function isValidFreeText(value) {
  return !/[<>]/.test(String(value));
}

function formatPhMobileFromDigits(digitsOnly) {
  const d = String(digitsOnly).replace(/\D/g, '').slice(0, 11);
  const part1 = d.slice(0, 4);
  const part2 = d.slice(4, 7);
  const part3 = d.slice(7, 11);

  if (d.length <= 4) return part1;
  if (d.length <= 7) return `${part1}-${part2}`;
  return `${part1}-${part2}-${part3}`;
}

// Parse <input type="date"> (YYYY-MM-DD) into a local Date (avoids timezone shifts)
function parseDateInputToLocalDate(yyyyMmDd) {
  if (!yyyyMmDd) return null;
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(yyyyMmDd));
  if (!m) return null;
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  const day = Number(m[3]);
  const dt = new Date(year, monthIndex, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== monthIndex || dt.getDate() !== day) return null;
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function formatDateInputForDisplay(yyyyMmDd) {
  const dt = parseDateInputToLocalDate(yyyyMmDd);
  return dt ? dt.toLocaleDateString() : '';
}

function attachLiveValidation() {
  const vendorEl = document.getElementById('v_vendor');
  if (vendorEl) {
    vendorEl.addEventListener('input', function () {
      // Keep only letters, spaces, commas
      this.value = this.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿÑñ\s,]/g, '');
    });
  }

  const businessEl = document.getElementById('v_business');
  if (businessEl) {
    businessEl.addEventListener('input', function () {
      // Keep only letters (no digits), spaces, comma, period, hyphen, apostrophe
      this.value = this.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿÑñ\s,\.\-']/g, '');
    });
  }

  const stallEl = document.getElementById('v_stall');
  if (stallEl) {
    stallEl.addEventListener('input', function () {
      // Keep letters/numbers and hyphen
      this.value = this.value.replace(/[^A-Za-z0-9\-]/g, '');
    });
  }

  const permitEl = document.getElementById('v_permit');
  if (permitEl) {
    permitEl.addEventListener('input', function () {
      // Keep letters/numbers and hyphen
      this.value = this.value.replace(/[^A-Za-z0-9\-]/g, '');
    });
  }

  const contactEl = document.getElementById('v_contact');
  if (contactEl) {
    contactEl.addEventListener('input', function () {
      // Auto-format as 09XX-XXX-XXXX (digits only; hyphens inserted)
      const digits = this.value.replace(/\D/g, '');
      this.value = formatPhMobileFromDigits(digits);
    });
  }

  const remarksEl = document.getElementById('v_remarks');
  if (remarksEl) {
    remarksEl.addEventListener('input', function () {
      // Block angle brackets
      this.value = this.value.replace(/[<>]/g, '');
    });
  }

  const cleanOthersText = document.getElementById('cleanOthersText');
  if (cleanOthersText) {
    cleanOthersText.addEventListener('input', function () {
      this.value = this.value.replace(/[<>]/g, '');
    });
  }
}

attachLiveValidation();

// ── TOAST HELPER ─────────────────────────────────────────────
function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ── FORM SUBMIT ──────────────────────────────────────────────
document.getElementById('vendorForm').addEventListener('submit', function (e) {
  e.preventDefault();

  // ── READ VALUES ───────────────────────────────────────────
  const business   = document.getElementById('v_business').value.trim();
  const product    = document.getElementById('v_product').value;
  const stall      = document.getElementById('v_stall').value.trim();
  const permit     = document.getElementById('v_permit').value.trim();
  const vendorName = document.getElementById('v_vendor').value.trim();
  let contact      = document.getElementById('v_contact').value.trim();
  const sanitary   = document.getElementById('v_sanitary').value;
  const regDate    = document.getElementById('v_reg_date') ? document.getElementById('v_reg_date').value : '';
  const remarks    = document.getElementById('v_remarks').value.trim();

  const cleanChecked = Array.from(document.querySelectorAll('input[name="cleanliness"]:checked'));
  const cleanParts   = cleanChecked.map(cb => {
    if (cb.value === 'Others') {
      const txt = document.getElementById('cleanOthersText').value.trim();
      return txt ? 'Others: ' + txt : 'Others';
    }
    return cb.value;
  });
  const cleanliness = cleanParts.join(', ');

  // ── VALIDATION ────────────────────────────────────────────
  if (!business || !stall || !permit || !vendorName || !contact) {
    showToast('⚠️ Please fill in all required fields.');
    return;
  }
  if (!product) {
    showToast('⚠️ Please select a product category.');
    return;
  }
  if (!sanitary) {
    showToast('⚠️ Please select a sanitary practice rating.');
    return;
  }

  if (!isValidBusinessName(business)) {
    showToast('⚠️ Business / Stall Name contains invalid characters.');
    return;
  }
  if (!isValidStall(stall)) {
    showToast('⚠️ Stall Number contains invalid characters.');
    return;
  }
  if (!isValidPermit(permit)) {
    showToast('⚠️ Business Permit No. contains invalid characters.');
    return;
  }

  // Vendor Name allowlist
  if (!isValidPersonName(vendorName)) {
    showToast('⚠️ Vendor Name may only contain letters, spaces, and commas.');
    return;
  }

  // Normalize/format contact before validating
  contact = formatPhMobileFromDigits(contact);
  const contactEl = document.getElementById('v_contact');
  if (contactEl) contactEl.value = contact;
  if (!isValidContact(contact)) {
    showToast('⚠️ Contact Number must be in the format 09XX-XXX-XXXX.');
    return;
  }

  if (!isValidFreeText(remarks)) {
    showToast('⚠️ Inspector Remarks contains invalid characters.');
    return;
  }

  // Date must be provided and not in the future
  if (!regDate) {
    showToast('⚠️ Please select a date.');
    return;
  }
  const regDt = parseDateInputToLocalDate(regDate);
  if (!regDt) {
    showToast('⚠️ Please enter a valid date.');
    return;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (regDt > today) {
    showToast('⚠️ Date cannot be in the future.');
    return;
  }

  // ── BUILD VENDOR OBJECT ───────────────────────────────────
  const vendor = {
    id:          Date.now(),
    business,
    product,
    stall,
    permit,
    vendorName,
    contact,
    sanitary,
    cleanliness,
    remarks,
    registered:  regDate
  };

  // ── SAVE & RENDER ─────────────────────────────────────────
  vendors.push(vendor);
  showToast('✅ Vendor registered successfully!');
  this.reset();
  renderTable();
});

// ── CLEAR BUTTON ─────────────────────────────────────────────
document.getElementById('clearVendorBtn').addEventListener('click', function () {
  document.getElementById('vendorForm').reset();
  showToast('🔄 Form cleared.');
});

// ── RENDER TABLE ─────────────────────────────────────────────
function renderTable() {
  const tbody  = document.getElementById('vendorTableBody');
  const status = document.getElementById('vendorTableStatus');

  if (vendors.length === 0) {
    status.textContent = 'No vendors registered yet.';
    tbody.innerHTML = '<tr class="empty-row"><td colspan="9">No vendors registered yet.</td></tr>';
    return;
  }

  status.textContent = `Showing ${vendors.length} registered vendor${vendors.length > 1 ? 's' : ''}.`;

  tbody.innerHTML = vendors.map((vendor, index) => {
    const sanitaryLower = vendor.sanitary.toLowerCase();
    const statusClass   = `status-${sanitaryLower}`;
    const isWarning     = vendor.sanitary === 'Poor' || vendor.sanitary === 'Fair';
    const rowClass      = isWarning ? 'row-warning' : '';

    return `
      <tr class="${rowClass}">
        <td>${index + 1}</td>
        <td><strong>${escapeHtml(vendor.business)}</strong></td>
        <td>${escapeHtml(vendor.vendorName)}</td>
        <td>${escapeHtml(vendor.product)}</td>
        <td>${escapeHtml(vendor.permit)}</td>
        <td>${escapeHtml(vendor.stall)}</td>
        <td><span class="${statusClass}">${escapeHtml(vendor.sanitary)}</span></td>
        <td>${escapeHtml(formatDateInputForDisplay(vendor.registered))}</td>
        <td>
          <button class="btn-delete" onclick="deleteVendor(${vendor.id})">🗑 Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ── DELETE VENDOR ─────────────────────────────────────────────
function deleteVendor(id) {
  if (confirm('Are you sure you want to delete this vendor?')) {
    vendors = vendors.filter(v => v.id !== id);
    renderTable();
    showToast('🗑 Vendor deleted.');
  }
}

// ── EXPORT TO CSV (reads from vendors array) (Edited Function) ───────────────────
function exportToCSV() {
  if (vendors.length === 0) {
    showToast('⚠️ No vendors to export! Register at least one vendor first.');
    return;
  }

  const headers = [
    'No.',
    'Business Name',
    'Vendor Name',
    'Product Type',
    'Stall Number',
    'Permit No.',
    'Contact',
    'Sanitary Rating',
    'Cleanliness',
    'Inspector Remarks',
    'Registered Date'
  ];

  const rows = vendors.map((v, i) => [
    i + 1,
    v.business,
    v.vendorName,
    v.product,
    v.stall,
    v.permit,
    v.contact,
    v.sanitary,
    v.cleanliness,
    v.remarks,
    formatDateInputForDisplay(v.registered)
  ]);

  const csvContent = [headers, ...rows]
    .map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `Vendor_Registry_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('📥 CSV exported successfully!');
}

// ── SECURITY: ESCAPE HTML ─────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── INITIAL RENDER ────────────────────────────────────────────
renderTable();