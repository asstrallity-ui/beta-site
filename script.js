document.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('splash-screen');
    setTimeout(() => { splash.classList.add('fade-out'); }, 2600);
    
    applyStoredTheme();

    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        if (window.pywebview || attempts > 50) {
            checkEnvironment();
            if (window.pywebview) clearInterval(interval);
        }
    }, 100);
});

window.addEventListener('pywebviewready', function() {
    checkEnvironment();
});

const REPO_BASE_URL = 'https://rh-archive.ru/mods_files_github/';
const REPO_JSON_URL = 'https://rh-archive.ru/mods_files_github/mods.json';

const contentArea = document.getElementById('content-area');
const navItems = document.querySelectorAll('.nav-item');
const modal = document.getElementById('progress-modal');
const installView = document.getElementById('install-view');
const successView = document.getElementById('success-view');
const errorView = document.getElementById('error-view');
const progressBar = document.getElementById('progress-bar');
const installSpeed = document.getElementById('install-speed');
const installPercent = document.getElementById('install-percent');

// Данные
let currentModsData = [];
let installedModsIds = []; // Список ID модов, которые РЕАЛЬНО установлены

function checkEnvironment() {
    // Сначала обновляем список установленного (deep check)
    if (window.pywebview) {
        window.pywebview.api.get_installed_list().then(ids => {
            installedModsIds = ids; // Сохраняем массив ID
            loadMods(); // Только потом грузим каталог
        });
    } else {
        loadMods();
    }
}

// Навигация
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        
        const tab = item.dataset.tab;
        handleTabChange(tab);
    });
});

function handleTabChange(tab) {
    const title = document.getElementById('page-title');
    contentArea.innerHTML = '';

    if (tab === 'catalog') {
        title.innerText = 'Каталог модификаций';
        renderMods(currentModsData);
    } else if (tab === 'settings') {
        title.innerText = 'Настройки темы';
        renderSettings();
    } else if (tab === 'methods') {
        title.innerText = 'Методы установки';
        contentArea.innerHTML = '<p style="padding:20px; color:#888;">Настройки путей установки (Auto/sDLS/Standart)...</p>';
    } else if (tab === 'authors') {
        title.innerText = 'Авторы';
        contentArea.innerHTML = '<p style="padding:20px; color:#888;">Список авторов...</p>';
    }
}

async function loadMods() {
    try {
        const response = await fetch(REPO_JSON_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        currentModsData = await response.json();
        
        if (document.querySelector('.nav-item[data-tab="catalog"]').classList.contains('active')) {
            renderMods(currentModsData);
        }
    } catch (error) {
        console.error('Error loading mods:', error);
        // Fallback если основной сервер лежит
        contentArea.innerHTML = '<p style="color: #f44336; padding: 20px;">Ошибка загрузки каталога.</p>';
    }
}

function renderMods(mods) {
    contentArea.innerHTML = '<div class="mod-grid" id="mod-grid"></div>';
    const grid = document.getElementById('mod-grid');

    mods.forEach(mod => {
        const card = document.createElement('div');
        card.className = 'glass-card';
        
        // Проверка: установлен ли мод?
        const isInstalled = installedModsIds.includes(String(mod.id));
        
        let btnHtml = '';
        if (isInstalled) {
            btnHtml = `
                <button class="btn-primary btn-installed" disabled>
                    <span class="material-symbols-outlined" style="font-size:18px;">check</span>
                    Уже установлен
                </button>
            `;
        } else {
            btnHtml = `
                <button class="btn-primary" onclick="startInstall('${mod.id}')">
                    Установить
                </button>
            `;
        }

        card.innerHTML = `
            <div class="mod-title">${mod.name}</div>
            <div class="mod-desc">${mod.description || 'Нет описания'}</div>
            ${btnHtml}
        `;
        grid.appendChild(card);
    });
}

function startInstall(modId) {
    const mod = currentModsData.find(m => String(m.id) === String(modId));
    if (!mod) return;

    modal.classList.add('visible');
    installView.classList.remove('hidden');
    successView.classList.add('hidden');
    errorView.classList.add('hidden');
    
    updateInstallStatus('progress', { stage: 'start', percent: 0, speed: 'Запуск...' });

    if (window.pywebview) {
        window.pywebview.api.install_mod(mod, 'auto');
    }
}

// НОВАЯ ФУНКЦИЯ: Отмена установки
function cancelInstall() {
    // Если установка идет, отменяем в питоне
    if (!installView.classList.contains('hidden')) {
        if (window.pywebview) {
            window.pywebview.api.cancel_installation();
            installSpeed.innerText = "Отмена операции...";
        }
    } else {
        // Если уже "Успех" или "Ошибка", просто закрываем окно
        hideModal();
    }
}

function hideModal() {
    modal.classList.remove('visible');
    // Обновляем статус кнопок после закрытия окна (вдруг установили?)
    checkEnvironment();
}

window.updateInstallStatus = function(status, data) {
    if (status === 'progress') {
        const percent = data.percent;
        progressBar.style.width = percent + '%';
        installPercent.innerText = percent + '%';
        
        if (data.stage === 'download') {
            installSpeed.innerText = `Скачивание: ${data.speed || ''}`;
        } else if (data.stage === 'unpack') {
            installSpeed.innerText = 'Распаковка файлов...';
        }

    } else if (status === 'success') {
        installView.classList.add('hidden');
        successView.classList.remove('hidden');
        setTimeout(hideModal, 2000);

    } else if (status === 'error') {
        installView.classList.add('hidden');
        errorView.classList.remove('hidden');
        document.getElementById('error-msg').innerText = typeof data === 'string' ? data : 'Error';

    } else if (status === 'cancelled') {
        hideModal();
    }
};

// --- Theme Logic ---
function renderSettings() {
    const storedColor = localStorage.getItem('accentColor') || '#d0bcff';
    contentArea.innerHTML = `
        <div class="glass-card" style="max-width: 500px;">
            <h3 class="mod-title">Персонализация</h3>
            <p style="color:#bbb; margin-bottom:15px;">Основной цвет (Accent):</p>
            <div style="display: flex; gap: 10px; align-items: center;">
                <input type="color" id="color-picker" value="${storedColor}" style="border:none; width:50px; height:50px; cursor:pointer; background:none;">
                <span id="color-val">${storedColor}</span>
            </div>
            <button class="btn-primary" style="margin-top:20px;" onclick="resetTheme()">Сброс</button>
        </div>
    `;
    
    const picker = document.getElementById('color-picker');
    picker.addEventListener('input', (e) => {
        updateTheme(e.target.value);
        document.getElementById('color-val').innerText = e.target.value;
    });
}

function updateTheme(hexColor) {
    const rgb = hexToRgb(hexColor);
    document.documentElement.style.setProperty('--md-sys-color-primary', hexColor);
    document.documentElement.style.setProperty('--md-sys-color-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    localStorage.setItem('accentColor', hexColor);
}

function applyStoredTheme() {
    const storedColor = localStorage.getItem('accentColor');
    if (storedColor) {
        updateTheme(storedColor);
    }
}

function resetTheme() {
    updateTheme('#d0bcff');
    if(document.getElementById('color-picker')) {
        document.getElementById('color-picker').value = '#d0bcff';
        document.getElementById('color-val').innerText = '#d0bcff';
    }
}

function hexToRgb(hex) {
    const bigint = parseInt(hex.replace('#', ''), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
}
