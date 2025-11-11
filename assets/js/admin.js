// assets/js/admin.js

// Admin functionality dengan Firestore admin verification
let currentUser = null;

// Initialize admin panel
function initAdminPanel() {
    // Check authentication state
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                // Check if user is in admins collection
                const adminDoc = await db.collection('admins').doc(user.email).get();
                
                if (adminDoc.exists) {
                    // ✅ ADMIN ACCESS GRANTED
                    currentUser = user;
                    document.getElementById('auth-section').classList.add('d-none');
                    document.getElementById('admin-panel').classList.remove('d-none');
                    loadGameSlugs();
                    loadAdminList(); // Load list of admins
                    
                    console.log('✅ Admin access granted:', user.email);
                } else {
                    // ❌ NOT ADMIN - Show access denied
                    showAccessDenied(user.email);
                    auth.signOut();
                }
            } catch (error) {
                console.error('Error checking admin access:', error);
                showAccessDenied(user.email);
                auth.signOut();
            }
        } else {
            // Not logged in
            currentUser = null;
            document.getElementById('auth-section').classList.remove('d-none');
            document.getElementById('admin-panel').classList.add('d-none');
        }
    });
    
    // Set up Google sign-in
    document.getElementById('google-signin-btn').addEventListener('click', signInWithGoogle);
    
    // Set up form submissions
    document.getElementById('game-form').addEventListener('submit', handleGameSubmit);
    document.getElementById('chapter-form').addEventListener('submit', handleChapterSubmit);
}

// Sign in with Google
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            console.log('Signed in successfully:', result.user.email);
            // Verification akan dilakukan di authStateChanged
        })
        .catch((error) => {
            console.error('Error signing in:', error);
            alert('Error signing in: ' + error.message);
        });
}

// Show access denied message
function showAccessDenied(userEmail) {
    document.getElementById('auth-section').innerHTML = `
        <div class="card bg-dark">
            <div class="card-body text-center">
                <div class="mb-3">
                    <i class="bi bi-shield-x display-1 text-danger"></i>
                </div>
                <h4 class="text-danger">Access Denied</h4>
                <p class="mb-3">Admin panel access is restricted to authorized users only.</p>
                <p class="text-muted small">Logged in as: ${userEmail}</p>
                <button onclick="firebase.auth().signOut()" class="btn btn-outline-secondary btn-sm">
                    <i class="bi bi-box-arrow-right me-1"></i> Sign Out
                </button>
            </div>
        </div>
    `;
}

// Function to upload image via Netlify Function
async function uploadToImgBB(imageFile) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            try {
                const imageData = e.target.result;
                
                // ✅ Gunakan Netlify Function, bukan direct API call
                const response = await fetch('/.netlify/functions/imgbb-upload', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        image: imageData,
                        fileName: imageFile.name || 'game-thumbnail.jpg'
                    })
                });

                const data = await response.json();
                
                if (data.success) {
                    resolve(data.url);
                } else {
                    reject(new Error(data.error || 'Upload failed'));
                }
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(imageFile);
    });
}

// ✅ FUNCTION TO GENERATE SLUG
function generateSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')     // Remove invalid chars
        .replace(/\s+/g, '-')            // Replace spaces with -
        .replace(/-+/g, '-')             // Replace multiple - with single -
        .replace(/^-+/, '')              // Trim - from start
        .replace(/-+$/, '')              // Trim - from end
        .trim();
}

// Handle game form submission dengan Netlify Function upload
async function handleGameSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('game-title').value;
    let slug = document.getElementById('game-slug').value; // pakai let, bukan const
    const description = document.getElementById('game-description').value;
    const thumbnailFile = document.getElementById('game-thumbnail').files[0];
    
    // ✅ AUTO-GENERATE SLUG JIKA KOSONG
    if (!slug && title) {
        slug = generateSlug(title);
        document.getElementById('game-slug').value = slug; // Update field juga
        console.log('✅ Auto-generated slug:', slug);
    }
    
    // Get included sections
    const includes = [];
    if (document.getElementById('main-story-check').checked) includes.push('main_story');
    if (document.getElementById('character-story-check').checked) includes.push('character_story');
    if (document.getElementById('side-story-check').checked) includes.push('side_story');
    if (document.getElementById('event-story-check').checked) includes.push('event_story');
    
    // Validate form
    if (!title || !slug || !description) {
        alert('Please fill in all required fields');
        return;
    }

    if (!thumbnailFile) {
        alert('Please select a thumbnail image');
        return;
    }

    // Validate file size (max 32MB)
    if (thumbnailFile.size > 32 * 1024 * 1024) {
        alert('File size too large. Maximum 32MB allowed.');
        return;
    }

    // Validate file type
    if (!thumbnailFile.type.startsWith('image/')) {
        alert('Please select a valid image file (PNG, JPG, GIF)');
        return;
    }

    // ✅ VALIDATE SLUG FORMAT
    if (!/^[a-z0-9-]+$/.test(slug)) {
        alert('Slug can only contain lowercase letters, numbers, and hyphens');
        return;
    }

    try {
        // Show loading state
        const submitBtn = document.getElementById('game-submit-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Uploading Image...';

        // Upload image via Netlify Function
        const thumbnailURL = await uploadToImgBB(thumbnailFile);
        
        // Update button text
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Saving Game...';
        
        // Save game to Firestore dengan URL dari ImgBB
        await saveGameToFirestore(title, slug, description, includes, thumbnailURL);
        
        // Success
        alert('✅ Game created successfully!');
        document.getElementById('game-form').reset();
        clearFileUpload();
        
        // Reload game slugs for chapter form
        loadGameSlugs();
        
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error: ' + error.message);
    } finally {
        // Reset button
        const submitBtn = document.getElementById('game-submit-btn');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Create Game';
    }
}

// Save game to Firestore
function saveGameToFirestore(title, slug, description, includes, thumbnailURL) {
    const gameData = {
        title: title,
        slug: slug,
        description: description,
        includes: includes,
        thumbnailURL: thumbnailURL,
        popularity: 100,
        sections: {
            main_story: [],
            character_story: [],
            side_story: [],
            event_story: []
        },
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: currentUser.uid,
        createdByEmail: currentUser.email
    };
    
    return db.collection("games").add(gameData);
}

// Handle chapter form submission
function handleChapterSubmit(e) {
    e.preventDefault();
    
    const gameSlug = document.getElementById('chapter-game-slug').value;
    const section = document.getElementById('chapter-section').value;
    const title = document.getElementById('chapter-title').value;
    const content = document.getElementById('chapter-content').value;
    
    if (!gameSlug || !section || !title || !content) {
        alert('Please fill in all required fields');
        return;
    }

    // Show loading
    const submitBtn = document.getElementById('chapter-submit-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Adding Chapter...';

    // Find the game document by slug
    db.collection("games").where("slug", "==", gameSlug).get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                throw new Error('Game not found');
            }
            
            const gameDoc = querySnapshot.docs[0];
            const gameData = gameDoc.data();
            
            // Create the chapter object
            const chapter = {
                title: title,
                content: content,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: currentUser.uid,
                createdByEmail: currentUser.email
            };
            
            // Add the chapter to the appropriate section
            const updatedSections = {...gameData.sections};
            if (!updatedSections[section]) {
                updatedSections[section] = [];
            }
            updatedSections[section].push(chapter);
            
            // Update the game document
            return db.collection("games").doc(gameDoc.id).update({
                sections: updatedSections
            });
        })
        .then(() => {
            alert('✅ Chapter added successfully!');
            document.getElementById('chapter-form').reset();
            
        })
        .catch((error) => {
            console.error("Error adding chapter: ", error);
            alert('❌ Error adding chapter: ' + error.message);
        })
        .finally(() => {
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Add Chapter';
        });
}

// Load game slugs for dropdown
function loadGameSlugs() {
    db.collection("games").orderBy("createdAt", "desc").get()
        .then((querySnapshot) => {
            const gameSlugSelect = document.getElementById('chapter-game-slug');
            gameSlugSelect.innerHTML = '<option value="">Select a game</option>';
            
            querySnapshot.forEach((doc) => {
                const game = doc.data();
                const option = document.createElement('option');
                option.value = game.slug;
                option.textContent = game.title;
                gameSlugSelect.appendChild(option);
            });
        })
        .catch((error) => {
            console.error("Error loading game slugs: ", error);
        });
}

// Clear file upload (helper function)
function clearFileUpload() {
    document.getElementById('game-thumbnail').value = '';
    document.getElementById('upload-placeholder').style.display = 'block';
    document.getElementById('upload-preview').style.display = 'none';
}

// ==================== ADMIN MANAGEMENT FUNCTIONS ====================

// Function to add new admin
async function addAdmin() {
    const newAdminEmail = document.getElementById('new-admin-email').value;
    const newAdminName = document.getElementById('new-admin-name').value;
    
    if (!newAdminEmail || !newAdminName) {
        alert('Please fill in both email and name');
        return;
    }
    
    // Validate email format
    if (!newAdminEmail.includes('@')) {
        alert('Please enter a valid email address');
        return;
    }
    
    try {
        // Check if admin already exists
        const existingAdmin = await db.collection('admins').doc(newAdminEmail).get();
        if (existingAdmin.exists) {
            alert('❌ Admin with this email already exists!');
            return;
        }
        
        // Add to admins collection
        await db.collection('admins').doc(newAdminEmail).set({
            email: newAdminEmail,
            name: newAdminName,
            role: 'admin',
            addedAt: firebase.firestore.FieldValue.serverTimestamp(),
            addedBy: currentUser.email
        });
        
        alert('✅ Admin added successfully!');
        document.getElementById('new-admin-email').value = '';
        document.getElementById('new-admin-name').value = '';
        
        // Refresh admin list
        loadAdminList();
        
    } catch (error) {
        console.error('Error adding admin:', error);
        alert('❌ Error adding admin: ' + error.message);
    }
}

// Function to load admin list
async function loadAdminList() {
    try {
        const querySnapshot = await db.collection('admins').orderBy('addedAt', 'desc').get();
        const adminList = document.getElementById('admin-list');
        
        adminList.innerHTML = '';
        
        if (querySnapshot.empty) {
            adminList.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-people display-6"></i>
                    <p>No admins found</p>
                </div>
            `;
            return;
        }
        
        querySnapshot.forEach((doc) => {
            const admin = doc.data();
            const adminItem = document.createElement('div');
            adminItem.className = 'admin-item d-flex justify-content-between align-items-center p-3 border-bottom';
            adminItem.innerHTML = `
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center">
                        <strong>${admin.name}</strong>
                        <span class="badge ${admin.role === 'superadmin' ? 'bg-warning' : 'bg-primary'} ms-2">${admin.role}</span>
                    </div>
                    <div class="text-muted small">${admin.email}</div>
                    <div class="text-muted smaller">Added: ${formatDate(admin.addedAt?.toDate())} by ${admin.addedBy || 'system'}</div>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-danger" onclick="removeAdmin('${admin.email}')" 
                            ${admin.role === 'superadmin' || admin.email === currentUser.email ? 'disabled' : ''}
                            title="${admin.role === 'superadmin' ? 'Cannot remove superadmin' : admin.email === currentUser.email ? 'Cannot remove yourself' : 'Remove admin'}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
            adminList.appendChild(adminItem);
        });
        
    } catch (error) {
        console.error('Error loading admin list:', error);
        document.getElementById('admin-list').innerHTML = `
            <div class="alert alert-danger">
                Error loading admin list: ${error.message}
            </div>
        `;
    }
}

// Function to remove admin
async function removeAdmin(email) {
    if (email === currentUser.email) {
        alert('You cannot remove yourself!');
        return;
    }
    
    if (!confirm(`Are you sure you want to remove ${email} as admin?`)) {
        return;
    }
    
    try {
        await db.collection('admins').doc(email).delete();
        alert('✅ Admin removed successfully!');
        loadAdminList();
    } catch (error) {
        console.error('Error removing admin:', error);
        alert('❌ Error removing admin: ' + error.message);
    }
}

// Helper function to format date
function formatDate(date) {
    if (!date) return 'Unknown';
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Sign out function
function signOut() {
    auth.signOut().then(() => {
        console.log('Signed out successfully');
    }).catch((error) => {
        console.error('Error signing out:', error);
    });
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', initAdminPanel);