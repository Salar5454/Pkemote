// Simple version that relies primarily on session storage data
// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

console.log('Firebase modules imported');
console.log('initializeApp function:', typeof initializeApp);
console.log('getFirestore function:', typeof getFirestore);

// Add a timeout to detect if Firebase modules are taking too long to load
setTimeout(() => {
    if (typeof initializeApp !== 'function' || typeof getFirestore !== 'function') {
        console.error('❌ Firebase modules not loaded properly after timeout');
        console.log('initializeApp type:', typeof initializeApp);
        console.log('getFirestore type:', typeof getFirestore);
    }
}, 5000);

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyC9unPaElUZd6OcuHwtgqB7H6FoKYN0iGc",
    authDomain: "pk-emote.firebaseapp.com",
    databaseURL: "https://pk-emote-default-rtdb.firebaseio.com",
    projectId: "pk-emote",
    storageBucket: "pk-emote.firebasestorage.app",
    messagingSenderId: "268120663788",
    appId: "1:268120663788:web:d27ba2e1428c1688bce7c9"
  };

console.log('Firebase config loaded:', firebaseConfig);

// Initialize Firebase with better error handling
let app, db;
try {
    console.log('Initializing Firebase with config:', firebaseConfig);
    if (typeof initializeApp !== 'function') {
        throw new Error('initializeApp is not a function');
    }
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized successfully');
    if (typeof getFirestore !== 'function') {
        throw new Error('getFirestore is not a function');
    }
    db = getFirestore(app);
    console.log('✅ Firestore initialized successfully');
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
    console.log('Firebase config:', firebaseConfig);
    // Set db to null so we can handle the error gracefully
    db = null;
}

// State Variables
let currentCategory = null;
let selectedEmoteId = null;
let selectedServerUrl = null;
let uidCount = 1;
const maxUids = 5;
let toastQueue = [];
let isProcessingToast = false;
let currentUser = null;
let unsubscribeUserListener = null;

// Check Authentication
console.log('Auth check - Session storage auth:', sessionStorage.getItem('auth'));
const rawAuthData = sessionStorage.getItem('auth');
if (!rawAuthData) {
    console.log('No auth found, redirecting to index.html');
    window.location.href = 'index.html';
}

// Subscription system removed - all users have access

// Get current user data from sessionStorage
let authData, currentUserEmail, currentUserUid;
try {
    console.log('Raw auth item:', rawAuthData);
    authData = JSON.parse(rawAuthData);
    currentUserEmail = authData?.email;
    currentUserUid = authData?.uid;
    console.log('Auth data parsed:', authData);
    console.log('Current user UID:', currentUserUid);
} catch (error) {
    console.error('Error parsing auth data:', error);
    console.log('Raw auth item that failed to parse:', rawAuthData);
}

// ===== INITIALIZE USER PROFILE =====
async function initializeUserProfile() {
    try {
        console.log('🔄 Initializing user profile');
        console.log('Database initialized:', !!db);
        console.log('Current user UID:', currentUserUid);
        
        // Check if we have auth data
        if (!authData) {
            console.error('❌ No auth data found');
            showToast('Authentication error. Please log in again.', 'error');
            sessionStorage.removeItem('auth');
            window.location.href = 'index.html';
            return;
        }
        
        // Always initialize UI with session data first (this is the primary method now)
        initializeUIWithSessionData();
        
        // Try to enhance with Firebase data if available
        if (db && currentUserUid) {
            try {
                // Get user data from sessionStorage
                const userUid = authData?.uid;
                const userEmail = authData?.email;
                const userName = authData?.name;
                
                console.log('User data from session:', { userUid, userEmail, userName });
                
                if (userUid) {
                    // Reference to user document in Firestore
                    const userDocRef = doc(db, 'users', userUid);
                    
                    // Check if user document exists
                    const userDoc = await getDoc(userDocRef);
                    
                    let userData;
                    if (userDoc.exists()) {
                        // User exists, get their data
                        userData = userDoc.data();
                        console.log('✅ Existing user profile loaded:', userData);
                    } else {
                        // New user, create their profile with default values
                        userData = {
                            uid: userUid,
                            email: userEmail,
                            name: userName || userEmail?.split('@')[0] || 'User',
                            plan: 'pro', // All users are pro now
                            emotesSentToday: 0,
                            totalEmotes: 0,
                            daysActive: 1,
                            createdAt: new Date().toISOString(),
                            lastLogin: new Date().toISOString()
                        };
                        
                        // Save user data to Firestore
                        try {
                            await setDoc(userDocRef, userData);
                            console.log('✅ New user profile created:', userData);
                        } catch (error) {
                            console.error('❌ Error creating user profile:', error);
                            // Continue with local data if Firestore fails
                        }
                    }
                    
                    // Update last login time
                    try {
                        await setDoc(userDocRef, { lastLogin: new Date().toISOString() }, { merge: true });
                    } catch (error) {
                        console.error('❌ Error updating last login time:', error);
                    }
                    
                    // Update global currentUser variable
                    currentUser = userData;
                    
                    // Update UI elements with Firebase data (enhancement)
                    document.querySelectorAll('.username').forEach(el => {
                        el.textContent = userData.name;
                    });
                    
                    document.querySelectorAll('.user-email').forEach(el => {
                        el.textContent = userData.email;
                    });
                    
                    // Update emote stats with Firebase data
                    const emotesTodayElement = document.getElementById('emotesToday');
                    const totalEmotesElement = document.getElementById('totalEmotes');
                    const daysActiveElement = document.getElementById('daysActive');
                    
                    if (emotesTodayElement) emotesTodayElement.textContent = userData.emotesSentToday || 0;
                    if (totalEmotesElement) totalEmotesElement.textContent = userData.totalEmotes || 0;
                    if (daysActiveElement) daysActiveElement.textContent = userData.daysActive || 1;
                    
                    console.log('✅ User profile enhanced with Firebase data');
                }
            } catch (firebaseError) {
                console.error('❌ Firebase enhancement error:', firebaseError);
                // Continue with session data only
            }
        }
        
        console.log('✅ User profile initialization completed');
        
    } catch (error) {
        console.error('❌ User profile initialization error:', error);
        // Fallback to session data
        initializeUIWithSessionData();
    }
}

// Fallback function to initialize UI with session data when Firebase fails
function initializeUIWithSessionData() {
    console.log('🔄 Initializing UI with session data (fallback)');
    
    if (!authData) {
        console.error('❌ No auth data for fallback');
        return;
    }
    
    // Update UI elements with session data
    document.querySelectorAll('.username').forEach(el => {
        el.textContent = authData.name || authData.email?.split('@')[0] || 'User';
    });
    
    document.querySelectorAll('.user-email').forEach(el => {
        el.textContent = authData.email || 'Unknown';
    });
    
    // Update emote stats with default values
    const emotesTodayElement = document.getElementById('emotesToday');
    const totalEmotesElement = document.getElementById('totalEmotes');
    const daysActiveElement = document.getElementById('daysActive');
    
    if (emotesTodayElement) emotesTodayElement.textContent = '0';
    if (totalEmotesElement) totalEmotesElement.textContent = '0';
    if (daysActiveElement) daysActiveElement.textContent = '1';
    
    // Update usage bar (always show full for pro users)
    const usageProgress = document.querySelector('.usage-progress');
    const usageText = document.querySelector('.usage-text');
    if (usageProgress) usageProgress.style.width = '100%';
    if (usageText) usageText.textContent = 'Unlimited Access';
    
    console.log('✅ UI initialized with session data');
    showToast('Welcome! Using offline mode.', 'info');
}

// ===== SETUP REAL-TIME USER PROFILE UPDATES =====
function setupRealTimeUserProfile() {
    try {
        console.log('Setting up real-time user profile updates');
        console.log('Database initialized:', !!db);
        console.log('Current user UID:', currentUserUid);
        
        // Check if Firebase is available
        if (!db) {
            console.log('❌ Firebase not available, skipping real-time updates');
            return;
        }
        
        // Get the user UID from sessionStorage
        const authData = JSON.parse(sessionStorage.getItem('auth'));
        const userUid = authData?.uid;
        
        console.log('Setting up real-time updates for user:', userUid);
        
        if (!userUid) {
            console.error('❌ User UID not found for real-time updates');
            return;
        }
        
        // Unsubscribe from any existing listener
        if (unsubscribeUserListener) {
            unsubscribeUserListener();
        }
        
        // Listen for real-time updates to user profile
        unsubscribeUserListener = onSnapshot(doc(db, 'users', userUid), (doc) => {
            if (doc.exists()) {
                const userData = doc.data();
                console.log('🔄 Real-time user profile update received:', userData);
                
                // Update global currentUser variable
                currentUser = userData;
                
                // Update UI with new data
                initializeUserProfile();
                
                console.log('✅ User profile updated in real-time');
            } else {
                console.error('❌ User document not found during real-time update');
            }
        }, (error) => {
            console.error('❌ Real-time user profile update error:', error);
        });
        
        console.log('✅ Real-time user profile updates enabled');
        
    } catch (error) {
        console.error('❌ Error setting up real-time user profile updates:', error);
    }
}

// DOM Elements
const dashboardContent = document.getElementById('dashboard-content');
const leaderboardContent = document.getElementById('leaderboard-content');
const profileContent = document.getElementById('profile-content');
const navLinks = document.querySelectorAll('.nav-link');
const logoutBtnSidebar = document.getElementById('logoutBtnSidebar');

// Logout Handler
function handleLogout() {
    console.log('Logging out user');
    // Unsubscribe from real-time listener
    if (unsubscribeUserListener) {
        unsubscribeUserListener();
    }
    
    sessionStorage.removeItem('auth');
    window.location.href = 'index.html';
}

document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
document.getElementById('logoutBtnSidebar')?.addEventListener('click', handleLogout);

// Navigation Handler
function switchPage(page) {
    // Hide all content sections
    document.getElementById('dashboard-content')?.classList.add('hidden');
    document.getElementById('leaderboard-content')?.classList.add('hidden');
    document.getElementById('profile-content')?.classList.add('hidden');
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-link').forEach(link => link.parentElement.classList.remove('active'));
    
    // Show selected content and set active nav item
    switch(page) {
        case 'dashboard':
            document.getElementById('dashboard-content')?.classList.remove('hidden');
            document.querySelector('[data-page="dashboard"]')?.parentElement.classList.add('active');
            document.querySelector('.content-header h1').textContent = 'Dashboard';
            break;
        case 'leaderboard':
            document.getElementById('leaderboard-content')?.classList.remove('hidden');
            document.querySelector('[data-page="leaderboard"]')?.parentElement.classList.add('active');
            document.querySelector('.content-header h1').textContent = 'Leaderboard';
            // Load leaderboard data when opening leaderboard page
            loadLeaderboard();
            break;
        case 'profile':
            document.getElementById('profile-content')?.classList.remove('hidden');
            document.querySelector('[data-page="profile"]')?.parentElement.classList.add('active');
            document.querySelector('.content-header h1').textContent = 'User Profile';
            break;
        default:
            document.getElementById('dashboard-content')?.classList.remove('hidden');
            document.querySelector('[data-page="dashboard"]')?.parentElement.classList.add('active');
            document.querySelector('.content-header h1').textContent = 'Dashboard';
    }
}

// Add event listeners to navigation links
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        switchPage(page);
    });
});


// Loader Functions
function showLoader() {
    const loader = document.getElementById('loadingSpinner');
    if (loader) loader.classList.remove('hidden');
}

function hideLoader() {
    const loader = document.getElementById('loadingSpinner');
    if (loader) loader.classList.add('hidden');
}

// ===== TOAST NOTIFICATION SYSTEM - Optimized Version =====
function showToast(message, type = 'success') {
    console.log(`📢 Toast: ${message} (${type})`);
    
    // For better performance, only show the latest toast and discard the queue
    toastQueue = [{ message, type }]; // Reset queue with only the latest message
    
    if (!isProcessingToast) {
        processToastQueue();
    } else {
        // If already processing, restart with the new message
        isProcessingToast = false;
        processToastQueue();
    }
}

function processToastQueue() {
    if (toastQueue.length === 0) {
        isProcessingToast = false;
        return;
    }
    
    isProcessingToast = true;
    
    // Remove existing toasts immediately for better performance
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    const { message, type } = toastQueue.pop(); // Get the latest message
    toastQueue = []; // Clear queue
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${message}</div>
    `;
    
    const container = document.getElementById('toastContainer');
    if (container) {
        container.appendChild(toast);
        
        // Use requestAnimationFrame for better performance
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
                isProcessingToast = false;
            }, 300);
        }, 3000);
    } else {
        isProcessingToast = false;
    }
}

// ===== INITIALIZE DASHBOARD =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Dashboard initializing...');
    console.log('Session storage auth:', sessionStorage.getItem('auth'));
    
    try {
        // Initialize user profile (now prioritizes session data)
        await initializeUserProfile();
        
        // Setup real-time updates (if Firebase is available)
        setupRealTimeUserProfile();
        
        // Initialize other dashboard components
        initializeDashboardComponents();
        
        console.log('✅ Dashboard ready!');
    } catch (error) {
        console.error('❌ Dashboard initialization error:', error);
        showToast('Failed to initialize dashboard. Please refresh the page.', 'error');
    }
});

// ===== INITIALIZE DASHBOARD COMPONENTS =====
function initializeDashboardComponents() {
    // Initialize server selection
    initializeServerSelection();
    
    // Initialize UID inputs
    initializeUidInputs();
    
    // Initialize emote categories
    loadEmoteCategories();
    
    // Initialize stats
    initializeStats();
}

// Placeholder functions for other dashboard components
function initializeServerSelection() {
    // This would be implemented with your server data
    console.log('🔄 Server selection initialized');
}

function initializeUidInputs() {
    // This would be implemented with your UID input logic
    console.log('🔄 UID inputs initialized');
}

function loadEmoteCategories() {
    // This would be implemented with your emote category loading logic
    console.log('🔄 Emote categories loaded');
}

function initializeStats() {
    // Stats are already initialized in initializeUserProfile
    console.log('🔄 Stats initialized');
}

// Placeholder functions that need to be implemented
function loadLeaderboard() {
    console.log('🔄 Loading leaderboard...');
    // Implementation would go here
}
