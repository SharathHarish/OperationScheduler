import { auth, db } from './firebase-init.js';
import {
  signOut
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

import {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDoc
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// Helper DOM refs
const adminEmailSpan = document.getElementById('adminEmail');
const logoutBtn = document.getElementById('logoutBtn');

// Doctors
const docNameInput = document.getElementById('docName');
const docSpecialtyInput = document.getElementById('docSpecialty');
const addDoctorBtn = document.getElementById('addDoctorBtn');
const doctorsList = document.getElementById('doctorsList');

// Patients
const patientSearch = document.getElementById('patientSearch');
const refreshPatientsBtn = document.getElementById('refreshPatientsBtn');
const patientsList = document.getElementById('patientsList');

// Schedules
const schedDate = document.getElementById('schedDate');
const schedStart = document.getElementById('schedStart');
const schedEnd = document.getElementById('schedEnd');
const schedOT = document.getElementById('schedOT');
const schedSurgeon = document.getElementById('schedSurgeon');
const schedAnes = document.getElementById('schedAnes');
const schedPatientId = document.getElementById('schedPatientId');
const schedRemarks = document.getElementById('schedRemarks');
const addScheduleBtn = document.getElementById('addScheduleBtn');
const schedulesList = document.getElementById('schedulesList');

// Ensure admin is authenticated and has admin role
async function requireAdmin() {
  // Use currentUser from auth
  const user = auth.currentUser;
  if(!user) {
    // Wait a moment for firebase auth to initialize and redirect if still null
    // We can listen to onAuthStateChanged, but keeping it simple:
    setTimeout(requireAdmin, 300);
    return;
  }

  // Display email
  adminEmailSpan.textContent = user.email || '';

  // Check role from users collection
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);
    if(!userSnap.exists()) {
      alert('User profile not found. Access denied.');
      await signOut(auth);
      window.location.href = 'index.html';
      return;
    }
    const role = userSnap.data().role;
    if(role !== 'admin') {
      alert('Access denied. Admins only.');
      await signOut(auth);
      window.location.href = 'index.html';
      return;
    }
    // OK admin. start listeners.
    initListeners();
  } catch (err) {
    console.error('Error checking admin role', err);
    alert('Error verifying admin. See console.');
  }
}

// Initialize listeners & real-time subscriptions
function initListeners() {
  // Logout
  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });

  // Add Doctor
  addDoctorBtn.addEventListener('click', async () => {
    const name = docNameInput.value.trim();
    const specialty = docSpecialtyInput.value.trim();
    if(!name || !specialty) {
      alert('Please enter name and specialty.');
      return;
    }
    try {
      await addDoc(collection(db, 'doctors'), { name, specialty, createdAt: new Date().toISOString() });
      docNameInput.value = '';
      docSpecialtyInput.value = '';
    } catch (err) {
      console.error(err);
      alert('Error adding doctor: ' + err.message);
    }
  });

  // Real-time doctors list
  const doctorsQuery = query(collection(db, 'doctors'), orderBy('createdAt', 'desc'));
  onSnapshot(doctorsQuery, (snapshot) => {
    doctorsList.innerHTML = '';
    snapshot.forEach((d) => {
      const data = d.data();
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="meta">
          <div>
            <div><strong>${escapeHtml(data.name || '—')}</strong></div>
            <div class="small">${escapeHtml(data.specialty || '')}</div>
          </div>
        </div>
        <div>
          <button class="action-btn" data-id="${d.id}" title="Delete">Delete</button>
        </div>
      `;
      doctorsList.appendChild(li);
    });

    // attach delete handlers
    doctorsList.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if(confirm('Delete this doctor?')) {
          try {
            await deleteDoc(doc(db, 'doctors', id));
          } catch(err) {
            console.error(err);
            alert('Delete error: ' + err.message);
          }
        }
      });
    });
  });

  // Patients list / refresh
  refreshPatientsBtn.addEventListener('click', loadPatients);
  patientSearch.addEventListener('keyup', () => {
    loadPatients(patientSearch.value.trim());
  });
  // initial load
  loadPatients();

  // Schedules add
  addScheduleBtn.addEventListener('click', async () => {
    const date = schedDate.value;
    const start = schedStart.value;
    const end = schedEnd.value;
    const ot = schedOT.value.trim();
    const surgeon = schedSurgeon.value.trim();
    const anes = schedAnes.value.trim();
    const patientRef = schedPatientId.value.trim();
    const remarks = schedRemarks.value.trim();

    if(!date || !start || !end || !ot || !surgeon) {
      alert('Please fill date, start, end, OT and surgeon.');
      return;
    }

    try {
      const payload = {
        date,
        start,
        end,
        ot,
        surgeon,
        anesthesiologist: anes,
        patientRef,
        remarks,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'schedules'), payload);
      // clear inputs
      schedDate.value = '';
      schedStart.value = '';
      schedEnd.value = '';
      schedOT.value = '';
      schedSurgeon.value = '';
      schedAnes.value = '';
      schedPatientId.value = '';
      schedRemarks.value = '';
    } catch(err) {
      console.error(err);
      alert('Error adding schedule: ' + err.message);
    }
  });

  // Real-time schedules list
  const schedulesQuery = query(collection(db, 'schedules'), orderBy('createdAt', 'desc'));
  onSnapshot(schedulesQuery, (snapshot) => {
    schedulesList.innerHTML = '';
    snapshot.forEach(s => {
      const data = s.data();
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="meta">
          <div>
            <div><strong>${escapeHtml(data.date || '')} ${escapeHtml(data.start || '')}-${escapeHtml(data.end || '')}</strong></div>
            <div class="small">OT: ${escapeHtml(data.ot || '')} | Surgeon: ${escapeHtml(data.surgeon || '')} | Patient: ${escapeHtml(data.patientRef || '')}</div>
            <div class="small">Remarks: ${escapeHtml(data.remarks || '')}</div>
          </div>
        </div>
        <div>
          <button class="action-btn" data-id="${s.id}" title="Delete">Delete</button>
        </div>
      `;
      schedulesList.appendChild(li);
    });

    schedulesList.querySelectorAll('.action-btn').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        const id = e.currentTarget.dataset.id;
        if(confirm('Delete this schedule?')) {
          try {
            await deleteDoc(doc(db, 'schedules', id));
          } catch(err) {
            console.error(err);
            alert('Delete schedule error: ' + err.message);
          }
        }
      });
    });
  });

}

// Load patients (optionally filtered)
async function loadPatients(filter = '') {
  try {
    patientsList.innerHTML = '<li class="small">Loading...</li>';
    const snap = await getDocs(collection(db, 'patients'));
    patientsList.innerHTML = '';
    snap.forEach(p => {
      const d = p.data();
      // filter if provided
      if(filter) {
        const combined = `${d.firstName || ''} ${d.lastName || ''} ${d.patientId || ''}`.toLowerCase();
        if(!combined.includes(filter.toLowerCase())) return;
      }
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="meta">
          <div>
            <div><strong>${escapeHtml(d.firstName || '')} ${escapeHtml(d.lastName || '')}</strong> <span class="small">(${escapeHtml(d.patientId || '')})</span></div>
            <div class="small">${escapeHtml(d.email || '')} | ${escapeHtml(d.address || '')}</div>
          </div>
        </div>
      `;
      patientsList.appendChild(li);
    });
    if(!patientsList.children.length) {
      patientsList.innerHTML = '<li class="small">No patients found.</li>';
    }
  } catch(err) {
    console.error(err);
    patientsList.innerHTML = '<li class="small">Error loading patients.</li>';
  }
}

// small helper to avoid XSS in UI strings
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Kick off admin requirement after a tiny delay so auth can initialize
setTimeout(requireAdmin, 300);