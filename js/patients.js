const form = document.getElementById("patientForm");
const list = document.getElementById("patientsList");
const filterStatus = document.getElementById("filterStatus");
const searchBtn = document.getElementById("searchPatientBtn");
const searchInput = document.getElementById("searchPatientName");

let patients = JSON.parse(localStorage.getItem("patients")) || [];

// ✅ Render patients
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

  filtered.forEach((p, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <strong>${p.name}</strong> (${p.id})<br>
        Age: ${p.age}, Gender: ${p.gender}, Status: <b>${p.status}</b><br>
        Condition: ${p.condition}<br>
        Contact: ${p.phone}
      </div>
      <div>
        <button class="edit-btn" data-index="${i}">Edit</button>
        <button class="delete-btn" data-index="${i}">Delete</button>
      </div>
    `;
    list.appendChild(li);
  });
}

// ✅ Add / Update patient
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
  };

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
  renderPatients();
});

// ✅ Edit patient
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

    form.dataset.editIndex = index;
    document.getElementById("addPatientBtn").textContent = "Update Patient";
  }

  // ✅ Delete patient
  if (e.target.classList.contains("delete-btn")) {
    const index = e.target.dataset.index;
    if (confirm("Are you sure you want to delete this patient?")) {
      patients.splice(index, 1);
      localStorage.setItem("patients", JSON.stringify(patients));
      renderPatients();
    }
  }
});

// ✅ Filters
searchBtn.addEventListener("click", () => renderPatients(filterStatus.value));
filterStatus.addEventListener("change", () => renderPatients(filterStatus.value));

// Initial render
renderPatients();
