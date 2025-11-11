// Load games from Firestore
function loadGames() {
    db.collection("games").orderBy("popularity", "desc").get()
        .then((querySnapshot) => {
            const gamesContainer = document.getElementById("games-container");
            const footerGamesList = document.getElementById("footer-games-list");
            
            gamesContainer.innerHTML = '';
            footerGamesList.innerHTML = '';
            
            querySnapshot.forEach((doc) => {
                const game = doc.data();
                game.id = doc.id;
                
                // Create game card for popular games section
                const gameCard = document.createElement('div');
                gameCard.className = 'col-md-6 col-lg-4 mb-4';
                gameCard.innerHTML = `
                    <div class="card game-card bg-dark h-100">
                        <img src="${game.thumbnailURL}" class="card-img-top" alt="${game.title}">
                        <div class="card-body">
                            <h5 class="card-title">${game.title}</h5>
                            <p class="card-text">${game.description}</p>
                            <a href="game.html?slug=${game.slug}" class="btn btn-primary">View Details</a>
                        </div>
                    </div>
                `;
                gamesContainer.appendChild(gameCard);
                
                // Add game to footer list
                const footerGameItem = document.createElement('div');
                footerGameItem.className = 'col-6 col-md-4 mb-2';
                footerGameItem.innerHTML = `<a href="game.html?slug=${game.slug}" class="text-decoration-none">${game.title}</a>`;
                footerGamesList.appendChild(footerGameItem);
            });
        })
        .catch((error) => {
            console.error("Error loading games: ", error);
        });
}

// Load game profile
function loadGameProfile() {
    const urlParams = new URLSearchParams(window.location.search);
    const gameSlug = urlParams.get('slug');
    
    if (!gameSlug) {
        window.location.href = 'index.html';
        return;
    }
    
    db.collection("games").where("slug", "==", gameSlug).get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                window.location.href = 'index.html';
                return;
            }
            
            const gameDoc = querySnapshot.docs[0];
            const game = gameDoc.data();
            game.id = gameDoc.id;
            
            // Update page title
            document.title = `${game.title} - Exeloth Codex`;
            
            // Render game profile
            const gameProfileContainer = document.getElementById('game-profile-container');
            gameProfileContainer.innerHTML = `
                <div class="row">
                    <div class="col-md-4">
                        <img src="${game.thumbnailURL}" class="img-fluid rounded" alt="${game.title}">
                    </div>
                    <div class="col-md-8">
                        <h1 class="display-5 fw-bold">${game.title}</h1>
                        <p class="lead">${game.description}</p>
                        <div class="mb-4">
                            <h5>Story Sections Included:</h5>
                            ${game.includes && game.includes.includes('main_story') ? '<span class="badge-section">📘 Main Story</span>' : ''}
                            ${game.includes && game.includes.includes('character_story') ? '<span class="badge-section">👤 Character Story</span>' : ''}
                            ${game.includes && game.includes.includes('side_story') ? '<span class="badge-section">🌿 Side Story</span>' : ''}
                            ${game.includes && game.includes.includes('event_story') ? '<span class="badge-section">🎉 Event Story</span>' : ''}
                        </div>
                    </div>
                </div>
            `;
            
            // Render story sections
            const storySectionsContainer = document.getElementById('story-sections-container');
            let storySectionsHTML = '';
            
            if (game.sections) {
                if (game.sections.main_story && game.sections.main_story.length > 0) {
                    storySectionsHTML += renderStorySection('main_story', '📘 Main Story', game.sections.main_story);
                }
                
                if (game.sections.character_story && game.sections.character_story.length > 0) {
                    storySectionsHTML += renderStorySection('character_story', '👤 Character Story', game.sections.character_story);
                }
                
                if (game.sections.side_story && game.sections.side_story.length > 0) {
                    storySectionsHTML += renderStorySection('side_story', '🌿 Side Story', game.sections.side_story);
                }
                
                if (game.sections.event_story && game.sections.event_story.length > 0) {
                    storySectionsHTML += renderStorySection('event_story', '🎉 Event Story', game.sections.event_story);
                }
            }
            
            storySectionsContainer.innerHTML = storySectionsHTML;
            
            // Add event listeners to chapter items
            document.querySelectorAll('.chapter-item').forEach(item => {
                item.addEventListener('click', function() {
                    const chapterTitle = this.getAttribute('data-title');
                    const chapterContent = this.getAttribute('data-content');
                    
                    document.getElementById('chapterModalTitle').textContent = chapterTitle;
                    document.getElementById('chapterModalContent').innerHTML = chapterContent;
                    
                    const chapterModal = new bootstrap.Modal(document.getElementById('chapterModal'));
                    chapterModal.show();
                });
            });
        })
        .catch((error) => {
            console.error("Error loading game profile: ", error);
        });
}

// Render a story section
function renderStorySection(sectionId, sectionTitle, chapters) {
    let html = `
        <div class="story-section">
            <h3 class="mb-4">${sectionTitle}</h3>
            <div class="row">
    `;
    
    chapters.forEach(chapter => {
        html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="chapter-item" data-title="${chapter.title}" data-content="${chapter.content}">
                    <h5>${chapter.title}</h5>
                    <p class="text-muted mb-0">Click to read</p>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

// Initialize based on current page
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        loadGames();
    } else if (window.location.pathname.endsWith('game.html')) {
        loadGameProfile();
    }
});