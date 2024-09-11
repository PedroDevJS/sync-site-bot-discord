function themeMode() {
    const body = document.body;
    const isDarkMode = body.classList.contains('light-mode');
    
    if (isDarkMode) {
        body.classList.remove('light-mode');
        body.style.backgroundColor = "#242424";
    } else {
        body.classList.add('light-mode');
        body.style.backgroundColor = "#ffffff";
    }
}