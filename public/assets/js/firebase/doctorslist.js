import { db } from "./auth.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const doctorsList = document.getElementById("doctorsList");
const searchInput = document.getElementById("searchInput");
const departmentFilter = document.getElementById("departmentFilter");
const searchBtn = document.getElementById("searchBtn");

let allDoctors = [];

// ✅ Fetch doctors from Firestore
async function loadDoctors() {
  try {
    const snapshot = await getDocs(collection(db, "doctors"));
    allDoctors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderDoctors(allDoctors);
  } catch (error) {
    console.error("Error loading doctors:", error);
  }
}

// ✅ Render doctor list
function renderDoctors(doctors) {
  doctorsList.innerHTML = "";

  if (doctors.length === 0) {
    doctorsList.innerHTML = "<p>No doctors found.</p>";
    return;
  }

  doctors.forEach(d => {
    const li = document.createElement("li");
    li.className = "doctor-card";
    li.innerHTML = `
      <div class="meta">
        <strong>Dr. ${d.name}</strong>
        <span class="small"><b>Dept:</b> ${d.department}</span>
        <span class="small"><b>Specialization:</b> ${d.specialization}</span>
        <span class="small"><b>Qualification:</b> ${d.qualification}</span>
        <span class="small"><b>Status:</b> ${d.status}</span>
        <span class="small"><b>Email:</b> ${d.email}</span>
        <span class="small"><b>Phone:</b> ${d.phone}</span>
        <span class="small"><b>Available Days:</b> ${d.availableDays?.join(", ") || "-"}</span>
        <span class="small"><b>Time Slots:</b> ${formatTimeSlots(d.timeSlots)}</span>
      </div>
      <div>
        <button class="action-btn edit-btn" data-id="${d.id}">✎ Update</button>
      </div>
    `;
    doctorsList.appendChild(li);
  });
}

function formatTimeSlots(slots) {
  if (!slots || slots.length === 0) return "-";
  return slots.map(s => `${s.from} - ${s.to}`).join(", ");
}

// ✅ Filter by name & department
function applyFilters() {
  const nameQuery = searchInput.value.toLowerCase();
  const dept = departmentFilter.value;
  const filtered = allDoctors.filter(d =>
    (!dept || d.department === dept) &&
    (!nameQuery || d.name.toLowerCase().includes(nameQuery))
  );
  renderDoctors(filtered);
}

// ✅ Event Listeners
searchBtn.addEventListener("click", applyFilters);
searchInput.addEventListener("keypress", e => {
  if (e.key === "Enter") applyFilters();
});

// ✅ Initial Load
loadDoctors();
