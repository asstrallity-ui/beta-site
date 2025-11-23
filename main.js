let bridge = null;

function setupWebChannel() {
    if (typeof QWebChannel === "undefined" || typeof qt === "undefined") return;
    new QWebChannel(qt.webChannelTransport, function (channel) {
        bridge = channel.objects.bridge;
    });
}

function onTabClick(tabId) {
    // Переключение кнопок
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`button[data-tab="${tabId}"]`).classList.add('active');

    // Переключение панелей
    document.querySelectorAll('.tab-panel').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    // Меняем заголовок (Upper Case для стиля)
    const titles = {
        'tab-mods': 'БИБЛИОТЕКА',
        'tab-info': 'ИНФОРМАЦИЯ',
        'tab-methods': 'УСТАНОВКА'
    };
    
    const titleEl = document.getElementById('page-title');
    // Эффект "перепечатывания" (опционально, но стильно)
    titleEl.style.opacity = 0;
    setTimeout(() => {
        titleEl.innerText = titles[tabId] || 'МЕНЮ';
        titleEl.style.opacity = 1;
    }, 150);

    if (bridge) bridge.onTabClicked(tabId);
}

function onActionClick(action) {
    if (bridge) bridge.onAction(action);
}

document.addEventListener("DOMContentLoaded", setupWebChannel);
