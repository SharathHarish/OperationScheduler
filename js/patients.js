// DOM Elements
const form = document.getElementById("patientForm");
const list = document.getElementById("patientsList");
const filterStatus = document.getElementById("filterStatus");
const searchBtn = document.getElementById("searchPatientBtn");
const searchInput = document.getElementById("searchPatientName");
const referredBySelect = document.getElementById("referredBy");

// patients stored locally
let patients = JSON.parse(localStorage.getItem("patients")) || [];

async function loadDoctors() {
  try {
    doctorDropdown.innerHTML = `<option>Loading doctors...</option>`;

    const snapshot = await getDocs(collection(db, "doctors"));

    doctorDropdown.innerHTML = `<option value="">Select Referred Doctor</option>`;

    snapshot.forEach(doc => {
      const data = doc.data();

      doctorDropdown.innerHTML += `
        <option value="${data.name}">
          ${data.name} (${data.specialization})
        </option>
      `;
    });

    if (snapshot.empty) {
      doctorDropdown.innerHTML = `<option>No doctors available</option>`;
    }

  } catch (err) {
    console.error("🔥 Error loading doctors:", err);
    doctorDropdown.innerHTML = `<option>Error loading doctors</option>`;
  }
}

loadDoctors();

/* -----------------------------------------------------
   🔵 Render Patients
------------------------------------------------------ */
function renderPatients(filter = "") {
  list.innerHTML = "";

  let filtered = patients.filter(p =>
    p.name.toLowerCase().includes(searchInput.value.toLowerCase()) &&
    (filter ? p.status === filter : true)
  );

  if (filtered.length === 0) {
    list.innerHTML = "<li>No patients found</li>";
    return;
  }

  filtered.forEach(p => {
    const index = patients.findIndex(x => x.id === p.id);

    const li = document.createElement("li");
    li.classList.add(`status-${p.status.toLowerCase()}`);

    li.innerHTML = `
      <div>
        <strong>${p.name}</strong> (${p.id})<br>
        Age: ${p.age}, Gender: ${p.gender}<br>
        Status: <span class="status-label ${p.status.toLowerCase()}">${p.status}</span><br>
        Condition: ${p.condition}<br>
        Referred By: <b>${p.referredBy || "N/A"}</b><br>
        Contact: ${p.phone}
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

/* -----------------------------------------------------
   🔵 Add / Update patient
------------------------------------------------------ */
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const patient = {
    id: form.patientId.value.trim(),
    name: form.patientName.value.trim(),
    age: form.patientAge.value,
    gender: form.patientGender.value,
    condition: form.patientCondition.value.trim(),
    status: form.patientStatus.value,
    email: form.patientEmail.value.trim(),
    phone: form.patientPhone.value.trim(),
    referredBy: form.referredBy.value || "",
  };

  // Prevent duplicate ID
  if (!form.dataset.editIndex && patients.some(p => p.id === patient.id)) {
    alert("A patient with this ID already exists!");
    return;
  }

  const editIndex = form.dataset.editIndex;

  if (editIndex !== undefined) {
    patients[editIndex] = patient;
    delete form.dataset.editIndex;
    document.getElementById("addPatientBtn").textContent = "Add Patient";
  } else {
    patients.push(patient);
  }

  localStorage.setItem("patients", JSON.stringify(patients));
  form.reset();
  renderPatients(filterStatus.value);
});

/* -----------------------------------------------------
   🔵 Edit or Delete patient
------------------------------------------------------ */
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

    if (confirm("Are you sure you want to delete this patient?")) {
      patients.splice(index, 1);
      localStorage.setItem("patients", JSON.stringify(patients));
      renderPatients(filterStatus.value);
    }
  }
});

/* -----------------------------------------------------
   🔵 Correct Schedule button → redirect with patient ID
------------------------------------------------------ */
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("schedule-btn")) {
      const id = e.target.getAttribute("data-id");
      window.location.href = `operation.html?patientId=${id}`;
  }
});

/* -----------------------------------------------------
   🔵 Filters
------------------------------------------------------ */
searchBtn.addEventListener("click", () => renderPatients(filterStatus.value));
filterStatus.addEventListener("change", () => renderPatients(filterStatus.value));
searchInput.addEventListener("input", () => renderPatients(filterStatus.value));

/* Initial render */
renderPatients();
