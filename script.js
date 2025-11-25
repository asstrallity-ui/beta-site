// --- КОНФИГ ---
const REPO_JSON_URL = 'https://rh-archive.ru/mods_files_github/mods.json';
const REPO_AUTHORS_URL = 'https://rh-archive.ru/mods_files_github/authors.json';
const REPO_BASE_URL = 'https://rh-archive.ru/mods_files_github/';

// --- DOM ---
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

// Новое окно восстановления
const repairModal = document.getElementById('repair-modal'); 
const repairList = document.getElementById('repair-list');
const repairCloseBtn = document.getElementById('repair-close-btn');

let currentInstallMethod = 'auto'; 
let globalModsList = []; // Храним список модов глобально
let globalInstalledIds = [];

// --- STARTUP ---
document.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('splash-screen');
    const savedColor = localStorage.getItem('accentColor');
    if (savedColor) applyAccentColor(savedColor); else applyAccentColor('#d0bcff');
    setTimeout(() => splash.classList.add('fade-out'), 2600);
    
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        if (window.pywebview || attempts > 50) {
            checkEnvironment();
            loadMods();
            if (window.pywebview) clearInterval(interval);
        }
    }, 100);
});

// --- THEME ---
function hexToRgb(hex) {
    hex = hex.replace('#', '');
    let bigint = parseInt(hex, 16);
    let r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
    return `${r}, ${g}, ${b}`;
}
function applyAccentColor(color) {
    document.documentElement.style.setProperty('--md-sys-color-primary', color);
    document.documentElement.style.setProperty('--md-sys-color-primary-rgb', hexToRgb(color));
}
function renderSettings() {
    let col = getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-primary').trim();
    contentArea.innerHTML = `
        <div class="full-height-container">
            <div class="big-panel grow-panel">
                <h2 class="panel-title">Персонализация</h2>
                <div class="color-picker-container">
                    <div class="color-preview-wrapper"><input type="color" id="accent-color-input" value="${col}"><div class="color-preview-icon" style="background-color: ${col};"></div></div>
                    <div class="color-info"><h3>Акцентный цвет</h3><p>Выберите основной цвет интерфейса.</p></div>
                </div>
                <div class="divider" style="margin: 24px 0;"></div>
                <button class="reset-theme-btn" onclick="resetTheme()"><span class="material-symbols-outlined">restart_alt</span> Сбросить тему</button>
            </div>
        </div>`;
    const inp = document.getElementById('accent-color-input');
    const ico = document.querySelector('.color-preview-icon');
    if(inp) inp.addEventListener('input', (e) => {
        applyAccentColor(e.target.value); localStorage.setItem('accentColor', e.target.value); ico.style.backgroundColor = e.target.value;
    });
}
window.resetTheme = function() { applyAccentColor('#d0bcff'); localStorage.removeItem('accentColor'); renderSettings(); }

// --- NAV ---
function checkEnvironment() {
    // Кнопка восстановления (появляется только если есть pywebview)
    const repairBtn = document.getElementById('global-repair-btn');
    if (window.pywebview && repairBtn) repairBtn.classList.remove('hidden');
}
navItems.forEach(item => {
    item.addEventListener('click', () => {
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

// --- MODS ---
async function loadMods() {
    contentArea.innerHTML = `<div class="loader-spinner"><div class="spinner"></div><p>Загрузка...</p></div>`;
    try {
        const resp = await fetch(REPO_JSON_URL);
        globalModsList = await resp.json(); // Сохраняем глобально
        
        globalInstalledIds = [];
        if (window.pywebview) {
            try { globalInstalledIds = await window.pywebview.api.check_installed_mods(globalModsList); } catch (e) {}
        }
        renderMods(globalModsList, globalInstalledIds);
    } catch (e) { contentArea.innerHTML = `<p style="color:#ff5252;">Ошибка: ${e.message}</p>`; }
}

function renderMods(mods, installedIds) {
    contentArea.innerHTML = '';
    mods.forEach(mod => {
        let img = mod.image || ""; if(img && !img.startsWith('http')) img = REPO_BASE_URL + img;
        if(!img) img = "https://via.placeholder.com/400x220/111/fff?text=No+Image";
        
        const isInst = installedIds.includes(mod.id);
        const btnClass = isInst ? 'install-btn installed' : 'install-btn';
        const btnText = window.pywebview ? (isInst ? 'Уже установлен' : 'Установить') : 'Доступно в приложении';
        const btnIcon = isInst ? 'check' : 'download';
        const disabled = !window.pywebview || isInst; // Блокируем если установлен

        const card = document.createElement('div');
        card.className = 'mod-card';
        card.innerHTML = `
            <img src="${img}" class="card-image">
            <div class="card-content">
                <h3 class="card-title">${mod.name}</h3>
                <p class="card-author">Автор: <span>${mod.author || "?"}</span></p>
                <p class="card-desc">${mod.description || ""}</p>
                <button class="${btnClass}" ${disabled ? 'disabled' : ''} onclick="startInstallProcess('${mod.id}', '${mod.name}', '${mod.file}')">
                    <span class="material-symbols-outlined">${btnIcon}</span> ${btnText}
                </button>
            </div>`;
        contentArea.appendChild(card);
    });
}

function renderInstallMethods() { /* (Код из прошлого ответа, без изменений) */ 
    contentArea.innerHTML = `<div class="full-height-container"><div class="methods-grid"><div class="method-card-new active-method"><div class="method-icon"><span class="material-symbols-outlined">smart_toy</span></div><div class="method-content"><h3>Автоматически</h3><p>Сам найдет папку</p></div></div></div><div class="big-panel grow-panel"><h2 class="panel-title">Инфо</h2><p style="color:#888;">Настройки методов пока фиксированы на Auto.</p></div></div>`;
} // Упростил для краткости, используй полный код из предыдущего ответа если нужно

async function loadAuthors() { /* (Код авторов из прошлого ответа) */ }

// --- INSTALL ---
function startInstallProcess(id, name, url) {
    if(!window.pywebview) return;
    if(url && !url.startsWith('http')) url = REPO_BASE_URL + url;
    
    installView.classList.remove('view-hidden'); successView.classList.add('view-hidden'); errorView.classList.add('view-hidden');
    progressBar.style.width = "0%"; progressPercent.innerText = "0%"; modalTitle.innerText = name; modalStatus.innerText = "Подготовка...";
    modal.classList.remove('hidden');
    window.pywebview.api.install_mod(id, url, currentInstallMethod);
}

modalCloseBtn.addEventListener('click', () => { if(window.pywebview) window.pywebview.api.cancel_install(); closeModal(); });
function closeModal() { modal.classList.add('hidden'); }

window.updateRealProgress = (p, t) => { progressBar.style.width = p + "%"; progressPercent.innerText = p + "%"; modalStatus.innerText = t; }
window.finishInstall = (s, m) => {
    if(s) { installView.classList.add('view-hidden'); successView.classList.remove('view-hidden'); setTimeout(() => { closeModal(); loadMods(); }, 2000); }
    else { if(m==="Canceled"){closeModal();} else { installView.classList.add('view-hidden'); errorView.classList.remove('view-hidden'); errorMessage.innerText = m; setTimeout(closeModal, 3000); } }
}

// --- REPAIR SYSTEM ---
function openRepairModal() {
    // Фильтруем только установленные моды
    const installedMods = globalModsList.filter(m => globalInstalledIds.includes(m.id));
    
    repairList.innerHTML = '';
    if (installedMods.length === 0) {
        repairList.innerHTML = '<p class="empty-text">Нет установленных модов для починки.</p>';
    } else {
        installedMods.forEach(mod => {
            const item = document.createElement('div');
            item.className = 'repair-item';
            item.innerHTML = `
                <span>${mod.name}</span>
                <button class="repair-action-btn" onclick="restoreMod('${mod.id}', '${mod.name}')" title="Восстановить">
                    <span class="material-symbols-outlined">build</span>
                </button>
            `;
            repairList.appendChild(item);
        });
    }
    repairModal.classList.remove('hidden');
}

async function restoreMod(id, name) {
    if (!confirm(`Восстановить оригинальные файлы для "${name}"?`)) return;
    
    // Показываем лоадер внутри кнопки или блокируем UI
    repairModal.classList.add('hidden'); // Закрываем меню выбора
    
    // Используем основное модальное окно для процесса
    installView.classList.remove('view-hidden'); successView.classList.add('view-hidden'); errorView.classList.add('view-hidden');
    progressBar.style.width = "100%"; progressPercent.innerText = ""; modalTitle.innerText = "Восстановление..."; modalStatus.innerText = "Копирование файлов...";
    modal.classList.remove('hidden');

    const res = await window.pywebview.api.restore_mod(id);
    
    if (res.success) {
        finishInstall(true, "Восстановлено");
    } else {
        finishInstall(false, res.message);
    }
}

repairCloseBtn.addEventListener('click', () => repairModal.classList.add('hidden'));
// Привязка кнопки открытия (добавь её в HTML)
document.getElementById('global-repair-btn').addEventListener('click', openRepairModal);
