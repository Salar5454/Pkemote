// NOVRA X - Login System
// Firebase Configuration & Authentication

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyC9unPaElUZd6OcuHwtgqB7H6FoKYN0iGc",
    authDomain: "pk-emote.firebaseapp.com",
    databaseURL: "https://pk-emote-default-rtdb.firebaseio.com",
    projectId: "pk-emote",
    storageBucket: "pk-emote.firebasestorage.app",
    messagingSenderId: "268120663788",
    appId: "1:268120663788:web:d27ba2e1428c1688bce7c9"
  };


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Load Social Links from Firebase
async function loadSocialLinks() {
    try {
        const docRef = doc(db, 'settings', 'footerLinks');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const links = docSnap.data();
            document.getElementById('telegram').href = links.telegram || '#';
            document.getElementById('github').href = links.github || '#';
            document.getElementById('discord').href = links.discord || '#';
            document.getElementById('youtube').href = links.youtube || '#';
        }
    } catch (error) {
        console.log('Social links not configured yet');
    }
}

// Hash Password Function
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Login Form Handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const input = document.getElementById('loginPassword');
    const errorMsg = document.getElementById('loginError');
    const password = input.value;
    
    try {
        const docRef = doc(db, 'settings', 'loginPassword');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            // Password exists - verify it
            const storedHash = docSnap.data().hash;
            const inputHash = await hashPassword(password);
            
            if (inputHash === storedHash) {
                // Login successful
                sessionStorage.setItem('auth', 'true');
                window.location.href = 'dashboard.html';
            } else {
                // Wrong password
                input.classList.add('shake');
                errorMsg.textContent = '❌ Invalid Password';
                errorMsg.classList.remove('hidden');
                
                setTimeout(() => {
                    input.classList.remove('shake');
                    errorMsg.classList.add('hidden');
                }, 2000);
            }
        } else {
            // First time setup - create password
            const hash = await hashPassword(password);
            await setDoc(doc(db, 'settings', 'loginPassword'), { hash });
            sessionStorage.setItem('auth', 'true');
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorMsg.textContent = '❌ Connection Error - Check Firebase setup';
        errorMsg.classList.remove('hidden');
    }
});

// Google Sign-In Handler
window.handleGoogleSignIn = async function(response) {
    try {
        // For demo purposes, we'll just log the user in
        // In a real implementation, you would verify the Google ID token on your backend
        console.log("Google Sign-In Response:", response);
        
        // Set auth in sessionStorage
        sessionStorage.setItem('auth', 'true');
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Google Sign-In error:', error);
        const errorMsg = document.getElementById('loginError');
        if (errorMsg) {
            errorMsg.textContent = '❌ Google Sign-In Failed';
            errorMsg.classList.remove('hidden');
        }
    }
};

// Add modern interactions
function addInteractiveEffects() {
    // Add hover effects to social links
    const socialLinks = document.querySelectorAll('.social-link');
    socialLinks.forEach(link => {
        link.addEventListener('mouseenter', () => {
            link.style.transform = 'translateY(-5px)';
        });
        
        link.addEventListener('mouseleave', () => {
            link.style.transform = 'translateY(0)';
        });
    });
    
    // Add focus effects to input
    const loginInput = document.getElementById('loginPassword');
    if (loginInput) {
        loginInput.addEventListener('focus', () => {
            loginInput.style.boxShadow = '0 0 0 3px rgba(94, 114, 228, 0.3)';
        });
        
        loginInput.addEventListener('blur', () => {
            loginInput.style.boxShadow = 'none';
        });
    }
    
    // Add pulse animation to login button on hover
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('mouseenter', () => {
            loginBtn.style.animation = 'pulse 1s infinite';
        });
        
        loginBtn.addEventListener('mouseleave', () => {
            loginBtn.style.animation = 'none';
        });
    }
}

// Initialize
loadSocialLinks();
addInteractiveEffects();
console.log('✅ Login page ready');