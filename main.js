let bridge = null;

function setupWebChannel() {
    if (typeof QWebChannel === "undefined" || typeof qt === "undefined") {
        console.warn("QWebChannel/qt не найдены — вероятно, страница открыта не из PyQt.");
        return;
    }

    new QWebChannel(qt.webChannelTransport, function (channel) {
        bridge = channel.objects.bridge;
        console.log("[JS] WebChannel готов, bridge =", bridge);
    });
}

/**
 * Переключение вкладок по клику
 */
function onTabClick(tabId) {
    // Переключение CSS-классов
    document.querySelectorAll(".tab-button").forEach(btn => {
        const isActive = btn.dataset.tab === tabId;
        btn.classList.toggle("tab-active", isActive);
    });

    document.querySelectorAll(".tab-page").forEach(page => {
        const isActive = page.id === tabId;
        page.classList.toggle("tab-page-active", isActive);
    });

    // Сообщаем Python, что пользователь переключил вкладку
    if (bridge && typeof bridge.onTabClicked === "function") {
        bridge.onTabClicked(tabId);
    }
}

/**
 * Действия (установка, выход и т.п.)
 */
function onActionClick(actionName) {
    if (bridge && typeof bridge.onAction === "function") {
        bridge.onAction(actionName);
    } else {
        console.log("[JS] Action:", actionName);
    }
}

// Запуск инициализации после загрузки DOM
document.addEventListener("DOMContentLoaded", () => {
    setupWebChannel();
});
