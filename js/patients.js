// -----------------------------
// 🔹 Imports
// -----------------------------
import { collection, getDocs, setDoc, doc, deleteDoc } 
  from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { db } from "./firebase-init.js";
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Supabase client
const supabaseUrl = 'https://neshwkyiacakcwcgsrsg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lc2h3a3lpYWNha2N3Y2dzcnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyOTU4ODUsImV4cCI6MjA3ODg3MTg4NX0.U9TaN675524qlZXDcoJgZR7gOVJHmsuFO2QQUqovGQE';
const supabase = createClient(supabaseUrl, supabaseKey);

// -----------------------------
// 🔹 DOM Elements
// -----------------------------
const form = document.getElementById("patientForm");
const list = document.getElementById("patientsList");
const filterStatus = document.getElementById("filterStatus");
const searchBtn = document.getElementById("searchPatientBtn");
const searchInput = document.getElementById("searchPatientName");
const referredBySelect = document.getElementById("referredBy");

// -----------------------------
// 🔹 Local Arrays
// -----------------------------
let patients = [];

// -----------------------------
// 🔹 Fetch Doctors & Populate Dropdown
// -----------------------------
async function fetchDoctorsAndStore() {
  try {
    const doctorsRef = collection(db, "doctors");
    const snapshot = await getDocs(doctorsRef);

    const doctors = [];
    snapshot.forEach(doc => doctors.push({ id: doc.id, ...doc.data() }));
    localStorage.setItem("doctors", JSON.stringify(doctors));
    populateReferredByDropdown();
  } catch (err) {
    console.error("Error fetching doctors:", err);
  }
}

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

// -----------------------------
// 🔹 Fetch Patients
// -----------------------------
async function fetchPatients() {
  try {
    const patientsRef = collection(db, "patients");
    const snapshot = await getDocs(patientsRef);

    patients = [];
    snapshot.forEach(doc => patients.push({ id: doc.id, ...doc.data() }));
    renderPatients(filterStatus.value);
  } catch (err) {
    console.error("Error fetching patients:", err);
  }
}

// -----------------------------
// 🔹 Render Patients
// -----------------------------
function renderPatients(filter = "") {
  list.innerHTML = "";

  const filtered = patients.filter(p =>
    (p.name || "").toLowerCase().includes((searchInput.value || "").toLowerCase()) &&
    (filter ? (p.status || "") === filter : true)
  );

  if (filtered.length === 0) {
    list.innerHTML = "<li>No patients found</li>";
    return;
  }

  filtered.forEach((p, index) => {
    const li = document.createElement("li");
    li.classList.add(`status-${(p.status || "unknown").toLowerCase()}`);
    li.innerHTML = `
      <div>
        <strong>${p.name || "Unnamed"}</strong> (${p.id})<br>
        Age: ${p.age || "N/A"}, Gender: ${p.gender || "N/A"}<br>
        Status: <span class="status-label ${(p.status || "unknown").toLowerCase()}">${p.status || "Unknown"}</span><br>
        Condition: ${p.condition || "N/A"}<br>
        Referred By: <b>${p.referredBy || "N/A"}</b><br>
        Contact: ${p.phone || "N/A"}<br>
        ${p.docs ? `<a href="${p.docs}" target="_blank">View Document</a>` : "No Document"}
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

// -----------------------------
// 🔹 Add / Update Patient
// -----------------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const patientId = form.patientId.value.trim();
  const patientName = form.patientName.value.trim();

  if (!patientId || !patientName) {
    alert("Patient ID and Name are required!");
    return;
  }

  const fileInput = document.getElementById("patientDoc");
  let fileURL = "";

  if (fileInput.files.length > 0) {
  const file = fileInput.files[0];

  // Validate type & size
  const allowedTypes = ["application/pdf", "image/jpeg"];
  if (!allowedTypes.includes(file.type)) {
    alert("Only PDF and JPG files are allowed!");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    alert("File size cannot exceed 10 MB!");
    return;
  }

  try {
    // Sanitize filename
    const sanitizeFilename = (name) => {
      return name
        .replace(/\s+/g, '_')          // spaces → _
        .replace(/[^a-zA-Z0-9_.-]/g, ''); // remove unsafe chars
    };

    const filename = sanitizeFilename(`${patientId}_${file.name}`);

    // Upload to public Supabase bucket
    const { data, error } = await supabase.storage
      .from('PatientDocs')   // exact bucket name
      .upload(filename, file);

    if (error) throw error;

    // Get public URL
    const { data: urlData, error: urlError } = supabase.storage
      .from('PatientDocs')
      .getPublicUrl(data.path);

    if (urlError) throw urlError;

    fileURL = urlData.publicUrl;

  } catch (err) {
    console.error("Supabase upload error:", err);
    alert("Failed to upload document.");
    return;
  }
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
    docs: fileURL
  };

  const editIndex = form.dataset.editIndex;

  try {
    if (editIndex !== undefined) {
      const existingId = patients[editIndex].id;
      await setDoc(doc(db, "patients", existingId), patient);
      patients[editIndex] = { id: existingId, ...patient };
      delete form.dataset.editIndex;
      document.getElementById("addPatientBtn").textContent = "Add Patient";
    } else {
      const docRef = doc(db, "patients", patientId);
      await setDoc(docRef, patient);
      patients.push({ id: patientId, ...patient });
    }

    form.reset();
    renderPatients(filterStatus.value);

  } catch (err) {
    console.error("Error saving patient:", err);
    alert("Failed to save patient.");
  }
});

// -----------------------------
// 🔹 Edit / Delete / Schedule Buttons
// -----------------------------
list.addEventListener("click", async (e) => {
  const index = e.target.dataset.index;

  // Edit
  if (e.target.classList.contains("edit-btn")) {
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

  // Delete
  if (e.target.classList.contains("delete-btn")) {
    const patient = patients[index];
    const patientId = patient.id;

    if (confirm("Are you sure you want to delete this patient?")) {
      try {
        // Delete from Firestore
        await deleteDoc(doc(db, "patients", patientId));

        // Delete file from Supabase if exists
        if (patient.docs) {
          try {
            const url = new URL(patient.docs);
            const path = url.pathname.split('/').slice(2).join('/'); 
            const { error } = await supabase.storage
              .from('PatientDocs')
              .remove([path]);
            if (error) console.error("Error deleting Supabase file:", error);
          } catch (err) {
            console.error("Error parsing Supabase file path:", err);
          }
        }

        patients.splice(index, 1);
        renderPatients(filterStatus.value);

      } catch (err) {
        console.error("Error deleting patient:", err);
      }
    }
  }
});

// Schedule
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("schedule-btn")) {
    const id = e.target.getAttribute("data-id");
    window.location.href = `operation.html?patientId=${id}`;
  }
});

// -----------------------------
// 🔹 Filters
// -----------------------------
searchBtn.addEventListener("click", () => renderPatients(filterStatus.value));
filterStatus.addEventListener("change", () => renderPatients(filterStatus.value));
searchInput.addEventListener("input", () => renderPatients(filterStatus.value));

// -----------------------------
// 🔹 Initial Load
// -----------------------------
fetchDoctorsAndStore();
fetchPatients();
