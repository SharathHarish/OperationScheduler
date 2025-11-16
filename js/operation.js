import { db } from './firebase-init.js';
import {
  collection,getDocs,
  addDoc
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// 🔥 Map specialization → allowed surgeries
const surgeryMap = {
  "General Surgeon": [
    "Appendectomy", "Cholecystectomy (Gallbladder Removal)", "Hernia Repair",
    "Hemorrhoidectomy", "Fissure Surgery", "Fistula Surgery",
    "Thyroidectomy", "Parathyroidectomy", "Mastectomy",
    "Breast Lumpectomy", "Colectomy", "Gastrectomy"
  ],

  "Orthopedic Surgeon": [
    "ORIF", "Total Knee Replacement (TKR)", "Total Hip Replacement (THR)",
    "ACL Reconstruction", "Meniscus Repair", "Spinal Fusion"
  ],

  "Cardiac Surgeon": [
    "CABG (Bypass Surgery)", "Valve Replacement", "ASD/VSD Repair",
    "Pacemaker Implantation"
  ],

  "Neurosurgeon": [
    "Craniotomy", "Brain Tumor Excision", "VP Shunt",
    "Spinal Decompression", "Spinal Tumor Resection"
  ],

  "Gynecologist": [
    "Cesarean Section", "Hysterectomy", "Myomectomy", "Tubectomy"
  ],

  "Urologist": [
    "TURP", "PCNL", "URSL", "Nephrectomy", "Prostatectomy"
  ],

  "ENT Surgeon": [
    "Tonsillectomy", "Septoplasty", "FESS", "Cochlear Implant"
  ],

  "Ophthalmologist": [
    "Cataract Surgery", "Glaucoma Surgery", "Retinal Detachment Repair"
  ],

  "Plastic Surgeon": [
    "Rhinoplasty", "Liposuction", "Abdominoplasty", "Facelift"
  ],

  "Vascular Surgeon": [
    "Varicose Veins Surgery", "AV Fistula Creation", "Aneurysm Repair"
  ],

  "Pediatric Surgeon": [
    "Pediatric Hernia Repair", "Pediatric Appendectomy"
  ]
};
// 🔥 Map specialization → Operation Theatre
const otMap = {
  "General Surgeon": ["OT-1 – General OT 1", "OT-2 – General OT 2"],
  "Orthopedic Surgeon": ["OT-4 – Orthopedic OT"],
  "Cardiac Surgeon": ["OT-13 – Cardiac OT"],
  "Neurosurgeon": ["OT-14 – Neurosurgery OT"],
  "Gynecologist": ["OT-6 – Obstetrics & Gynecology OT"],
  "Urologist": ["OT-7 – Urology OT"],
  "ENT Surgeon": ["OT-5 – ENT / Head & Neck OT"],
  "Ophthalmologist": ["OT-10 – Eye OT"],
  "Plastic Surgeon": ["OT-9 – Plastic & Reconstructive OT"],
  "Vascular Surgeon": ["OT-12 – Vascular OT"],
  "Pediatric Surgeon": ["OT-11 – Pediatric Surgery OT"]
};


document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('patientId');
    console.log("Received patient ID in operation page:", patientId);

    if (patientId) {
        const input = document.getElementById('patientIdInput');
        if (input) {
            input.value = patientId;
            input.readOnly = true;
        }
    } else {
        console.warn("No patient ID received from patient.html");
    }

 // Fill patient ID into the input field
    const patientInput = document.getElementById('patientIdInput');
    if (patientInput) {
        patientInput.value = patientId;
        patientInput.readOnly = true; // make it non-editable
    }

    });

    // Operation Scheduling DOM Elements
const schedDate = document.getElementById('schedDate');
const schedStart = document.getElementById('schedStart');
const schedEnd = document.getElementById('schedEnd');
const schedOT = document.getElementById('schedOT');
const schedSurgeon = document.getElementById('schedSurgeon');
const schedAnes = document.getElementById('schedAnes');
const schedPatientId = document.getElementById('schedPatientId');
const schedRemarks = document.getElementById('schedRemarks');
const addScheduleBtn = document.getElementById('addScheduleBtn');

// 🔵 Add Operation Schedule → Firebase
addScheduleBtn.addEventListener('click', async () => {
  const date = schedDate.value;
  const start = schedStart.value;
  const end = schedEnd.value;
  const ot = schedOT.value.trim();
  const surgeon = schedSurgeon.value.trim();
  const anes = schedAnes.value.trim();
  const patientRef = schedPatientId.value.trim();
  const remarks = schedRemarks.value.trim();

  // Required fields validation
  if (!date || !start || !end || !ot || !surgeon) {
    alert('Please fill date, start, end, OT and surgeon.');
    return;
  }

  try {
    const schedule = {
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

    await addDoc(collection(db, 'schedules'), schedule);

    // Clear input fields after success
    schedDate.value = '';
    schedStart.value = '';
    schedEnd.value = '';
    schedOT.value = '';
    schedSurgeon.value = '';
    schedAnes.value = '';
    schedPatientId.value = '';
    schedRemarks.value = '';

    alert("Schedule added successfully!");

  } catch (err) {
    console.error(err);
    alert('Error adding schedule: ' + err.message);
  }
});

/* -----------------------------------------------------
   🔵 Fetch Doctors (Firebase v9 Modular) and store locally
------------------------------------------------------ */
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
    populateDoctorDropdowns();

  } catch (error) {
    console.error("Error fetching doctors:", error);
  }
}

function populateDoctorDropdowns() {
  const doctors = JSON.parse(localStorage.getItem("doctors")) || [];

  // Dropdown refs
  const surgeonDD = document.getElementById("schedSurgeon");
  const anaesDD   = document.getElementById("schedAnes");

  if (!surgeonDD || !anaesDD) {
    console.error("Dropdown not found: #schedSurgeon or #anaesList");
    return;
  }

  // Clear both dropdowns
  surgeonDD.innerHTML = `<option value="">Select Doctor</option>`;
  anaesDD.innerHTML   = `<option value="">Select Anesthesiologist</option>`;

  doctors.forEach(doc => {
    const name = doc.name || "";
    const spec = (doc.specialization || "").trim();

    // Create <option>
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = spec ? `${name} (${spec})` : name;

    if (spec === "Anesthesiologist") {
      // 👉 Goes to anaesthesiologist dropdown
      anaesDD.appendChild(opt);
    } else {
      // 👉 Goes to surgeon dropdown
      surgeonDD.appendChild(opt);
    }
  });
}
// Load doctors from Firebase → store local → update dropdown
fetchDoctorsAndStore();
