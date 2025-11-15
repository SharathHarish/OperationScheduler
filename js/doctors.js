import { db, auth } from './firebase-init.js';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

const doctorForm = document.getElementById('doctorForm');
const addSlotBtn = document.getElementById('addSlotBtn');
const timeSlotsContainer = document.getElementById('timeSlotsContainer');
const logoutBtn = document.getElementById('logoutBtn');
const doctorsList = document.getElementById('doctorsList');
const filterDepartment = document.getElementById('filterDepartment');
const searchName = document.getElementById('searchName');
const searchBtn = document.getElementById('searchBtn');

// ✅ Logout
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    alert('Logged out successfully!');
    window.location.href = 'login.html';
  });
}

// ✅ Add Time Slot
addSlotBtn.addEventListener('click', () => {
  const slotDiv = document.createElement('div');
  slotDiv.classList.add('slot-row');
  slotDiv.innerHTML = `
    <input type="time" class="fromTime" required />
    <span>to</span>
    <input type="time" class="toTime" required />
    <button type="button" class="removeSlotBtn">✖</button>
  `;
  slotDiv.querySelector('.removeSlotBtn').addEventListener('click', () => slotDiv.remove());
  timeSlotsContainer.appendChild(slotDiv);
});

// ✅ Department–Specialization validation
const departmentSpecializationMap = {
  "Cardiology": ["Cardiologist"],
  "Neurology": ["Neurologist"],
  "Orthopedics": ["Orthopedic Surgeon"],
  "Gastroenterology": ["Gastroenterologist"],
  "Oncology": ["Oncologist"],
  "Pediatrics": ["Pediatrician"],
  "Urology": ["Urologist"],
  "Dermatology": ["Dermatologist"],
  "ENT": ["ENT Specialist"],
  "Anesthesiology": ["Anesthesiologist"],
  "General Surgery": ["General Surgeon"]
};

// ✅ Auto-generate doctor ID (DOC001, DOC002...)
async function generateDoctorId() {
  const doctorsRef = collection(db, "doctors");
  const snapshot = await getDocs(doctorsRef);
  const count = snapshot.size + 1;
  return `DOC${count.toString().padStart(3, '0')}`;
}

// ✅ Add Doctor
doctorForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('docName').value.trim();
  const qualification = document.getElementById('docQualification').value;
  const department = document.getElementById('docDepartment').value;
  const specialization = document.getElementById('docSpecialization').value;
  const email = document.getElementById('docEmail').value.trim();
  const phone = document.getElementById('docPhone').value.trim();
  const status = document.getElementById('docStatus').value;
  const days = Array.from(document.querySelectorAll('input[name="availableDays"]:checked')).map(cb => cb.value);
  const timeSlots = Array.from(document.querySelectorAll('#timeSlotsContainer .slot-row')).map(row => ({
    from: row.querySelector('.fromTime').value,
    to: row.querySelector('.toTime').value
  }));

  // Validation
  if (!departmentSpecializationMap[department]?.includes(specialization)) {
    alert(`❌ Specialization "${specialization}" does not match Department "${department}".`);
    return;
  }

  try {
    const doctorsRef = collection(db, "doctors");

    // Duplicate check
    const [emailSnap, phoneSnap] = await Promise.all([
      getDocs(query(doctorsRef, where('email', '==', email))),
      getDocs(query(doctorsRef, where('phone', '==', phone)))
    ]);

    if (!emailSnap.empty || !phoneSnap.empty) {
      alert('❌ Doctor with same email or phone already exists!');
      return;
    }

    const doctorId = await generateDoctorId();

    const newDoctor = {
      doctorId,
      name,
      qualification,
      department,
      specialization,
      email,
      phone,
      availableDays: days,
      timeSlots,
      status
    };

    await addDoc(doctorsRef, newDoctor);
    alert(`✅ Doctor ${name} added successfully!`);
    doctorForm.reset();
    timeSlotsContainer.innerHTML = '';

  } catch (err) {
    console.error('❌ Error adding doctor:', err);
    alert('Error adding doctor: ' + err.message);
  }
});

// ✅ Live Auto-refresh Doctor List
function setupLiveDoctorsListener() {
  const doctorsRef = collection(db, 'doctors');
  const q = query(doctorsRef, orderBy('doctorId', 'asc'));

  onSnapshot(q, (snapshot) => {
    doctorsList.innerHTML = '';

    const search = searchName?.value?.trim().toLowerCase() || '';
    const filterDept = filterDepartment?.value || '';

    snapshot.forEach(docSnap => {
      const data = docSnap.data();

      // Optional filters
      if (filterDept && data.department !== filterDept) return;
      if (search && !data.name.toLowerCase().includes(search)) return;

      const li = document.createElement('li');
      li.innerHTML = `
        <div class="meta">
          <strong>${data.name}</strong> 
          <span class="small">🆔 ${data.doctorId}</span>
          <span class="small">${data.department}</span> 
          <span class="small">${data.specialization}</span> 
          <span class="small">${data.email}</span>
          <span class="small">${data.phone}</span>
          <span class="small">${data.status}</span>
        </div>
      `;
      doctorsList.appendChild(li);
    });

    if (!snapshot.size) doctorsList.innerHTML = '<li>No doctors found.</li>';
  });
}

// ✅ Filter & Search
filterDepartment?.addEventListener('change', setupLiveDoctorsListener);
searchBtn?.addEventListener('click', setupLiveDoctorsListener);
function renderDoctorsList(doctors) {
  const tableBody = document.getElementById('doctorsTableBody');
  const noMsg = document.getElementById('noDoctorsMsg');

  tableBody.innerHTML = '';

  if (doctors.length === 0) {
    noMsg.classList.remove('hidden');
    return;
  }
  noMsg.classList.add('hidden');

  doctors.forEach(doc => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="border px-3 py-2">${doc.doctorId}</td>
      <td class="border px-3 py-2">${doc.name}</td>
      <td class="border px-3 py-2">${doc.qualification}</td>
      <td class="border px-3 py-2">${doc.department}</td>
      <td class="border px-3 py-2">${doc.specialization}</td>
      <td class="border px-3 py-2">${doc.email}</td>
      <td class="border px-3 py-2">${doc.phone}</td>
      <td class="border px-3 py-2">${doc.availableDays?.join(', ') || '-'}</td>
      <td class="border px-3 py-2">${doc.status}</td>
      <td class="border px-3 py-2 text-center space-x-2">
        <button class="editBtn bg-[#c49a6c] hover:bg-[#a77f54] text-white px-2 py-1 rounded" data-id="${doc.id}">Edit</button>
        <button class="deleteBtn bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded" data-id="${doc.id}">Delete</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  // 📝 Edit Button
  document.querySelectorAll('.editBtn').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.target.dataset.id;
      alert('Edit feature coming soon for doctor ID: ' + id);
      // Optional: Open modal with edit form
    });
  });

  // 🗑️ Delete Button
  document.querySelectorAll('.deleteBtn').forEach(btn => {
    btn.addEventListener('click', async e => {
      const id = e.target.dataset.id;
      if (confirm('Are you sure you want to delete this doctor?')) {
        await deleteDoc(doc(db, "doctors", id));
        alert('Doctor deleted successfully!');
        loadDoctors(); // refresh table
      }
    });
  });
}
// Load initially
setupLiveDoctorsListener();
