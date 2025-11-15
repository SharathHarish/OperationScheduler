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