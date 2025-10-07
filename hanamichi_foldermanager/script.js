// ===== CONFIG =====
const CLIENT_ID = '1046331761757-jmmi5nscf9joidvp7b0c3r4fqs57hgnc.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';
const ROOT_FOLDER_ID = '10pKUCnNT-IDo-yVWComadVC8STv3He5X'; // 2025 folder

let tokenClient;
let token = null;
let currentFolderId = ROOT_FOLDER_ID;
let folderStack = []; // for breadcrumb/back button

// DOM ELEMENTS
const loginModal = document.getElementById('loginModal');
const loginBtn = document.getElementById('loginBtn');
const folderContainer = document.getElementById('folderContainer');
const breadcrumb = document.getElementById('breadcrumb');
const backBtn = document.getElementById('backBtn');
const pathSpan = document.getElementById('path');

// ===== INIT GOOGLE OAUTH =====
function initOAuthClient() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (resp) => {
            token = resp.access_token;
            loginModal.style.display = 'none';
            loadFolder(ROOT_FOLDER_ID);
        }
    });
}

// ===== LOGIN BUTTON =====
loginBtn.onclick = () => {
    tokenClient.requestAccessToken();
};

// ===== LOAD FOLDER =====
async function loadFolder(folderId) {
    folderContainer.innerHTML = 'Loading...';
    try {
        currentFolderId = folderId;
        breadcrumb.style.display = (folderId === ROOT_FOLDER_ID) ? 'none' : 'flex';
        updatePath();

        const query = `'${folderId}' in parents and trashed=false`;
        const url = `https://www.googleapis.com/drive/v3/files?` +
                    `q=${encodeURIComponent(query)}` +
                    `&fields=files(id,name,mimeType)&includeItemsFromAllDrives=true&supportsAllDrives=true`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const items = data.files || [];
        folderContainer.innerHTML = '';

        if (items.length === 0) {
            folderContainer.innerHTML = 'No items in this folder / このフォルダにはアイテムがありません';
            return;
        }

        if (items.length > 10) {
            // Scrollable list
            const scrollDiv = document.createElement('div');
            scrollDiv.className = 'scrollable';
            items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'listItem';
                div.innerHTML = `<img src="${getIcon(item.mimeType, item.name)}" width="32" height="32"> ${item.name}`;
                div.onclick = () => handleItemClick(item);
                scrollDiv.appendChild(div);
            });
            folderContainer.appendChild(scrollDiv);
        } else {
            // Grid of big cards
            const gridDiv = document.createElement('div');
            gridDiv.className = 'grid';
            items.forEach(item => {
                const btn = document.createElement('div');
                btn.className = (item.mimeType === 'application/vnd.google-apps.folder') ? 'folderBtn' : 'fileBtn';
                btn.innerHTML = `<img src="${getIcon(item.mimeType, item.name)}"> ${item.name}`;
                btn.onclick = () => handleItemClick(item);
                gridDiv.appendChild(btn);
            });
            folderContainer.appendChild(gridDiv);
        }

    } catch (err) {
        console.error('Error loading folder:', err);
        folderContainer.innerHTML = `Error loading folder: ${err}`;
    }
}

// ===== HANDLE ITEM CLICK =====
function handleItemClick(item) {
    if (item.mimeType === 'application/vnd.google-apps.folder') {
        folderStack.push(currentFolderId);
        loadFolder(item.id);
    } else {
        window.open(`https://drive.google.com/file/d/${item.id}/view`);
    }
}

// ===== BACK BUTTON =====
backBtn.onclick = () => {
    if (folderStack.length > 0) {
        const prevFolderId = folderStack.pop();
        loadFolder(prevFolderId);
    } else {
        loadFolder(ROOT_FOLDER_ID);
    }
};

// ===== UPDATE BREADCRUMB =====
function updatePath() {
    pathSpan.textContent = folderStack.length === 0 ? '2025 / 2025' : `2025 / ${folderStack.length}階層目`;
}

// ===== ICONS =====
function getIcon(mimeType, name) {
    const defaultFolderIcon = 'https://img.icons8.com/fluency/48/000000/folder-invoices.png';
    if (mimeType === 'application/vnd.google-apps.folder') {
        const safeName = name.toLowerCase();
        const iconPath = `icons/${safeName}.ico`;
        // Fallback to default folder icon if custom icon not found
        return `${iconPath}" onerror="this.onerror=null;this.src='${defaultFolderIcon}'`;
    } else {
        return 'https://img.icons8.com/fluency/48/000000/document.png';
    }
}

// ===== START =====
window.onload = () => {
    initOAuthClient();
    loginModal.style.display = 'flex';
};
// ===== HANDLE ITEM CLICK =====
function handleItemClick(item) {
    if (item.mimeType === 'application/vnd.google-apps.folder') {
        folderStack.push(currentFolderId);
        loadFolder(item.id);
    } else {
        // Normal left-click opens file
        window.open(`https://drive.google.com/file/d/${item.id}/view`);
    }
}

// ===== ADD RIGHT-CLICK DOWNLOAD =====
folderContainer.addEventListener('contextmenu', function(e) {
    e.preventDefault(); // Prevent default browser menu
    const target = e.target.closest('.fileBtn, .listItem'); // Match file element only
    if (!target) return;

    const fileName = target.textContent.trim();
    const fileItem = currentItems.find(f => f.name === fileName && f.mimeType !== 'application/vnd.google-apps.folder');
    if (!fileItem) return;

    // Trigger download
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileItem.id}?alt=media`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileItem.name;
    a.target = '_blank';
    a.click();
});
