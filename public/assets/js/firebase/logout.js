import { auth } from "./firebase-init.js";
import { signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

async function performLogout() {
  try {
    await signOut(auth);

    sessionStorage.clear();
    localStorage.clear();
    window.location.replace("login.html");
  } catch (error) {
    console.error("Logout failed:", error);
  }
}

function attachLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    performLogout();
  });
}

// Run after header is loaded
attachLogout();
