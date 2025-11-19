function sideBarOpen(): void {
  const sidebar = document.getElementById("side-bar");
  if (sidebar) {
    sidebar.classList.add("sidebar-open");
  }
}

function sideBarClose(): void {
  const sidebar = document.getElementById("side-bar");
  if (sidebar) {
    sidebar.classList.remove("sidebar-open");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.getElementById("close-btn");
  const settingBtn = document.getElementById("setting-btn");

  if (closeBtn) {
    closeBtn.addEventListener("click", sideBarClose);
  }
  if (settingBtn) {
    settingBtn.addEventListener("click", sideBarOpen);
  }
});

export { sideBarOpen, sideBarClose };