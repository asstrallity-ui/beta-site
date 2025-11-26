// Ссылки для картинок оставляем, картинки браузер грузит нормально (обычно)
const REPO_BASE_URL = 'https://rh-archive.ru/mods_files_github/';

const contentArea = document.getElementById('content-area');
const navItems = document.querySelectorAll('.nav-item');

// Окна
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
let newUpdateUrl = "";

document.addEventListener('DOMContentLoaded', () => {
    const savedColor = localStorage.getItem('accentColor');
    if (savedColor) applyAccentColor(savedColor); else applyAccentColor('#d0bcff');
    
    // Ждем инициализации Python
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        // Ждем pywebviewready или просто наличие объекта
        if (window.pywebview || attempts > 50) {
            checkEnvironment();
            loadMods(); 
            if (window.pywebview) clearInterval(interval);
        }
    }, 100);
});

window.addEventListener('pywebviewready', checkEnvironment);

function showToast(msg) {
    if(!toast) return;
    toast.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

async function checkForUpdates(manual = false) {
    if (!window.pywebview) {
        if(manual) showToast("Доступно только в EXE версии");
        return;
    }
    
    if(manual && btnCheckUpdates) {
        const icon = btnCheckUpdates.querySelector('span');
        if(icon) icon.style.animation = "spin 1s linear infinite";
    }

    try {
        const res = await window.pywebview.api.check_for_updates();
        
        if (res.available) {
            newUpdateUrl = res.url;
            if(updateVerSpan) updateVerSpan.innerText = "v" + res.version;
            if(updateLogP) updateLogP.innerText = res.changelog;
            if(updateSizeSpan) updateSizeSpan.innerText = res.size || "MB";
            
            updateModal.classList.remove('hidden');
        } else {
            if (manual) showToast(res.message || "Обновлений нет");
        }
    } catch (e) {
        if (manual) showToast("Ошибка связи с сервером");
        console.error(e);
    } finally {
        if(manual && btnCheckUpdates) {
            const icon = btnCheckUpdates.querySelector('span');
            if(icon) icon.style.animation = "none";
        }
    }
}

if (btnCheckUpdates) btnCheckUpdates.addEventListener('click', () => checkForUpdates(true));

if (btnStartUpdate) {
    btnStartUpdate.addEventListener('click', () => {
        btnStartUpdate.innerHTML = 'Скачивание...';
        btnStartUpdate.disabled = true;
        btnSkipUpdate.style.display = 'none';
        window.pywebview.api.perform_update(newUpdateUrl);
    });
}

if (btnSkipUpdate) btnSkipUpdate.addEventListener('click', () => updateModal.classList.add('hidden'));

function applyAccentColor(color) {
    document.documentElement.style.setProperty('--md-sys-color-primary', color);
    // Упрощенная конвертация для примера, лучше использовать hexToRgb
    document.documentElement.style.setProperty('--md-sys-color-on-primary', '#1e1e1e');
}

function renderSettings() {
    contentArea.innerHTML = `
        <div class="full-height-container">
            <div class="big-panel grow-panel">
                <h2 class="panel-title">Персонализация</h2>
                <p style="color:#aaa; margin-bottom:20px;">Выберите цвет интерфейса:</p>
                <div class="presets-grid">
                    <div class="color-preset" style="background: #d0bcff" onclick="setTheme('#d0bcff')"></div>
                    <div class="color-preset" style="background: #ff4081" onclick="setTheme('#ff4081')"></div>
                    <div class="color-preset" style="background: #00e676" onclick="setTheme('#00e676')"></div>
                    <div class="color-preset" style="background: #2979ff" onclick="setTheme('#2979ff')"></div>
                    <div class="color-preset" style="background: #ffea00" onclick="setTheme('#ffea00')"></div>
                </div>
                <div class="divider" style="margin: 24px 0;"></div>
                <button class="reset-theme-btn" onclick="setTheme('#d0bcff')">Сбросить</button>
            </div>
        </div>`;
}
window.setTheme = function(col) {
    applyAccentColor(col);
    localStorage.setItem('accentColor', col);
}

function checkEnvironment() {
    const repairBtn = document.getElementById('global-repair-btn');
    if (window.pywebview && repairBtn) repairBtn.classList.remove('hidden');
    checkForUpdates(false); // Тихая проверка при старте
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        if(item.id === 'btn-check-updates') return;
        navItems.forEach(n => n.classList.remove('active')); item.classList.add('active');
        handleTabChange(item.getAttribute('data-tab'));
    });
});

function handleTabChange(tab) {
    contentArea.classList.add('fade-out');
    setTimeout(() => {
        contentArea.innerHTML = ''; contentArea.className = '';
        if (tab === 'mods') { contentArea.classList.add('content-grid'); loadMods(); }
        else if (tab === 'install-methods') renderInstallMethods();
        else if (tab === 'authors') loadAuthors();
        else if (tab === 'settings') renderSettings();
        requestAnimationFrame(() => contentArea.classList.remove('fade-out'));
    }, 250);
}

// --- ГЛАВНАЯ ФУНКЦИЯ ЗАГРУЗКИ (ЧЕРЕЗ PYTHON) ---
async function loadMods() {
    contentArea.innerHTML = `<div class="loader-spinner"><div class="spinner"></div><p>Загрузка каталога...</p></div>`;
    
    if (!window.pywebview) {
        // Если открыто просто в браузере для теста
        contentArea.innerHTML = "<p class='empty-text'>Режим браузера: Нет связи с Python</p>";
        // Тут можно оставить старый fetch для отладки, но для продакшена лучше так:
        return; 
    }

    try {
        // ЗАПРОС К PYTHON (ОБХОД CORS)
        const response = await window.pywebview.api.get_mods_data();
        
        if (!response.success) throw new Error(response.error);

        globalModsList = response.mods; 
        globalBuyList = response.buy;
        globalInstalledIds = [];

        try { 
            globalInstalledIds = await window.pywebview.api.check_installed_mods(globalModsList); 
        } catch (e) {}

        renderMods(globalModsList, globalInstalledIds, globalBuyList);
    } catch (e) { 
        contentArea.innerHTML = `<div class="empty-state"><p style="color:#ff5252">Ошибка загрузки: ${e.message}</p></div>`; 
    } finally {
        if(splash) setTimeout(() => splash.classList.add('fade-out'), 500);
    }
}

function renderMods(mods, installedIds, buyList) {
    contentArea.innerHTML = '';
    if (!mods || mods.length === 0) { contentArea.innerHTML = '<p class="empty-text">Пусто.</p>'; return; }
    mods.forEach(mod => {
        let img = mod.image || ""; if(img && !img.startsWith('http')) img = REPO_BASE_URL + img;
        if(!img) img = "https://via.placeholder.com/400x220/111/fff?text=No+Image";
        const isInst = installedIds.includes(mod.id);
        const buyInfo = buyList ? buyList.find(b => b.id === mod.id) : null;
        let btnText = 'Установить';
        let btnIcon = 'download';
        let btnClass = 'install-btn';
        let isDisabled = false;
        let onClickAction = `startInstallProcess('${mod.id}', '${mod.name}', '${mod.file}')`;
        
        if (buyInfo) {
            if (buyInfo.status === 'preorder') {
                btnText = 'Предзаказ'; btnIcon = 'schedule'; onClickAction = `openInfoModal('preorder', '${mod.id}')`;
            } else {
                btnText = 'Купить'; btnIcon = 'shopping_cart'; onClickAction = `openInfoModal('paid', '${mod.id}')`;
            }
        } else if (isInst) { 
            btnText = 'Уже установлен'; btnIcon = 'check'; btnClass = 'install-btn installed'; isDisabled = true; 
        }

        const card = document.createElement('div'); card.className = 'mod-card';
        card.innerHTML = `
            <img src="${img}" class="card-image" loading="lazy">
            <div class="card-content">
                <h3 class="card-title">${mod.name}</h3>
                <p class="card-author">Автор: <span>${mod.author || "?"}</span></p>
                <p class="card-desc">${mod.description || ""}</p>
                <button class="${btnClass}" ${isDisabled ? 'disabled' : ''} onclick="${onClickAction}">
                    <span class="material-symbols-outlined">${btnIcon}</span> ${btnText}
                </button>
            </div>`;
        contentArea.appendChild(card);
    });
}

function openInfoModal(type, modId) {
    const buyItem = globalBuyList.find(b => b.id === modId);
    const modItem = globalModsList.find(m => m.id === modId);
    if (!buyItem || !modItem) return;
    infoModal.classList.remove('hidden');
    infoActionBtn.className = 'modal-action-btn'; 
    infoTitle.innerText = type === 'preorder' ? 'Предзаказ' : 'Платный контент';
    let btnText = type === 'preorder' ? 'ЗАКАЗАТЬ' : 'КУПИТЬ';
    
    infoDesc.innerHTML = `
        <div class="info-row"><span class="info-label">Мод:</span><span class="info-value">${modItem.name}</span></div>
        <div class="info-row"><span class="info-label">Автор:</span><span class="info-value author-highlight">${modItem.author}</span></div>
        <div class="divider" style="margin: 16px 0;"></div>
        <p class="info-description">${buyItem.desc || "Описание недоступно."}</p>
        <div class="info-price-tag">${buyItem.price || "Цена договорная"}</div>
    `;
    infoActionBtn.innerHTML = `${btnText} <span class="material-symbols-outlined">telegram</span>`;
    infoActionBtn.onclick = () => { if (buyItem.link) window.open(buyItem.link, '_blank'); };
}

if(infoCloseBtn) infoCloseBtn.addEventListener('click', () => infoModal.classList.add('hidden'));

function renderInstallMethods() {
    contentArea.innerHTML = `
        <div class="full-height-container">
            <div class="big-panel grow-panel"><h2 class="panel-title">Методы установки</h2>
            <p style="color:#aaa;">Функционал переключателей методов установки...</p>
            </div>
        </div>`;
}

// --- АВТОРЫ (ТОЖЕ ЧЕРЕЗ PYTHON) ---
async function loadAuthors() {
    contentArea.innerHTML = `<div class="loader-spinner"><div class="spinner"></div></div>`;
    if (!window.pywebview) return;

    try {
        const response = await window.pywebview.api.get_authors_data();
        if (!response.success) throw new Error(response.error);
        
        const authors = response.data;
        let authorsListHtml = '';
        authors.forEach((author) => {
            let avatarUrl = author.avatar || "";
            if (avatarUrl && !avatarUrl.startsWith('http')) avatarUrl = REPO_BASE_URL + avatarUrl;
            const firstLetter = author.name ? author.name.charAt(0).toUpperCase() : "?";
            authorsListHtml += `
                <div class="author-row">
                    <div class="author-avatar-wrapper">
                        <img src="${avatarUrl}" alt="${author.name}" class="author-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="author-avatar-placeholder" style="background-color: rgba(208, 188, 255, 0.2); color: #d0bcff; display: none;">${firstLetter}</div>
                    </div>
                    <div class="author-details"><h3>${author.name}</h3><span class="role">${author.role}</span><p>${author.bio || ""}</p></div>
                </div>`;
        });
        contentArea.innerHTML = `
            <div class="about-page-container">
                <div class="big-panel authors-panel"><h2 class="panel-title">Команда</h2><div class="authors-list">${authorsListHtml}</div></div>
                <div class="big-panel app-info-panel"><h2 class="panel-title">О приложении</h2>
                    <div class="app-details">
                        <div class="app-header-row"><span class="app-version-badge">v1.0.0</span></div>
                        <div class="app-description-block"><p class="app-desc-text">Универсальный лаунчер для Tanks Blitz.</p></div>
                        <div style="flex-grow: 1;"></div>
                        <div class="app-footer-row"><p class="app-credits">(C) 2025</p></div>
                    </div>
                </div>
            </div>`;
    } catch (error) { contentArea.innerHTML = `<p style="color:#ff5252;">Ошибка: ${error.message}</p>`; }
}

function startInstallProcess(id, name, url) {
    if(!window.pywebview) return;
    installView.classList.remove('view-hidden'); successView.classList.add('view-hidden'); errorView.classList.add('view-hidden');
    progressBar.style.width = "0%"; progressPercent.innerText = "0%"; modalTitle.innerText = name; modalStatus.innerText = "Подготовка...";
    modal.classList.remove('hidden');
    window.pywebview.api.install_mod(id, url, currentInstallMethod);
}

if(modalCloseBtn) modalCloseBtn.addEventListener('click', () => { closeModal(); });
function closeModal() { modal.classList.add('hidden'); }

window.updateRealProgress = (p, t) => { progressBar.style.width = p + "%"; progressPercent.innerText = p + "%"; modalStatus.innerText = t; }
window.finishInstall = (s, m) => {
    if(s) { installView.classList.add('view-hidden'); successView.classList.remove('view-hidden'); setTimeout(() => { closeModal(); loadMods(); }, 2000); }
    else { installView.classList.add('view-hidden'); errorView.classList.remove('view-hidden'); errorMessage.innerText = m; setTimeout(closeModal, 3000); }
}
