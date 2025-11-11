// assets/js/admin.js

// Admin functionality dengan Netlify Function upload
let currentUser = null;

// Initialize admin panel
function initAdminPanel() {
    // Check authentication state
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            document.getElementById('auth-section').classList.add('d-none');
            document.getElementById('admin-panel').classList.remove('d-none');
            loadGameSlugs();
            
            console.log('Admin logged in:', user.email);
        } else {
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
            console.log('Signed in successfully:', result.user);
        })
        .catch((error) => {
            console.error('Error signing in:', error);
            alert('Error signing in: ' + error.message);
        });
}

// Function to upload image via Netlify Function
async function uploadToImgBB(imageFile) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            try {
                const imageData = e.target.result;
                
                // ✅ BENAR - Gunakan Netlify Function, bukan direct API call
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

// Handle game form submission dengan Netlify Function upload
async function handleGameSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('game-title').value;
    const slug = document.getElementById('game-slug').value;
    const description = document.getElementById('game-description').value;
    const thumbnailFile = document.getElementById('game-thumbnail').files[0];
    
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

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', initAdminPanel);