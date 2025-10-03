// Import Firebase modules
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { auth, db } from './firebase-init.js'; // Import auth and db from your firebase-init.js

// Ensure DOM is loaded before attaching event listener
document.addEventListener('DOMContentLoaded', () => {

    // Registration button click event
    const registerBtn = document.getElementById('registerBtn');
    if(!registerBtn) {
        console.error("Register button with ID 'registerBtn' not found!");
        return;
    }

    registerBtn.addEventListener('click', async () => {
          const patientId = document.getElementById('registerPID').value;
        const firstName = document.getElementById('registerFName').value;
        const lastName = document.getElementById('registerLName').value;
        const address = document.getElementById('registerAddress').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        // Default role
        const role = 'patient';

        if(!email || !password){
            alert("Please enter both email and password.");
            return;
        }

        try {
            // Create user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Save user info in Firestore with default role
            await setDoc(doc(db, "users", user.uid), {
                email: email,
                role: role
            });
             // Save in "patients" collection
             console.log("Saving to patients...");
        await setDoc(doc(db, "patients", user.uid), {
            patientid: patientId,
            fname: firstName,
            lname: lastName,
            address: address,
            email: email,
        });
            

            alert('Registration successful! Your role is patient.');

            // Optionally, clear input fields
            document.getElementById('registerEmail').value = '';
            document.getElementById('registerPassword').value = '';

        } catch(err) {
            console.error(err);
            alert('Registration Error: ' + err.message);
        }
    });

});