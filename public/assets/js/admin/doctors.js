import { db, auth } from '../firebase/firebase-init.js';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  orderBy
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

/* -------------------------------------------------------
   GLOBAL VARIABLES
-------------------------------------------------------- */
let editDoctorId = null; // 🔥 Tracks if editing

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
  slotDiv.classList.add("slot-row");

  slotDiv.innerHTML = `
    <input type="time" class="fromTime" required />
    <span>to</span>
    <input type="time" class="toTime" required />
    <button type="button" class="removeSlotBtn">✖</button>
  `;

  slotDiv.querySelector(".removeSlotBtn").addEventListener("click", () => slotDiv.remove());

  timeSlotsContainer.appendChild(slotDiv);
});

/* -------------------------------------------------------
   DEPT – SPECIALIZATION VALIDATION
-------------------------------------------------------- */
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

/* -------------------------------------------------------
   GENERATE DOCTOR ID (USED ONLY FOR ADD)
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

  const name = document.getElementById("docName").value.trim();
  const qualification = document.getElementById("docQualification").value;
  const department = document.getElementById("docDepartment").value;
  const specialization = document.getElementById("docSpecialization").value;
  const email = document.getElementById("docEmail").value.trim();
  const phone = document.getElementById("docPhone").value.trim();
  const status = document.getElementById("docStatus").value;

  const availableDays = Array.from(document.querySelectorAll('input[name="availableDays"]:checked')).map(d => d.value);

  const timeSlots = Array.from(document.querySelectorAll(".slot-row")).map(row => ({
    from: row.querySelector(".fromTime").value,
    to: row.querySelector(".toTime").value
  }));

  // Department & specialization validation
  if (!departmentSpecializationMap[department]?.includes(specialization)) {
    alert(`❌ "${specialization}" is not valid for ${department}.`);
    return;
  }

  const doctorsRef = collection(db, "doctors");

  try {
    if (editDoctorId) {
      /* -------------------------------------------------------
         🔥 UPDATE EXISTING DOCTOR
      -------------------------------------------------------- */
      const docRef = doc(db, "doctors", editDoctorId);

      await updateDoc(docRef, {
        name,
        qualification,
        department,
        specialization,
        email,
        phone,
        status,
        availableDays,
        timeSlots
      });

      alert(`✔ Doctor updated successfully!`);
      addDoctorBtn.textContent = "Add Doctor";
      editDoctorId = null;

    } else {
      /* -------------------------------------------------------
         ➕ ADD NEW DOCTOR
      -------------------------------------------------------- */
      const doctorId = await generateDoctorId();

      await addDoc(doctorsRef, {
        doctorId,
        name,
        qualification,
        department,
        specialization,
        email,
        phone,
        status,
        availableDays,
        timeSlots
      });

      alert(`✔ Doctor added successfully!`);
    }

    doctorForm.reset();
    timeSlotsContainer.innerHTML = "";

  } catch (error) {
    console.error(error);
    alert("Error saving doctor.");
  }
});

/* -------------------------------------------------------
   LIVE DOCTOR LIST
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

      const li = document.createElement("li");
      li.classList.add("doctor-card");

      // Status colors
      let statusClass = "";
      if (data.status === "Active") statusClass = "status-green";
      else if (data.status === "Not Available") statusClass = "status-yellow";
      else statusClass = "status-red";

      li.classList.add(statusClass);

      li.innerHTML = `
        <h3>${data.name}</h3>
        <p><strong>ID:</strong> ${data.doctorId}</p>
        <p><strong>Department:</strong> ${data.department}</p>
        <p><strong>Specialization:</strong> ${data.specialization}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.phone}</p>
        <p><strong>Status:</strong> ${data.status}</p>

        <div class="card-buttons">
          <button class="edit-btn" data-id="${id}">Edit</button>
          <button class="delete-btn" data-id="${id}">Delete</button>
        </div>
      `;

      doctorsList.appendChild(li);
    });

    if (!snapshot.size) {
      doctorsList.innerHTML = "<p>No doctors found.</p>";
    }

    /* -------------------------------------------------------
       EDIT BUTTON → PREFILL FORM
    -------------------------------------------------------- */
    document.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const docId = btn.dataset.id;
        const docRef = doc(db, "doctors", docId);
        const snap = await getDoc(docRef);
        const data = snap.data();

        editDoctorId = docId;
        addDoctorBtn.textContent = "Update Doctor";

        document.getElementById("docName").value = data.name;
        document.getElementById("docQualification").value = data.qualification;
        document.getElementById("docDepartment").value = data.department;
        document.getElementById("docSpecialization").value = data.specialization;
        document.getElementById("docEmail").value = data.email;
        document.getElementById("docPhone").value = data.phone;
        document.getElementById("docStatus").value = data.status;

        // Days
        document.querySelectorAll('input[name="availableDays"]').forEach(cb => {
          cb.checked = data.availableDays.includes(cb.value);
        });

        // Time Slots
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

    /* -------------------------------------------------------
       DELETE BUTTON
    -------------------------------------------------------- */
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
   SEARCH AND FILTER
-------------------------------------------------------- */
filterDepartment.addEventListener("change", loadDoctors);
searchBtn.addEventListener("click", loadDoctors);

