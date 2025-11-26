const REPO_JSON_URL = 'https://rh-archive.ru/mods_files_github/mods.json';
const REPO_AUTHORS_URL = 'https://rh-archive.ru/mods_files_github/authors.json';
const REPO_BUY_URL = 'https://rh-archive.ru/mods_files_github/buy.json';
const REPO_BASE_URL = 'https://rh-archive.ru/mods_files_github/';

const contentArea = document.getElementById('content-area');
const navItems = document.querySelectorAll('.nav-item');

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

// GEO
const btnTestGeo = document.getElementById('btn-test-geo');
const geoModal = document.getElementById('geo-modal');
const btnGeoFix = document.getElementById('btn-geo-fix');

const toast = document.getElementById('toast-notification');

let currentInstallMethod = 'auto';
let globalModsList = [];
let globalBuyList = [];
let globalInstalledIds = [];
let newUpdateUrl = "";

document.addEventListener('DOMContentLoaded', () => {
    const savedColor = localStorage.getItem('accentColor');
    if (savedColor) applyAccentColor(savedColor);
    else applyAccentColor('#d0bcff');

    // Ждем pywebview
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        if (window.pywebview || attempts > 50) {
            checkEnvironment();
            loadMods();
            if (window.pywebview) clearInterval(interval);
        }
    }, 100);

    checkPing();
    setInterval(checkPing, 5000);
});

window.addEventListener('pywebviewready', checkEnvironment);

// --- GEO CHECK FUNCTIONS ---
async function checkGeo(test = false) {
    if (!window.pywebview) return;
    
    try {
        // Вызываем Python API: test=true форсирует "blocked"
        const res = await window.pywebview.api.check_connection_status(test);
        
        if (res.status === 'blocked') {
            // Показываем красное модальное окно
            geoModal.classList.remove('hidden');
            geoModal.classList.add('active');
        } else {
            if (test) {
                showToast("Вы не в Украине (Тест OK)");
            }
        }
    } catch (e) {
        console.error("Geo check error:", e);
    }
}

if (btnTestGeo) {
    btnTestGeo.addEventListener('click', () => {
        // При нажатии кнопки - запускаем с флагом TEST=TRUE
        checkGeo(true);
    });
}

if (btnGeoFix) {
    btnGeoFix.addEventListener('click', async () => {
        // Логика исправления: меняем "настройки" и перезагружаем
        btnGeoFix.innerText = "Перезагрузка...";
        btnGeoFix.disabled = true;
        
        localStorage.setItem('language', 'ru'); // Для примера сохраняем настройку
        
        if (window.pywebview) {
            await window.pywebview.api.restart_app();
        }
    });
}
// ---------------------------

function checkEnvironment() {
    // Запускаем проверку ГЕО при старте (настоящую, test=false)
    checkGeo(false);

    if(window.pywebview) {
        checkForUpdates(false);
        // Get installed mods
    }
}

function showToast(msg) {
    if(!toast) return;
    toast.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

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
        btnStartUpdate.innerHTML = '<span class="material-symbols-outlined spinner-sm">sync</span> Скачивание...';
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
    <div class="big-panel fade-in">
        <div class="panel-title">Персонализация</div>
        <div class="custom-color-picker">
            <div class="picker-header">
                <div class="current-color-preview" style="background-color: ${col}"></div>
                <div class="picker-info">
                    <h3>Акцентный цвет</h3>
                    <p>Выберите основной цвет интерфейса</p>
                </div>
            </div>
            <div class="picker-controls">
                <label>Оттенок</label>
                <input type="range" min="0" max="360" class="slider-hue" id="hue-slider">
                <div class="presets-grid">
                    <div class="color-preset" style="background:#d0bcff" onclick="updateColor('#d0bcff')"></div>
                    <div class="color-preset" style="background:#ffb7b2" onclick="updateColor('#ffb7b2')"></div>
                    <div class="color-preset" style="background:#b2fba5" onclick="updateColor('#b2fba5')"></div>
                    <div class="color-preset" style="background:#a5eeff" onclick="updateColor('#a5eeff')"></div>
                    <div class="color-preset" style="background:#fffda5" onclick="updateColor('#fffda5')"></div>
                </div>
            </div>
        </div>
        <button class="reset-theme-btn" onclick="updateColor('#d0bcff')">
            <span class="material-symbols-outlined">restart_alt</span> Сбросить тему
        </button>
    </div>
    `;
    
    const slider = document.getElementById('hue-slider');
    if(slider) {
        slider.addEventListener('input', (e) => {
            const hue = e.target.value;
            const color = `hsl(${hue}, 100%, 80%)`;
            updateColor(color);
        });
    }
}
window.updateColor = (c) => {
    localStorage.setItem('accentColor', c);
    applyAccentColor(c);
    const p = document.querySelector('.current-color-preview');
    if(p) p.style.backgroundColor = c;
}

// --- NAVIGATION ---
navItems.forEach(btn => {
    btn.addEventListener('click', () => {
        // Если это кнопка теста, не переключаем вкладки
        if (btn.id === 'btn-test-geo') return;

        navItems.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        
        if(tab === 'home') loadMods();
        else if(tab === 'installed') loadInstalled();
        else if(tab === 'settings') renderSettings();
        else if(tab === 'about') renderAbout();
    });
});

async function loadMods() {
    contentArea.innerHTML = '<div class="loader-spinner"><div class="spinner"></div><p>Загрузка каталога...</p></div>';
    
    try {
        // Parallel fetch
        const [modsRes, buyRes] = await Promise.all([
            fetch(REPO_JSON_URL + '?t=' + Date.now()).then(r => r.json()),
            fetch(REPO_BUY_URL + '?t=' + Date.now()).then(r => r.json())
        ]);

        globalModsList = modsRes;
        globalBuyList = buyRes;
        
        if(window.pywebview) {
            globalInstalledIds = await window.pywebview.api.check_installed_mods(globalModsList);
        }
        
        renderModsGrid(globalModsList, globalBuyList, globalInstalledIds);
        
        if(splash) {
             splash.classList.add('fade-out');
             setTimeout(()=> splash.style.display='none', 800);
        }

    } catch (e) {
        contentArea.innerHTML = `<div class="error-text">Ошибка загрузки: ${e.message}</div>`;
        if(splash) splash.style.display='none';
    }
}

async function loadInstalled() {
    if(!window.pywebview) {
        contentArea.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined empty-icon">desktop_access_disabled</span><p>Требуется приложение</p></div>';
        return;
    }
    
    globalInstalledIds = await window.pywebview.api.check_installed_mods(globalModsList);
    const installedMods = globalModsList.filter(m => globalInstalledIds.includes(m.id));
    
    if (installedMods.length === 0) {
        contentArea.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined empty-icon">inventory_2</span><p>Пусто. Установите что-нибудь!</p></div>';
        return;
    }
    
    renderModsGrid(installedMods, globalBuyList, globalInstalledIds);
}

function renderModsGrid(mods, buyList, installedIds) {
    contentArea.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'content-grid fade-in';
    contentArea.appendChild(grid);
    
    if(mods.length === 0) { grid.innerHTML = 'Пусто.'; return; }
    
    mods.forEach(mod => {
        let img = mod.image || "";
        if(img && !img.startsWith('http')) img = REPO_BASE_URL + img;
        if(!img) img = "https://via.placeholder.com/400x220/111/fff?text=No+Image";
        
        const isInst = installedIds.includes(mod.id);
        const buyInfo = buyList.find(b => b.id === mod.id);
        
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
                <div class="card-title">${mod.name}</div>
                <div class="card-author">by <span>${mod.author || "Unknown"}</span></div>
                <div class="card-desc">${mod.description || ""}</div>
                <button class="${btnClass}" onclick="${onClickAction}" ${isDisabled ? 'disabled' : ''}>
                    <span class="material-symbols-outlined">${btnIcon}</span> ${btnText}
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// INFO MODAL
window.openInfoModal = (type, id) => {
    const mod = globalModsList.find(m => m.id === id);
    const buyItem = globalBuyList.find(b => b.id === id);
    if(!mod) return;

    infoTitle.innerText = mod.name;
    infoDesc.innerHTML = buyItem ? buyItem.desc : "Описание недоступно.";
    
    const pb = document.getElementById('info-modal-price-block');
    pb.innerHTML = '';

    if(type === 'preorder') {
        infoActionBtn.innerText = "Оформить предзаказ";
        infoActionBtn.disabled = true;
        infoActionBtn.style.background = "#444";
    } else if (type === 'paid') {
        infoActionBtn.innerText = "Перейти к покупке";
        infoActionBtn.disabled = false;
        infoActionBtn.onclick = () => {
             if(buyItem && buyItem.link) window.open(buyItem.link, '_blank');
        };
        const ptag = document.createElement('span');
        ptag.className = "info-price-tag";
        ptag.innerText = buyItem.price || "Цена не указана";
        pb.appendChild(ptag);
    }

    infoModal.classList.remove('hidden');
}
if(infoCloseBtn) infoCloseBtn.addEventListener('click', () => infoModal.classList.add('hidden'));

// INSTALL LOGIC
function startInstallProcess(id, name, url) {
    if(!window.pywebview) return;
    
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
            loadMods();
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

// REPAIR
function openRepairModal() {
    const installedMods = globalModsList.filter(m => globalInstalledIds.includes(m.id));
    repairList.innerHTML = '';
    
    if (installedMods.length === 0) repairList.innerHTML = '<div style="text-align:center; color:#777; padding:20px;">Нет установленных модов для починки.</div>';
    else {
        installedMods.forEach(mod => {
            const item = document.createElement('div');
            item.className = 'repair-item';
            item.innerHTML = `
                <span>${mod.name}</span>
                <button class="repair-action-btn" title="Удалить / Восстановить" onclick="restoreMod('${mod.id}', '${mod.name}')">
                    <span class="material-symbols-outlined">delete_history</span>
                </button>
            `;
            repairList.appendChild(item);
        });
    }
    repairModal.classList.remove('hidden');
}

window.restoreMod = async (id, name) => {
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

function renderAbout() {
    contentArea.innerHTML = `
    <div class="about-page-container fade-in">
        <div class="big-panel grow-panel" style="align-items:center; text-align:center;">
            <img src="https://i.imgur.com/6Jj3J3k.png" style="width:100px; margin-bottom:20px;">
            <h2 style="font-size:28px; margin-bottom:10px;">LOADER ASTR</h2>
            <p style="color:var(--md-sys-color-primary); font-weight:700; margin-bottom:20px;">v1.0.0 Release</p>
            <p style="color:#999; max-width:600px; line-height:1.6;">
                Это универсальный лаунчер-загрузчик модов в игру <b>Tanks Blitz</b>.
                <br>Разработан для упрощения установки модификаций, без лишних действий с файловой системой.
                <br><br>
                Авторы: <span style="color:#fff;">Asstrallity Team</span>
            </p>
            <button style="margin-top:30px; background:transparent; border:1px solid #555; color:#ccc; padding:10px 30px; border-radius:20px; cursor:pointer;" onclick="checkEnvironment()">Перезагрузить UI</button>
        </div>
    </div>
    `;
}
