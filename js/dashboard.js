// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, getDoc, collection, getDocs, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

// Initialize Firebase
let app, db;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

// State Variables
let currentCategory = null;
let selectedEmoteId = null;
let selectedServerUrl = null;
let uidCount = 1;
const maxUids = 5;
let toastQueue = [];
let isProcessingToast = false;
let currentUser = null; // Will be populated with real data from Firebase

// Check Authentication
if (!sessionStorage.getItem('auth')) {
    window.location.href = 'index.html';
}

// Subscription system removed - all users have access

// Get current user data from sessionStorage
const authData = JSON.parse(sessionStorage.getItem('auth'));
const currentUserEmail = authData?.email;

// ===== LOAD USER PROFILE FROM FIREBASE =====
async function loadUserProfile() {
    try {
        console.log('🔄 Loading user profile from Firebase for:', currentUserEmail);
        
        if (!db || !currentUserEmail) {
            console.error('❌ Database not initialized or user not authenticated');
            return null;
        }
        
        // Get the user UID from sessionStorage
        const authData = JSON.parse(sessionStorage.getItem('auth'));
        const userUid = authData?.uid;
        
        if (!userUid) {
            console.error('❌ User UID not found in session storage');
            return null;
        }
        
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', userUid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('✅ User profile loaded from Firestore:', userData);
            return userData;
        } else {
            console.error('❌ User document not found in Firestore');
            return null;
        }
        
    } catch (error) {
        console.error('❌ User profile load error:', error);
        return null;
    }
}

// ===== SETUP REAL-TIME USER PROFILE UPDATES =====
function setupRealTimeUserProfile() {
    try {
        // Get the user UID from sessionStorage
        const authData = JSON.parse(sessionStorage.getItem('auth'));
        const userUid = authData?.uid;
        
        if (!db || !userUid) {
            console.error('❌ Database not initialized or user not authenticated');
            return;
        }
        
        // Listen for real-time updates to user profile
        const unsubscribe = onSnapshot(doc(db, 'users', userUid), (doc) => {
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
        return unsubscribe;
        
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
    }
}

// ===== LOAD SERVERS FROM FIREBASE - Optimized Version =====
async function loadServers() {
    try {
        console.log('🔄 Loading servers from Firebase...');
        
        if (!db) {
            console.error('❌ Database not initialized');
            showToast('Database connection failed', 'error');
            return;
        }
        
        const serversCol = collection(db, 'servers');
        const serverSnapshot = await getDocs(serversCol);
        
        const serverSelect = document.getElementById('serverSelect');
        
        if (!serverSelect) {
            console.error('❌ Server select element not found');
            return;
        }
        
        // Build options string for better performance
        let optionsHtml = '<option value="">Select a Server...</option>';
        
        const servers = [];
        serverSnapshot.forEach(doc => {
            const serverData = doc.data();
            console.log('📡 Found server:', serverData);
            servers.push({ id: doc.id, ...serverData });
        });
        
        // Sort by order
        servers.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // Build all options as HTML string
        servers.forEach(server => {
            optionsHtml += `<option value="${server.baseUrl}">${server.name} (${server.region || 'Other'})</option>`;
            console.log('✅ Added server:', server.name);
        });

        // Set innerHTML once for better performance
        serverSelect.innerHTML = optionsHtml;

        const totalServers = servers.length;
        console.log(`✅ Loaded ${totalServers} servers`);
        showToast(`Loaded ${totalServers} servers`, 'success');
        
    } catch (error) {
        console.error('❌ Server load error:', error);
        showToast('Error loading servers: ' + error.message, 'error');
    }
}
// Server Selection Handler for consolidated dropdown
function setupServerSelection() {
    const serverSelect = document.getElementById('serverSelect');
    const statServer = document.getElementById('statServer');
    
    function handleServerChange(e) {
        selectedServerUrl = e.target.value;
        const selectedText = e.target.options[e.target.selectedIndex].text;
        
        if (statServer) {
            statServer.textContent = selectedText || 'Not Selected';
        }
        
        console.log('🎯 Server selected:', selectedText, selectedServerUrl);
        
        if (selectedServerUrl) {
            showToast(`Server "${selectedText}" selected`, 'success');
        }
    }
    
    if (serverSelect) serverSelect.addEventListener('change', handleServerChange);
}

// ===== LOAD CATEGORIES FROM FIREBASE - Optimized Version =====
async function loadCategories() {
    try {
        console.log('🔄 Loading categories...');
        
        if (!db) {
            console.error('❌ Database not initialized');
            return;
        }
        
        const categoriesCol = collection(db, 'categories');
        const categorySnapshot = await getDocs(categoriesCol);
        const categoryTabs = document.getElementById('categoryTabs');
        
        if (!categoryTabs) {
            console.error('❌ Category tabs element not found');
            return;
        }
        
        categoryTabs.innerHTML = '';
        
        const categories = [];
        categorySnapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by order
        categories.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        if (categories.length === 0) {
            console.log('⚠️ No categories found, using defaults');
            categoryTabs.innerHTML = `
                <button class="category-tab active" data-category="HOT">🔥 HOT</button>
                <button class="category-tab" data-category="EVO">⚡ EVO</button>
                <button class="category-tab" data-category="RARE">💎 RARE</button>
            `;
            currentCategory = 'HOT';
            
            // Add event listeners to default tabs
            setTimeout(() => {
                document.querySelectorAll('.category-tab').forEach(tab => {
                    tab.addEventListener('click', function(e) {
                        e.preventDefault();
                        document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
                        this.classList.add('active');
                        const category = this.dataset.category;
                        currentCategory = category;
                        loadEmotes(category);
                    });
                });
            }, 100);
        } else {
            // Build HTML string for better performance
            let tabsHtml = '';
            categories.forEach((cat, index) => {
                const isActive = index === 0 ? ' active' : '';
                tabsHtml += `<button class="category-tab${isActive}" data-category="${cat.id}">${cat.icon || ''} ${cat.name}</button>`;
                
                if (index === 0) currentCategory = cat.id;
            });
            categoryTabs.innerHTML = tabsHtml;
            
            // Add event listeners using event delegation
            categoryTabs.addEventListener('click', function(e) {
                const tab = e.target.closest('.category-tab');
                if (tab) {
                    e.preventDefault();
                    document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    currentCategory = tab.dataset.category;
                    loadEmotes(currentCategory);
                }
            });
            
            console.log(`✅ Loaded ${categories.length} categories`);
        }
        
        // Load emotes for the initial category
        if (currentCategory) {
            loadEmotes(currentCategory);
        } else {
            // Fallback to load HOT category if no current category is set
            console.log('Fallback: Loading HOT category emotes');
            loadEmotes('HOT');
        }
        
    } catch (error) {
        console.error('❌ Category load error:', error);
        const categoryTabs = document.getElementById('categoryTabs');
        if (categoryTabs) {
            categoryTabs.innerHTML = `
                <button class="category-tab active" data-category="HOT">🔥 HOT</button>
                <button class="category-tab" data-category="EVO">⚡ EVO</button>
            `;
        }
        currentCategory = 'HOT';
        loadEmotes('HOT');
    }
}

function switchCategory(category, btnElement) {
    document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    btnElement.classList.add('active');
    currentCategory = category;
    loadEmotes(category);
    console.log('🔄 Switched to category:', category);
}

// ===== LOAD EMOTES FROM FIREBASE - Optimized Version =====
async function loadEmotes(category) {
    try {
        console.log('🔄 Loading emotes for category:', category);
        
        if (!db) {
            console.error('❌ Database not initialized');
            return;
        }
        
        const emotesCol = collection(db, 'emotes');
        const emoteSnapshot = await getDocs(emotesCol);
        const emoteGrid = document.getElementById('emoteGrid');
        
        if (!emoteGrid) {
            console.error('❌ Emote grid element not found');
            return;
        }
        
        // Show loading message
        emoteGrid.innerHTML = '<div class="no-emotes">Loading emotes...</div>';
        
        console.log(`Found ${emoteSnapshot.size} total emotes in database`);
        
        // Create document fragment for better performance
        const fragment = document.createDocumentFragment();
        let count = 0;
        
        // Process emotes in batches to prevent UI blocking
        const emotes = [];
        emoteSnapshot.forEach(doc => {
            const emote = doc.data();
            // Check if emote belongs to current category (case insensitive)
            if (emote.category && emote.category.toLowerCase() === category.toLowerCase()) {
                emotes.push(emote);
            }
        });
        
        // Render emotes in smaller batches
        const batchSize = 20;
        let rendered = 0;
        
        function renderBatch() {
            const batchEnd = Math.min(rendered + batchSize, emotes.length);
            
            for (let i = rendered; i < batchEnd; i++) {
                const emote = emotes[i];
                const card = document.createElement('div');
                card.className = 'emote-card';
                card.innerHTML = `
                    <div class="emote-image-wrapper">
                        <img src="${emote.imageUrl || 'https://via.placeholder.com/100x100/333/666?text=?'}" alt="${emote.emoteId}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23333%22 width=%22100%22 height=%22100%22/%3E%3Ctext fill=%22%23666%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3E?%3C/text%3E%3C/svg%3E'">
                    </div>
                    <p class="emote-name">${emote.emoteId}</p>
                `;
                card.addEventListener('click', () => sendEmoteInstantly(emote.emoteId, card));
                fragment.appendChild(card);
                count++;
            }
            
            rendered = batchEnd;
            
            // Append the batch to the DOM
            emoteGrid.appendChild(fragment);
            
            // Continue rendering if there are more emotes
            if (rendered < emotes.length) {
                setTimeout(renderBatch, 0); // Yield to the browser
            } else {
                // Finalize
                if (count === 0) {
                    emoteGrid.innerHTML = '<div class="no-emotes">No emotes in this category</div>';
                    console.log('⚠️ No emotes found for category:', category);
                } else {
                    console.log(`✅ Loaded ${count} emotes for ${category}`);
                }
            }
        }
        
        // Start rendering
        if (emotes.length > 0) {
            renderBatch();
        } else {
            emoteGrid.innerHTML = '<div class="no-emotes">No emotes in this category</div>';
            console.log('⚠️ No emotes found for category:', category);
        }
        
    } catch (error) {
        console.error('❌ Emote load error:', error);
        const emoteGrid = document.getElementById('emoteGrid');
        if (emoteGrid) {
            emoteGrid.innerHTML = '<div class="no-emotes">Error loading emotes</div>';
        }
    }
}

// ===== ENHANCED SEND EMOTE FUNCTION - SUPER FAST & OPTIMIZED =====
async function sendEmoteInstantly(emoteId, cardElement) {
    const startTime = performance.now();
    console.log('⚡ INSTANT SEND:', emoteId);
    
    // ✅ STEP 1: CHECK SUBSCRIPTION LIMITS
    // Premium users have unlimited emotes
    // No limits for premium users
    
    // ✅ STEP 2: INSTANT UI UPDATE (0ms delay)
    selectedEmoteId = emoteId;
    const statEmote = document.getElementById('statEmote');
    if (statEmote) statEmote.textContent = emoteId;
    
    document.querySelectorAll('.emote-card').forEach(c => c.classList.remove('selected'));
    cardElement.classList.add('selected');
    
    // ✅ STEP 3: PRE-VALIDATED DATA (cached references)
    const teamCodeInput = document.getElementById('teamCode');
    const uid1Input = document.getElementById('uid1');
    
    // Quick validation with early return
    if (!selectedServerUrl) {
        showToast('⚠️ Select server first', 'error');
        return;
    }
    
    if (!teamCodeInput || !uid1Input) {
        showToast('❌ Form error', 'error');
        return;
    }
    
    const tc = teamCodeInput.value.trim();
    const uid1 = uid1Input.value.trim();
    
    if (!tc) {
        showToast('⚠️ Enter team code', 'error');
        return;
    }
    
    if (!uid1 || !/^[0-9]{9,12}$/.test(uid1)) {
        showToast('⚠️ Valid UID required (9-12 digits)', 'error');
        return;
    }
    
    // ✅ STEP 3: COLLECT UIDs IN SINGLE LOOP (optimized)
    const params = new URLSearchParams({
        server: selectedServerUrl,
        tc: tc,
        uid1: uid1,
        emote_id: emoteId
    });
    
    // Add additional UIDs efficiently
    for (let i = 2; i <= maxUids; i++) {
        const inp = document.getElementById(`uid${i}`);
        if (inp?.value.trim() && /^[0-9]{9,12}$/.test(inp.value.trim())) {
            params.append(`uid${i}`, inp.value.trim());
        }
    }
    
    // ✅ STEP 4: BUILD URL (single operation)
    const url = `/.netlify/functions/send-emote?${params.toString()}`;
    
    // Fallback URL for direct API call if Netlify function is not available
    // Remove the 'server' parameter since it's already part of the base URL
    const fallbackParams = new URLSearchParams();
    for (const [key, value] of params.entries()) {
        if (key !== 'server') {
            fallbackParams.append(key, value);
        }
    }
    const fallbackUrl = `${selectedServerUrl}/join?${fallbackParams.toString()}`;
    
    console.log('🌐 API URL Ready:', url);
    
    // ✅ STEP 5: SHOW MINIMAL LOADER (optional, can remove for even faster feel)
    showLoader();
    
    // ✅ STEP 6: PARALLEL API CALL WITH TIMEOUT PROTECTION
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    try {
        // Try Netlify function first
        let response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            keepalive: true,
            priority: 'high'
        });
        
        // If Netlify function returns 404, try direct API call
        let isDirectCall = false;
        if (response.status === 404) {
            // Check if we're in local development - skip fallback in local dev due to CORS
            if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
                console.log('🚫 Skipping direct API call in local development due to CORS restrictions');
                hideLoader();
                showToast('❌ API service not available in local development. Deploy to Netlify or contact support.', 'error');
                return;
            }
            
            console.log('🔄 Netlify function not available, trying direct API call...');
            showToast('🔄 Trying alternative connection method...', 'info');
            try {
                response = await fetch(fallbackUrl, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal,
                    keepalive: true,
                    priority: 'high'
                });
                isDirectCall = true;
            } catch (directError) {
                // If direct call fails due to CORS, show appropriate message
                if (directError.message.includes('Failed to fetch')) {
                    console.error('❌ DIRECT API CALL FAILED (CORS BLOCKED):', directError);
                    hideLoader();
                    showToast('❌ Connection failed. Please contact support for assistance.', 'error');
                    return;
                } else {
                    throw directError; // Re-throw other errors
                }
            }
        }
        
        clearTimeout(timeoutId);
        
        // Check if response is OK (200-299)
        if (!response.ok && !isDirectCall) {
            hideLoader();
            const errorText = await response.text();
            console.error(`❌ API ERROR ${response.status}:`, errorText);
            
            // Check if it's a 404 error (function not found)
            if (response.status === 404) {
                // Check if we're in local development
                if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
                    showToast('❌ API service not available in local development. Contact support for assistance.', 'error');
                } else {
                    showToast('❌ API service unavailable. System will try alternative method.', 'error');
                }
            } else {
                showToast(`❌ API Error ${response.status}: ${response.statusText}`, 'error');
            }
            return;
        }
        
        // Handle direct API call differently from Netlify function
        let result;
        if (isDirectCall) {
            // Direct API calls return plain text, not JSON
            const responseText = await response.text();
            console.log('📡 Direct API Response:', responseText);
            
            // Treat as successful if we got a response
            result = { 
                success: response.ok, 
                message: response.ok ? 'Emote sent successfully' : 'Failed to send emote', 
                data: responseText,
                status: response.status
            };
        } else {
            // Netlify function should return JSON
            try {
                result = await response.json();
            } catch (parseError) {
                hideLoader();
                const responseText = await response.text();
                console.error('❌ JSON Parse Error:', parseError);
                console.error('Response content:', responseText);
                showToast('❌ Invalid API response. Please contact support.', 'error');
                return;
            }
        }
        
        hideLoader();
        
        const elapsed = (performance.now() - startTime).toFixed(0);
        
        // Handle both Netlify function response and direct API response
        const isSuccess = result.success || 
                         (result.status >= 200 && result.status < 300) || 
                         (result.data && (result.data.includes('success') || result.data.includes('OK')));
        
        if (isSuccess) {
            console.log(`✅ SUCCESS in ${elapsed}ms:`, result);
            showToast(`✓ ${emoteId} sent (${elapsed}ms)`, 'success');
            
            // Update user emote counters
            currentUser.emotesSentToday++;
            currentUser.totalEmotes++;
            
            // Save updated user data back to Firestore
            if (db && currentUser && currentUser.uid) {
                try {
                    await setDoc(doc(db, 'users', currentUser.uid), {
                        emotesSentToday: currentUser.emotesSentToday,
                        totalEmotes: currentUser.totalEmotes
                    }, { merge: true });
                    console.log('✅ User stats updated in Firestore');
                } catch (error) {
                    console.error('❌ Error updating user stats:', error);
                }
            }
            
            // Update UI
            const emotesTodayElement = document.querySelector('.stat-value');
            if (emotesTodayElement) emotesTodayElement.textContent = currentUser.emotesSentToday;
            
            const totalEmotesElement = document.querySelector('.stat-card:nth-child(2) .stat-value');
            if (totalEmotesElement) totalEmotesElement.textContent = currentUser.totalEmotes;
            
            // Update usage bar for free users
            if (currentUser.plan === 'free') {
                const usageProgress = document.querySelector('.usage-progress');
                if (usageProgress) {
                    const percentage = Math.min(100, (currentUser.emotesSentToday / 100) * 100);
                    usageProgress.style.width = `${percentage}%`;
                    const usageText = document.querySelector('.usage-text');
                    if (usageText) {
                        usageText.textContent = `${currentUser.emotesSentToday}/100 emotes today`;
                    }
                }
            }
        } else {
            console.error('❌ API ERROR:', result);
            showToast(`✗ ${result.error || 'Failed'}`, 'error');
        }
        
    } catch (error) {
        clearTimeout(timeoutId);
        hideLoader();
        
        if (error.name === 'AbortError') {
            console.error('⏱️ TIMEOUT after 10s');
            showToast('⏱️ Request timeout', 'error');
        } else if (error.message.includes('Failed to fetch') && isDirectCall) {
            console.error('❌ CORS ERROR: Direct API call blocked by CORS policy');
            showToast('❌ Connection blocked by security settings. Contact support for assistance.', 'error');
        } else {
            console.error('❌ NETWORK ERROR:', error);
            showToast(`❌ ${error.message}`, 'error');
        }
    }
}

// ===== UID MANAGEMENT =====
const addUidBtn = document.getElementById('addUidBtn');
if (addUidBtn) {
    addUidBtn.addEventListener('click', () => {
        if (uidCount < maxUids) {
            uidCount++;
            addUidField(uidCount);
            const statUids = document.getElementById('statUids');
            if (statUids) {
                statUids.textContent = uidCount;
            }
            
            if (uidCount >= maxUids) {
                addUidBtn.disabled = true;
                addUidBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 13l4 4L19 7" stroke-width="2"/></svg> MAX UIDs ADDED';
            }
        }
    });
}

function addUidField(number) {
    const container = document.getElementById('uidContainer');
    if (!container) return;
    
    const uidBox = document.createElement('div');
    uidBox.className = 'input-group-box uid-field';
    uidBox.id = `uidBox${number}`;
    uidBox.innerHTML = `
        <label>TARGET UID ${number} <span style="color: var(--text-gray); font-size: 11px;">(Optional)</span></label>
        <div style="display: flex; gap: 10px;">
            <input type="text" id="uid${number}" placeholder="Enter UID (9-12 digits)" class="config-input uid-input" pattern="[0-9]{9,12}">
            <button class="remove-uid-btn" onclick="window.removeUid(${number})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M18 6L6 18M6 6l12 12" stroke-width="2"/>
                </svg>
            </button>
        </div>
    `;
    container.appendChild(uidBox);
}

window.removeUid = function(number) {
    const uidBox = document.getElementById(`uidBox${number}`);
    if (uidBox) {
        uidBox.remove();
        uidCount--;
        const statUids = document.getElementById('statUids');
        if (statUids) {
            statUids.textContent = uidCount;
        }
        
        const addBtn = document.getElementById('addUidBtn');
        if (addBtn) {
            addBtn.disabled = false;
            addBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" stroke-width="2"/></svg> ADD UID';
        }
    }
};

// ===== MAINTENANCE CHECK =====
async function checkMaintenance() {
    try {
        if (!db) return;
        
        const docRef = doc(db, 'settings', 'maintenance');
        const docSnap = await getDoc(docRef);
        
        const overlay = document.getElementById('maintenanceOverlay');
        const msg = document.getElementById('maintenanceMsg');
        
        if (docSnap.exists() && docSnap.data().enabled) {
            if (msg) msg.textContent = docSnap.data().message;
            if (overlay) overlay.classList.remove('hidden');
        }
        
        // Real-time listener
        onSnapshot(docRef, (doc) => {
            if (doc.exists() && doc.data().enabled) {
                if (msg) msg.textContent = doc.data().message;
                if (overlay) overlay.classList.remove('hidden');
            } else {
                if (overlay) overlay.classList.add('hidden');
            }
        });
    } catch (error) {
        console.log('⚠️ Maintenance check skipped:', error.message);
    }
}

// ===== LOAD FOOTER LINKS =====
async function loadFooterLinks() {
    try {
        if (!db) return;
        
        const docRef = doc(db, 'settings', 'footerLinks');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const links = docSnap.data();
            const telegram = document.getElementById('footerTelegram');
            const github = document.getElementById('footerGithub');
            const discord = document.getElementById('footerDiscord');
            const youtube = document.getElementById('footerYoutube');
            const maintenanceTG = document.getElementById('maintenanceTG');
            
            if (telegram) telegram.href = links.telegram || '#';
            if (github) github.href = links.github || '#';
            if (discord) discord.href = links.discord || '#';
            if (youtube) youtube.href = links.youtube || '#';
            if (maintenanceTG) maintenanceTG.href = links.telegram || '#';
        }
    } catch (error) {
        console.log('⚠️ Footer links not configured');
    }
}

// ===== LOAD LEADERBOARD DATA =====
async function loadLeaderboard() {
    try {
        console.log('🏆 Loading leaderboard data from Firebase...');
        
        if (!db) {
            console.error('❌ Database not initialized');
            return;
        }
        
        // Fetch leaderboard data from Firestore
        // We'll query the users collection ordered by totalEmotes
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        
        // Process users data and sort by totalEmotes
        const usersData = [];
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            // Only include users with emote data
            if (userData.totalEmotes > 0) {
                usersData.push({
                    name: userData.name || userData.email?.split('@')[0] || 'Anonymous',
                    emotes: userData.totalEmotes || 0,
                    plan: userData.plan || 'free'
                });
            }
        });
        
        // Sort by emotes descending and take top 10
        usersData.sort((a, b) => b.emotes - a.emotes);
        const leaderboardData = usersData.slice(0, 10).map((user, index) => ({
            rank: index + 1,
            name: user.name,
            emotes: user.emotes,
            plan: user.plan
        }));
        
        // Update leaderboard UI
        const leaderboardList = document.querySelector('.leaderboard-list');
        if (leaderboardList) {
            leaderboardList.innerHTML = '';
            
            if (leaderboardData.length === 0) {
                leaderboardList.innerHTML = '<div class="no-data">No leaderboard data available yet.</div>';
                return;
            }
            
            leaderboardData.forEach(user => {
                const leaderboardItem = document.createElement('div');
                leaderboardItem.className = 'leaderboard-item';
                
                // Determine avatar emoji based on rank
                let avatarEmoji = '👤';
                if (user.rank === 1) avatarEmoji = '👑';
                else if (user.rank === 2) avatarEmoji = '🔥';
                else if (user.rank === 3) avatarEmoji = '⚡';
                
                leaderboardItem.innerHTML = `
                    <div class="leaderboard-col">${user.rank}</div>
                    <div class="leaderboard-col">
                        <div class="user-avatar-small">${avatarEmoji}</div>
                        <span>${user.name}</span>
                        <span class="user-badge ${user.plan}">${user.plan.toUpperCase()}</span>
                    </div>
                    <div class="leaderboard-col">${user.emotes.toLocaleString()}</div>
                `;
                
                leaderboardList.appendChild(leaderboardItem);
            });
        }
        
        console.log('✅ Leaderboard loaded with', leaderboardData.length, 'users');
        
    } catch (error) {
        console.error('❌ Leaderboard load error:', error);
        // Show error in UI
        const leaderboardList = document.querySelector('.leaderboard-list');
        if (leaderboardList) {
            leaderboardList.innerHTML = '<div class="error">Failed to load leaderboard data.</div>';
        }
    }
}

// ===== INITIALIZE DASHBOARD =====
async function initializeDashboard() {
    console.log('🔥 NOVRA X Dashboard Initializing...');
    console.log('📱 Firebase Project:', firebaseConfig.projectId);
    
    try {
        // Load user profile first
        currentUser = await loadUserProfile();
        
        if (!currentUser) {
            console.error('❌ Failed to load user profile');
            showToast('Failed to load user profile. Please login again.', 'error');
            sessionStorage.removeItem('auth');
            window.location.href = 'index.html';
            return;
        }
        
        // Setup real-time updates for user profile
        setupRealTimeUserProfile();
        
        await checkMaintenance();
        await loadServers();
        setupServerSelection();
        await loadCategories();
        await loadFooterLinks();
        
        console.log('✅ NOVRA X Dashboard Ready!');
        console.log('⚡ INSTANT SEND MODE ACTIVATED!');
        
        setTimeout(() => {
            showToast('Dashboard loaded successfully!', 'success');
        }, 1000);
        
    } catch (error) {
        console.error('❌ Dashboard initialization failed:', error);
        showToast('Dashboard initialization failed. Check console.', 'error');
    }
}

// Add modern interactions
function addDashboardInteractions() {
    // Add hover effects to stat items
    const statItems = document.querySelectorAll('.stat-item');
    statItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            item.style.transform = 'translateY(-5px)';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.transform = 'translateY(0)';
        });
    });
    
    // Add hover effects to emote cards
    const emoteCards = document.querySelectorAll('.emote-card');
    emoteCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });
    
    // Add pulse animation to category tabs
    const categoryTabs = document.querySelectorAll('.category-tab');
    categoryTabs.forEach(tab => {
        tab.addEventListener('mouseenter', () => {
            tab.style.animation = 'pulse 1s infinite';
        });
        
        tab.addEventListener('mouseleave', () => {
            tab.style.animation = 'none';
        });
    });
    
    // Auto-hide sidebar functionality
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.querySelector('.menu-toggle');
    
    if (sidebar && menuToggle) {
        // Initially hide sidebar on desktop
        if (window.innerWidth > 768) {
            sidebar.classList.add('collapsed');
        }
        
        // Toggle sidebar visibility on menu button click
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.innerWidth > 768) {
                sidebar.classList.toggle('collapsed');
            } else {
                sidebar.classList.toggle('hidden-mobile');
            }
        });
        
        // Auto-hide sidebar on mouse leave (desktop only)
        let hideTimeout;
        
        sidebar.addEventListener('mouseenter', () => {
            clearTimeout(hideTimeout);
            if (window.innerWidth > 768) {
                sidebar.classList.remove('collapsed');
            }
        });
        
        sidebar.addEventListener('mouseleave', () => {
            if (window.innerWidth > 768) {
                hideTimeout = setTimeout(() => {
                    sidebar.classList.add('collapsed');
                }, 1000); // 1 second delay before hiding
            }
        });
        
        // Mobile sidebar toggle
        if (window.innerWidth <= 768) {
            // Hide sidebar by default on mobile
            sidebar.classList.add('hidden-mobile');
            
            // Hide sidebar when clicking outside
            document.addEventListener('click', (e) => {
                if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                    sidebar.classList.add('hidden-mobile');
                }
            });
        }
    }
}

// Initialize User Profile Data
function initializeUserProfile() {
    if (!currentUser) {
        console.error('❌ No user data available');
        return;
    }
    
    // Set initial user profile data
    const usernameElements = document.querySelectorAll('.username');
    usernameElements.forEach(el => el.textContent = currentUser.name);
    
    const emailElements = document.querySelectorAll('.user-email');
    emailElements.forEach(el => el.textContent = currentUser.email);
    
    // Update stats
    const emotesTodayElement = document.querySelector('.stat-value');
    if (emotesTodayElement) emotesTodayElement.textContent = currentUser.emotesSentToday;
    
    const totalEmotesElement = document.querySelector('.stat-card:nth-child(2) .stat-value');
    if (totalEmotesElement) totalEmotesElement.textContent = currentUser.totalEmotes;
    
    const daysActiveElement = document.querySelector('.stat-card:nth-child(3) .stat-value');
    if (daysActiveElement) daysActiveElement.textContent = currentUser.daysActive;
    
    // Set plan badge - only premium plans
    const planBadges = document.querySelectorAll('.user-plan, .user-plan-badge');
    const planNames = {
        'free': 'Premium Plan',
        'weekly': 'Premium Plan',
        'monthly': 'Premium Plan',
        'lifetime': 'Premium Plan'
    };
    planBadges.forEach(badge => {
        badge.textContent = planNames[currentUser.plan] || 'Premium Plan';
        badge.className = badge.className.replace(/\b(free|pro|weekly|monthly|lifetime)\b/g, '') + ' pro';
    });
    
    // Set usage bar - always unlimited for premium
    const usageProgress = document.querySelector('.usage-progress');
    if (usageProgress) {
        usageProgress.style.width = `100%`;
        const usageText = document.querySelector('.usage-text');
        if (usageText) {
            usageText.textContent = 'Unlimited emotes';
        }
    }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(async () => {
            await initializeDashboard();
            addDashboardInteractions();
            initializeUserProfile();
            // Load leaderboard data initially
            loadLeaderboard();
        }, 100);
    });
} else {
    setTimeout(async () => {
        await initializeDashboard();
        addDashboardInteractions();
        initializeUserProfile();
        // Load leaderboard data initially
        loadLeaderboard();
    }, 100);
}