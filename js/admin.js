// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, addDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

// Check if Firebase is properly initialized
function isFirebaseInitialized() {
    return !!db;
}

// Wait for Firebase to be ready
async function waitForFirebase() {
    return new Promise((resolve) => {
        if (isFirebaseInitialized()) {
            resolve();
            return;
        }
        
        const interval = setInterval(() => {
            if (isFirebaseInitialized()) {
                clearInterval(interval);
                resolve();
            }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
            clearInterval(interval);
            resolve();
        }, 5000);
    });
}

// Loader Functions
function showLoader() {
    const loader = document.getElementById('adminLoader');
    if (loader) loader.classList.remove('hidden');
}

function hideLoader() {
    const loader = document.getElementById('adminLoader');
    if (loader) loader.classList.add('hidden');
}

// Hash Password
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ===== ADMIN LOGIN =====
const loginForm = document.getElementById('adminLoginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('📥 Admin login form submitted');
        
        const emailInput = document.getElementById('adminEmail');
        const passwordInput = document.getElementById('adminPassword');
        const errorDiv = document.getElementById('adminLoginError');
        
        if (!emailInput || !passwordInput || !errorDiv) {
            console.error('❌ Form elements not found');
            return;
        }
        
        const email = emailInput.value;
        const password = passwordInput.value;
        
        console.log('📧 Attempting login with:', email);

        showLoader();
        try {
            console.log('🔐 Attempting admin login with email:', email);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('✅ Admin login successful:', userCredential.user.email);
            
            const loginView = document.getElementById('adminLoginView');
            const dashboard = document.getElementById('adminDashboard');
            
            if (loginView) {
                console.log('🙈 Hiding login view');
                loginView.classList.add('hidden');
            }
            
            if (dashboard) {
                console.log('👀 Showing admin dashboard');
                dashboard.classList.remove('hidden');
            }
            
            console.log('🔄 Loading all data');
            await loadAllData();
            console.log('✅ Admin panel ready');
        } catch (error) {
            console.error('❌ Admin login error:', error);
            let errorMessage = 'Login failed';
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'User not found';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address';
            } else {
                errorMessage = error.message;
            }
            errorDiv.textContent = `❌ ${errorMessage}`;
            errorDiv.classList.remove('hidden');
            setTimeout(() => errorDiv.classList.add('hidden'), 5000);
        } finally {
            hideLoader();
        }
    });
}

// Admin Logout
const logoutBtn = document.getElementById('adminLogout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await signOut(auth);
        location.reload();
    });
}

// Load All Data
async function loadAllData() {
    console.log('🔄 Loading all admin data');
    
    // Wait for Firebase to be ready
    await waitForFirebase();
    
    if (!isFirebaseInitialized()) {
        console.error('❌ Firebase not initialized, cannot load data');
        return;
    }
    
    // Small delay to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
        await loadServers();
        await loadCategories();
        await loadCategoryDropdown();
        await loadEmotes();
        await loadLinks();
        await loadMaintenance();
        await loadGroupApiSettings();
        console.log('✅ All admin data loaded successfully');
    } catch (error) {
        console.error('❌ Error loading admin data:', error);
    }
}

// ===== SERVER MANAGEMENT =====
async function loadServers() {
    console.log('🔄 Loading servers...');
    const serverList = document.getElementById('serverList');
    if (!serverList) {
        console.warn('⚠️ Server list element not found');
        return;
    }
    
    serverList.innerHTML = '<p class="no-data">Loading servers...</p>';
    
    try {
        const serversCol = collection(db, 'servers');
        const snapshot = await getDocs(serversCol);
        
        console.log('📥 Servers snapshot received:', snapshot.size, 'documents');
        
        if (snapshot.empty) {
            serverList.innerHTML = '<p class="no-data">No servers added yet</p>';
            console.log('📭 No servers found in database');
            return;
        }
        
        const servers = [];
        snapshot.forEach(doc => {
            servers.push({ id: doc.id, ...doc.data() });
        });
        
        servers.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // Clear the list
        serverList.innerHTML = '';
        
        // Group servers by region with proper categorization
        const indianServers = servers.filter(s => s.region === 'indian');
        const bangladeshServers = servers.filter(s => s.region === 'bangladesh');
        const otherServers = servers.filter(s => s.region === 'other');
        
        console.log('📊 Server Categorization:', {
            indian: indianServers.length,
            bangladesh: bangladeshServers.length,
            other: otherServers.length
        });
        
        // Create region headers
        if (indianServers.length > 0) {
            const regionHeader = document.createElement('div');
            regionHeader.className = 'region-header';
            regionHeader.innerHTML = `<h3>🇮🇳 Indian Servers (${indianServers.length})</h3>`;
            serverList.appendChild(regionHeader);
            
            indianServers.forEach(server => {
                serverList.appendChild(createServerItem(server));
            });
        }
        
        if (bangladeshServers.length > 0) {
            const regionHeader = document.createElement('div');
            regionHeader.className = 'region-header';
            regionHeader.innerHTML = `<h3>🇧🇩 Bangladesh Servers (${bangladeshServers.length})</h3>`;
            serverList.appendChild(regionHeader);
            
            bangladeshServers.forEach(server => {
                serverList.appendChild(createServerItem(server));
            });
        }
        
        if (otherServers.length > 0) {
            const regionHeader = document.createElement('div');
            regionHeader.className = 'region-header';
            regionHeader.innerHTML = `<h3>🌍 Other Servers (${otherServers.length})</h3>`;
            serverList.appendChild(regionHeader);
            
            otherServers.forEach(server => {
                serverList.appendChild(createServerItem(server));
            });
        }
        
        // Show message if no servers in any category
        if (servers.length === 0) {
            serverList.innerHTML = '<p class="no-data">No servers added yet</p>';
        }
        
        console.log('✅ Servers loaded successfully');
    } catch (error) {
        console.error('❌ Server load error:', error);
        serverList.innerHTML = `<p class="error-text">Error loading servers: ${error.message}</p>`;
    }
}

function createServerItem(server) {
    const item = document.createElement('div');
    item.className = 'admin-item';
    
    const regionIcon = server.region === 'indian' ? '🇮🇳' : 
                      server.region === 'bangladesh' ? '🇧🇩' : '🌍';
    
    const regionName = server.region === 'indian' ? 'Indian' :
                      server.region === 'bangladesh' ? 'Bangladesh' : 'Other';
    
    item.innerHTML = `
        <div class="admin-item-info">
            <strong>${regionIcon} ${server.name}</strong>
            <span style="color: var(--text-gray); font-size: 12px;">${server.baseUrl}</span>
            <span style="color: var(--text-gray); font-size: 11px; display: block; margin-top: 2px;">
                Region: ${regionName} | Order: ${server.order || 0}
            </span>
        </div>
        <div class="admin-item-actions">
            <button class="action-icon-btn pin" data-action="editServer" 
                    data-id="${server.id}" 
                    data-name="${server.name}" 
                    data-url="${server.baseUrl}" 
                    data-region="${server.region}"
                    data-order="${server.order || 0}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
                </svg>
            </button>
            <button class="action-icon-btn close" data-action="deleteServer" data-id="${server.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M18 6L6 18M6 6l12 12" stroke-width="2"/>
                </svg>
            </button>
        </div>
    `;
    
    // Add event listeners
    const editBtn = item.querySelector('[data-action="editServer"]');
    const deleteBtn = item.querySelector('[data-action="deleteServer"]');
    
    editBtn.addEventListener('click', () => {
        editServer(
            editBtn.dataset.id, 
            editBtn.dataset.name, 
            editBtn.dataset.url, 
            editBtn.dataset.region,
            editBtn.dataset.order
        );
    });
    
    deleteBtn.addEventListener('click', () => {
        deleteServer(deleteBtn.dataset.id);
    });
    
    return item;
}

const serverForm = document.getElementById('serverForm');
if (serverForm) {
    serverForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('editServerId').value;
        const name = document.getElementById('serverName').value;
        const baseUrl = document.getElementById('serverUrl').value;
        const region = document.getElementById('serverRegion').value;
        const order = parseInt(document.getElementById('serverOrder').value) || 0;

        // Validate region selection
        if (!region) {
            alert('❌ Please select a region');
            return;
        }

        console.log('➕ Adding Server:', { name, baseUrl, region, order });

        showLoader();
        try {
            const serverData = { 
                name, 
                baseUrl, 
                region: region, // Ensure region is properly saved
                order 
            };
            
            if (editId) {
                await updateDoc(doc(db, 'servers', editId), serverData);
                console.log('✅ Server updated:', serverData);
            } else {
                await addDoc(collection(db, 'servers'), serverData);
                console.log('✅ Server added:', serverData);
            }
            
            serverForm.reset();
            document.getElementById('editServerId').value = '';
            document.getElementById('serverBtnText').textContent = 'ADD SERVER';
            document.getElementById('cancelServerEdit').classList.add('hidden');
            await loadServers();
            alert(`✅ Server saved successfully in ${getRegionName(region)} category!`);
        } catch (error) {
            alert('❌ Error: ' + error.message);
            console.error('Server save error:', error);
        } finally {
            hideLoader();
        }
    });
}

// Helper function to get region name
function getRegionName(region) {
    const regions = {
        'indian': 'Indian 🇮🇳',
        'bangladesh': 'Bangladesh 🇧🇩', 
        'other': 'Other 🌍'
    };
    return regions[region] || 'Unknown';
}

function editServer(id, name, url, region, order) {
    console.log('✏️ Editing Server:', { id, name, url, region, order });
    
    document.getElementById('editServerId').value = id;
    document.getElementById('serverName').value = name;
    document.getElementById('serverUrl').value = url;
    document.getElementById('serverRegion').value = region;
    document.getElementById('serverOrder').value = order;
    document.getElementById('serverBtnText').textContent = 'UPDATE SERVER';
    document.getElementById('cancelServerEdit').classList.remove('hidden');
    window.scrollTo(0, 0);
}

async function deleteServer(id) {
    if (confirm('❌ Delete this server?')) {
        showLoader();
        try {
            await deleteDoc(doc(db, 'servers', id));
            await loadServers();
            alert('✅ Server deleted!');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            hideLoader();
        }
    }
}

const cancelServerEdit = document.getElementById('cancelServerEdit');
if (cancelServerEdit) {
    cancelServerEdit.addEventListener('click', () => {
        serverForm.reset();
        document.getElementById('editServerId').value = '';
        document.getElementById('serverBtnText').textContent = 'ADD SERVER';
        cancelServerEdit.classList.add('hidden');
    });
}

// ===== CATEGORY MANAGEMENT =====
async function loadCategories() {
    console.log('🔄 Loading categories...');
    const categoryList = document.getElementById('categoryList');
    if (!categoryList) {
        console.warn('⚠️ Category list element not found');
        return;
    }
    
    categoryList.innerHTML = '<p class="no-data">Loading categories...</p>';
    
    try {
        const categoriesCol = collection(db, 'categories');
        const snapshot = await getDocs(categoriesCol);
        
        console.log('📥 Categories snapshot received:', snapshot.size, 'documents');
        
        if (snapshot.empty) {
            categoryList.innerHTML = '<p class="no-data">No categories added yet</p>';
            console.log('📭 No categories found in database');
            return;
        }
        
        // Clear the list
        categoryList.innerHTML = '';
        
        const categories = [];
        snapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        
        categories.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        let categoryCount = 0;
        categories.forEach(cat => {
            const item = document.createElement('div');
            item.className = 'admin-item';
            item.innerHTML = `
                <div class="admin-item-info">
                    <strong>${cat.icon || ''} ${cat.name || 'Unnamed'}</strong>
                    <span style="color: var(--text-gray); font-size: 12px;">Order: ${cat.order || 0}</span>
                </div>
                <div class="admin-item-actions">
                    <button class="action-icon-btn pin" data-action="editCategory" data-id="${cat.id}" data-name="${cat.name || ''}" data-icon="${cat.icon || ''}" data-order="${cat.order || 0}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
                        </svg>
                    </button>
                    <button class="action-icon-btn close" data-action="deleteCategory" data-id="${cat.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 6L6 18M6 6l12 12" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
            `;
            categoryList.appendChild(item);
            categoryCount++;
        });
        
        console.log(`✅ Loaded ${categoryCount} categories`);
        
        // Add event listeners
        categoryList.querySelectorAll('[data-action="editCategory"]').forEach(btn => {
            btn.addEventListener('click', () => {
                editCategory(btn.dataset.id, btn.dataset.name, btn.dataset.icon, btn.dataset.order);
            });
        });
        
        categoryList.querySelectorAll('[data-action="deleteCategory"]').forEach(btn => {
            btn.addEventListener('click', () => {
                deleteCategory(btn.dataset.id);
            });
        });
        
    } catch (error) {
        console.error('❌ Category load error:', error);
        if (categoryList) {
            categoryList.innerHTML = `<p class="error-text">Error loading categories: ${error.message}</p>`;
        }
    }
}

async function loadCategoryDropdown() {
    console.log('🔄 Loading category dropdown...');
    try {
        const categoriesCol = collection(db, 'categories');
        const snapshot = await getDocs(categoriesCol);
        const select = document.getElementById('emoteCategory');
        if (!select) {
            console.warn('⚠️ Category dropdown element not found');
            return;
        }
        
        select.innerHTML = '<option value="">Select Category</option>';
        
        const categories = [];
        snapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        
        categories.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        let categoryCount = 0;
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = `${cat.icon || ''} ${cat.name || 'Unnamed'}`;
            select.appendChild(option);
            categoryCount++;
        });
        
        console.log(`✅ Loaded ${categoryCount} categories in dropdown`);
    } catch (error) {
        console.error('❌ Category dropdown error:', error);
    }
}

const categoryForm = document.getElementById('categoryForm');
if (categoryForm) {
    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('editCategoryId').value;
        const name = document.getElementById('categoryName').value;
        const icon = document.getElementById('categoryIcon').value;
        const order = parseInt(document.getElementById('categoryOrder').value) || 0;

        showLoader();
        try {
            const categoryData = { name, icon, order };
            
            if (editId) {
                await updateDoc(doc(db, 'categories', editId), categoryData);
            } else {
                await addDoc(collection(db, 'categories'), categoryData);
            }
            
            categoryForm.reset();
            document.getElementById('editCategoryId').value = '';
            document.getElementById('categoryBtnText').textContent = 'ADD CATEGORY';
            document.getElementById('cancelCategoryEdit').classList.add('hidden');
            await loadCategories();
            await loadCategoryDropdown();
            alert('✅ Category saved!');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            hideLoader();
        }
    });
}

function editCategory(id, name, icon, order) {
    document.getElementById('editCategoryId').value = id;
    document.getElementById('categoryName').value = name;
    document.getElementById('categoryIcon').value = icon;
    document.getElementById('categoryOrder').value = order;
    document.getElementById('categoryBtnText').textContent = 'UPDATE CATEGORY';
    document.getElementById('cancelCategoryEdit').classList.remove('hidden');
    window.scrollTo(0, 0);
}

async function deleteCategory(id) {
    if (confirm('❌ Delete this category?')) {
        showLoader();
        try {
            await deleteDoc(doc(db, 'categories', id));
            await loadCategories();
            await loadCategoryDropdown();
            alert('✅ Category deleted!');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            hideLoader();
        }
    }
}

const cancelCategoryEdit = document.getElementById('cancelCategoryEdit');
if (cancelCategoryEdit) {
    cancelCategoryEdit.addEventListener('click', () => {
        categoryForm.reset();
        document.getElementById('editCategoryId').value = '';
        document.getElementById('categoryBtnText').textContent = 'ADD CATEGORY';
        cancelCategoryEdit.classList.add('hidden');
    });
}

// ===== EMOTE MANAGEMENT =====
async function loadEmotes() {
    console.log('🔄 Loading emotes...');
    const emoteList = document.getElementById('emoteList');
    if (!emoteList) {
        console.warn('⚠️ Emote list element not found');
        return;
    }
    
    emoteList.innerHTML = '<p class="no-data">Loading emotes...</p>';
    
    // Check if Firebase is initialized
    if (!db) {
        console.error('❌ Firestore not initialized');
        emoteList.innerHTML = '<p class="error-text">Firestore not initialized</p>';
        return;
    }
    
    try {
        console.log('🔍 Querying emotes collection...');
        const emotesCol = collection(db, 'emotes');
        const snapshot = await getDocs(emotesCol);
        
        console.log('📥 Emotes snapshot received:', snapshot.size, 'documents');
        
        if (snapshot.empty) {
            emoteList.innerHTML = '<p class="no-data">No emotes added yet</p>';
            console.log('📭 No emotes found in database');
            return;
        }
        
        // Clear the list
        emoteList.innerHTML = '';
        
        let emoteCount = 0;
        console.log('📝 Processing emote documents...');
        snapshot.forEach(doc => {
            try {
                const emote = doc.data();
                console.log('📄 Processing emote:', emote);
                const item = document.createElement('div');
                item.className = 'admin-item';
                item.innerHTML = `
                    <div class="admin-item-info" style="display: flex; align-items: center; gap: 10px;">
                        <img src="${emote.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiByeD0iOCIgZmlsbD0iIzU1NSIvPgo8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzIiBmaWxsPSIjZmZmIi8+Cjwvc3ZnPgo='}" style="width: 40px; height: 40px; object-fit: contain; border-radius: 8px;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiByeD0iOCIgZmlsbD0iIzU1NSIvPgo8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzIiBmaWxsPSIjZmZmIi8+Cjwvc3ZnPgo='">
                        <div>
                            <strong>${emote.emoteId || 'Unnamed'}</strong>
                            <span style="color: var(--text-gray); font-size: 12px; display: block;">Category: ${emote.category || 'Uncategorized'}</span>
                        </div>
                    </div>
                    <div class="admin-item-actions">
                        <button class="action-icon-btn pin" data-action="editEmote" data-id="${doc.id}" data-url="${emote.imageUrl || ''}" data-category="${emote.category || ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
                            </svg>
                        </button>
                        <button class="action-icon-btn close" data-action="deleteEmote" data-id="${doc.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M18 6L6 18M6 6l12 12" stroke-width="2"/>
                            </svg>
                        </button>
                    </div>
                `;
                emoteList.appendChild(item);
                emoteCount++;
            } catch (docError) {
                console.error('❌ Error processing emote document:', doc.id, docError);
            }
        });
        
        console.log(`✅ Loaded ${emoteCount} emotes`);
        
        // Add event listeners
        console.log('🔗 Adding event listeners to emote buttons...');
        emoteList.querySelectorAll('[data-action="editEmote"]').forEach(btn => {
            btn.addEventListener('click', () => {
                editEmote(btn.dataset.id, btn.dataset.url, btn.dataset.category);
            });
        });
        
        emoteList.querySelectorAll('[data-action="deleteEmote"]').forEach(btn => {
            btn.addEventListener('click', () => {
                deleteEmote(btn.dataset.id);
            });
        });
        
        console.log('✅ Emote loading completed');
    } catch (error) {
        console.error('❌ Emote load error:', error);
        if (emoteList) {
            emoteList.innerHTML = `<p class="error-text">Error loading emotes: ${error.message}</p>`;
        }
    }
}

const emoteImageInput = document.getElementById('emoteImageUrl');
if (emoteImageInput) {
    emoteImageInput.addEventListener('input', (e) => {
        const url = e.target.value;
        const preview = document.getElementById('emotePreview');
        if (preview) {
            if (url) {
                preview.innerHTML = `<img src="${url}" style="max-width: 150px; max-height: 150px; border-radius: 10px;">`;
            } else {
                preview.innerHTML = '';
            }
        }
    });
}

// Refresh emotes button
const refreshEmotesBtn = document.getElementById('refreshEmotesBtn');
if (refreshEmotesBtn) {
    refreshEmotesBtn.addEventListener('click', async () => {
        console.log('🔄 Refreshing emotes...');
        showLoader();
        try {
            await loadEmotes();
        } catch (error) {
            console.error('❌ Error refreshing emotes:', error);
            alert('Error refreshing emotes: ' + error.message);
        } finally {
            hideLoader();
        }
    });
}

const emoteForm = document.getElementById('emoteForm');
if (emoteForm) {
    emoteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('editEmoteId').value;
        const imageUrl = document.getElementById('emoteImageUrl').value;
        const category = document.getElementById('emoteCategory').value;
        
        const filename = imageUrl.split('/').pop();
        const emoteId = filename.split('.')[0];

        showLoader();
        try {
            console.log('💾 Saving emote:', { imageUrl, category, emoteId });
            const emoteData = { imageUrl, category, emoteId };
            
            if (editId) {
                console.log('✏️ Updating existing emote:', editId);
                await updateDoc(doc(db, 'emotes', editId), emoteData);
            } else {
                console.log('➕ Adding new emote');
                const docRef = await addDoc(collection(db, 'emotes'), emoteData);
                console.log('✅ Emote added with ID:', docRef.id);
            }
            
            emoteForm.reset();
            document.getElementById('editEmoteId').value = '';
            document.getElementById('emoteBtnText').textContent = 'ADD EMOTE';
            document.getElementById('cancelEmoteEdit').classList.add('hidden');
            document.getElementById('emotePreview').innerHTML = '';
            await loadEmotes();
            alert('✅ Emote saved!');
        } catch (error) {
            console.error('❌ Error saving emote:', error);
            alert('❌ Error: ' + error.message);
        } finally {
            hideLoader();
        }
    });
}

function editEmote(id, url, category) {
    document.getElementById('editEmoteId').value = id;
    document.getElementById('emoteImageUrl').value = url;
    document.getElementById('emoteCategory').value = category;
    document.getElementById('emoteBtnText').textContent = 'UPDATE EMOTE';
    document.getElementById('cancelEmoteEdit').classList.remove('hidden');
    document.getElementById('emotePreview').innerHTML = `<img src="${url}" style="max-width: 150px; max-height: 150px; border-radius: 10px;">`;
    window.scrollTo(0, document.getElementById('emoteForm').offsetTop - 100);
}

async function deleteEmote(id) {
    if (confirm('❌ Delete this emote?')) {
        showLoader();
        try {
            await deleteDoc(doc(db, 'emotes', id));
            await loadEmotes();
            alert('✅ Emote deleted!');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            hideLoader();
        }
    }
}

const cancelEmoteEdit = document.getElementById('cancelEmoteEdit');
if (cancelEmoteEdit) {
    cancelEmoteEdit.addEventListener('click', () => {
        emoteForm.reset();
        document.getElementById('editEmoteId').value = '';
        document.getElementById('emoteBtnText').textContent = 'ADD EMOTE';
        cancelEmoteEdit.classList.add('hidden');
        document.getElementById('emotePreview').innerHTML = '';
    });
}

// ===== FOOTER LINKS =====
async function loadLinks() {
    console.log('🔄 Loading footer links...');
    try {
        const docRef = doc(db, 'settings', 'footerLinks');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const links = docSnap.data();
            console.log('📥 Footer links data:', links);
            document.getElementById('telegramUrl').value = links.telegram || '';
            document.getElementById('githubUrl').value = links.github || '';
            document.getElementById('discordUrl').value = links.discord || '';
            document.getElementById('youtubeUrl').value = links.youtube || '';
            console.log('✅ Footer links loaded');
        } else {
            console.log('📭 No footer links found in database');
        }
    } catch (error) {
        console.error('❌ Footer links load error:', error);
    }
}

const linksForm = document.getElementById('linksForm');
if (linksForm) {
    linksForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoader();
        try {
            await setDoc(doc(db, 'settings', 'footerLinks'), {
                telegram: document.getElementById('telegramUrl').value,
                github: document.getElementById('githubUrl').value,
                discord: document.getElementById('discordUrl').value,
                youtube: document.getElementById('youtubeUrl').value
            });
            alert('✅ Links updated!');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            hideLoader();
        }
    });
}

// ===== MAINTENANCE MODE =====
async function loadMaintenance() {
    console.log('🔄 Loading maintenance settings...');
    try {
        const docRef = doc(db, 'settings', 'maintenance');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log('📥 Maintenance data:', data);
            document.getElementById('maintenanceToggle').checked = data.enabled || false;
            document.getElementById('maintenanceMessage').value = data.message || '';
            console.log('✅ Maintenance settings loaded');
        } else {
            console.log('📭 No maintenance settings found in database');
        }
    } catch (error) {
        console.error('❌ Maintenance settings load error:', error);
    }
}

// ===== 5-PLAYER GROUP API SETTINGS =====
async function loadGroupApiSettings() {
    console.log('🔄 Loading 5-player group API settings...');
    try {
        const docRef = doc(db, 'settings', 'groupApi');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log('📥 Group API data:', data);
            document.getElementById('groupApiUrl').value = data.url || 'https://unafforded-veronique-cuter.ngrok-free.dev/5?uid={uid}';
            document.getElementById('groupApiEnabled').checked = data.enabled || false;
            console.log('✅ Group API settings loaded');
        } else {
            console.log('📭 No group API settings found in database');
            // Set default values
            document.getElementById('groupApiUrl').value = 'https://unafforded-veronique-cuter.ngrok-free.dev/5?uid={uid}';
            document.getElementById('groupApiEnabled').checked = false;
        }
    } catch (error) {
        console.error('❌ Group API settings load error:', error);
    }
}

const maintenanceForm = document.getElementById('maintenanceForm');
if (maintenanceForm) {
    maintenanceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoader();
        try {
            await setDoc(doc(db, 'settings', 'maintenance'), {
                enabled: document.getElementById('maintenanceToggle').checked,
                message: document.getElementById('maintenanceMessage').value
            });
            alert('✅ Maintenance settings saved!');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            hideLoader();
        }
    });
}

// ===== 5-PLAYER GROUP API FORM =====
const groupApiForm = document.getElementById('groupApiForm');
if (groupApiForm) {
    groupApiForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoader();
        try {
            const url = document.getElementById('groupApiUrl').value;
            const enabled = document.getElementById('groupApiEnabled').checked;
            
            await setDoc(doc(db, 'settings', 'groupApi'), {
                url: url,
                enabled: enabled,
                updatedAt: new Date()
            });
            
            alert('✅ 5-Player Group API settings saved!');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            hideLoader();
        }
    });
}

// ===== PASSWORD MANAGER =====
const passwordForm = document.getElementById('passwordForm');
if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;
        
        showLoader();
        try {
            const hash = await hashPassword(newPassword);
            await setDoc(doc(db, 'settings', 'loginPassword'), { hash });
            alert('✅ Password updated!\nNew password: ' + newPassword);
            document.getElementById('newPassword').value = '';
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            hideLoader();
        }
    });
}

console.log('🔥 NOVRA X Admin Panel Ready!');

// Check if user is already authenticated
setTimeout(async () => {
    if (auth && auth.currentUser) {
        console.log('👤 User already authenticated, loading data');
        const loginView = document.getElementById('adminLoginView');
        const dashboard = document.getElementById('adminDashboard');
        
        if (loginView) {
            loginView.classList.add('hidden');
        }
        
        if (dashboard) {
            dashboard.classList.remove('hidden');
        }
        
        await loadAllData();
    }
}, 500);

// ===== USER MANAGEMENT =====
let allUsers = [];

// Refresh Users Button
const refreshUsersBtn = document.getElementById('refreshUsersBtn');
if (refreshUsersBtn) {
    refreshUsersBtn.addEventListener('click', loadUsers);
}

// Search and Filter Events
const searchUserInput = document.getElementById('searchUser');
const filterPlanSelect = document.getElementById('filterPlan');

if (searchUserInput) {
    searchUserInput.addEventListener('input', filterUsers);
}

if (filterPlanSelect) {
    filterPlanSelect.addEventListener('change', filterUsers);
}

async function loadUsers() {
    const userList = document.getElementById('userList');
    if (!userList) return;
    
    showLoader();
    
    try {
        const usersCol = collection(db, 'users');
        const snapshot = await getDocs(usersCol);
        
        allUsers = [];
        snapshot.forEach(doc => {
            allUsers.push({ id: doc.id, ...doc.data() });
        });
        
        // Update stats
        updateUserStats();
        
        // Display all users initially
        displayUsers(allUsers);
        
    } catch (error) {
        console.error('User load error:', error);
        userList.innerHTML = '<p class="error-text">Error loading users: ' + error.message + '</p>';
    } finally {
        hideLoader();
    }
}

function updateUserStats() {
    const totalUsers = allUsers.length;
    const today = new Date().toDateString();
    
    // Count users active today
    const activeUsers = allUsers.filter(user => {
        if (user.lastLogin) {
            const lastLoginDate = new Date(user.lastLogin).toDateString();
            return lastLoginDate === today;
        }
        return false;
    }).length;
    
    // Sum total emotes
    const totalEmotes = allUsers.reduce((sum, user) => sum + (user.totalEmotes || 0), 0);
    
    // Update UI
    const totalUsersEl = document.getElementById('totalUsers');
    const activeUsersEl = document.getElementById('activeUsers');
    const totalEmotesEl = document.getElementById('totalEmotesSent');
    
    if (totalUsersEl) totalUsersEl.textContent = totalUsers;
    if (activeUsersEl) activeUsersEl.textContent = activeUsers;
    if (totalEmotesEl) totalEmotesEl.textContent = totalEmotes;
}

function filterUsers() {
    const searchTerm = (document.getElementById('searchUser')?.value || '').toLowerCase();
    const planFilter = document.getElementById('filterPlan')?.value || '';
    
    let filteredUsers = allUsers;
    
    // Apply search filter
    if (searchTerm) {
        filteredUsers = filteredUsers.filter(user => 
            (user.name && user.name.toLowerCase().includes(searchTerm)) ||
            (user.email && user.email.toLowerCase().includes(searchTerm))
        );
    }
    
    // Apply plan filter
    if (planFilter) {
        filteredUsers = filteredUsers.filter(user => user.plan === planFilter);
    }
    
    displayUsers(filteredUsers);
}

function displayUsers(users) {
    const userList = document.getElementById('userList');
    if (!userList) return;
    
    if (users.length === 0) {
        userList.innerHTML = '<p class="no-data">No users found matching your criteria</p>';
        return;
    }
    
    userList.innerHTML = '';
    
    // Sort users by last login (newest first)
    users.sort((a, b) => {
        const dateA = a.lastLogin ? new Date(a.lastLogin) : new Date(0);
        const dateB = b.lastLogin ? new Date(b.lastLogin) : new Date(0);
        return dateB - dateA;
    });
    
    users.forEach(user => {
        const userElement = createUserItem(user);
        userList.appendChild(userElement);
    });
}

function createUserItem(user) {
    const item = document.createElement('div');
    item.className = 'admin-item';
    
    // Format dates
    const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
    const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never';
    
    // Plan styling
    const planNames = {
        'free': 'Free',
        'weekly': 'Weekly',
        'monthly': 'Monthly',
        'lifetime': 'Lifetime'
    };
    
    const planBadge = planNames[user.plan] || user.plan || 'Unknown';
    
    item.innerHTML = `
        <div class="admin-item-info">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <strong>${user.name || 'Unnamed User'}</strong>
                    <div style="color: var(--text-gray); font-size: 13px; margin-top: 5px;">${user.email || 'No email'}</div>
                    <div style="color: var(--text-gray); font-size: 12px; margin-top: 8px;">
                        <div>User ID: ${user.uid || 'N/A'}</div>
                        <div>Plan: <span style="color: ${user.plan === 'free' ? '#f5365c' : '#2dce89'}; font-weight: 600;">${planBadge}</span></div>
                        <div>Created: ${createdAt}</div>
                        <div>Last Login: ${lastLogin}</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 18px; font-weight: 700; margin-bottom: 5px;">${user.totalEmotes || 0}</div>
                    <div style="font-size: 12px; color: var(--text-gray);">Total Emotes</div>
                    <div style="font-size: 18px; font-weight: 700; margin-top: 10px;">${user.emotesSentToday || 0}</div>
                    <div style="font-size: 12px; color: var(--text-gray);">Today</div>
                </div>
            </div>
        </div>
        <div class="admin-item-actions">
            <button class="action-icon-btn pin" data-action="editUser" data-id="${user.id}" title="Edit User">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
                </svg>
            </button>
            <button class="action-icon-btn close" data-action="deleteUser" data-id="${user.id}" title="Delete User">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M18 6L6 18M6 6l12 12" stroke-width="2"/>
                </svg>
            </button>
        </div>
    `;
    
    // Add event listeners
    const editBtn = item.querySelector('[data-action="editUser"]');
    const deleteBtn = item.querySelector('[data-action="deleteUser"]');
    
    editBtn.addEventListener('click', () => {
        editUser(user);
    });
    
    deleteBtn.addEventListener('click', () => {
        deleteUser(user.id, user.email || user.name);
    });
    
    return item;
}

function editUser(user) {
    // Create modal for editing user
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.className = 'panel-section';
    modalContent.style.cssText = `
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
    `;
    
    const planNames = {
        'free': 'Free',
        'weekly': 'Weekly',
        'monthly': 'Monthly',
        'lifetime': 'Lifetime'
    };
    
    modalContent.innerHTML = `
        <div class="section-title">
            <h2>Edit User: ${user.name || user.email}</h2>
        </div>
        <form id="editUserForm" class="admin-form">
            <input type="hidden" id="editUserId" value="${user.id}">
            <div class="form-grid">
                <input type="text" id="editUserName" placeholder="User Name" value="${user.name || ''}" class="config-input">
                <input type="email" id="editUserEmail" placeholder="Email" value="${user.email || ''}" class="config-input" readonly>
            </div>
            <div class="form-grid">
                <select id="editUserPlan" class="config-input">
                    <option value="free" ${user.plan === 'free' ? 'selected' : ''}>Free Plan</option>
                    <option value="weekly" ${user.plan === 'weekly' ? 'selected' : ''}>Weekly Plan</option>
                    <option value="monthly" ${user.plan === 'monthly' ? 'selected' : ''}>Monthly Plan</option>
                    <option value="lifetime" ${user.plan === 'lifetime' ? 'selected' : ''}>Lifetime Plan</option>
                </select>
                <input type="number" id="editUserEmotesToday" placeholder="Emotes Today" value="${user.emotesSentToday || 0}" class="config-input" min="0">
            </div>
            <input type="number" id="editUserTotalEmotes" placeholder="Total Emotes" value="${user.totalEmotes || 0}" class="config-input" min="0">
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="submit" class="action-btn-large" style="flex: 1;">Save Changes</button>
                <button type="button" id="cancelEditUser" class="squad-btn leave" style="flex: 1;">Cancel</button>
            </div>
        </form>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Add event listeners
    const editForm = document.getElementById('editUserForm');
    const cancelBtn = document.getElementById('cancelEditUser');
    
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userId = document.getElementById('editUserId').value;
        const name = document.getElementById('editUserName').value;
        const plan = document.getElementById('editUserPlan').value;
        const emotesToday = parseInt(document.getElementById('editUserEmotesToday').value) || 0;
        const totalEmotes = parseInt(document.getElementById('editUserTotalEmotes').value) || 0;
        
        showLoader();
        
        try {
            await updateDoc(doc(db, 'users', userId), {
                name: name,
                plan: plan,
                emotesSentToday: emotesToday,
                totalEmotes: totalEmotes
            });
            
            alert('✅ User updated successfully!');
            document.body.removeChild(modal);
            loadUsers(); // Refresh the user list
        } catch (error) {
            alert('❌ Error updating user: ' + error.message);
        } finally {
            hideLoader();
        }
    });
    
    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

async function deleteUser(userId, userName) {
    if (confirm(`❌ Are you sure you want to delete user: ${userName}? This action cannot be undone.`)) {
        showLoader();
        
        try {
            await deleteDoc(doc(db, 'users', userId));
            alert('✅ User deleted successfully!');
            loadUsers(); // Refresh the user list
        } catch (error) {
            alert('❌ Error deleting user: ' + error.message);
        } finally {
            hideLoader();
        }
    }
}

// Load users when dashboard is shown
const dashboard = document.getElementById('adminDashboard');
dashboard?.addEventListener('DOMSubtreeModified', () => {
    if (!document.getElementById('userList').innerHTML.includes('Click "Refresh Users"')) {
        loadUsers();
    }
});

// ===== ADMIN SIDEBAR FUNCTIONALITY =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Admin DOM loaded');
    
    // Wait a bit more to ensure all elements are rendered
    setTimeout(() => {
        initializeAdminPanel();
    }, 100);
});

function initializeAdminPanel() {
    console.log('🔧 Initializing admin panel');
    
    // Section switching
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.admin-section');
    
    console.log('🔍 Admin nav links found:', navLinks.length);
    console.log('🔍 Admin sections found:', sections.length);
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            console.log('_CLICKED nav link:', link.getAttribute('data-section'));
            
            // Remove active class from all links and sections
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked link
            link.classList.add('active');
            
            // Show corresponding section
            const sectionId = link.getAttribute('data-section') + 'Section';
            const section = document.getElementById(sectionId);
            
            console.log('_SWITCHING to section:', sectionId, section);
            
            if (section) {
                section.classList.add('active');
            } else {
                console.error('❌ Section not found:', sectionId);
            }
            
            // Close sidebar on mobile
            const sidebar = document.querySelector('.modern-sidebar');
            if (sidebar && window.innerWidth <= 768) {
                sidebar.classList.remove('visible');
            }
        });
    });
    
    // Sidebar toggle buttons
    const sidebarToggle = document.getElementById('adminSidebarToggle');
    const sidebarClose = document.getElementById('adminSidebarClose');
    const sidebarBackdrop = document.getElementById('adminSidebarBackdrop');
    const sidebar = document.querySelector('.modern-sidebar');
    
    console.log('🔍 Sidebar elements:', { sidebarToggle, sidebarClose, sidebarBackdrop, sidebar });
    
    function toggleSidebar() {
        console.log('🔄 Toggling sidebar');
        if (sidebar) {
            sidebar.classList.toggle('visible');
            if (sidebarBackdrop) {
                sidebarBackdrop.classList.toggle('visible');
            }
            console.log('Sidebar visible:', sidebar.classList.contains('visible'));
        }
    }
    
    function closeSidebar() {
        console.log('🚫 Closing sidebar');
        if (sidebar) {
            sidebar.classList.remove('visible');
            if (sidebarBackdrop) {
                sidebarBackdrop.classList.remove('visible');
            }
        }
    }
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    if (sidebarClose) {
        sidebarClose.addEventListener('click', closeSidebar);
    }
    
    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', closeSidebar);
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (sidebar && window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && 
                !e.target.closest('#adminSidebarToggle') && 
                sidebar.classList.contains('visible')) {
                closeSidebar();
            }
        }
    });
    
    // Refresh button
    const refreshBtn = document.getElementById('adminRefreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            console.log('🔄 Refresh button clicked');
            showLoader();
            try {
                await loadAllData();
                // Also refresh users if on user management section
                const activeSection = document.querySelector('.admin-section.active');
                console.log('Current active section:', activeSection?.id);
                if (activeSection && activeSection.id === 'usersSection') {
                    console.log('🔄 Refreshing users');
                    await loadUsers();
                }
            } catch (error) {
                console.error('❌ Refresh error:', error);
                // Show error to user
                alert('❌ Error refreshing data: ' + error.message);
            } finally {
                hideLoader();
            }
        });
    }
}
