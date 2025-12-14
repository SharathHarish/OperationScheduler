// Import Firebase modules
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { doc, setDoc, getDocs, collection, query, where } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { auth, db } from '../firebase/firebase-init.js';

document.addEventListener('DOMContentLoaded', () => {

    const registerBtn = document.getElementById('registerBtn');
    if (!registerBtn) {
        console.error("Register button with ID 'registerBtn' not found!");
        return;
    }

    registerBtn.addEventListener('click', async () => {

        const email = document.getElementById('registerEmail').value.trim(); // readonly
        const password = document.getElementById('registerPassword').value;
        const cpassword = document.getElementById('cregisterPassword').value; // corrected ID

        // 1️⃣ Check password match
        if (!password || !cpassword) {
            alert("Please enter both password fields.");
            return;
        }

        if (password !== cpassword) {
            alert("Passwords do not match!");
            return;
        }

        try {
            // 2️⃣ Check if email exists in patients collection
            const patientsRef = collection(db, "patients");
            const q = query(patientsRef, where("email", "==", email));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert("Registration failed: Email not found in patients records. Only registered surgery patients can create an account.");
                return;
            }

            // Extract patientId from the matched patient document
            const patientDoc = querySnapshot.docs[0];
            const patientData = patientDoc.data();
            const patientId = patientData.patientId || patientDoc.id;

            // 3️⃣ Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 4️⃣ Add to users collection (email + role + userId)
            await setDoc(doc(db, "users", user.uid), {
                email: email,
                role: "patient",
                userId: patientId
            });

            alert("Registration successful!");
            window.location.href = "login.html";

        } catch (err) {

            // Existing email in Firebase Auth
            if (err.code === "auth/email-already-in-use") {
                alert("Patient already has an account with this email.");
                return;
            }

            console.error(err);
            alert("Registration Error: " + err.message);
        }
    });
});
