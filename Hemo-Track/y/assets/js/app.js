// app.js
import { db } from './firebase-config.js'; // Adjust the path as necessary
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!email || !password) {
        alert("Please fill in all fields.");
        return;
    }

    const auth = getAuth();
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await redirectUser(user.uid);
    } catch (error) {
        alert(`Login failed: ${error.message}`);
    }
}

async function redirectUser(userId) {
    try {
        const userDoc = doc(db, 'users', userId);
        const docSnap = await getDoc(userDoc);

        if (docSnap.exists()) {
            const userData = docSnap.data();
            const redirectPage = userData.role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
            window.location.href = redirectPage;
        } else {
            alert("User data not found.");
        }
    } catch (error) {
        alert(`Error fetching user data: ${error.message}`);
    }
}
