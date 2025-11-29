const REPO_JSON_URL = 'https://rh-archive.ru/mods_files_github/mods.json';
const REPO_AUTHORS_URL = 'https://rh-archive.ru/mods_files_github/authors.json';
const REPO_BUY_URL = 'https://rh-archive.ru/mods_files_github/buy.json';
const REPO_BASE_URL = 'https://rh-archive.ru/mods_files_github/';
const REPO_YOUTUBE_URL = 'https://rh-archive.ru/mods_files_github/youtube.json';

const contentArea = document.getElementById('content-area');
// Nav Items
const navCatalog = document.getElementById('nav-catalog');
const navYoutube = document.getElementById('nav-youtube');
const navSettings = document.getElementById('nav-settings');

const modal = document.getElementById('progress-modal');
const installView = document.getElementById('install-view');
const successView = document.getElementById('success-view');
const errorView = document.getElementById('error-view');
const errorMessage = document.getElementById('error-message');
const progressBar = document.getElementById('progress-bar');
const progressPercent = document.getElementById('progress-percent');
const modalStatus = document.getElementById('modal-status');
const modalTitle = document.getElementById('modal-title');
const modalCloseBtn = document.getElementById('modal-close-btn');

const repairModal = document.getElementById('repair-modal');
const repairList = document.getElementById('repair-list');
const repairCloseBtn = document.getElementById('repair-close-btn');

const infoModal = document.getElementById('info-modal');
const infoTitle = document.getElementById('info-modal-title');
const infoDesc = document.getElementById('info-modal-desc');
const infoActionBtn = document.getElementById('info-modal-action');
const infoCloseBtn = document.getElementById('info-close-btn');

const splash = document.getElementById('splash-screen');

// Обновление
const btnCheckUpdates = document.getElementById('btn-check-updates');
const updateModal = document.getElementById('update-modal');
const updateVerSpan = document.getElementById('update-version');
const updateSizeSpan = document.getElementById('update-size');
const updateLogP = document.getElementById('update-changelog');
const btnStartUpdate = document.getElementById('btn-start-update');
const btnSkipUpdate = document.getElementById('btn-skip-update');
const toast = document.getElementById('toast-notification');

let currentInstallMethod = 'auto';
let globalModsList = [];
let globalBuyList = [];
let globalInstalledIds = [];
let globalYouTubeData = [];
let newUpdateUrl = "";

// Navigation State
let activeTab = 'catalog'; // catalog, youtube, settings

document.addEventListener('DOMContentLoaded', () => {
    const savedColor = localStorage.getItem('accentColor');
    if (savedColor) applyAccentColor(savedColor);
    else applyAccentColor('#d0bcff');

    // Setup Navigation
    if (navCatalog) navCatalog.addEventListener('click', () => switchTab('catalog'));
    if (navYoutube) navYoutube.addEventListener('click', () => switchTab('youtube'));
    if (navSettings) navSettings.addEventListener('click', () => switchTab('settings'));

    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        if (window.pywebview || attempts > 50) {
            checkEnvironment();
            loadMods(); // Load default tab
            if (window.pywebview) clearInterval(interval);
        }
    }, 100);

    checkPing();
    setInterval(checkPing, 5000);
});

window.addEventListener('pywebviewready', checkEnvironment);

function showToast(msg) {
    if(!toast) return;
    toast.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// === TAB SWITCHING LOGIC ===
async function switchTab(tabName) {
    if (activeTab === tabName) return;
    activeTab = tabName;

    // Update UI classes
    [navCatalog, navYoutube, navSettings].forEach(btn => {
        if(btn) btn.classList.remove('active');
    });

    if(tabName === 'catalog' && navCatalog) navCatalog.classList.add('active');
    if(tabName === 'youtube' && navYoutube) navYoutube.classList.add('active');
    if(tabName === 'settings' && navSettings) navSettings.classList.add('active');

    // Fade out content
    contentArea.classList.add('fade-out');

    setTimeout(() => {
        contentArea.innerHTML = ''; // Clear
        contentArea.classList.remove('fade-out');
        
        if (tabName === 'catalog') {
            renderMods(globalModsList);
        } else if (tabName === 'youtube') {
            loadYouTubeMods();
        } else if (tabName === 'settings') {
            renderSettings();
        }
    }, 250);
}

// === YOUTUBE LOGIC ===
async function loadYouTubeMods() {
    contentArea.innerHTML = '<div style="text-align:center; margin-top:50px; color:#888;">Загрузка YouTube модов...</div>';
    try {
        // Add cache bust
        const res = await fetch(REPO_YOUTUBE_URL + '?t=' + Date.now());
        if (!res.ok) throw new Error("Не удалось загрузить YouTube список");
        globalYouTubeData = await res.json();
        
        if (!globalYouTubeData || globalYouTubeData.length === 0) {
            contentArea.innerHTML = '<div style="text-align:center; margin-top:50px;">Список ютуберов пуст</div>';
            return;
        }
        
        // Select first youtuber by default
        renderYouTubeView(globalYouTubeData[0].name);
        
    } catch (e) {
        contentArea.innerHTML = `<div style="text-align:center; margin-top:50px; color:#f44336;">Ошибка: ${e.message}</div>`;
    }
}

function renderYouTubeView(selectedYoutuberName) {
    contentArea.innerHTML = '';
    
    // 1. Filter Bar (Chips)
    const filterContainer = document.createElement('div');
    filterContainer.className = 'youtuber-filter';
    
    globalYouTubeData.forEach(yt => {
        const chip = document.createElement('div');
        chip.className = 'filter-chip';
        if (yt.name === selectedYoutuberName) chip.classList.add('active');
        chip.innerText = yt.name;
        chip.addEventListener('click', () => {
            renderYouTubeView(yt.name); // Re-render with new selection
        });
        filterContainer.appendChild(chip);
    });
    
    contentArea.appendChild(filterContainer);
    
    // 2. Find selected data
    const selectedData = globalYouTubeData.find(y => y.name === selectedYoutuberName);
    
    // 3. Grid
    const grid = document.createElement('div');
    grid.className = 'content-grid';
    
    if (selectedData && selectedData.mods && selectedData.mods.length > 0) {
        selectedData.mods.forEach(mod => {
            // Reuse mod card logic, slightly simplified or same
            // Ensure we map fields correctly if youtube json differs, but I assume standard structure:
            // { id, name, description, image, file }
            
            let img = mod.image || "";
            if(img && !img.startsWith('http')) img = REPO_BASE_URL + img;
            if(!img) img = "https://via.placeholder.com/400x220/111/fff?text=No+Image";
            
            const isInst = globalInstalledIds.includes(mod.id);
            
            let btnText = 'Скачать';
            let btnClass = 'install-btn';
            let isDisabled = false;
            // Note: YouTube mods might not be in 'buy.json', assuming free
            
            if (!window.pywebview) {
                btnText = 'Доступно в приложении';
                isDisabled = true;
            } else if (isInst) {
                btnText = 'Уже установлен';
                btnClass = 'install-btn installed';
                isDisabled = true;
            }

            const card = document.createElement('div');
            card.className = 'mod-card';
            card.innerHTML = `
                <img src="${img}" class="card-image" loading="lazy">
                <div class="card-content">
                    <div class="card-author"><span>${selectedYoutuberName}</span></div>
                    <div class="card-title">${mod.name}</div>
                    <div class="card-desc">${mod.description || "Описание отсутствует"}</div>
                    <button class="${btnClass}" ${isDisabled ? 'disabled' : ''} onclick="${!isDisabled ? `startInstallProcess('${mod.id}', '${mod.name}', '${mod.file}')` : ''}">
                        <span class="material-symbols-outlined">download</span>
                        ${btnText}
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
    } else {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#666;">У этого ютубера пока нет модов</div>';
    }
    
    contentArea.appendChild(grid);
}


// === EXISTING LOGIC ===

async function checkForUpdates(manual = false) {
    if (!window.pywebview) {
        if(manual) showToast("Доступно только в приложении");
        return;
    }
    if(manual && btnCheckUpdates) {
        const icon = btnCheckUpdates.querySelector('span');
        icon.style.animation = "spin 1s linear infinite";
    }
    try {
        const res = await window.pywebview.api.check_for_updates();
        if (res.available) {
            newUpdateUrl = res.url;
            updateVerSpan.innerText = "v" + res.version;
            updateLogP.innerText = res.changelog;
            updateSizeSpan.innerText = res.size || "Неизвестно";
            updateModal.classList.remove('hidden');
        } else {
            if (manual) showToast(res.message || "Обновлений не найдено");
        }
    } catch (e) {
        if (manual) showToast("Ошибка проверки");
    } finally {
        if(manual && btnCheckUpdates) {
            const icon = btnCheckUpdates.querySelector('span');
            icon.style.animation = "none";
        }
    }
}

if (btnCheckUpdates) btnCheckUpdates.addEventListener('click', () => checkForUpdates(true));

if (btnStartUpdate) {
    btnStartUpdate.addEventListener('click', () => {
        btnStartUpdate.innerHTML = ' Скачивание...';
        btnStartUpdate.disabled = true;
        btnSkipUpdate.style.display = 'none';
        window.pywebview.api.perform_update(newUpdateUrl);
    });
}
if (btnSkipUpdate) btnSkipUpdate.addEventListener('click', () => updateModal.classList.add('hidden'));

async function checkPing() {
    const pingText = document.getElementById('ping-text');
    const pingDot = document.getElementById('ping-dot');
    if (!pingText || !pingDot) return;
    const start = Date.now();
    try {
        await fetch(REPO_JSON_URL + '?t=' + start, { method: 'HEAD', cache: 'no-store' });
        const end = Date.now();
        const ping = end - start;
        pingText.innerText = `Соединено: ${ping} ms`;
        pingDot.style.backgroundColor = ping < 150 ? '#4caf50' : (ping < 300 ? '#ff9800' : '#f44336');
        pingDot.style.boxShadow = `0 0 8px ${pingDot.style.backgroundColor}`;
    } catch (e) {
        pingText.innerText = 'Нет сети';
        pingDot.style.backgroundColor = '#f44336';
        pingDot.style.boxShadow = 'none';
    }
}

function applyAccentColor(color) {
    const div = document.createElement('div');
    div.style.color = color;
    document.body.appendChild(div);
    const computed = window.getComputedStyle(div).color;
    document.body.removeChild(div);
    const rgbMatch = computed.match(/\d+/g);
    if (rgbMatch) {
        const rgbVal = `${rgbMatch[0]}, ${rgbMatch[1]}, ${rgbMatch[2]}`;
        document.documentElement.style.setProperty('--md-sys-color-primary', computed);
        document.documentElement.style.setProperty('--md-sys-color-primary-rgb', rgbVal);
        document.documentElement.style.setProperty('--md-sys-color-on-primary', '#1e1e1e');
    }
}

function renderSettings() {
    let col = getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-primary').trim();
    
    contentArea.innerHTML = `
    <div class="big-panel">
        <div class="panel-title">Персонализация</div>
        <div class="custom-color-picker">
            <div class="picker-header">
                <div class="current-color-preview" id="color-preview" style="background-color:${col}"></div>
                <div class="picker-info">
                    <h3>Акцентный цвет</h3>
                    <p>Выберите цвет для элементов интерфейса</p>
                </div>
                <button class="reset-theme-btn" id="reset-theme">
                    <span class="material-symbols-outlined">restart_alt</span>
                    Сброс
                </button>
            </div>
            <div class="picker-controls">
                <label>Оттенок (Hue)</label>
                <input type="range" min="0" max="360" value="270" class="slider-hue" id="hue-slider">
            </div>
        </div>
    </div>
    `;

    const slider = document.getElementById('hue-slider');
    const preview = document.getElementById('color-preview');
    const resetBtn = document.getElementById('reset-theme');

    slider.addEventListener('input', (e) => {
        const hue = e.target.value;
        const color = `hsl(${hue}, 100%, 75%)`;
        preview.style.backgroundColor = color;
        applyAccentColor(color);
        localStorage.setItem('accentColor', color);
    });

    resetBtn.addEventListener('click', () => {
        applyAccentColor('#d0bcff');
        localStorage.removeItem('accentColor');
        renderSettings();
    });
}

async function checkEnvironment() {
    if (window.pywebview) {
        try {
            const installed = await window.pywebview.api.check_installed_mods(globalModsList); // Need full list to check IDs?
            // Actually check_installed_mods just checks IDs on disk, passing full list helps valid IDs
            // But here we might not have loaded mods yet. 
            // We'll update globalInstalledIds
            globalInstalledIds = installed || [];
            
            // Check Geo
            checkGeoRestriction();
        } catch (e) {
            console.log(e);
        }
    }
}

async function loadMods() {
    if (activeTab !== 'catalog') return; // Only render if active
    
    contentArea.innerHTML = '<div style="text-align:center; margin-top:50px; color:#888;">Загрузка каталога...</div>';
    try {
        const [modsRes, buyRes] = await Promise.all([
            fetch(REPO_JSON_URL + '?t=' + Date.now()),
            fetch(REPO_BUY_URL + '?t=' + Date.now())
        ]);

        if (!modsRes.ok) throw new Error("Не удалось загрузить список модов");
        
        const mods = await modsRes.json();
        globalModsList = mods;
        
        if (buyRes.ok) globalBuyList = await buyRes.json();
        else globalBuyList = [];

        // Check installed
        if (window.pywebview) {
            const inst = await window.pywebview.api.check_installed_mods(mods);
            globalInstalledIds = inst;
        }

        renderMods(mods);
        
        // Fade out splash
        if (splash && !splash.classList.contains('fade-out')) {
            splash.classList.add('fade-out');
        }

    } catch (e) {
        contentArea.innerHTML = `<div style="text-align:center; margin-top:50px; color:#f44336;">Ошибка загрузки: ${e.message}</div>`;
        if (splash) splash.classList.add('fade-out');
    }
}

function renderMods(mods) {
    if (activeTab !== 'catalog') return;
    
    contentArea.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'content-grid';
    
    if (!mods || mods.length === 0) {
        contentArea.innerHTML = 'Пусто.';
        return;
    }

    mods.forEach(mod => {
        let img = mod.image || "";
        if(img && !img.startsWith('http')) img = REPO_BASE_URL + img;
        if(!img) img = "https://via.placeholder.com/400x220/111/fff?text=No+Image";

        const isInst = globalInstalledIds.includes(mod.id);
        const buyInfo = globalBuyList.find(b => b.id === mod.id);

        let btnText = 'Установить';
        let btnIcon = 'download';
        let btnClass = 'install-btn';
        let isDisabled = false;
        let onClickAction = `startInstallProcess('${mod.id}', '${mod.name}', '${mod.file}')`;

        if (buyInfo) {
            if (buyInfo.status === 'preorder') {
                btnText = 'Предзаказ';
                btnIcon = 'schedule';
                onClickAction = `openInfoModal('preorder', '${mod.id}')`;
            } else if (buyInfo.status === 'BT') {
                btnText = 'Временно недоступен';
                btnIcon = 'schedule';
                onClickAction = `openInfoModal('testing', '${mod.id}')`;
            } else {
                btnText = 'Купить';
                btnIcon = 'shopping_cart';
                onClickAction = `openInfoModal('paid', '${mod.id}')`;
            }
        } else {
            if (!window.pywebview) {
                btnText = 'Доступно в приложении';
                isDisabled = true;
            } else if (isInst) {
                btnText = 'Уже установлен';
                btnIcon = 'check';
                btnClass = 'install-btn installed';
                isDisabled = true;
            }
        }

        const card = document.createElement('div');
        card.className = 'mod-card';
        card.innerHTML = `
            <img src="${img}" class="card-image" loading="lazy">
            <div class="card-content">
                <div class="card-author">Автор: <span>${mod.author || "Неизвестно"}</span></div>
                <div class="card-title">${mod.name}</div>
                <div class="card-desc">${mod.description || ""}</div>
                <button class="${btnClass}" ${isDisabled ? 'disabled' : ''} onclick="${!isDisabled ? onClickAction : ''}">
                    <span class="material-symbols-outlined">${btnIcon}</span>
                    ${btnText}
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
    
    contentArea.appendChild(grid);
}

window.openInfoModal = (type, id) => {
    infoModal.classList.remove('hidden');
    const buyItem = globalBuyList.find(b => b.id === id);
    if (!buyItem) return;

    infoTitle.innerText = buyItem.title || "Информация";
    
    if (type === 'preorder') {
        infoDesc.innerText = "Этот мод находится в стадии предзаказа. Скоро будет доступен.";
    } else if (type === 'testing') {
        infoDesc.innerText = "Мод находится на тестировании (BT) и временно недоступен.";
    } else if (type === 'paid') {
        infoDesc.innerText = buyItem.desc || "Описание недоступно.";
    }
}

if(infoCloseBtn) infoCloseBtn.addEventListener('click', () => infoModal.classList.add('hidden'));
if(infoActionBtn) infoActionBtn.addEventListener('click', () => infoModal.classList.add('hidden'));

window.startInstallProcess = (id, name, url) => {
    if(!window.pywebview) return;
    
    // Handle relative URLs
    if(url && !url.startsWith('http')) url = REPO_BASE_URL + url;

    installView.classList.remove('view-hidden');
    successView.classList.add('view-hidden');
    errorView.classList.add('view-hidden');
    progressBar.style.width = "0%";
    progressPercent.innerText = "0%";
    modalTitle.innerText = name;
    modalStatus.innerText = "Подготовка...";
    modal.classList.remove('hidden');
    
    window.pywebview.api.install_mod(id, url, currentInstallMethod);
}

if(modalCloseBtn) modalCloseBtn.addEventListener('click', () => {
    if(window.pywebview) window.pywebview.api.cancel_install();
    closeModal();
});

function closeModal() {
    modal.classList.add('hidden');
}

window.updateRealProgress = (p, t) => {
    progressBar.style.width = p + "%";
    progressPercent.innerText = p + "%";
    modalStatus.innerText = t;
}

window.finishInstall = (s, m) => {
    if(s) {
        installView.classList.add('view-hidden');
        successView.classList.remove('view-hidden');
        setTimeout(() => {
            closeModal();
            // Refresh lists to show installed status
            if (activeTab === 'catalog') loadMods();
            if (activeTab === 'youtube') renderYouTubeView(globalYouTubeData.find(y=>y.mods.some(m=>m.id===globalInstalledIds[0]))?.name || globalYouTubeData[0].name);
            // Just re-fetching installed IDs would be better but full reload works
            checkEnvironment(); 
        }, 2000);
    } else {
        if(m==="Canceled"){closeModal();}
        else {
            installView.classList.add('view-hidden');
            errorView.classList.remove('view-hidden');
            errorMessage.innerText = m;
            setTimeout(closeModal, 3000);
        }
    }
}

function openRepairModal() {
    const installedMods = globalModsList.filter(m => globalInstalledIds.includes(m.id));
    // Also check youtube mods? 
    // For simplicity, repair currently only shows catalog mods. 
    // To add youtube mods, we'd need to scan globalYouTubeData too.
    // Let's try to aggregate all known mods
    
    let allKnownMods = [...globalModsList];
    globalYouTubeData.forEach(yt => {
        allKnownMods = allKnownMods.concat(yt.mods);
    });
    
    const myInstalled = allKnownMods.filter(m => globalInstalledIds.includes(m.id));
    
    repairList.innerHTML = '';
    if (myInstalled.length === 0) repairList.innerHTML = '<div style="text-align:center; color:#777;">Нет установленных модов для починки.</div>';
    else {
        myInstalled.forEach(mod => {
            const item = document.createElement('div');
            item.className = 'repair-item';
            item.innerText = mod.name;
            item.addEventListener('click', () => restoreMod(mod.id, mod.name));
            repairList.appendChild(item);
        });
    }
    repairModal.classList.remove('hidden');
}

async function restoreMod(id, name) {
    repairModal.classList.add('hidden');
    installView.classList.remove('view-hidden');
    successView.classList.add('view-hidden');
    errorView.classList.add('view-hidden');
    progressBar.style.width = "100%";
    progressPercent.innerText = "";
    modalTitle.innerText = "Восстановление...";
    modalStatus.innerText = "Обработка...";
    modal.classList.remove('hidden');
    
    const res = await window.pywebview.api.restore_mod(id);
    if (res.success) finishInstall(true, res.message);
    else finishInstall(false, res.message);
}

if(repairCloseBtn) repairCloseBtn.addEventListener('click', () => repairModal.classList.add('hidden'));
const rb = document.getElementById('global-repair-btn');
if(rb) rb.addEventListener('click', openRepairModal);

// === GEO RESTRICTION LOGIC ===
const geoModal = document.getElementById('geo-modal');
const geoExitBtn = document.getElementById('geo-exit-btn');

async function checkGeoRestriction() {
    if (!window.pywebview || !window.pywebview.api || !window.pywebview.api.check_connection_status) {
        return;
    }
    try {
        const res = await window.pywebview.api.check_connection_status(); 
        // { status: "blocked", country: "UA" }
        if (res && res.status === 'blocked') {
            if (geoModal) {
                geoModal.classList.remove('hidden');
            }
        }
    } catch (e) {
        console.warn('Geo check failed', e);
    }
}

if (geoExitBtn) {
    geoExitBtn.addEventListener('click', () => {
        if (window.pywebview && window.pywebview.api && window.pywebview.api.close) {
            window.pywebview.api.close();
        } else if (geoModal) {
            geoModal.classList.add('hidden');
        }
    });
}
