// -----------------------------
// 🔹 patients.js
// -----------------------------
// Make sure firebase-init.js exports `db` and that file path is correct in HTML
// This file is ESM module (type="module") in the HTML

import { collection, getDocs, setDoc, doc, deleteDoc, getDoc } 
  from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { db } from "./firebase-init.js";
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// -----------------------------
// Supabase client (keep your key here as before)
// -----------------------------
const supabaseUrl = 'https://neshwkyiacakcwcgsrsg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lc2h3a3lpYWNha2N3Y2dzcnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyOTU4ODUsImV4cCI6MjA3ODg3MTg4NX0.U9TaN675524qlZXDcoJgZR7gOVJHmsuFO2QQUqovGQE';
const supabase = createClient(supabaseUrl, supabaseKey);

// -----------------------------
// DOM Elements
// -----------------------------
const form = document.getElementById("patientForm");
const list = document.getElementById("patientsList");
const filterStatus = document.getElementById("filterStatus");
const searchBtn = document.getElementById("searchPatientBtn");
const searchInput = document.getElementById("searchPatientName");
const referredBySelect = document.getElementById("referredBy");
const resetBtn = document.getElementById("resetBtn");
const addBtn = document.getElementById("addPatientBtn");

// -----------------------------
// Local state
// -----------------------------
let patients = [];

// -----------------------------
// Helper: custom dialog
// -----------------------------
function showDialog(type = "success", title = "Success", message = "") {
  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";

  const box = document.createElement("div");
  box.className = `popup-box ${type}`;

  box.innerHTML = `
    <div class="popup-title">${title}</div>
    <div class="popup-message">${message}</div>
    <button class="popup-btn">OK</button>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // animate in
  setTimeout(() => overlay.classList.add("show"), 30);

  // close action
  box.querySelector(".popup-btn").onclick = () => {
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 220);
  };

  // auto close after 2.8s
  setTimeout(() => {
    if (document.body.contains(overlay)) {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 220);
    }
  }, 2800);
}

// -----------------------------
// Validation helpers
// -----------------------------
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function clearValidation() {
  form.querySelectorAll(".error").forEach(el => el.textContent = "");
  form.querySelectorAll(".invalid").forEach(el => el.classList.remove("invalid"));
}

function showFieldError(fieldId, message) {
  const err = form.querySelector(`.error[data-for="${fieldId}"]`);
  if (err) err.textContent = message;
  const input = form.querySelector(`#${fieldId}`);
  if (input) input.classList.add("invalid");
}

function validateForm(isEdit = false) {
  clearValidation();
  const values = {
    patientId: form.patientId.value.trim(),
    patientName: form.patientName.value.trim(),
    patientAge: form.patientAge.value.trim(),
    patientGender: form.patientGender.value,
    patientCondition: form.patientCondition.value.trim(),
    patientStatus: form.patientStatus.value,
    patientEmail: form.patientEmail.value.trim(),
    patientPhone: form.patientPhone.value.trim(),
    referredBy: form.referredBy.value
  };

  // Required checks
  if (!values.patientId) { showFieldError("patientId", "Patient ID is required"); return { ok:false }; }
  if (!values.patientName) { showFieldError("patientName", "Patient name is required"); return { ok:false }; }
  if (!values.patientAge || isNaN(Number(values.patientAge)) || Number(values.patientAge) < 0) { showFieldError("patientAge", "Valid age is required"); return { ok:false }; }
  if (!values.patientGender) { showFieldError("patientGender", "Please select gender"); return { ok:false }; }
  if (!values.patientCondition) { showFieldError("patientCondition", "Condition is required"); return { ok:false }; }
  if (!values.patientStatus) { showFieldError("patientStatus", "Please select status"); return { ok:false }; }
  if (!values.referredBy) { showFieldError("referredBy", "Please select a doctor"); return { ok:false }; }

  // Email optional but if present must be valid
  if (values.patientEmail && !emailRegex.test(values.patientEmail)) {
    showFieldError("patientEmail", "Invalid email format");
    return { ok:false };
  }

  // Phone required: digits-only and length 10
  const phone = values.patientPhone.replace(/\D/g, "");
  if (!phone) { showFieldError("patientPhone", "Phone is required"); return { ok:false }; }
  if (phone.length !== 10) { showFieldError("patientPhone", "Phone must be 10 digits"); return { ok:false }; }
  if (!/^\d{10}$/.test(values.patientPhone)) {
    // if input had non-digit chars, highlight but accept normalized digits for storage
    showFieldError("patientPhone", "Phone must contain only digits");
    return { ok:false };
  }

  return { ok:true, values: { ...values, patientPhone: phone } };
}

// Prevent non-digit entry in phone field
document.getElementById("patientPhone").addEventListener("input", (e) => {
  const el = e.target;
  el.value = el.value.replace(/\D/g, "").slice(0, 10);
});

// Reset button
resetBtn.addEventListener("click", () => {
  form.reset();
  delete form.dataset.editIndex;
  form.patientId.disabled = false;
  addBtn.textContent = "Add Patient";
  clearValidation();
});

// -----------------------------
// Populate doctors dropdown
// -----------------------------
async function fetchDoctorsAndStore() {
  try {
    const doctorsRef = collection(db, "doctors");
    const snapshot = await getDocs(doctorsRef);
    const doctors = [];
    snapshot.forEach(d => doctors.push({ id: d.id, ...d.data() }));
    localStorage.setItem("doctors", JSON.stringify(doctors));
    populateReferredByDropdown();
  } catch (err) {
    console.error("Error fetching doctors:", err);
  }
}
function populateReferredByDropdown() {
  const doctors = JSON.parse(localStorage.getItem("doctors") || "[]");
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
// Fetch patients
// -----------------------------
async function fetchPatients() {
  try {
    const patientsRef = collection(db, "patients");
    const snapshot = await getDocs(patientsRef);
    patients = [];
    snapshot.forEach(d => patients.push({ id: d.id, ...d.data() }));
    renderPatients(filterStatus.value);
  } catch (err) {
    console.error("Error fetching patients:", err);
  }
}

// -----------------------------
// Render patients list
// -----------------------------
function renderPatients(filter = "") {
  list.innerHTML = "";
  const q = (searchInput.value || "").toLowerCase();
  const filtered = patients.filter(p =>
    (p.name || "").toLowerCase().includes(q) &&
    (filter ? (p.status || "") === filter : true)
  );

  if (filtered.length === 0) {
    list.innerHTML = "<li>No patients found</li>";
    return;
  }

  filtered.forEach((p, index) => {
    const li = document.createElement("li");

    const info = document.createElement("div");
    info.className = "patient-info";
  info.innerHTML = `
  <div style="font-size:14px; line-height:1.6;">
    <div>Patient Name: <strong>${p.name || "Unnamed"}</strong> <span style="color:#777">(${p.patientId || p.id})</span></div>
    <div>Age: ${p.age || "N/A"}</div> <div> Gender: ${p.gender || "N/A"}</div>
    <div>Condition: ${p.condition || "N/A"}</div>
    <div>Status: <span class="status-label">${p.status || "Unknown"}</span></div>
    <div>Referred By: ${p.referredBy || "N/A"}</div>
    <div>Contact: ${p.phone || "N/A"}${p.email ? ` • <span style="color:#666">${p.email}</span>` : ""}</div>
    <div>${p.docs ? `<a href="${p.docs}" target="_blank">View Document</a>` : "No Document"}</div>
  </div>
`;

    const actions = document.createElement("div");
    actions.className = "patient-actions";
    actions.innerHTML = `
      <button class="edit-btn" data-index="${index}">Edit</button>
      <button class="delete-btn" data-index="${index}">Delete</button>
      <button class="schedule-btn" data-id="${p.id}">Schedule</button>
    `;

    li.appendChild(info);
    li.appendChild(actions);
    list.appendChild(li);
  });
}

// -----------------------------
// Submit (Add / Update)
// -----------------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const isEdit = form.dataset.editIndex !== undefined;
  const validation = validateForm(isEdit);
  if (!validation.ok) return;

  const vals = validation.values;
  const patientId = vals.patientId;
  const fileInput = document.getElementById("patientDoc");
  let fileURL = "";

  // If creating (not editing), check uniqueness
  if (!isEdit) {
    try {
      const snapshot = await getDoc(doc(db, "patients", patientId));
      if (snapshot.exists()) {
        showFieldError("patientId", "Patient ID already exists");
        showDialog("error", "Duplicate ID", "Patient ID already exists. Please choose another ID.");
        return;
      }
    } catch (err) {
      console.error("Error checking patient id:", err);
      showDialog("error", "Error", "Could not validate Patient ID uniqueness.");
      return;
    }
  }

  // File upload (optional)
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const allowed = ["application/pdf", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.type)) {
      showFieldError("patientDoc", "Only PDF / JPG allowed");
      showDialog("error", "Invalid File", "Only PDF or JPG files are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showFieldError("patientDoc", "File too large (>10MB)");
      showDialog("error", "Upload Failed", "File size cannot exceed 10 MB.");
      return;
    }

    try {
      const sanitizeFilename = (name) => name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
      const filename = sanitizeFilename(`${patientId}_${file.name}`);
      const { data, error } = await supabase.storage.from('PatientDocs').upload(filename, file);
      if (error && error.message && !data) throw error;
      const { data: urlData } = supabase.storage.from('PatientDocs').getPublicUrl(data.path);
      fileURL = urlData.publicUrl;
    } catch (err) {
      console.error("Supabase upload error:", err);
      showDialog("error", "Upload Failed", "Document upload failed. Try again.");
      return;
    }
  }

  // build patient object
  const patientObj = {
    patientId: vals.patientId, 
    name: vals.patientName,
    age: vals.patientAge,
    gender: vals.patientGender,
    condition: vals.patientCondition,
    status: vals.patientStatus,
    email: vals.patientEmail || "",
    phone: vals.patientPhone,
    referredBy: vals.referredBy,
    docs: fileURL || ""
  };

  try {
    if (isEdit) {
      // update existing doc
      const editIndex = Number(form.dataset.editIndex);
      const existingId = patients[editIndex].id;
      await setDoc(doc(db, "patients", patientId), patientObj);
      patients[editIndex] = { id: patientId, ...patientObj };
      delete form.dataset.editIndex;
      form.patientId.disabled = false;
      addBtn.textContent = "Add Patient";
      showDialog("success", "Updated", "Patient updated successfully.");
    } else {
      // add new with provided patientId
      await setDoc(doc(db, "patients", patientId), patientObj);
      patients.push({ id: patientId, ...patientObj });
      showDialog("success", "Added", "Patient added successfully.");
    }

    form.reset();
    clearValidation();
    renderPatients(filterStatus.value);

  } catch (err) {
    console.error("Error saving patient:", err);
    showDialog("error", "Save Failed", "Failed to save patient. Try again.");
  }
});

// -----------------------------
// Edit / Delete / Schedule handlers
// -----------------------------
list.addEventListener("click", async (e) => {
  const index = e.target.dataset.index;
  if (e.target.classList.contains("edit-btn")) {
    const p = patients[index];
    form.patientId.value = p.id;
    form.patientName.value = p.name || "";
    form.patientAge.value = p.age || "";
    form.patientGender.value = p.gender || "";
    form.patientCondition.value = p.condition || "";
    form.patientStatus.value = p.status || "";
    form.patientEmail.value = p.email || "";
    form.patientPhone.value = p.phone || "";
    form.referredBy.value = p.referredBy || "";
    form.dataset.editIndex = index;
    form.patientId.disabled = true; // prevent changing id while editing
    addBtn.textContent = "Update Patient";
    clearValidation();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (e.target.classList.contains("delete-btn")) {
    const p = patients[index];
    if (!confirm(`Delete patient ${p.name} (${p.id})? This action is permanent.`)) return;

    try {
      // delete from Firestore
      await deleteDoc(doc(db, "patients", p.id));

      // delete file from supabase if exists
      if (p.docs) {
        try {
          const url = new URL(p.docs);
          // path in bucket: remove leading /storage/v1/... parts until bucket path - this depends on supabase url format
          // For safety try to extract filename after last '/'
          const filename = url.pathname.split('/').pop();
          const { error } = await supabase.storage.from('PatientDocs').remove([filename]);
          if (error) console.error("Error deleting supabase file:", error);
        } catch (err) {
          console.error("Error parsing supabase url:", err);
        }
      }

      patients.splice(index, 1);
      renderPatients(filterStatus.value);
      showDialog("success", "Deleted", "Patient deleted successfully.");
    } catch (err) {
      console.error("Error deleting patient:", err);
      showDialog("error", "Delete Failed", "Could not delete patient.");
    }
  }
  if (e.target.classList.contains("schedule-btn")) {
  const patientId = e.target.dataset.id;

  // Redirect with patientId in URL
  window.location.href = `operation.html?patientId=${patientId}`;
  return;
}
});

// Scroll to Add Patient section
document.getElementById("scrollToAddPatientBtn")?.addEventListener("click", () => {
    const section = document.getElementById("aoperation");
    if (section) {
        section.scrollIntoView({ behavior: "smooth" });
    } else {
        console.warn("Add Patient section not found");
    }
});

// Scroll to Scheduled Operations section
document.getElementById("scrollToSBtn")?.addEventListener("click", () => {
    const section = document.getElementById("soperation");
    if (section) {
        section.scrollIntoView({ behavior: "smooth" });
    } else {
        console.warn("Scheduled Operations section not found");
    }
});
// -----------------------------
// Filters & search
// -----------------------------
searchBtn.addEventListener("click", () => renderPatients(filterStatus.value));
filterStatus.addEventListener("change", () => renderPatients(filterStatus.value));
searchInput.addEventListener("input", () => renderPatients(filterStatus.value));

// -----------------------------
// Initial load
// -----------------------------
fetchDoctorsAndStore();
fetchPatients();
