import { collection, getDocs, addDoc, setDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { db } from "./firebase-init.js";

/* -------------------------------------------------------------
   📌 DOM Elements
-------------------------------------------------------------- */
const form = document.getElementById("patientForm");
const list = document.getElementById("patientsList");
const filterStatus = document.getElementById("filterStatus");
const searchBtn = document.getElementById("searchPatientBtn");
const searchInput = document.getElementById("searchPatientName");
const referredBySelect = document.getElementById("referredBy");

/* -------------------------------------------------------------
   🔵 Local Arrays
-------------------------------------------------------------- */
let patients = []; // Patients fetched from Firebase

/* -------------------------------------------------------------
   🔵 Fetch Doctors (Firebase v9 Modular)
-------------------------------------------------------------- */
async function fetchDoctorsAndStore() {
  try {
    console.log("Fetching doctors from Firebase...");
    const doctorsRef = collection(db, "doctors");
    const snapshot = await getDocs(doctorsRef);

    let doctors = [];
    snapshot.forEach(doc => {
      doctors.push({
        id: doc.id,
        ...doc.data()
      });
    });

    localStorage.setItem("doctors", JSON.stringify(doctors));
    populateReferredByDropdown();

  } catch (error) {
    console.error("Error fetching doctors:", error);
  }
}

/* -------------------------------------------------------------
   🔵 Populate "Referred By" Dropdown (Skip Anaesthesiologists)
-------------------------------------------------------------- */
function populateReferredByDropdown() {
  const doctors = JSON.parse(localStorage.getItem("doctors")) || [];
  referredBySelect.innerHTML = `<option value="">Select Doctor</option>`;

  doctors
    .filter(doc => {
      const spec = (doc.specialization || "").toLowerCase();
      return !spec.includes("anaes") && !spec.includes("anesth");
    })
    .forEach(doc => {
      const opt = document.createElement("option");
      opt.value = doc.name;
      opt.textContent = doc.specialization ? `${doc.name} (${doc.specialization})` : doc.name;
      referredBySelect.appendChild(opt);
    });
}

/* -------------------------------------------------------------
   🔵 Fetch Patients from Firebase
-------------------------------------------------------------- */
async function fetchPatients() {
  try {
    const patientsRef = collection(db, "patients");
    const snapshot = await getDocs(patientsRef);

    patients = [];
    snapshot.forEach(doc => {
      patients.push({
        id: doc.id,
        ...doc.data()
      });
    });

    renderPatients(filterStatus.value);

  } catch (error) {
    console.error("Error fetching patients:", error);
  }
}

/* -------------------------------------------------------------
   🔵 Render Patients (Safe Version)
-------------------------------------------------------------- */
function renderPatients(filter = "") {
  list.innerHTML = "";

  let filtered = patients.filter(p =>
    (p.name || "").toLowerCase().includes((searchInput.value || "").toLowerCase()) &&
    (filter ? (p.status || "") === filter : true)
  );

  if (filtered.length === 0) {
    list.innerHTML = "<li>No patients found</li>";
    return;
  }

  filtered.forEach(p => {
    const index = patients.findIndex(x => x.id === p.id);

    const li = document.createElement("li");
    li.classList.add(`status-${(p.status || "unknown").toLowerCase()}`);

    li.innerHTML = `
      <div>
        <strong>${p.name || "Unnamed"}</strong> (${p.id})<br>
        Age: ${p.age || "N/A"}, Gender: ${p.gender || "N/A"}<br>
        Status: <span class="status-label ${(p.status || "unknown").toLowerCase()}">${p.status || "Unknown"}</span><br>
        Condition: ${p.condition || "N/A"}<br>
        Referred By: <b>${p.referredBy || "N/A"}</b><br>
        Contact: ${p.phone || "N/A"}
      </div>

      <div>
        <button class="edit-btn" data-index="${index}">Edit</button>
        <button class="delete-btn" data-index="${index}">Delete</button>
        <button class="schedule-btn" data-id="${p.id}">Schedule Operation</button>
      </div>
    `;

    list.appendChild(li);
  });
}

/* -------------------------------------------------------------
   🔵 Add / Update Patient (Firestore)
-------------------------------------------------------------- */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const patientId = form.patientId.value.trim();
  const patientName = form.patientName.value.trim();

  if (!patientId || !patientName) {
    alert("Patient ID and Name are required!");
    return;
  }

  const patient = {
    name: patientName,
    age: form.patientAge.value || "",
    gender: form.patientGender.value || "",
    condition: form.patientCondition.value.trim() || "",
    status: form.patientStatus.value || "Unknown",
    email: form.patientEmail.value.trim() || "",
    phone: form.patientPhone.value.trim() || "",
    referredBy: form.referredBy.value || "",
  };

  const editIndex = form.dataset.editIndex;

  try {
    if (editIndex !== undefined) {
      // Update existing patient
      const existingId = patients[editIndex].id;
      await setDoc(doc(db, "patients", existingId), patient);
      patients[editIndex] = { id: existingId, ...patient };
      delete form.dataset.editIndex;
      document.getElementById("addPatientBtn").textContent = "Add Patient";
    } else {
      // Add new patient
      const docRef = doc(db, "patients", patientId);
      await setDoc(docRef, patient);
      patients.push({ id: patientId, ...patient });
    }

    form.reset();
    renderPatients(filterStatus.value);

  } catch (error) {
    console.error("Error saving patient:", error);
    alert("Failed to save patient. Check console for details.");
  }
});

/* -------------------------------------------------------------
   🔵 Edit or Delete Patient
-------------------------------------------------------------- */
list.addEventListener("click", (e) => {
  if (e.target.classList.contains("edit-btn")) {
    const index = e.target.dataset.index;
    const p = patients[index];

    form.patientId.value = p.id;
    form.patientName.value = p.name;
    form.patientAge.value = p.age;
    form.patientGender.value = p.gender;
    form.patientCondition.value = p.condition;
    form.patientStatus.value = p.status;
    form.patientEmail.value = p.email;
    form.patientPhone.value = p.phone;
    form.referredBy.value = p.referredBy;

    form.dataset.editIndex = index;
    document.getElementById("addPatientBtn").textContent = "Update Patient";
  }

  if (e.target.classList.contains("delete-btn")) {
    const index = e.target.dataset.index;
    const patientId = patients[index].id;

    if (confirm("Are you sure you want to delete this patient?")) {
      deleteDoc(doc(db, "patients", patientId))
        .then(() => {
          patients.splice(index, 1);
          renderPatients(filterStatus.value);
        })
        .catch(err => console.error("Error deleting patient:", err));
    }
  }
});

/* -------------------------------------------------------------
   🔵 Schedule Operation Button
-------------------------------------------------------------- */
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("schedule-btn")) {
    const id = e.target.getAttribute("data-id");
    window.location.href = `operation.html?patientId=${id}`;
  }
});

/* -------------------------------------------------------------
   🔵 Filters
-------------------------------------------------------------- */
searchBtn.addEventListener("click", () => renderPatients(filterStatus.value));
filterStatus.addEventListener("change", () => renderPatients(filterStatus.value));
searchInput.addEventListener("input", () => renderPatients(filterStatus.value));

/* -------------------------------------------------------------
   🔵 Initial Page Load
-------------------------------------------------------------- */
fetchDoctorsAndStore();
fetchPatients();
