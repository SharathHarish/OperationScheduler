// js/admin.js
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ---------------- Firebase Configuration ----------------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------------- Elements ----------------
const docName = document.getElementById("docName");
const docSpecialty = document.getElementById("docSpecialty");
const docEmail = document.getElementById("docEmail");
const docPhone = document.getElementById("docPhone");
const addDoctorBtn = document.getElementById("addDoctorBtn");
const doctorsList = document.getElementById("doctorsList");

// ---------------- Load all doctors on page load ----------------
async function loadDoctors() {
  doctorsList.innerHTML = "";
  const snapshot = await getDocs(collection(db, "doctors"));
  snapshot.forEach((d) => {
    renderDoctor({
      id: d.id,
      ...d.data(),
    });
  });
}

function renderDoctor(doctor) {
  const li = document.createElement("li");
  li.innerHTML = `
    <div class="meta">
      <strong>${doctor.name}</strong>
      <span class="small">${doctor.specialization}</span>
      <span class="small">${doctor.email}</span>
      <span class="small">${doctor.phone}</span>
    </div>
    <div>
      <button class="action-btn edit-btn" data-id="${doctor.id}">✎ Edit</button>
      <button class="action-btn delete-btn" data-id="${doctor.id}">🗑 Delete</button>
    </div>
  `;
  doctorsList.appendChild(li);
}

// ---------------- Add or Update Doctor ----------------
addDoctorBtn.addEventListener("click", async () => {
  const name = docName.value.trim();
  const specialization = docSpecialty.value.trim();
  const email = docEmail.value.trim();
  const phone = docPhone.value.trim();

  if (!name || !specialization || !email || !phone) {
    alert("Please fill all fields");
    return;
  }

  // If editing an existing doctor
  const editingId = addDoctorBtn.dataset.editing;

  if (!editingId) {
    // ---------------- Check for duplicates ----------------
    const emailQuery = query(collection(db, "doctors"), where("email", "==", email));
    const phoneQuery = query(collection(db, "doctors"), where("phone", "==", phone));
    const emailSnap = await getDocs(emailQuery);
    const phoneSnap = await getDocs(phoneQuery);

    if (!emailSnap.empty || !phoneSnap.empty) {
      alert("A doctor with this email or phone number already exists.");
      return;
    }

    // ---------------- Add new doctor ----------------
    await addDoc(collection(db, "doctors"), {
      name,
      specialization,
      email,
      phone,
    });

    alert("Doctor added successfully!");
  } else {
    // ---------------- Update existing doctor ----------------
    const docRef = doc(db, "doctors", editingId);
    await updateDoc(docRef, {
      name,
      specialization,
      email,
      phone,
    });

    alert("Doctor details updated successfully!");
    addDoctorBtn.textContent = "Add Doctor";
    delete addDoctorBtn.dataset.editing;
  }

  // Reset form & reload list
  docName.value = "";
  docSpecialty.value = "";
  docEmail.value = "";
  docPhone.value = "";
  loadDoctors();
});

// ---------------- Edit or Delete Doctor ----------------
doctorsList.addEventListener("click", async (e) => {
  const id = e.target.dataset.id;
  if (!id) return;

  // ----- Delete -----
  if (e.target.classList.contains("delete-btn")) {
    const confirmDelete = confirm("Are you sure you want to delete this doctor?");
    if (confirmDelete) {
      await deleteDoc(doc(db, "doctors", id));
      alert("Doctor deleted successfully!");
      e.target.closest("li").remove();
    }
  }

  // ----- Edit -----
  if (e.target.classList.contains("edit-btn")) {
    const snapshot = await getDocs(query(collection(db, "doctors"), where("__name__", "==", id)));
    if (!snapshot.empty) {
      const doctor = snapshot.docs[0].data();
      docName.value = doctor.name;
      docSpecialty.value = doctor.specialization;
      docEmail.value = doctor.email;
      docPhone.value = doctor.phone;
      addDoctorBtn.textContent = "Save Changes";
      addDoctorBtn.dataset.editing = id;
    }
  }
});

// ---------------- Logout button (placeholder) ----------------
document.getElementById("logoutBtn").addEventListener("click", () => {
  alert("Logged out successfully!");
  window.location.href = "login.html"; // optional redirect
});

// ---------------- Initialize ----------------
loadDoctors();
