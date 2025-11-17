// operation.js (module)
import { db } from './firebase-init.js';
import {
  collection,
  getDocs,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
/* --------------------------
   Popup functions (reusable)
   -------------------------- */
function showPopup(title, message, type = 'success') {
  const overlay = document.getElementById('popupOverlay');
  const titleEl = document.getElementById('popupTitle');
  const msgEl = document.getElementById('popupMessage');
  if (!overlay || !titleEl || !msgEl) {
    // fallback alert if DOM not present
    if (type === 'error') alert(`${title}\n\n${message}`);
    else alert(`${title}\n\n${message}`);
    return;
  }

  titleEl.textContent = title;
  msgEl.innerHTML = message;
  // apply classes for styling if needed
  titleEl.className = type === 'success' ? 'popup-success' : 'popup-error';
  overlay.classList.add('show');
  overlay.style.display = 'flex';
}
const popupCloseBtn = document.getElementById('popupCloseBtn');
if (popupCloseBtn) {
  popupCloseBtn.addEventListener('click', () => {
    const overlay = document.getElementById('popupOverlay');
    overlay.classList.remove('show');
    setTimeout(() => { overlay.style.display = 'none'; }, 180);
  });
}
// -----------------------------
// Populate doctors dropdown
// -----------------------------
async function fetchPatientsAndStore() {
  try {
    const patientsRef = collection(db, "patients");
    const psnapshot = await getDocs(patientsRef);
    const patients = [];
    snapshot.forEach(p => patients.push({ id: p.id, ...p.data() }));
    localStorage.setItem("patients", JSON.stringify(patients));
   sendScheduleEmail();
  } catch (err) {
    console.error("Error fetching patients:", err);
  }
}
async function sendScheduleEmail(schedule) {
    try {
    const templateParams = {
      patient_name: p.name || '-', // make sure schedule has patientName
      patient_id: p.id || '-'
    };

    // send email
    await emailjs.send(
      'service_awggasq',       // EmailJS Service ID
      'template_7dolonf',      // EmailJS Template ID
      templateParams
    );

    console.log('Email sent successfully.');
  } catch (err) {
    console.error('EmailJS send error:', err);
  }
}
/* --------------------------
   DOM refs
   -------------------------- */
const surgeryList = document.getElementById('surgeryList');
const schedDate = document.getElementById('schedDate');
const schedStart = document.getElementById('schedStart');
const schedEnd = document.getElementById('schedEnd');
const operationTheatre = document.getElementById('operationTheatre');
const schedSurgeon = document.getElementById('schedSurgeon');
const schedAnes = document.getElementById('schedAnes');
const patientIdInput = document.getElementById('patientIdInput');
const schedRemarks = document.getElementById('schedRemarks');
const addScheduleBtn = document.getElementById('addScheduleBtn');
const resetScheduleBtn = document.getElementById('resetScheduleBtn');

const filterDate = document.getElementById('filterDate');
const filterPatient = document.getElementById('filterPatient');
const searchScheduleBtn = document.getElementById('searchScheduleBtn');
const schedulesList = document.getElementById('schedulesList');

let localDoctors = [];      // cached doctors (each: { id: docId, doctorId, name, specialization, ... })
let editingScheduleId = null;

/* --------------------------
   load patient doc (if patientId in URL)
   -------------------------- */
async function loadPatientDoc(patientId) {
  try {
    const pRef = doc(db, 'patients', patientId);
    const snap = await getDoc(pRef);
    if (!snap.exists()) return;
    const data = snap.data();
    if (data && data.docs) {
      displayPatientDocument(data.docs);
    }
  } catch (err) {
    console.error('Error loading patient doc', err);
  }
}

function displayPatientDocument(url) {
  const box = document.getElementById('patientDocBox');
  if (!box) return;
  const ext = (url.split('.').pop() || '').toLowerCase();
  box.innerHTML = '';
  if (ext === 'pdf') {
    box.innerHTML = `<embed src="${url}" type="application/pdf" width="100%" height="400px" /> 
                     <div style="margin-top:8px;"><a href="${url}" target="_blank">Open PDF</a></div>`;
  } else if (['jpg', 'jpeg', 'png'].includes(ext)) {
    box.innerHTML = `<img src="${url}" style="max-width:260px;border:1px solid #ddd;border-radius:6px;" />
                     <div style="margin-top:8px;"><a href="${url}" target="_blank">Open Image</a></div>`;
  } else {
    box.innerHTML = `<a href="${url}" target="_blank">Download Document</a>`;
  }
}

/* --------------------------
   read patientId from querystring if provided
   -------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const pid = params.get('patientId');
  if (pid) {
    patientIdInput.value = pid;
    patientIdInput.readOnly = true;
    loadPatientDoc(pid);
  }
});

/* --------------------------
   Fetch doctors -> populate surgeon and anaes dropdowns
   -------------------------- */
async function fetchDoctorsAndCache() {
  try {
    const docsSnap = await getDocs(collection(db, 'doctors'));
    localDoctors = [];
    docsSnap.forEach(s => localDoctors.push({ id: s.id, ...s.data() }));
    populateDoctorDropdowns();
  } catch (err) {
    console.error('Error fetching doctors', err);
  }
}

function populateDoctorDropdowns() {
  // clear
  schedSurgeon.innerHTML = '<option value="">Select Surgeon</option>';
  schedAnes.innerHTML = '<option value="">Select Anesthesiologist</option>';

  localDoctors.forEach(d => {
    const display = d.specialization ? `${d.name} (${d.specialization})` : d.name;
    const val = (d.doctorId && d.doctorId.trim()) ? d.doctorId : d.id; // prefer doctorId field, fallback to doc id

    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = display;

    const spec = (d.specialization || '').toLowerCase();
    if (spec.includes('anaes') || spec.includes('anesth') || spec.includes('anaesth')) {
      // anaesthesiologist
      schedAnes.appendChild(opt.cloneNode(true));
    } else {
      // surgeon / other (we include general surgeons etc.)
      schedSurgeon.appendChild(opt.cloneNode(true));
    }
  });
}

/* --------------------------
   When surgeon selected -> suggest OT(s) (simple mapping)
   (uses localDoctors and doctorId values)
   -------------------------- */
const otMap = {
  "General Surgeon": ["OT-1 – General OT 1", "OT-2 – General OT 2"],
  "Orthopedic Surgeon": ["OT-4 – Orthopedic OT"],
  "Cardiac Surgeon": ["OT-13 – Cardiac OT"],
  "Neurosurgeon": ["OT-14 – Neurosurgery OT"],
  "Gynecologist": ["OT-6 – Obstetrics & Gynecology OT"],
  "Urologist": ["OT-7 – Urology OT"],
  "ENT Specialist": ["OT-5 – ENT / Head & Neck OT"],
  "Ophthalmologist": ["OT-10 – Eye OT"],
  "Plastic Surgeon": ["OT-9 – Plastic & Reconstructive OT"],
  "Vascular Surgeon": ["OT-12 – Vascular OT"],
  "Pediatric Surgeon": ["OT-11 – Pediatric Surgery OT"]
};

schedSurgeon.addEventListener('change', () => {
  const selectedId = schedSurgeon.value;
  if (!selectedId) return;
  const docObj = localDoctors.find(d => (d.doctorId === selectedId) || (d.id === selectedId));
  if (!docObj) return;
  const spec = (docObj.specialization || '').trim();
  const suggestions = otMap[spec] || [];
  if (suggestions.length) {
    // Pre-select first suggestion only if user hasn't chosen something
    if (!operationTheatre.value) operationTheatre.value = suggestions[0];
  }
});

/* --------------------------
   Utility: normalize times & overlap (supports HH:MM)
   -------------------------- */
function toMinutes(hhmm) {
  const [hh, mm] = (hhmm || '').split(':').map(s => Number(s));
  if (isNaN(hh) || isNaN(mm)) return null;
  return hh * 60 + mm;
}

// allows overnight intervals (end <= start treated as next-day)
function normalizeInterval(startStr, endStr) {
  const s = toMinutes(startStr);
  let e = toMinutes(endStr);
  if (s === null || e === null) return null;
  if (e <= s) e += 24 * 60;
  return { s, e };
}

function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  const A = normalizeInterval(aStart, aEnd);
  const B = normalizeInterval(bStart, bEnd);
  if (!A || !B) return false;
  return A.s < B.e && A.e > B.s;
}

/* --------------------------
   Add or Update Schedule (full validation)
   -------------------------- */
addScheduleBtn.addEventListener('click', async () => {
  const surgery = surgeryList.value?.trim();
  const date = schedDate.value;
  const start = schedStart.value;
  const end = schedEnd.value;
  const ot = operationTheatre.value?.trim();
  const surgeonId = schedSurgeon.value?.trim();       // this is doctorId or doc id
  const anesId = schedAnes.value?.trim();            // doctorId or doc id
  const patientRef = patientIdInput.value?.trim();
  const remarks = schedRemarks.value?.trim();

  // validation
  if (!surgery || !date || !start || !end || !ot || !surgeonId) {
    showPopup('Missing fields', 'Please fill surgery, date, start, end, OT and surgeon.', 'error');
    return;
  }

  // find doctor objects
  const surgeonDoc = localDoctors.find(d => (d.doctorId === surgeonId) || (d.id === surgeonId));
  const anesDoc = localDoctors.find(d => (d.doctorId === anesId) || (d.id === anesId));

  // check doctor availability by availableDays & timeSlots (if doc record exists)
  const weekday = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });

  if (surgeonDoc) {
    const availableDays = surgeonDoc.availableDays || [];
    if (!availableDays.includes(weekday)) {
      showPopup('Doctor Unavailable', `${surgeonDoc.name || 'Selected surgeon'} is not available on ${weekday}.`, 'error');
      return;
    }

    const timeSlots = surgeonDoc.timeSlots || [];
    const fitsSlot = timeSlots.some(slot => {
      if (!slot || !slot.from || !slot.to) return false;
      return intervalsOverlap(start, end, slot.from, slot.to) || (
        // additionally require surgery be fully inside a timeslot — choose strict containment
        normalizeInterval(start, end) && normalizeInterval(slot.from, slot.to) &&
        (normalizeInterval(start, end).s >= normalizeInterval(slot.from, slot.to).s &&
         normalizeInterval(start, end).e <= normalizeInterval(slot.from, slot.to).e)
      );
    });
    if (!fitsSlot) {
      const slotsText = (timeSlots.map(s => `${s.from}–${s.to}`).join(', ') || 'No slots configured');
      showPopup('Doctor Time Mismatch', `${surgeonDoc.name || 'Surgeon'} works in: ${slotsText}. Your selected time ${start}–${end} doesn't fit.`, 'error');
      return;
    }
  }

  // same for anaesthesiologist if provided
  if (anesDoc) {
    const availableDays = anesDoc.availableDays || [];
    if (!availableDays.includes(weekday)) {
      showPopup('Anesthesiologist Unavailable', `${anesDoc.name || 'Selected anesthesiologist'} is not available on ${weekday}.`, 'error');
      return;
    }
    const timeSlots = anesDoc.timeSlots || [];
    const fitsSlot = timeSlots.some(slot => {
      if (!slot || !slot.from || !slot.to) return false;
      return intervalsOverlap(start, end, slot.from, slot.to) || (
        normalizeInterval(start, end) && normalizeInterval(slot.from, slot.to) &&
        (normalizeInterval(start, end).s >= normalizeInterval(slot.from, slot.to).s &&
         normalizeInterval(start, end).e <= normalizeInterval(slot.from, slot.to).e)
      );
    });
    if (!fitsSlot) {
      const slotsText = (timeSlots.map(s => `${s.from}–${s.to}`).join(', ') || 'No slots configured');
      showPopup('Anesth. Time Mismatch', `${anesDoc.name || 'Anaesthesiologist'} works in: ${slotsText}. Your selected time ${start}–${end} doesn't fit.`, 'error');
      return;
    }
  }

  try {
    // load existing schedules for the same date
    const allSnap = await getDocs(collection(db, 'schedules'));
    const todays = [];
    allSnap.forEach(s => {
      const data = s.data();
      if (data.date === date) todays.push({ id: s.id, ...data });
    });

    // patient same-day check (block overlap)
    if (patientRef) {
      const conflict = todays.find(s => (s.patientId === patientRef) && intervalsOverlap(start, end, s.startTime, s.endTime));
      if (conflict) {
        showPopup('Patient Already Scheduled', `Patient (${patientRef}) already has a surgery on ${date} from ${conflict.startTime}–${conflict.endTime}.`, 'error');
        return;
      }
    }

    // anaesthesiologist conflict
    if (anesId) {
      const conflict = todays.find(s => (s.anaesthesiologistId === anesId) && intervalsOverlap(start, end, s.startTime, s.endTime));
      if (conflict) {
        showPopup('Anesthesiologist Busy', `Selected anesthesiologist is booked ${conflict.startTime}–${conflict.endTime}.`, 'error');
        return;
      }
    }

    // surgeon conflict
    if (surgeonId) {
      const conflict = todays.find(s => (s.doctorId === surgeonId) && intervalsOverlap(start, end, s.startTime, s.endTime));
      if (conflict) {
        showPopup('Surgeon Busy', `Selected surgeon is booked ${conflict.startTime}–${conflict.endTime}.`, 'error');
        return;
      }
    }

    // OT conflict
    const otConflict = todays.find(s => (s.otName === ot) && intervalsOverlap(start, end, s.startTime, s.endTime));
    if (otConflict) {
      showPopup('OT Occupied', `Operation theatre "${ot}" is already booked ${otConflict.startTime}–${otConflict.endTime}.`, 'error');
      return;
    }

    // All checks passed → insert schedule
    const scheduleDoc = {
      patientId: patientRef || '',
      doctorId: surgeonId,
      anaesthesiologistId: anesId || '',
      otName: ot,
      date,
      startTime: start,
      endTime: end,
      surgeryType: surgery,
      remarks: remarks || '',
      createdAt: serverTimestamp ? serverTimestamp() : new Date().toISOString()
    };

    // If editing, update; otherwise add new
    if (editingScheduleId) {
      await setDoc(doc(db, 'schedules', editingScheduleId), scheduleDoc, { merge: true });
      showPopup('Updated', 'Schedule updated successfully.', 'success');
      editingScheduleId = null;
      document.getElementById('formTitle').textContent = 'Add Operation Schedule';
      addScheduleBtn.textContent = 'Add Schedule';
    } else {
      await addDoc(collection(db, 'schedules'), scheduleDoc);
      showPopup('Success', 'Schedule added successfully.', 'success');
      // SEND EMAIL AFTER SUCCESS
      sendScheduleEmail(scheduleDoc);
    }

    // reset while preserving patient id if readOnly
    const pidReadOnly = patientIdInput.readOnly;
    document.getElementById('operationForm').reset();
    if (pidReadOnly) {
      const params = new URLSearchParams(window.location.search);
      const pid = params.get('patientId');
      if (pid) {
        patientIdInput.value = pid;
        patientIdInput.readOnly = true;
        loadPatientDoc(pid);
      }
    }

  } catch (err) {
    console.error('Error saving schedule', err);
    showPopup('Error', 'Failed to save schedule: ' + (err.message || ''), 'error');
  }
});

/* --------------------------
   Reset button
   -------------------------- */
resetScheduleBtn.addEventListener('click', () => {
  document.getElementById('operationForm').reset();
  editingScheduleId = null;
  document.getElementById('formTitle').textContent = 'Add Operation Schedule';
  addScheduleBtn.textContent = 'Add Schedule';
  const params = new URLSearchParams(window.location.search);
  const pid = params.get('patientId');
  if (pid) {
    patientIdInput.value = pid;
    patientIdInput.readOnly = true;
    loadPatientDoc(pid);
  } else {
    patientIdInput.readOnly = false;
  }
});

/* --------------------------
   Render schedules live (with filter & search)
   -------------------------- */
function setupSchedulesListener() {
  const q = query(collection(db, 'schedules'), orderBy('date', 'desc'));
  onSnapshot(q, snapshot => {
    schedulesList.innerHTML = '';
    const dateFilter = filterDate.value || '';
    const search = (filterPatient.value || '').trim().toLowerCase();

    snapshot.forEach(docSnap => {
      const id = docSnap.id;
      const d = docSnap.data();

      // apply filters
      if (dateFilter && d.date !== dateFilter) return;
      if (search) {
        const matchPatient = (d.patientId || '').toLowerCase().includes(search);
        const matchSurgery = (d.surgeryType || '').toLowerCase().includes(search);
        // lookup surgeon name
        const surgeonObj = localDoctors.find(dd => (dd.doctorId === d.doctorId) || (dd.id === d.doctorId));
        const surgeonName = surgeonObj ? surgeonObj.name : (d.surgeon || '');
        const matchSurgeon = (surgeonName || '').toLowerCase().includes(search);
        if (!(matchPatient || matchSurgery || matchSurgeon)) return;
      }

      const li = document.createElement('li');
      li.className = 'schedule-card';

      const left = document.createElement('div');
      left.className = 'left';

      // show surgeon name if we have id
      const surgeonObj = localDoctors.find(dd => (dd.doctorId === d.doctorId) || (dd.id === d.doctorId));
      const surgeonName = surgeonObj ? surgeonObj.name : (d.surgeon || '-');

      const anesObj = localDoctors.find(dd => (dd.doctorId === d.anaesthesiologistId) || (dd.id === d.anaesthesiologistId));
      const anesName = anesObj ? anesObj.name : (d.anesthesiologist || '-');

      left.innerHTML = `
        <div class="schedule-title">${d.surgeryType || d.surgery} — <small>${d.date}</small></div>
        <div class="schedule-meta"><strong>Time:</strong> ${d.startTime || d.start} — ${d.endTime || d.end}</div>
        <div class="schedule-meta"><strong>OT:</strong> ${d.otName || d.ot || '-'}</div>
        <div class="schedule-meta"><strong>Surgeon:</strong> ${surgeonName}</div>
        <div class="schedule-meta"><strong>Anesth.:</strong> ${anesName}</div>
        <div class="schedule-meta"><strong>Patient:</strong> ${d.patientId || d.patientRef || '-'}</div>
        <div class="schedule-meta"><strong>Remarks:</strong> ${d.remarks || '-'}</div>
      `;

      const actions = document.createElement('div');
      actions.className = 'schedule-actions';
      actions.innerHTML = `
        <button class="edit-btn" data-id="${id}">Edit</button>
        <button class="delete-btn" data-id="${id}">Delete</button>
      `;

      li.appendChild(left);
      li.appendChild(actions);
      schedulesList.appendChild(li);
    });

    if (!schedulesList.hasChildNodes()) {
      schedulesList.innerHTML = '<li class="schedule-card"><div class="left"><div class="schedule-title">No schedules found</div></div></li>';
    }

    // attach handlers after DOM built
    document.querySelectorAll('.delete-btn').forEach(b => {
      b.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (!confirm('Delete this schedule?')) return;
        try {
          await deleteDoc(doc(db, 'schedules', id));
          showPopup('Deleted', 'Schedule deleted successfully.', 'success');
        } catch (err) {
          console.error(err);
          showPopup('Error', 'Failed to delete schedule.', 'error');
        }
      });
    });

    document.querySelectorAll('.edit-btn').forEach(b => {
      b.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        try {
          const snap = await getDoc(doc(db, 'schedules', id));
          if (!snap.exists()) {
            showPopup('Error', 'Schedule no longer exists.', 'error');
            return;
          }
          const data = snap.data();
          // fill form
          surgeryList.value = data.surgeryType || data.surgery || '';
          schedDate.value = data.date || '';
          schedStart.value = data.startTime || data.start || '';
          schedEnd.value = data.endTime || data.end || '';
          operationTheatre.value = data.otName || data.ot || '';
          // set select values to doctorId (or fallback)
          schedSurgeon.value = data.doctorId || data.surgeon || '';
          schedAnes.value = data.anaesthesiologistId || data.anesthesiologist || '';
          patientIdInput.value = data.patientId || data.patientRef || '';
          schedRemarks.value = data.remarks || '';

          editingScheduleId = id;
          document.getElementById('formTitle').textContent = 'Edit Operation Schedule';
          addScheduleBtn.textContent = 'Update Schedule';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
          console.error(err);
          showPopup('Error', 'Could not load schedule for edit.', 'error');
        }
      });
    });

  }, err => {
    console.error('schedules onSnapshot error', err);
  });
}

/* --------------------------
   search/filter handlers
   -------------------------- */
searchScheduleBtn.addEventListener('click', () => setupSchedulesListener());
filterDate.addEventListener('change', () => setupSchedulesListener());
filterPatient.addEventListener('input', () => { /* live search */ setupSchedulesListener(); });

/* --------------------------
   initial load
   -------------------------- */
fetchDoctorsAndCache();
setupSchedulesListener();
