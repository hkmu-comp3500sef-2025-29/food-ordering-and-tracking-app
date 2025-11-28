function sideBarOpen() {
    const sidebar = document.getElementById("side-bar");
    if (sidebar) {
        sidebar.classList.add("sidebar-open");
    }
}
function sideBarClose() {
    const sidebar = document.getElementById("side-bar");
    if (sidebar) {
        sidebar.classList.remove("sidebar-open");
    }
}
document.addEventListener("DOMContentLoaded", () => {
    const closeBtn = document.getElementById("close-btn");
    const settingsBtn = document.getElementById("settings-btn");
    if (closeBtn) {
        closeBtn.addEventListener("click", sideBarClose);
    }
    if (settingsBtn) {
        settingsBtn.addEventListener("click", sideBarOpen);
    }
});
export { sideBarOpen, sideBarClose };
