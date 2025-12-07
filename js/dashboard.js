// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, getDocs, query, where, increment, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
                    updateUIWithUserData(userData);
                    
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
    
    console.log('✅ UI initialized with session data');
}

// Update UI with Firebase user data
function updateUIWithUserData(userData) {
    console.log('🔄 Updating UI with user data:', userData);
    
    // Update username
    document.querySelectorAll('.username').forEach(el => {
        el.textContent = userData.name || userData.email?.split('@')[0] || 'User';
    });
    
    // Update email
    document.querySelectorAll('.user-email').forEach(el => {
        el.textContent = userData.email || 'Unknown';
    });
    
    // Update stats if available
    if (userData.emotesSentToday !== undefined) {
        const emotesTodayElement = document.getElementById('emotesToday');
        if (emotesTodayElement) emotesTodayElement.textContent = userData.emotesSentToday;
    }
    
    if (userData.totalEmotes !== undefined) {
        const totalEmotesElement = document.getElementById('totalEmotes');
        if (totalEmotesElement) totalEmotesElement.textContent = userData.totalEmotes;
    }
    
    if (userData.daysActive !== undefined) {
        const daysActiveElement = document.getElementById('daysActive');
        if (daysActiveElement) daysActiveElement.textContent = userData.daysActive;
    }
    
    console.log('✅ UI updated with user data');
}

// Setup real-time updates for user profile
function setupRealTimeUserProfile() {
    console.log('🔄 Setting up real-time user profile updates');
    
    if (!db || !currentUserUid) {
        console.log('❌ Cannot setup real-time updates: db or currentUserUid missing');
        return;
    }
    
    try {
        // Unsubscribe from any existing listener
        if (unsubscribeUserListener) {
            unsubscribeUserListener();
        }
        
        // Listen for real-time updates to user profile
        unsubscribeUserListener = onSnapshot(doc(db, 'users', currentUserUid), (doc) => {
            if (doc.exists()) {
                const userData = doc.data();
                console.log('🔄 Real-time user profile update received:', userData);
                
                // Update global currentUser variable
                currentUser = userData;
                
                // Update UI with new data (without reinitializing everything)
                updateUIWithUserData(userData);
                
                console.log('✅ User profile updated in real-time');
            } else {
                console.error('❌ User document not found during real-time update');
            }
        }, (error) => {
            console.error('❌ Real-time user profile update error:', error);
        });
        
        console.log('✅ Real-time user profile updates setup completed');
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
const modernSidebar = document.getElementById('modernSidebar');
const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
const topNavbar = document.querySelector('.top-navbar');
const mainWrapper = document.querySelector('.main-wrapper');

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
            document.querySelector('.page-title').textContent = 'Dashboard';
            break;
        case 'leaderboard':
            document.getElementById('leaderboard-content')?.classList.remove('hidden');
            document.querySelector('[data-page="leaderboard"]')?.parentElement.classList.add('active');
            document.querySelector('.page-title').textContent = 'Leaderboard';
            // Load leaderboard data when opening leaderboard page
            loadLeaderboard();
            break;
        case 'profile':
            document.getElementById('profile-content')?.classList.remove('hidden');
            document.querySelector('[data-page="profile"]')?.parentElement.classList.add('active');
            document.querySelector('.page-title').textContent = 'User Profile';
            break;
        default:
            document.getElementById('dashboard-content')?.classList.remove('hidden');
            document.querySelector('[data-page="dashboard"]')?.parentElement.classList.add('active');
            document.querySelector('.page-title').textContent = 'Dashboard';
    }
}

// Add event listeners to navigation links
document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        switchPage(page);
        
        // Hide sidebar on mobile after clicking a link
        if (window.innerWidth <= 768) {
            modernSidebar.classList.remove('visible');
        }
    });
});

// Modern Sidebar Toggle Functionality
function toggleSidebar() {
    if (window.innerWidth > 768) {
        // Desktop: Collapse/expand sidebar
        modernSidebar.classList.toggle('collapsed');
        topNavbar.classList.toggle('collapsed');
        mainWrapper.classList.toggle('collapsed');
    } else {
        // Mobile: Show/hide sidebar
        modernSidebar.classList.toggle('visible');
    }
}

// Close sidebar on mobile
function closeSidebar() {
    if (window.innerWidth <= 768) {
        modernSidebar.classList.remove('visible');
    } else {
        // On desktop, collapse if not already collapsed
        if (!modernSidebar.classList.contains('collapsed')) {
            modernSidebar.classList.add('collapsed');
            topNavbar.classList.add('collapsed');
            mainWrapper.classList.add('collapsed');
        }
    }
}

// Event listeners for sidebar toggle
if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener('click', toggleSidebar);
}

if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener('click', closeSidebar);
}

// Auto-hide sidebar on mobile by default
function checkMobileAndHideSidebar() {
    if (window.innerWidth <= 768) {
        modernSidebar.classList.remove('collapsed');
        topNavbar.classList.remove('collapsed');
        mainWrapper.classList.remove('collapsed');
    } else {
        // On larger screens, keep the default state
    }
}

// Check on initial load
checkMobileAndHideSidebar();

// Check on window resize
window.addEventListener('resize', checkMobileAndHideSidebar);

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

// Implement the actual Firebase functions instead of placeholders
async function initializeServerSelection() {
    console.log('🔄 Initializing server selection');
    
    if (!db) {
        console.log('❌ Firebase not available for server selection');
        return;
    }
    
    try {
        const serversCol = collection(db, 'servers');
        const snapshot = await getDocs(serversCol);
        
        const serverSelect = document.getElementById('serverSelect');
        if (!serverSelect) {
            console.log('❌ Server select element not found');
            return;
        }
        
        // Clear existing options
        serverSelect.innerHTML = '<option value="">Select a Server...</option>';
        
        if (snapshot.empty) {
            console.log('❌ No servers found in database');
            return;
        }
        
        const servers = [];
        snapshot.forEach(doc => {
            servers.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by order field
        servers.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // Add servers to dropdown
        servers.forEach(server => {
            const option = document.createElement('option');
            option.value = server.baseUrl;
            option.textContent = server.name; // Show only server name
            serverSelect.appendChild(option);
        });
        
        // Add event listener for server selection
        serverSelect.addEventListener('change', function() {
            selectedServerUrl = this.value;
            
            // Update stats
            const statServer = document.getElementById('statServer');
            if (statServer) {
                const selectedOption = this.options[this.selectedIndex];
                statServer.textContent = selectedOption ? selectedOption.textContent : 'Not Selected';
            }
            
            console.log('✅ Selected server:', this.value);
        });
        
        console.log('✅ Server selection initialized with', servers.length, 'servers');
    } catch (error) {
        console.error('❌ Error initializing server selection:', error);
    }
}

function initializeUidInputs() {
    console.log('🔄 Initializing UID inputs');
    
    // Add event listener to add UID button
    const addUidBtn = document.getElementById('addUidBtn');
    if (addUidBtn) {
        addUidBtn.addEventListener('click', addUidInput);
    }
    
    // Add event listeners to existing UID inputs
    const uidInputs = document.querySelectorAll('.uid-input');
    uidInputs.forEach(input => {
        input.addEventListener('input', function() {
            // Update stats when UID is entered
            const statUids = document.getElementById('statUids');
            if (statUids) statUids.textContent = uidCount;
        });
    });
    
    console.log('✅ UID inputs initialized');
}

// Add UID input field
function addUidInput() {
    const uidContainer = document.getElementById('uidContainer');
    if (!uidContainer) return;
    
    // Check if we've reached the maximum number of UIDs
    if (uidCount >= maxUids) {
        showToast('Maximum of 5 UIDs allowed', 'error');
        return;
    }
    
    uidCount++;
    
    const uidDiv = document.createElement('div');
    uidDiv.className = 'input-group-box uid-group';
    uidDiv.innerHTML = `
        <label>TARGET UID ${uidCount} <span class="required">*</span></label>
        <input type="text" id="uid${uidCount}" placeholder="Enter UID (9-12 digits)" class="config-input uid-input" pattern="[0-9]{9,12}" required>
        <button class="remove-uid-btn" data-uid="${uidCount}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M18 6L6 18M6 6l12 12" stroke-width="2"/>
            </svg>
        </button>
    `;
    
    uidContainer.appendChild(uidDiv);
    
    // Add event listener to remove button
    const removeBtn = uidDiv.querySelector('.remove-uid-btn');
    removeBtn.addEventListener('click', function() {
        uidDiv.remove();
        uidCount--;
    });
    
    // Update stats
    const statUids = document.getElementById('statUids');
    if (statUids) statUids.textContent = uidCount;
}

async function loadEmoteCategories() {
    console.log('🔄 Loading emote categories');
    
    if (!db) {
        console.log('❌ Firebase not available for emote categories');
        return;
    }
    
    try {
        const categoriesCol = collection(db, 'categories');
        const snapshot = await getDocs(categoriesCol);
        
        const categoryTabs = document.getElementById('categoryTabs');
        if (!categoryTabs) {
            console.log('❌ Category tabs element not found');
            return;
        }
        
        // Clear existing categories
        categoryTabs.innerHTML = '';
        
        if (snapshot.empty) {
            console.log('❌ No categories found in database');
            categoryTabs.innerHTML = '<p class="no-categories">No categories available</p>';
            return;
        }
        
        const categories = [];
        snapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by order field
        categories.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // Add categories to tabs
        categories.forEach((category, index) => {
            const tab = document.createElement('button');
            tab.className = `category-tab ${index === 0 ? 'active' : ''}`;
            tab.setAttribute('data-category', category.id);
            tab.innerHTML = `
                <span class="category-icon">${category.icon || '🎨'}</span>
                <span class="category-name">${category.name}</span>
            `;
            
            categoryTabs.appendChild(tab);
            
            // Load emotes for the first category immediately
            if (index === 0) {
                currentCategory = category.id;
                loadEmotesForCategory(category.id);
            }
        });
        
        // Add event listeners to category tabs
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                // Remove active class from all tabs
                document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
                
                // Add active class to clicked tab
                this.classList.add('active');
                
                // Load emotes for selected category
                const categoryId = this.getAttribute('data-category');
                currentCategory = categoryId;
                loadEmotesForCategory(categoryId);
            });
        });
        
        console.log('✅ Loaded', categories.length, 'emote categories');
    } catch (error) {
        console.error('❌ Error loading emote categories:', error);
    }
}

async function loadEmotesForCategory(categoryId) {
    console.log('🔄 Loading emotes for category:', categoryId);
    
    if (!db) {
        console.log('❌ Firebase not available for emotes');
        return;
    }
    
    try {
        // Show loading state
        const emoteGrid = document.getElementById('emoteGrid');
        if (emoteGrid) {
            emoteGrid.innerHTML = '<div class="loading-emotes">Loading emotes...</div>';
        }
        
        // Query emotes for the selected category
        const emotesQuery = query(
            collection(db, 'emotes'),
            where('category', '==', categoryId)
        );
        
        const snapshot = await getDocs(emotesQuery);
        
        if (!emoteGrid) {
            console.log('❌ Emote grid element not found');
            return;
        }
        
        // Clear existing emotes
        emoteGrid.innerHTML = '';
        
        if (snapshot.empty) {
            emoteGrid.innerHTML = '<p class="no-emotes">No emotes available in this category</p>';
            console.log('❌ No emotes found for category:', categoryId);
            return;
        }
        
        // Add emotes to grid
        snapshot.forEach(doc => {
            const emote = doc.data();
            const emoteElement = document.createElement('div');
            emoteElement.className = 'emote-card'; // Use emote-card class for consistent styling
            emoteElement.setAttribute('data-emote-id', emote.emoteId);
            emoteElement.innerHTML = `
                <div class="emote-image-wrapper">
                    <img src="${emote.imageUrl}" alt="${emote.emoteId}" class="emote-image">
                </div>
                <div class="emote-name">${emote.emoteId}</div>
            `;
            
            // Add click event to select emote and automatically send it
            emoteElement.addEventListener('click', function() {
                // Remove selected class from all emotes
                document.querySelectorAll('.emote-card').forEach(e => e.classList.remove('selected'));
                
                // Add selected class to clicked emote
                this.classList.add('selected');
                
                // Store selected emote ID
                selectedEmoteId = emote.emoteId;
                
                // Update stats
                const statEmote = document.getElementById('statEmote');
                if (statEmote) statEmote.textContent = emote.emoteId;
                
                console.log('✅ Selected emote:', emote.emoteId);
                
                // Automatically send the emote
                sendEmote();
            });
            
            emoteGrid.appendChild(emoteElement);
        });
        
        console.log('✅ Loaded', snapshot.size, 'emotes for category:', categoryId);
    } catch (error) {
        console.error('❌ Error loading emotes for category:', categoryId, error);
        
        const emoteGrid = document.getElementById('emoteGrid');
        if (emoteGrid) {
            emoteGrid.innerHTML = '<p class="error-emotes">Error loading emotes. Please try again.</p>';
        }
    }
}

function initializeStats() {
    // Stats are already initialized in initializeUserProfile
    console.log('🔄 Stats initialized');
}

async function sendEmote() {
    console.log('🔄 Sending emote');
    
    // Get form values
    const serverSelect = document.getElementById('serverSelect');
    const teamCodeInput = document.getElementById('teamCode');
    const uidInputs = document.querySelectorAll('.uid-input');
    
    if (!serverSelect || !teamCodeInput) {
        showToast('❌ Form elements not found', 'error');
        return;
    }
    
    const serverUrl = serverSelect.value;
    const teamCode = teamCodeInput.value;
    
    // Validate inputs
    if (!serverUrl) {
        showToast('❌ Please select a server', 'error');
        return;
    }
    
    if (!teamCode) {
        showToast('❌ Please enter a team code', 'error');
        return;
    }
    
    // Collect UIDs
    const uids = [];
    uidInputs.forEach(input => {
        if (input.value.trim()) {
            // Validate UID format (9-12 digits)
            if (!/^\d{9,12}$/.test(input.value.trim())) {
                showToast('❌ Invalid UID format. Must be 9-12 digits.', 'error');
                return;
            }
            uids.push(input.value.trim());
        }
    });
    
    if (uids.length === 0) {
        showToast('❌ Please enter at least one UID', 'error');
        return;
    }
    
    if (!currentCategory) {
        showToast('❌ Please select a category', 'error');
        return;
    }
    
    if (!selectedEmoteId) {
        showToast('❌ Please select an emote', 'error');
        return;
    }
    
    // Show loading spinner
    showLoader();
    
    try {
        // Build query parameters
        const params = new URLSearchParams({
            server: serverUrl,
            tc: teamCode,
            emote_id: selectedEmoteId
        });
        
        // Add UIDs
        uids.forEach((uid, index) => {
            params.append(`uid${index + 1}`, uid);
        });
        
        // Make API call to Netlify function
        const apiUrl = `/api/send-emote?${params.toString()}`;
        console.log('⚡ Sending emote with URL:', apiUrl);
        
        const response = await fetch(apiUrl);
        
        // Check if response is OK and is JSON
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response received:', text);
            throw new Error('Received non-JSON response from server');
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Emote sent successfully!', 'success');
            
            // Update user stats in Firebase
            if (db && currentUserUid) {
                try {
                    const userDocRef = doc(db, 'users', currentUserUid);
                    
                    // Increment emote counts
                    await setDoc(userDocRef, {
                        emotesSentToday: increment(1),
                        totalEmotes: increment(1),
                        lastEmoteSent: new Date().toISOString()
                    }, { merge: true });
                    
                    // Update UI stats
                    const emotesTodayElement = document.getElementById('emotesToday');
                    const totalEmotesElement = document.getElementById('totalEmotes');
                    
                    if (emotesTodayElement) {
                        const current = parseInt(emotesTodayElement.textContent) || 0;
                        emotesTodayElement.textContent = current + 1;
                    }
                    
                    if (totalEmotesElement) {
                        const current = parseInt(totalEmotesElement.textContent) || 0;
                        totalEmotesElement.textContent = current + 1;
                    }
                } catch (error) {
                    console.error('❌ Error updating user stats:', error);
                }
            }
            
            // Hide sidebar on mobile after sending emote
            if (window.innerWidth <= 768 && modernSidebar) {
                modernSidebar.classList.remove('visible');
            }
        } else {
            showToast(`❌ Failed to send emote: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error sending emote:', error);
        showToast('❌ Network error. Please try again.', 'error');
    } finally {
        hideLoader();
    }
}

// Implement the leaderboard loading function
async function loadLeaderboard() {
    console.log('🔄 Loading leaderboard...');
    
    if (!db) {
        console.log('❌ Firebase not available for leaderboard');
        return;
    }
    
    try {
        // Show loading state
        const leaderboardList = document.getElementById('leaderboardList');
        if (leaderboardList) {
            leaderboardList.innerHTML = '<div class="loading-leaderboard">Loading leaderboard...</div>';
        }
        
        // Get users ordered by totalEmotes (descending)
        const usersQuery = query(
            collection(db, 'users'),
            orderBy('totalEmotes', 'desc'),
            limit(50) // Limit to top 50 users
        );
        
        const snapshot = await getDocs(usersQuery);
        
        if (!leaderboardList) {
            console.log('❌ Leaderboard list element not found');
            return;
        }
        
        // Clear existing leaderboard
        leaderboardList.innerHTML = '';
        
        if (snapshot.empty) {
            leaderboardList.innerHTML = '<p class="no-leaderboard">No users found</p>';
            console.log('❌ No users found for leaderboard');
            return;
        }
        
        // Add users to leaderboard
        let rank = 1;
        snapshot.forEach(doc => {
            const user = doc.data();
            
            // Skip users with 0 emotes
            if (user.totalEmotes <= 0) return;
            
            const leaderboardItem = document.createElement('div');
            leaderboardItem.className = 'leaderboard-item';
            leaderboardItem.innerHTML = `
                <div class="leaderboard-col">
                    <span class="rank-number">${rank}</span>
                </div>
                <div class="leaderboard-col">
                    <div class="user-avatar-small">${user.name?.charAt(0) || user.email?.charAt(0) || 'U'}</div>
                    <span class="user-name">${user.name || user.email?.split('@')[0] || 'Anonymous'}</span>
                </div>
                <div class="leaderboard-col">
                    <span class="emote-count">${user.totalEmotes}</span>
                </div>
            `;
            
            leaderboardList.appendChild(leaderboardItem);
            rank++;
        });
        
        // If no users with emotes were found
        if (rank === 1) {
            leaderboardList.innerHTML = '<p class="no-leaderboard">No users with emotes found</p>';
        }
        
        console.log('✅ Loaded leaderboard with', rank - 1, 'users');
    } catch (error) {
        console.error('❌ Error loading leaderboard:', error);
        
        const leaderboardList = document.getElementById('leaderboardList');
        if (leaderboardList) {
            leaderboardList.innerHTML = '<p class="error-leaderboard">Error loading leaderboard. Please try again.</p>';
        }
    }
}
