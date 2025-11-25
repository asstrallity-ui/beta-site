// В начале файла, где загрузка
document.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('splash-screen');
    
    // Загружаем сохраненный цвет
    const savedColor = localStorage.getItem('accentColor');
    if (savedColor) {
        applyAccentColor(savedColor);
    } else {
        // Цвет по умолчанию (фиолетовый)
        applyAccentColor('#d0bcff');
    }

    setTimeout(() => { 
        splash.classList.add('fade-out'); 
    }, 2600); 
    
    loadMods();
    // ... остальной код ...
});

// --- ФУНКЦИИ СМЕНЫ ЦВЕТА (Улучшенные) ---
function hexToRgb(hex) {
    // Убираем решетку, если есть
    hex = hex.replace('#', '');
    
    // Парсим r, g, b
    let bigint = parseInt(hex, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;

    return `${r}, ${g}, ${b}`;
}

function applyAccentColor(color) {
    const root = document.documentElement;
    
    // Устанавливаем основной цвет
    root.style.setProperty('--md-sys-color-primary', color);
    
    // Устанавливаем RGB версию для прозрачности
    const rgb = hexToRgb(color);
    root.style.setProperty('--md-sys-color-primary-rgb', rgb);
    
    // Вычисляем контрастный цвет текста на кнопках (черный или белый)
    // Для простоты пока оставим темный, так как обычно акцентные цвета светлые на темной теме
    root.style.setProperty('--md-sys-color-on-primary', '#1e1e1e'); 
}

function renderSettings() {
    // Получаем текущий цвет из переменной или дефолт
    let currentColor = getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-primary').trim();
    
    contentArea.innerHTML = `
        <div class="full-height-container">
            <div class="big-panel grow-panel">
                <h2 class="panel-title">Персонализация</h2>
                
                <div class="color-picker-container">
                    <!-- Превью цвета -->
                    <div class="color-preview-wrapper">
                        <input type="color" id="accent-color-input" value="${currentColor}">
                        <div class="color-preview-icon" style="background-color: ${currentColor};"></div>
                    </div>
                    
                    <div class="color-info">
                        <h3>Акцентный цвет</h3>
                        <p>Выберите основной цвет интерфейса</p>
                    </div>
                </div>

                <div class="divider" style="margin: 24px 0;"></div>

                <button class="reset-theme-btn" onclick="resetTheme()">
                    <span class="material-symbols-outlined">restart_alt</span> Сбросить тему
                </button>
            </div>
        </div>
    `;

    const colorInput = document.getElementById('accent-color-input');
    const previewIcon = document.querySelector('.color-preview-icon');

    colorInput.addEventListener('input', (e) => {
        const newColor = e.target.value;
        previewIcon.style.backgroundColor = newColor;
        applyAccentColor(newColor);
        localStorage.setItem('accentColor', newColor);
    });
}

window.resetTheme = function() {
    const defaultColor = '#d0bcff';
    applyAccentColor(defaultColor);
    localStorage.removeItem('accentColor');
    renderSettings();
}
