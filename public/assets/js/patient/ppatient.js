import { db } from "../firebase/firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// ---------------------------------------------------------
// 🔹 SHOW ONLY LOGGED-IN PATIENT
// ---------------------------------------------------------

async function loadLoggedInPatient() {
    const patientId = sessionStorage.getItem("patientId");

    if (!patientId) {
        console.error("No patientId found in sessionStorage");
        return;
    }

    try {
        const patientRef = doc(db, "patients", patientId);
        const patientSnap = await getDoc(patientRef);

        if (!patientSnap.exists()) {
            console.error("Patient not found in Firestore");
            return;
        }

        const patient = patientSnap.data();
        renderPatient(patient);
    } catch (err) {
        console.error("Error fetching patient:", err);
    }
}


// ---------------------------------------------------------
// 🔹 RENDER PATIENT CARD (Single card only)
// ---------------------------------------------------------

function renderPatient(p) {
    const list = document.getElementById("patientsList");
    list.innerHTML = ""; // Clear existing

    const li = document.createElement("li");

    li.innerHTML = `
        <div class="patient-info">
            <h3>${p.name || "Unnamed Patient"}</h3>
            <p><strong>ID:</strong> ${p.patientId}</p>
            <p><strong>Email:</strong> ${p.email || "-"}</p>
            <p><strong>Age:</strong> ${p.age || "-"}</p>
            <p><strong>Status:</strong> 
                <span class="status-label">${p.status || "Unknown"}</span>
            </p>
        </div>
    `;

    list.appendChild(li);
}


// ---------------------------------------------------------
// 🔹 INIT
// ---------------------------------------------------------
document.addEventListener("DOMContentLoaded", loadLoggedInPatient);
