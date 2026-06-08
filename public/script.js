// =============================================
// Eagle Sports - Main Script (Backend Integrated)
// =============================================

const API_URL = '/api';

// ---- Data Fetching Helpers ----

async function fetchCatalog() {
    try {
        const response = await fetch(`${API_URL}/jerseys`);
        if (!response.ok) throw new Error('Failed to fetch catalog');
        return await response.json();
    } catch (error) {
        console.error('Error fetching catalog:', error);
        return [];
    }
}

// ---- HOMEPAGE: Render category cards ----

function renderCategories() {
    const container = document.getElementById('catalog-container');
    if (!container) return;

    const staticCategories = [
        { name: 'Volleyball', link: 'choice.html?category=Volleyball', image: 'assets/volleyball_jersey.png' },
        { name: 'Basketball', link: 'choice.html?category=Basketball', image: 'assets/basketball_jersey.png' },
        { name: 'Kabaddi', link: 'choice.html?category=Kabaddi', image: 'assets/kabaddi_jersey.png' },
        { name: 'Cricket Jerseys', link: 'choice.html?category=Cricket%20Jerseys', image: 'assets/cricket_jersey.png' },
        { name: 'Festival Design', link: 'choice.html?category=Festival%20Design', image: 'assets/festival_jersey.png' },
        { name: 'Special Jerseys', link: 'choice.html?category=Special%20Jerseys', image: 'assets/special_jersey.png' }
    ];

    let html = '<div class="main-grid">';
    staticCategories.forEach(cat => {
        html += `
            <a href="${cat.link}" class="card category-card">
                <img src="${cat.image}" alt="${cat.name}" class="card-img" loading="lazy">
                <h3 class="category-title-large">${cat.name}</h3>
            </a>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// ---- CATEGORY PAGE: Render jerseys ----

async function renderJerseysByCategory(categoryName, page = 1) {
    const grid = document.getElementById('jersey-grid');
    const emptyMsg = document.getElementById('empty-message');
    if (!grid) return;

    const catalog = await fetchCatalog();
    const items = catalog.filter(item =>
        item.category.toLowerCase() === categoryName.toLowerCase()
    );

    const totalItems = items.length;
    const itemsPerPage = 20;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    let paginationEl = document.getElementById('pagination-controls');

    if (totalItems === 0) {
        grid.innerHTML = '';
        if (emptyMsg) emptyMsg.style.display = 'block';
        if (paginationEl) paginationEl.style.display = 'none';
        return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = items.slice(startIndex, endIndex);

    let html = '';
    paginatedItems.forEach(item => {
        const imgUrl = item.image.startsWith('http') ? item.image : `/${item.image}`;
        let cardClass = 'clean-card';
        if (categoryName === 'Basketball Traditional' || categoryName === 'Basketball - Collection 1') {
            cardClass = 'traditional-card';
        } else if (categoryName === 'Basketball - Collection 2' || categoryName === 'Basketball - Collection 3') {
            cardClass = 'basketball-col2-card';
        }
        html += `
            <div class="card ${cardClass}" style="cursor: pointer;" onclick="openImageModal('${imgUrl}')">
                <img src="${imgUrl}" alt="${item.name}" class="card-img" loading="lazy">
            </div>
        `;
    });
    grid.innerHTML = html;

    if (totalPages > 1) {
        if (!paginationEl) {
            paginationEl = document.createElement('div');
            paginationEl.id = 'pagination-controls';
            paginationEl.className = 'pagination-controls';
            grid.parentNode.insertBefore(paginationEl, grid.nextSibling);
        }
        paginationEl.innerHTML = `
            <button class="btn-pagination" ${page === 1 ? 'disabled' : ''} onclick="changeCollectionPage('${categoryName}', ${page - 1})">← Prev</button>
            <span class="pagination-info">Page ${page} of ${totalPages}</span>
            <button class="btn-pagination" ${page === totalPages ? 'disabled' : ''} onclick="changeCollectionPage('${categoryName}', ${page + 1})">Next →</button>
        `;
        paginationEl.style.display = 'flex';
    } else {
        if (paginationEl) paginationEl.style.display = 'none';
    }
}

// Make globally available for inline onclick attributes
window.changeCollectionPage = function (categoryName, newPage) {
    renderJerseysByCategory(categoryName, newPage);
    const mainSection = document.querySelector('.catalog-section');
    if (mainSection) {
        mainSection.scrollIntoView({ behavior: 'smooth' });
    }
};

// ---- LIGHTBOX / IMAGE MODAL ----
window.openImageModal = function(imgSrc) {
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('expanded-image');
    if (!modal || !modalImg) return;

    // Preload the image, then show modal instantly
    const preload = new Image();
    preload.onload = function() {
        modalImg.src = imgSrc;
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    };
    preload.src = imgSrc;

    // Also set src immediately in case image is cached
    if (preload.complete) {
        modalImg.src = imgSrc;
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }
};

window.closeImageModal = function() {
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.classList.remove('show');
    }
};

// Close on backdrop click or Escape key
document.addEventListener('click', function(e) {
    const modal = document.getElementById('image-modal');
    if (e.target === modal) {
        closeImageModal();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeImageModal();
    }
});

// ---- AUTHENTICATION ----
function getToken() {
    return localStorage.getItem('eagleAdminToken');
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const msgEl = document.getElementById('login-message');

    fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                msgEl.textContent = data.error;
                msgEl.className = 'message error';
            } else if (data.token) {
                localStorage.setItem('eagleAdminToken', data.token);
                msgEl.textContent = 'Login successful! Redirecting...';
                msgEl.className = 'message success';
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 1000);
            }
        })
        .catch(err => {
            msgEl.textContent = 'Server error. Please try again.';
            msgEl.className = 'message error';
        });
}

window.logout = function () {
    localStorage.removeItem('eagleAdminToken');
    window.location.href = 'login.html';
};

function checkAdminAccess() {
    if (window.location.pathname.includes('admin.html')) {
        const token = getToken();
        if (!token) {
            window.location.href = 'login.html';
        } else {
            renderAdminCatalog();
        }
    }
}

// ---- ADMIN: Handle Upload ----

async function handleUpload(e) {
    e.preventDefault();

    const nameInput = document.getElementById('jersey-name');
    const categoryInput = document.getElementById('jersey-category');
    const subCollectionInput = document.getElementById('jersey-subcollection');
    const fileInput = document.getElementById('jersey-image-file');
    const token = getToken();

    if (!token) {
        showMessage('Please log in first.', 'error');
        return;
    }

    if (!fileInput.files || fileInput.files.length === 0) {
        showMessage('Please select an image file.', 'error');
        return;
    }

    let finalCategory = categoryInput.value;
    if (subCollectionInput && subCollectionInput.value) {
        finalCategory = categoryInput.value + ' - ' + subCollectionInput.value;
    }

    const formData = new FormData();
    formData.append('name', nameInput.value);
    formData.append('category', finalCategory);
    formData.append('image', fileInput.files[0]);

    try {
        const response = await fetch(`${API_URL}/jerseys`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Jersey uploaded successfully!', 'success');
            document.getElementById('upload-form').reset();
            const preview = document.getElementById('image-preview');
            if (preview) {
                preview.src = '';
                preview.style.display = 'none';
            }
            document.getElementById('upload-placeholder').style.display = 'flex';

            // Re-render
            renderAdminCatalog();
            if (typeof renderAdminStats === 'function') {
                renderAdminStats();
            }
        } else {
            showMessage('Error: ' + data.error, 'error');
        }
    } catch (error) {
        showMessage('Upload failed. Is the server running?', 'error');
    }
}

function showMessage(msg, type) {
    const messageEl = document.getElementById('upload-message');
    if (!messageEl) return;
    messageEl.textContent = msg;
    messageEl.className = 'message ' + type;
    setTimeout(function () {
        messageEl.textContent = '';
        messageEl.className = 'message';
    }, 4000);
}

// ---- ADMIN: Render catalog with delete buttons ----

window.fetchCatalog = fetchCatalog; // Export for inline usage in admin.html

async function renderAdminCatalog() {
    const container = document.getElementById('admin-catalog-container');
    if (!container) return;

    const catalog = await fetchCatalog();
    const grouped = {};

    catalog.forEach(function (item) {
        if (!grouped[item.category]) {
            grouped[item.category] = [];
        }
        grouped[item.category].push(item);
    });

    let html = '';
    for (const category in grouped) {
        const items = grouped[category];
        html += '<div class="admin-category-group">';
        html += '<h3 class="admin-category-title">' + category + ' (' + items.length + ')</h3>';
        html += '<div class="admin-grid">';
        items.forEach(function (item) {
            const imgUrl = item.image.startsWith('http') ? item.image : `/${item.image}`;
            html += '<div class="admin-item-card" id="item-' + item.id + '">';
            html += '  <img src="' + imgUrl + '" alt="' + item.name + '" class="admin-item-img" crossorigin="anonymous">';
            html += '  <div class="admin-item-info">';
            html += '    <span class="admin-item-name">' + item.name + '</span>';
            html += '    <button class="btn-delete" onclick="deleteJersey(' + item.id + ')">✕ Delete</button>';
            html += '  </div>';
            html += '</div>';
        });
        html += '</div></div>';
    }

    if (catalog.length === 0) {
        html = '<p style="text-align:center; color:#94a3b8;">No jerseys in the catalog yet.</p>';
    }

    container.innerHTML = html;
}

window.deleteJersey = async function (id) {
    if (!confirm('Are you sure you want to delete this jersey?')) return;

    const token = getToken();
    if (!token) return showMessage('Please log in first.', 'error');

    try {
        const response = await fetch(`${API_URL}/jerseys/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            renderAdminCatalog();
            if (typeof renderAdminStats === 'function') {
                renderAdminStats();
            }
        } else {
            const data = await response.json();
            alert('Error deleting: ' + data.error);
        }
    } catch (err) {
        alert('Server error.');
    }
};

// ---- Init on page load ----

document.addEventListener('DOMContentLoaded', function () {
    checkAdminAccess();

    renderCategories();

    // Handle Dynamic Choice Page
    const pageTitle = document.title.toLowerCase();
    if (pageTitle.includes('options | eagle sports') && window.location.pathname.includes('choice.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');
        if (category) {
            document.getElementById('choice-title').textContent = category + ' Views';
            const choiceGrid = document.getElementById('choice-grid');
            
            const collections = ['Collection 1', 'Collection 2', 'Collection 3', 'Collection 4'];
            const images = ['assets/kobe2.jpg', 'assets/kobe3.jpg', 'assets/kobe4.jpg', 'assets/kobe5.jpg']; // Default placeholders
            
            let html = '';
            collections.forEach((sub, index) => {
                const encCategory = encodeURIComponent(category);
                const encSub = encodeURIComponent(sub);
                html += `
                    <a href="gallery.html?category=${encCategory}&sub=${encSub}" class="card category-card">
                        <img src="${images[index]}" alt="${sub}" class="card-img" loading="lazy">
                        <h3 class="category-title-large">${sub}</h3>
                    </a>
                `;
            });
            choiceGrid.innerHTML = html;
        }
    }

    // Handle Dynamic Gallery Page
    if (pageTitle.includes('gallery | eagle sports') && window.location.pathname.includes('gallery.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');
        const sub = urlParams.get('sub');
        if (category && sub) {
            document.getElementById('gallery-title').textContent = category;
            document.getElementById('gallery-subtitle').textContent = sub;
            const backBtn = document.getElementById('back-to-choices');
            if (backBtn) {
                backBtn.href = `choice.html?category=${encodeURIComponent(category)}`;
                backBtn.style.display = 'inline-block';
            }
            renderJerseysByCategory(category + ' - ' + sub);
        }
    }

    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Admin form
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUpload);
        // Add logout button
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            const logoutBtn = document.createElement('a');
            logoutBtn.href = "#";
            logoutBtn.className = "btn-outline";
            logoutBtn.textContent = "Logout";
            logoutBtn.onclick = logout;
            navLinks.appendChild(logoutBtn);
        }
    }
});
