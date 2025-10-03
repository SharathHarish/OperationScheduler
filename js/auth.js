import { auth, db } from './firebase-init.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// Login
document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Get user role from Firestore
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if(docSnap.exists()){
            const role = docSnap.data().role;
            if(role === 'admin'){
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'user.html';
            }
        } else {
            alert('No role assigned. Contact admin.');
        }
    } catch(err) {
        alert('Login Error: ' + err.message);
    }
});

// Register
document.getElementById('registerBtn').addEventListener('click', async () => {
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('role').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save role in Firestore
        await setDoc(doc(db, "users", user.uid), {
            email: email,
            role: role
        });

        alert('Registration successful!');
    } catch(err) {
        alert('Registration Error: ' + err.message);
    }
});