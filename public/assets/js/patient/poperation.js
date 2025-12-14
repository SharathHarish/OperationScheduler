import { db } from "../firebase/firebase-init.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* ---------------------------------------------------------
   FETCH DOCTOR NAME USING ID
----------------------------------------------------------*/
async function getDoctorNameById(doctorId) {
  if (!doctorId) return "-";

  try {
    const docRef = doc(db, "doctors", doctorId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return snap.data().name || "-";
    }
    return "-";
  } catch (err) {
    console.error("Error fetching doctor:", err);
    return "-";
  }
}

/* ---------------------------------------------------------
   FETCH LOGGED-IN PATIENT'S SURGERIES
----------------------------------------------------------*/
async function fetchPatientOperations() {
  const patientId = sessionStorage.getItem("patientId");

  if (!patientId) {
    console.error("No patientId in sessionStorage");
    return [];
  }

  try {
    const q = query(
      collection(db, "schedules"),
      where("patientId", "==", patientId)
    );

    const snap = await getDocs(q);
    const operations = [];

    snap.forEach(d => operations.push({ id: d.id, ...d.data() }));

    return operations;

  } catch (err) {
    console.error("Error fetching operations:", err);
    return [];
  }
}

/* ---------------------------------------------------------
   RENDER OPERATIONS AS TABLE
----------------------------------------------------------*/
async function displayOperations() {
  const list = document.getElementById("operationList");
  list.innerHTML = "<p>Loading...</p>";

  const operations = await fetchPatientOperations();

  if (operations.length === 0) {
    list.innerHTML = "<p>No operations scheduled.</p>";
    return;
  }

  // Create table
  let tableHTML = `
    <table class="operation-table">
      <thead>
        <tr>
          <th>Surgery</th>
          <th>Date</th>
          <th>Time</th>
          <th>OT Room</th>
          <th>Surgeon</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const op of operations) {
    const doctorName = await getDoctorNameById(op.doctorId);

    tableHTML += `
      <tr>
        <td>${op.surgeryType}</td>
        <td>${op.date}</td>
        <td>${op.startTime} - ${op.endTime}</td>
        <td>${op.otName}</td>
        <td>Dr. ${doctorName}</td>
      </tr>
    `;
  }

  tableHTML += `
      </tbody>
    </table>
  `;

  list.innerHTML = tableHTML;
}

document.addEventListener("DOMContentLoaded", displayOperations);
