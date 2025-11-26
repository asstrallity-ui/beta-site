const REPO_JSON_URL = 'https://rh-archive.ru/mods_files_github/mods.json';
const REPO_AUTHORS_URL = 'https://rh-archive.ru/mods_files_github/authors.json';
const REPO_BUY_URL = 'https://rh-archive.ru/mods_files_github/buy.json';
const REPO_BASE_URL = 'https://rh-archive.ru/mods_files_github/';

const contentArea = document.getElementById('content-area');
const navItems = document.querySelectorAll('.nav-item');
const pageTitle = document.getElementById('page-title');

const modal = document.getElementById('progress-modal');
const installView = document.getElementById('install-view');
const successView = document.getElementById('success-view');
const errorView = document.getElementById('error-view');
const errorMessage = document.getElementById('error-message');
const progressBar = document.getElementById('progress-fill'); // Fixed ID
const progressPercent = document.getElementById('progress-percent');
const modalStatus = document.getElementById('modal-status');
const modalTitle = document.getElementById('modal-title');
const modalCloseBtn = document.getElementById('modal-close-btn');

const repairModal = document.getElementById('repair-modal');
const repairList = document.getElementById('repair-list');
const repairCloseBtn = document.getElementById('repair-close-btn');

const infoModal = document.getElementById('info-modal');
const infoModName = document.getElementById('info-mod-name');
const infoDesc = document.getElementById('info-modal-desc');
const infoPrice = document.getElementById('info-price');
const infoActionBtn = document.getElementById('info-modal-action');
const infoCloseBtn = document.getElementById('info-close-btn');

const splash = document.getElementById('splash-screen');

// Update
const btnCheckUpdates = document.getElementById('btn-check-updates');
const updateModal = document.getElementById('update-modal');
const updateVerSpan = document.getElementById('update-version');
const updateSizeSpan = document.getElementById('update-size');
const updateLogP = document.getElementById('update-changelog');
const btnStartUpdate = document.getElementById('btn-start-update');
const btnSkipUpdate = document.getElementById('btn-skip-update');

const toast = document.getElementById('toast-notification');

// VPN
const vpnModal = document.getElementById('vpn-modal');
const btnVpnReload = document.getElementById('btn-vpn-reload');
const btnTestVpn = document.getElementById('btn-test-vpn');

let currentInstallMethod = 'auto'; 
let globalModsList = [];
let globalBuyList = [];
let globalInstalledIds = [];
let newUpdateUrl = "";

document.addEventListener('DOMContentLoaded', () => {
    const savedColor = localStorage.getItem('accentColor');
    if (savedColor) applyAccentColor(savedColor);
    
    // Init Logic
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        if (window.pywebview || attempts > 50) {
            clearInterval(interval);
            checkEnvironment();
            // Проверка сети с задержкой
            setTimeout(checkNetworkStatus, 1000);
            // Load content
            loadMods();
            setTimeout(() => splash.style.opacity = 0, 800);
            setTimeout(() => splash.style.display = 'none', 1300);
        }
    }, 100);

    checkPing();
    setInterval(checkPing, 10000);

    // Nav logic
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.dataset.target;
            if(!target) return; // skip if no target (like test button)
            
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            if (target === 'mods') {
                pageTitle.innerText = "Каталог модов";
                loadMods();
            } else if (target === 'settings') {
                pageTitle.innerText = "Настройки";
                renderSettings();
            } else if (target === 'about') {
                pageTitle.innerText = "О программе";
                renderAbout();
            }
        });
    });

    if (btnTestVpn) btnTestVpn.addEventListener('click', showVpnModal);
    if (btnVpnReload) btnVpnReload.addEventListener('click', () => window.location.reload());
});

async function checkNetworkStatus() {
    if (!window.pywebview) return;
    try {
        const res = await window.pywebview.api.check_connection_status();
        if (res.status === 'blocked' && res.country === 'UA') {
            showVpnModal();
        } else if (res.status === 'error') {
            showToast("Сервер недоступен. Проверьте интернет.");
        }
    } catch (e) {
        console.error("Network check fail:", e);
    }
}

function showVpnModal() {
    if(vpnModal) vpnModal.classList.remove('hidden');
}

function showToast(msg) {
    if(!toast) return;
    toast.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

window.addEventListener('pywebviewready', () => {
    // pywebview ready
});

function checkEnvironment() {
    // Init checks if needed
}

// ... (Остальной код fetch/render без изменений, сокращен для удобства)
// Вставь сюда свой старый код отрисовки карточек, настроек и т.д.
// Я оставил структуру, чтобы ты мог просто скопировать методы renderMods, renderSettings и т.д.

async function loadMods() {
    contentArea.innerHTML = '<div class="loader-spinner">Загрузка...</div>';
    try {
        const [modsRes, buyRes, authorsRes] = await Promise.all([
            fetch(REPO_JSON_URL + '?t=' + Date.now()).then(r => r.json()),
            fetch(REPO_BUY_URL + '?t=' + Date.now()).then(r => r.json()),
            fetch(REPO_AUTHORS_URL + '?t=' + Date.now()).then(r => r.json())
        ]);

        globalModsList = modsRes;
        globalBuyList = buyRes;
        
        if (window.pywebview) {
            globalInstalledIds = await window.pywebview.api.check_installed_mods(globalModsList);
        }

        renderMods(globalModsList, globalBuyList, globalInstalledIds);

    } catch (e) {
        contentArea.innerHTML = `<div class="error-text">Ошибка загрузки: ${e.message}</div>`;
    }
}

function renderMods(mods, buyList, installedIds) {
    contentArea.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'mods-grid';
    
    mods.forEach(mod => {
        const buyInfo = buyList.find(b => b.id === mod.id);
        const isInstalled = installedIds.includes(mod.id);
        
        let btnText = 'Установить';
        let btnClass = 'install-btn';
        let action = `startInstall('${mod.id}', '${mod.file}', '${mod.name}')`;
        let icon = 'download';

        if (buyInfo) {
            if (buyInfo.status === 'preorder') {
                btnText = 'Предзаказ';
                icon = 'schedule';
            } else {
                btnText = 'Купить';
                icon = 'shopping_cart';
            }
            action = `openInfoModal('${mod.id}', '${mod.name}', '${buyInfo.desc}', '${buyInfo.price}', '${buyInfo.link}')`;
        } else {
            if (isInstalled) {
                btnText = 'Установлен';
                btnClass += ' installed';
                icon = 'check';
                // Можно отключить кнопку или оставить для переустановки
            }
        }

        let img = mod.image || "";
        if (img && !img.startsWith('http')) img = REPO_BASE_URL + img;

        const card = document.createElement('div');
        card.className = 'mod-card';
        card.innerHTML = `
            <img src="${img}" class="mod-image">
            <div class="mod-content">
                <h3 class="mod-title">${mod.name}</h3>
                <div class="mod-author">by ${mod.author || "Unknown"}</div>
                <div class="mod-desc">${mod.description || ""}</div>
                <div class="mod-actions">
                    <button class="${btnClass}" onclick="${action}">
                        <span class="material-symbols-rounded">${icon}</span> ${btnText}
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
    contentArea.appendChild(grid);
}

function startInstall(id, url, name) {
    if(!window.pywebview) return;
    if(url && !url.startsWith('http')) url = REPO_BASE_URL + url;
    
    modalTitle.innerText = name;
    modalStatus.innerText = "Подготовка...";
    progressBar.style.width = '0%';
    progressPercent.innerText = '0%';
    
    installView.classList.remove('view-hidden');
    successView.classList.add('view-hidden');
    errorView.classList.add('view-hidden');
    
    modal.classList.remove('hidden');
    window.pywebview.api.install_mod(id, url, currentInstallMethod);
}

window.updateRealProgress = (pct, txt) => {
    if(progressBar) progressBar.style.width = pct + "%";
    if(progressPercent) progressPercent.innerText = pct + "%";
    if(modalStatus) modalStatus.innerText = txt;
};

window.finishInstall = (success, msg) => {
    if(success) {
        installView.classList.add('view-hidden');
        successView.classList.remove('view-hidden');
        setTimeout(() => {
            modal.classList.add('hidden');
            loadMods();
        }, 2000);
    } else {
        if(msg === 'Canceled' || msg === 'Отменено') {
            modal.classList.add('hidden');
        } else {
            installView.classList.add('view-hidden');
            errorView.classList.remove('view-hidden');
            errorMessage.innerText = msg;
        }
    }
};

if(modalCloseBtn) modalCloseBtn.addEventListener('click', () => {
    if(window.pywebview) window.pywebview.api.cancel_install();
    modal.classList.add('hidden');
});

// --- INFO MODAL ---
function openInfoModal(id, name, desc, price, link) {
    infoModName.innerText = name;
    infoDesc.innerText = desc;
    infoPrice.innerText = price || "Цена не указана";
    
    infoActionBtn.onclick = () => {
        if(window.pywebview) window.pywebview.api.open_link(link); // Add open_link to python if needed or use window.open
        else window.open(link, '_blank');
    };
    
    infoModal.classList.remove('hidden');
}
if(infoCloseBtn) infoCloseBtn.addEventListener('click', () => infoModal.classList.add('hidden'));

// --- REPAIR ---
const rb = document.getElementById('global-repair-btn');
if(rb) rb.addEventListener('click', openRepairModal);

function openRepairModal() {
    repairList.innerHTML = '';
    if(globalInstalledIds.length === 0) {
        repairList.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Нет установленных модов.</div>';
    } else {
        globalInstalledIds.forEach(id => {
            const mod = globalModsList.find(m => m.id === id);
            if(!mod) return;
            const item = document.createElement('div');
            item.className = 'repair-item';
            item.innerHTML = `
                <span>${mod.name}</span>
                <button class="repair-btn-small" onclick="doRestore('${mod.id}')">Удалить</button>
            `;
            repairList.appendChild(item);
        });
    }
    repairModal.classList.remove('hidden');
}
if(repairCloseBtn) repairCloseBtn.addEventListener('click', () => repairModal.classList.add('hidden'));

async function doRestore(id) {
    repairModal.classList.add('hidden');
    showToast("Удаление...");
    const res = await window.pywebview.api.restore_mod(id);
    if(res.success) {
        showToast("Успешно удалено");
        loadMods();
    } else {
        showToast("Ошибка: " + res.message);
    }
}

// --- SETTINGS (Simplified) ---
function renderSettings() {
    contentArea.innerHTML = `
        <div class="settings-section">
            <div class="settings-title">Основные</div>
            <div class="setting-item">
                <div class="setting-info">
                    <h4>Метод установки (SDLS)</h4>
                    <p>Устанавливать в папку Documents/packs (рекомендуется).</p>
                </div>
                <label class="switch">
                    <input type="checkbox" id="sdls-toggle" ${currentInstallMethod === 'auto' || currentInstallMethod === 'sdls' ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
        </div>
        <div class="settings-section">
            <div class="settings-title">Внешний вид</div>
            <div class="color-options">
                <div class="color-circle" style="background:#d0bcff" onclick="applyAccentColor('#d0bcff')"></div>
                <div class="color-circle" style="background:#ffb7b2" onclick="applyAccentColor('#ffb7b2')"></div>
                <div class="color-circle" style="background:#a0c4ff" onclick="applyAccentColor('#a0c4ff')"></div>
                <div class="color-circle" style="background:#9bf6ff" onclick="applyAccentColor('#9bf6ff')"></div>
            </div>
        </div>
    `;
    
    const toggle = document.getElementById('sdls-toggle');
    if(toggle) {
        toggle.addEventListener('change', (e) => {
            currentInstallMethod = e.target.checked ? 'auto' : 'standard'; // или 'sdls' / 'no_sdls'
            // Можно сохранять в localStorage
        });
    }
}

function applyAccentColor(hex) {
    document.documentElement.style.setProperty('--md-sys-color-primary', hex);
    // Можно высчитать RGB для полупрозрачности
    localStorage.setItem('accentColor', hex);
}

function renderAbout() {
    contentArea.innerHTML = `
        <div class="big-panel">
            <h2>Loader ASTR</h2>
            <p>Версия: 1.0.0</p>
            <p>Универсальный загрузчик модов.</p>
        </div>
    `;
}

// --- PING ---
async function checkPing() {
    const pt = document.getElementById('ping-text');
    const pd = document.getElementById('ping-dot');
    if(!pt) return;
    const start = Date.now();
    try {
        await fetch(REPO_JSON_URL + '?t=' + start, {method: 'HEAD'});
        const ping = Date.now() - start;
        pt.innerText = ping + " ms";
        pd.style.backgroundColor = ping < 150 ? '#4caf50' : 'orange';
    } catch(e) {
        pt.innerText = "Нет сети";
        pd.style.backgroundColor = '#f44336';
    }
}
