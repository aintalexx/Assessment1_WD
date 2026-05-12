// ── BARANGAY HEALTH MONITORING — SCRIPT ──────────────────────

let healthRecords = [];

// ── TOAST HELPER ─────────────────────────────────────────────
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

// ── VALIDATION HELPERS ────────────────────────────────────────

/**
 * Full name allowlist: letters (incl. accents/Ñ), spaces, and commas.
 * Blocks numbers and other symbols.
 */
function isValidName(value) {
    const trimmed = String(value).trim();
    if (!trimmed) return false;
    // Must start/end with a letter; inside can include spaces/commas.
    return /^[A-Za-zÀ-ÖØ-öø-ÿÑñ](?:[A-Za-zÀ-ÖØ-öø-ÿÑñ\s,]*[A-Za-zÀ-ÖØ-öø-ÿÑñ])?$/.test(trimmed);
}

// Parse <input type="date"> value (YYYY-MM-DD) into a local Date (avoids timezone shifts)
function parseDateInputToLocalDate(yyyyMmDd) {
    if (!yyyyMmDd) return null;
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(yyyyMmDd));
    if (!m) return null;
    const year = Number(m[1]);
    const monthIndex = Number(m[2]) - 1;
    const day = Number(m[3]);
    const dt = new Date(year, monthIndex, day);
    // Guard against invalid dates like 2026-02-31
    if (dt.getFullYear() !== year || dt.getMonth() !== monthIndex || dt.getDate() !== day) return null;
    dt.setHours(0, 0, 0, 0);
    return dt;
}

function formatDateInputForDisplay(yyyyMmDd) {
    const dt = parseDateInputToLocalDate(yyyyMmDd);
    return dt ? dt.toLocaleDateString() : '';
}

/**
 * Age must be a whole positive integer between 1 and 120.
 */
function isValidAge(value) {
    const num = Number(value);
    return Number.isInteger(num) && num >= 1 && num <= 120;
}

/**
 * Address: letters, numbers, spaces, and common punctuation only.
 * Blocks script tags and injection characters.
 */
function isValidAddress(value) {
    return /^[A-Za-z0-9ÑñÀ-ÖØ-öø-ÿ\s\.\,\#\-\'\/]+$/.test(value);
}

/**
 * "Others" free-text fields: block angle brackets and script-like content.
 */
function isValidFreeText(value) {
    return !/[<>]/.test(value);
}

// ── INLINE ERROR HELPER ───────────────────────────────────────
function setFieldError(id, message) {
    const el = document.getElementById(id);
    if (!el) return;

    el.style.borderColor = '#c0392b';
    el.style.background  = '#fff5f5';

    let errEl = document.getElementById(id + '_err');
    if (!errEl) {
        errEl = document.createElement('span');
        errEl.id = id + '_err';
        errEl.style.cssText = 'color:#c0392b;font-size:.75rem;margin-top:4px;display:block;';
        el.parentNode.insertBefore(errEl, el.nextSibling);
    }
    errEl.textContent = message;
}

function clearFieldError(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.borderColor = '';
        el.style.background  = '';
    }
    const errEl = document.getElementById(id + '_err');
    if (errEl) errEl.textContent = '';
}

function clearAllErrors() {
    ['h_fullname', 'h_age', 'h_address', 'h_last_checkup', 'h_notes'].forEach(clearFieldError);
}

// ── LIVE VALIDATION (attach on load) ─────────────────────────
function attachLiveValidation() {
    // Full Name: block non-name characters in real time
    const nameEl = document.getElementById('h_fullname');
    if (nameEl) {
        nameEl.addEventListener('input', function () {
            // Strip any character that isn't a letter, space, or comma
            this.value = this.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿÑñ\s,]/g, '');
        });
    }

    // Age: block non-numeric and enforce range on blur
    const ageEl = document.getElementById('h_age');
    if (ageEl) {
        ageEl.addEventListener('input', function () {
            // Remove anything that isn't a digit
            this.value = this.value.replace(/[^0-9]/g, '');
        });
        ageEl.addEventListener('blur', function () {
            if (this.value === '') return;
            const num = parseInt(this.value, 10);
            if (num < 1)   this.value = '1';
            if (num > 120) this.value = '120';
        });
    }

    // Address: block angle brackets and script-like chars in real time
    const addrEl = document.getElementById('h_address');
    if (addrEl) {
        addrEl.addEventListener('input', function () {
            this.value = this.value.replace(/[<>"'`]/g, '');
        });
    }

    // Others text: block angle brackets
    const sympOthers = document.getElementById('sympOthersText');
    if (sympOthers) {
        sympOthers.addEventListener('input', function () {
            this.value = this.value.replace(/[<>]/g, '');
        });
    }
}

// ── FORM SUBMIT ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

    const healthForm  = document.getElementById('healthForm');
    const tableBody   = document.getElementById('healthTableBody');
    const tableStatus = document.getElementById('healthTableStatus');

    attachLiveValidation();

    healthForm.addEventListener('submit', function (event) {
        event.preventDefault();
        clearAllErrors();

        let hasError = false;

        // ── READ VALUES ──────────────────────────────────────────
        const fullName    = document.getElementById('h_fullname').value.trim();
        const ageRaw      = document.getElementById('h_age').value.trim();
        const address     = document.getElementById('h_address').value.trim();
        const genderEl    = document.querySelector('input[name="gender"]:checked');
        const gender      = genderEl ? genderEl.value : '';
        const vaccStatusEl = document.getElementById('h_vacc_status');
        const vaccStatus  = vaccStatusEl.options[vaccStatusEl.selectedIndex].text;
        const vaccValue   = vaccStatusEl.value;
        const lastCheckup = document.getElementById('h_last_checkup').value;
        const notes       = document.getElementById('h_notes').value.trim();

        // ── VALIDATE: Full Name ───────────────────────────────────
        if (!fullName) {
            setFieldError('h_fullname', 'Full name is required.');
            hasError = true;
        } else if (!isValidName(fullName)) {
            setFieldError('h_fullname', 'Name may only contain letters, spaces, and commas.');
            hasError = true;
        } else if (fullName.length < 2) {
            setFieldError('h_fullname', 'Name must be at least 2 characters.');
            hasError = true;
        } else if (fullName.length > 100) {
            setFieldError('h_fullname', 'Name must not exceed 100 characters.');
            hasError = true;
        }

        // ── VALIDATE: Age ─────────────────────────────────────────
        if (!ageRaw) {
            setFieldError('h_age', 'Age is required.');
            hasError = true;
        } else if (!isValidAge(ageRaw)) {
            setFieldError('h_age', 'Age must be a whole number between 1 and 120.');
            hasError = true;
        }

        // ── VALIDATE: Address ─────────────────────────────────────
        if (!address) {
            setFieldError('h_address', 'Address is required.');
            hasError = true;
        } else if (!isValidAddress(address)) {
            setFieldError('h_address', 'Address contains invalid characters.');
            hasError = true;
        } else if (address.length > 200) {
            setFieldError('h_address', 'Address must not exceed 200 characters.');
            hasError = true;
        }

        // ── VALIDATE: Gender ──────────────────────────────────────
        if (!gender) {
            showToast('⚠️ Please select a gender.');
            hasError = true;
        }

        // ── VALIDATE: Vaccination Status ──────────────────────────
        if (!vaccValue) {
            showToast('⚠️ Please select a vaccination status.');
            hasError = true;
        }

        // ── VALIDATE: Last Checkup ────────────────────────────────
        if (!lastCheckup) {
            setFieldError('h_last_checkup', 'Please enter the last medical checkup date.');
            hasError = true;
        } else {
            const checkupDate = parseDateInputToLocalDate(lastCheckup);
            if (!checkupDate) {
                setFieldError('h_last_checkup', 'Please enter a valid date.');
                hasError = true;
            } else {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (checkupDate > today) {
                setFieldError('h_last_checkup', 'Last checkup date cannot be in the future.');
                hasError = true;
                }
            }
        }

        // ── VALIDATE: Symptoms ────────────────────────────────────
        const checkedSymptoms = document.querySelectorAll('input[name="symptom"]:checked');
        if (checkedSymptoms.length === 0) {
            showToast('⚠️ Please select at least one symptom (or "None").');
            hasError = true;
        }

        // ── VALIDATE: Others text (if checked) ────────────────────
        const sympOthersCheck = document.getElementById('sympOthersCheck');
        if (sympOthersCheck && sympOthersCheck.checked) {
            const othersText = document.getElementById('sympOthersText').value.trim();
            if (!othersText) {
                showToast('⚠️ Please specify the "Others" symptom.');
                hasError = true;
            } else if (!isValidFreeText(othersText)) {
                showToast('⚠️ "Others" field contains invalid characters.');
                hasError = true;
            }
        }

        if (hasError) return;

        // ── BUILD SYMPTOMS STRING ─────────────────────────────────
        let symptomsArray = [];
        checkedSymptoms.forEach(function (cb) {
            if (cb.value === 'others') {
                const txt = document.getElementById('sympOthersText').value.trim();
                if (txt) symptomsArray.push('Others: ' + txt);
            } else {
                const labelSpan = cb.parentElement.querySelectorAll('span:not(.dot)')[0];
                symptomsArray.push(labelSpan ? labelSpan.innerText : cb.value);
            }
        });
        const symptoms = symptomsArray.length > 0 ? symptomsArray.join(', ') : 'None';

        // ── SAVE RECORD ───────────────────────────────────────────
        const record = {
            id:          Date.now(),
            fullName,
            age:         parseInt(ageRaw, 10),  // store as integer
            gender,
            address,
            vaccStatus,
            vaccValue,
            lastCheckup,
            symptoms,
            notes,
            date:        new Date().toLocaleDateString() // submitted date (kept for CSV)
        };

        healthRecords.push(record);
        renderHealthTable();
        showToast('✅ Health record submitted successfully!');
        healthForm.reset();
        clearAllErrors();
    });

    // ── CLEAR BUTTON ───────────────────────────────────────────
    const clearBtn = document.getElementById('clearHealthBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            healthForm.reset();
            clearAllErrors();
            showToast('🔄 Form cleared.');
        });
    }

    renderHealthTable();
});

// ── RENDER HEALTH TABLE ───────────────────────────────────────
function renderHealthTable() {
    const tbody  = document.getElementById('healthTableBody');
    const status = document.getElementById('healthTableStatus');

    if (healthRecords.length === 0) {
        status.textContent    = 'No records yet.';
        status.style.display  = '';
        tbody.innerHTML       = '';
        return;
    }

    status.style.display = 'none';

    tbody.innerHTML = healthRecords.map((rec, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(rec.fullName)}</td>
            <td>${escapeHtml(rec.age)}</td>
            <td style="text-transform:capitalize;">${escapeHtml(rec.gender)}</td>
            <td>${escapeHtml(rec.vaccStatus)}</td>
            <td>${escapeHtml(rec.symptoms)}</td>
            <td>${escapeHtml(formatDateInputForDisplay(rec.lastCheckup))}</td>
            <td class="status-submitted">Submitted</td>
        </tr>
    `).join('');
}

// ── EXPORT TO CSV ─────────────────────────────────────────────
function exportToCSV() {
    if (healthRecords.length === 0) {
        showToast('⚠️ No records to export! Submit at least one record first.');
        return;
    }

    const headers = [
        'No.', 'Full Name', 'Age', 'Gender', 'Address',
        'Vaccination Status', 'Last Checkup', 'Symptoms', 'Notes', 'Date Submitted'
    ];

    const rows = healthRecords.map((rec, i) => [
        i + 1, rec.fullName, rec.age, rec.gender, rec.address,
        rec.vaccStatus, rec.lastCheckup, rec.symptoms, rec.notes, rec.date
    ]);

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Health_Records_${new Date().toISOString().split('T')[0]}.csv`;
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