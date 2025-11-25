document.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('splash-screen');
    setTimeout(() => { splash.classList.add('fade-out'); }, 2000);
    
    // Инициализация темы
    applyStoredTheme();

    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        if (window.pywebview || attempts > 50) {
            clearInterval(interval);
            initApp();
        }
    }, 100);
});

// URL для JSON (заглушка или реальный)
const REPO_JSON_URL = 'https://raw.githubusercontent.com/Asstrallity-UI/beta-site/refs/heads/main/mods.json'; 

const contentArea = document.getElementById('content-area');
const navItems = document.querySelectorAll('.nav-item');
const modal = document.getElementById('progress-modal');
const installView = document.getElementById('install-view');
const successView = document.getElementById('success-view');
const errorView = document.getElementById('error-view');
const progressBar = document.getElementById('progress-bar');
const installSpeed = document.getElementById('install-speed');
const installPercent = document.getElementById('install-percent');
const cancelBtn = document.getElementById('cancel-btn');

let currentModsData = []; // Храним загруженные моды
let installedModsIds = []; // ID установленных модов

function initApp() {
    setupNavigation();
    // Сначала узнаем, что уже установлено
    refreshInstalledList().then(() => {
        loadMods();
    });
}

// Запрос к Python: дай список установленных ID
function refreshInstalledList() {
    if (window.pywebview) {
        return window.pywebview.api.get_installed_list().then(ids => {
            installedModsIds = ids;
            console.log("Installed mods:", installedModsIds);
        });
    }
    return Promise.resolve();
}

function setupNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            const tab = item.dataset.tab;
            handleTabChange(tab);
        });
    });
}

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
        contentArea.innerHTML = '<p style="padding:20px; color:#888;">Настройки путей установки (Auto/sDLS)...</p>';
    } else {
        title.innerText = tab;
    }
}

async function loadMods() {
    try {
        const response = await fetch(REPO_JSON_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        currentModsData = await response.json();
        
        // Если мы на вкладке каталога, рендерим
        if (document.querySelector('.nav-item[data-tab="catalog"]').classList.contains('active')) {
            renderMods(currentModsData);
        }
    } catch (error) {
        console.error('Error loading mods:', error);
        contentArea.innerHTML = '<p style="color: #f44336; padding: 20px;">Ошибка загрузки каталога. Проверьте соединение.</p>';
    }
}

function renderMods(mods) {
    contentArea.innerHTML = '<div class="mod-grid" id="mod-grid"></div>';
    const grid = document.getElementById('mod-grid');

    mods.forEach(mod => {
        const isInstalled = installedModsIds.includes(String(mod.id));

        const card = document.createElement('div');
        card.className = 'glass-card';
        
        let buttonHtml = '';
        if (isInstalled) {
            buttonHtml = `
                <button class="btn-primary btn-installed" disabled>
                    <span class="material-symbols-outlined" style="font-size:18px;">check</span>
                    Уже установлен
                </button>
            `;
        } else {
            buttonHtml = `
                <button class="btn-primary" onclick="startInstall('${mod.id}')">
                    Установить
                </button>
            `;
        }

        card.innerHTML = `
            <div class="mod-title">${mod.name}</div>
            <div class="mod-desc">${mod.description || 'Описание отсутствует'}</div>
            ${buttonHtml}
        `;
        grid.appendChild(card);
    });
}

function startInstall(modId) {
    const mod = currentModsData.find(m => String(m.id) === String(modId));
    if (!mod) return;

    showModal();
    // Сброс UI
    installView.classList.remove('hidden');
    successView.classList.add('hidden');
    errorView.classList.add('hidden');
    cancelBtn.style.display = 'block'; // Показываем крестик
    
    updateInstallStatus('progress', { stage: 'start', percent: 0, speed: 'Initializing...' });

    if (window.pywebview) {
        // По умолчанию ставим Auto, можно расширить выбор
        window.pywebview.api.install_mod(mod, 'auto');
    }
}

// Вызывается кнопкой крестика
function cancelInstall() {
    if (window.pywebview) {
        window.pywebview.api.cancel_installation();
    }
    // UI обновится через событие 'cancelled' от питона, но можно и сразу визуально:
    installSpeed.innerText = "Отмена...";
}

function showModal() {
    modal.classList.add('visible');
}

function hideModal() {
    modal.classList.remove('visible');
    // После закрытия обновляем список, вдруг что-то установилось или удалилось
    refreshInstalledList().then(() => {
        if (document.querySelector('.nav-item[data-tab="catalog"]').classList.contains('active')) {
            renderMods(currentModsData);
        }
    });
}

// Функция, которую вызывает Python
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
        cancelBtn.style.display = 'none'; // Убираем крестик на успехе
        setTimeout(hideModal, 2000);

    } else if (status === 'error') {
        installView.classList.add('hidden');
        errorView.classList.remove('hidden');
        document.getElementById('error-msg').innerText = typeof data === 'string' ? data : 'Error';
        cancelBtn.style.display = 'block'; // Оставляем, чтобы закрыть окно

    } else if (status === 'cancelled') {
        // Просто закрываем окно или показываем сообщение
        hideModal();
    }
};

// === Theme Logic ===
function renderSettings() {
    const storedColor = localStorage.getItem('accentColor') || '#d0bcff';
    contentArea.innerHTML = `
        <div class="glass-card" style="max-width: 500px;">
            <h3 class="mod-title">Персонализация</h3>
            <p style="color:#bbb; margin-bottom:15px;">Выберите основной цвет интерфейса:</p>
            <div style="display: flex; gap: 10px; align-items: center;">
                <input type="color" id="color-picker" value="${storedColor}" style="border:none; width:50px; height:50px; cursor:pointer; background:none;">
                <span id="color-val">${storedColor}</span>
            </div>
            <button class="btn-primary" style="margin-top:20px;" onclick="resetTheme()">Сбросить по умолчанию</button>
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
