import { auth, db } from './firebase-init.js';
import { 
    signInWithEmailAndPassword 
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { doc, getDoc, collection, query, where, getDocs } 
    from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// --------------------------
// 🔹 Dialog Box
// --------------------------
function showDialog(type = "success", title = "Success", message = "") {
    const overlay = document.createElement("div");
    overlay.className = "popup-overlay";

    const box = document.createElement("div");
    box.className = `popup-box ${type}`;
    box.innerHTML = `
        <div class="popup-title">${title}</div>
        <div class="popup-message">${message}</div>
        <button class="popup-btn">OK</button>
    `;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add("show"), 20);

    box.querySelector(".popup-btn").onclick = () => {
        overlay.classList.remove("show");
        setTimeout(() => overlay.remove(), 200);
    };

    setTimeout(() => {
        if (document.body.contains(overlay)) {
            overlay.classList.remove("show");
            setTimeout(() => overlay.remove(), 200);
        }
    }, 3000);
}

// --------------------------
// 🔹 LOGIN
// --------------------------
document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) {
        showDialog("error", "Missing Fields", "Email and Password are required.");
        return;
    }

    try {
        // 🔹 Firebase Auth sign-in
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 🔹 Get role from users collection
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            showDialog("error", "Role Missing", "No role assigned. Contact admin.");
            return;
        }

        const role = userDocSnap.data().role;

        // 🔹 If patient, get patientId from patients collection
        let patientId = null;
        if (role === "patient") {
            const patientsQuery = query(collection(db, "patients"), where("email", "==", email));
            const querySnapshot = await getDocs(patientsQuery);

            if (!querySnapshot.empty) {
                patientId = querySnapshot.docs[0].data().patientId;
                sessionStorage.setItem("patientId", patientId);
            } else {
                showDialog("error", "Patient Not Found", "No patient record found for this email.");
                return;
            }
        }

        // 🔹 Store session info
        sessionStorage.setItem("userRole", role);
        sessionStorage.setItem("userEmail", email);
        sessionStorage.setItem("userId", user.uid);

        // 🔹 Redirect based on role
        showDialog("success", "Login Successful", "Redirecting…");
        setTimeout(() => {
            if (role === 'admin') 
                window.location.href = 'admin/admin.html';
            else if (role === 'patient') 
                window.location.href = 'poperation.html';
            else 
                window.location.href = 'user.html';
        }, 800);

    } catch (err) {
        showDialog("error", "Login Failed", err.message.replace("Firebase:", ""));
    }
});
