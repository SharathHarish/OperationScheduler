import { db } from "../firebase/firebase-init.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* ---------------------------------------------------------
   FETCH FULL DOCTOR DETAILS USING doctorId FIELD
----------------------------------------------------------*/
async function getDoctorDetailsByDoctorId(doctorId) {
  if (!doctorId) return null;

  try {
    const q = query(
      collection(db, "doctors"),
      where("doctorId", "==", doctorId)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return snapshot.docs[0].data(); // full doctor object
    }

    return null;
  } catch (error) {
    console.error("Error fetching doctor details:", error);
    return null;
  }
}

/* ---------------------------------------------------------
   FETCH LOGGED-IN PATIENT'S SCHEDULES
----------------------------------------------------------*/
async function fetchPatientOperations() {
  const patientId = sessionStorage.getItem("patientId");

  if (!patientId) {
    console.error("patientId missing in sessionStorage");
    return [];
  }

  try {
    const q = query(
      collection(db, "schedules"),
      where("patientId", "==", patientId)
    );

    const snapshot = await getDocs(q);
    const operations = [];

    snapshot.forEach(docSnap => {
      operations.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    return operations;

  } catch (error) {
    console.error("Error fetching schedules:", error);
    return [];
  }
}

/* ---------------------------------------------------------
   SHOW DOCTOR DETAILS POPUP
----------------------------------------------------------*/
function showDoctorPopup(doctor) {
  const popupHTML = `
    <div class="doctor-popup-overlay">
      <div class="doctor-popup">
        <h3>Doctor ${doctor.name}</h3>
        <p><strong>Qualification:</strong> ${doctor.qualification || "-"}</p>
        <p><strong>Specialization :</strong> ${doctor.specialization || "-"}</p>
         <p><strong>Department:</strong> ${doctor.department || "-"}</p>
        <p><strong>Email:</strong> ${doctor.email || "-"}</p>

        <button id="closeDoctorPopup">Close</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", popupHTML);

  document
    .getElementById("closeDoctorPopup")
    .addEventListener("click", () => {
      document.querySelector(".doctor-popup-overlay").remove();
    });
}

/* ---------------------------------------------------------
   DISPLAY OPERATIONS TABLE
----------------------------------------------------------*/
async function displayOperations() {
  const container = document.getElementById("operationList");
  container.innerHTML = "<p>Loading...</p>";

  const operations = await fetchPatientOperations();

  if (operations.length === 0) {
    container.innerHTML = "<p>No operations scheduled.</p>";
    return;
  }

  let tableHTML = `
    <table class="operation-table">
      <thead>
        <tr>
          <th>Surgery</th>
          <th>Date</th>
          <th>Time</th>
          <th>OT Room</th>
          <th>Doctor</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const op of operations) {
    const doctor = await getDoctorDetailsByDoctorId(op.doctorId);
    const doctorName = doctor ? doctor.name : "-";

    tableHTML += `
      <tr>
        <td>${op.surgeryType || "-"}</td>
        <td>${op.date || "-"}</td>
        <td>${op.startTime || "-"} - ${op.endTime || "-"}</td>
        <td>${op.otName || "-"}</td>
        <td>
          <span 
            class="doctor-link" 
            data-doctor-id="${op.doctorId}">
            Dr.${doctorName}
          </span>
        </td>
      </tr>
    `;
  }

  tableHTML += `
      </tbody>
    </table>
  `;

  container.innerHTML = tableHTML;

  /* ---------------------------------------------------------
     CLICK HANDLER FOR DOCTOR NAME
  ----------------------------------------------------------*/
  document.querySelectorAll(".doctor-link").forEach(link => {
    link.addEventListener("click", async () => {
      const doctorId = link.getAttribute("data-doctor-id");
      const doctor = await getDoctorDetailsByDoctorId(doctorId);

      if (doctor) {
        showDoctorPopup(doctor);
      }
    });
  });
}

/* ---------------------------------------------------------
   INITIAL LOAD
----------------------------------------------------------*/
document.addEventListener("DOMContentLoaded", displayOperations);
