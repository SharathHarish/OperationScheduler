import { db, auth } from '../firebase/firebase-init.js';
import {
  collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc,
  query, onSnapshot, orderBy
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

/* -------------------------------------------------------
   DOM ELEMENTS
-------------------------------------------------------- */
const doctorForm = document.getElementById("doctorForm");
const addDoctorBtn = document.getElementById("addDoctorBtn");
const addSlotBtn = document.getElementById("addSlotBtn");
const timeSlotsContainer = document.getElementById("timeSlotsContainer");
const doctorsList = document.getElementById("doctorsList");
const filterDepartment = document.getElementById("filterDepartment");
const searchName = document.getElementById("searchName");
const searchBtn = document.getElementById("searchBtn");

let editDoctorId = null;

/* -------------------------------------------------------
   LOGOUT
-------------------------------------------------------- */
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  alert("Logged out successfully!");
  window.location.href = "login.html";
});

/* -------------------------------------------------------
   ADD TIME SLOT
-------------------------------------------------------- */
addSlotBtn.addEventListener("click", () => {
  const slotDiv = document.createElement("div");
  slotDiv.className = "slot-row";

  slotDiv.innerHTML = `
    <input type="time" class="fromTime" required />
    <span>to</span>
    <input type="time" class="toTime" required />
    <button type="button" class="removeSlotBtn">✖</button>
  `;

  slotDiv.querySelector(".removeSlotBtn")
    .addEventListener("click", () => slotDiv.remove());

  timeSlotsContainer.appendChild(slotDiv);
});

/* -------------------------------------------------------
   DEPARTMENT – SPECIALIZATION MAP
-------------------------------------------------------- */
const departmentSpecializationMap = {
  "Orthopedics": ["Orthopedic Surgeon"],
  "General Surgery": ["General Surgeon"],
  "Neurosurgery": ["Neurosurgeon"],
  "Cardiothoracic Surgery": ["Cardiothoracic Surgeon"],
  "Plastic Surgery": ["Plastic Surgeon"],
  "ENT": ["ENT Surgeon"],
  "Urology": ["Urological Surgeon"],
  "Pediatrics": ["Pediatric Surgeon"],
  "Oncology": ["Oncological Surgeon"]
};

/* -------------------------------------------------------
   GENERATE DOCTOR ID (AUTO)
-------------------------------------------------------- */
async function generateDoctorId() {
  const snap = await getDocs(collection(db, "doctors"));
  const count = snap.size + 1;
  return `DOC${count.toString().padStart(3, "0")}`;
}

/* -------------------------------------------------------
   ADD / UPDATE DOCTOR
-------------------------------------------------------- */
doctorForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const doctorId = document.getElementById("docId").value.trim();
  const name = document.getElementById("docName").value.trim();
  const qualification = document.getElementById("docQualification").value;
  const department = document.getElementById("docDepartment").value;
  const specialization = document.getElementById("docSpecialization").value;
  const email = document.getElementById("docEmail").value.trim();
  const phone = document.getElementById("docPhone").value.trim();
  const status = document.getElementById("docStatus").value;

  // ---------- REQUIRED FIELDS ----------
  if (!doctorId || !name || !email || !phone) {
    alert("Doctor ID, Name, Email, and Phone are required!");
    return;
  }

  if (!qualification || !department || !specialization || !status) {
    alert("Please select all dropdowns!");
    return;
  }

  // ---------- EMAIL PATTERN VALIDATION ----------
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    alert("Please enter a valid email address.");
    return;
  }

  // ---------- PHONE PATTERN VALIDATION ----------
  const phonePattern = /^[6-9]\d{9}$/;
  if (!phonePattern.test(phone)) {
    alert("Please enter a valid 10-digit Indian mobile number.");
    return;
  }

  // ---------- AT LEAST ONE DAY ----------
  const availableDays = Array.from(document.querySelectorAll('input[name="availableDays"]:checked')).map(d => d.value);
  if (availableDays.length === 0) {
    alert("Please select at least one available day.");
    return;
  }

  // ---------- AT LEAST ONE TIME SLOT ----------
  const timeSlots = Array.from(document.querySelectorAll(".slot-row")).map(row => ({
    from: row.querySelector(".fromTime").value,
    to: row.querySelector(".toTime").value
  }));
  if (timeSlots.length === 0 || timeSlots.some(slot => !slot.from || !slot.to)) {
    alert("Please add at least one valid time slot.");
    return;
  }

  // ---------- SPECIALIZATION VALIDATION ----------
  if (!departmentSpecializationMap[department]?.includes(specialization)) {
    alert(`❌ "${specialization}" is not valid for ${department}.`);
    return;
  }

  try {
    // ---------- UNIQUE CHECK ----------
    const snap = await getDocs(collection(db, "doctors"));
    let isDuplicate = false;

    snap.forEach(docSnap => {
      const data = docSnap.data();
      // skip current doctor when editing
      if (editDoctorId && docSnap.id === editDoctorId) return;

      if (data.doctorId === doctorId) isDuplicate = `Doctor ID "${doctorId}" already exists!`;
      if (data.email === email) isDuplicate = `Email "${email}" already exists!`;
      if (data.phone === phone) isDuplicate = `Phone "${phone}" already exists!`;
    });

    if (isDuplicate) {
      alert(isDuplicate);
      return;
    }

    if (editDoctorId) {
      // ---------- UPDATE DOCTOR ----------
      await updateDoc(doc(db, "doctors", editDoctorId), {
        doctorId, name, qualification, department, specialization, email, phone, status, availableDays, timeSlots
      });
      alert("✔ Doctor updated successfully!");
      addDoctorBtn.textContent = "Add Doctor";
      editDoctorId = null;
    } else {
      // ---------- ADD DOCTOR ----------
      await addDoc(collection(db, "doctors"), {
        doctorId, name, qualification, department, specialization, email, phone, status, availableDays, timeSlots
      });
      alert("✔ Doctor added successfully!");
    }

    // RESET FORM
    doctorForm.reset();
    timeSlotsContainer.innerHTML = "";

  } catch (error) {
    console.error(error);
    alert("❌ Error saving doctor.");
  }
});

/* -------------------------------------------------------
   LOAD DOCTORS → TABLE
-------------------------------------------------------- */
function loadDoctors() {
  const q = query(collection(db, "doctors"), orderBy("doctorId"));

  onSnapshot(q, (snapshot) => {
    doctorsList.innerHTML = "";

    const search = searchName.value.trim().toLowerCase();
    const departmentFilter = filterDepartment.value;

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const id = docSnap.id;

      if (departmentFilter && data.department !== departmentFilter) return;
      if (search && !data.name.toLowerCase().includes(search)) return;

      let statusClass = "status-inactive";
      if (data.status === "Active") statusClass = "status-active";
      else if (data.status === "Not Available") statusClass = "status-unavailable";

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${data.doctorId}</td>
        <td>${data.name}</td>
        <td>${data.department}</td>
        <td>${data.specialization}</td>
        <td>${data.email}</td>
        <td>${data.phone}</td>
        <td><span class="status-badge ${statusClass}">${data.status}</span></td>
        <td>
          <button class="action-btn edit-btn" data-id="${id}">Edit</button>
</td>
<td>
          <button class="action-btn delete-btn" data-id="${id}">Delete</button>
        </td>
      `;

      doctorsList.appendChild(tr);
    });

    /* ------------ EDIT ------------ */
    document.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const docId = btn.dataset.id;
        const snap = await getDoc(doc(db, "doctors", docId));
        const data = snap.data();

        editDoctorId = docId;
        addDoctorBtn.textContent = "Update Doctor";

        document.getElementById("docId").value = data.doctorId;
        document.getElementById("docName").value = data.name;
        document.getElementById("docQualification").value = data.qualification;
        document.getElementById("docDepartment").value = data.department;
        document.getElementById("docSpecialization").value = data.specialization;
        document.getElementById("docEmail").value = data.email;
        document.getElementById("docPhone").value = data.phone;
        document.getElementById("docStatus").value = data.status;

        document.querySelectorAll('input[name="availableDays"]').forEach(cb => {
          cb.checked = data.availableDays.includes(cb.value);
        });

        timeSlotsContainer.innerHTML = "";
        data.timeSlots.forEach(slot => {
          const div = document.createElement("div");
          div.className = "slot-row";
          div.innerHTML = `
            <input type="time" class="fromTime" value="${slot.from}" />
            <span>to</span>
            <input type="time" class="toTime" value="${slot.to}" />
            <button type="button" class="removeSlotBtn">✖</button>
          `;
          div.querySelector(".removeSlotBtn").addEventListener("click", () => div.remove());
          timeSlotsContainer.appendChild(div);
        });

        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    /* ------------ DELETE ------------ */
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this doctor?")) return;
        await deleteDoc(doc(db, "doctors", btn.dataset.id));
        alert("Doctor deleted.");
      });
    });
  });
}

loadDoctors();

/* -------------------------------------------------------
   SEARCH & FILTER
-------------------------------------------------------- */
filterDepartment.addEventListener("change", loadDoctors);
searchBtn.addEventListener("click", loadDoctors);

// Scroll to DoctorsList section
document.getElementById("scrollToDLBtn")?.addEventListener("click", () => {
    const section = document.getElementById("dl");
    if (section) {
        section.scrollIntoView({ behavior: "smooth" });
    } else {
        console.warn("Doctors list section not found");
    }
});

// Scroll to Add doctor section
document.getElementById("scrollToADBtn")?.addEventListener("click", () => {
    const section = document.getElementById("ad");
    if (section) {
        section.scrollIntoView({ behavior: "smooth" });
    } else {
        console.warn("Doctors list section not found");
    }
});

