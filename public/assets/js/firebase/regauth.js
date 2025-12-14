// Import Firebase modules
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { auth, db } from '../firebase/firebase-init.js';

document.addEventListener('DOMContentLoaded', () => {

    const registerBtn = document.getElementById('registerBtn');
    if (!registerBtn) {
        console.error("Register button with ID 'registerBtn' not found!");
        return;
    }

    registerBtn.addEventListener('click', async () => {

        const email = document.getElementById('registerEmail').value;   // readonly
        const password = document.getElementById('registerPassword').value;
        const cpassword = document.getElementById('CregisterPassword').value;

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
            // 2️⃣ Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 3️⃣ Add to users collection (email + role)
            await setDoc(doc(db, "users", user.uid), {
                email: email,
                role: "patient"
            });

            alert("Registration successful!");

            // 4️⃣ Redirect to login page
            window.location.href = "login.html";

        } catch (err) {

            // Existing email
            if (err.code === "auth/email-already-in-use") {
                alert("Patient already has an account with this email.");
                return;
            }

            console.error(err);
            alert("Registration Error: " + err.message);
        }
    });
});
