const DEFAULT_SETTINGS = {
  downloadDirectory: "Instagram",
  buttonDisplayMode: "hover",
  enableSubfolders: true,
  subfolderMode: "username"
};

const api = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome;

async function ensureInstagramTab() {
  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url || "";
    if (url.includes("instagram.com")) return true;
    await api.tabs.create({ url: "https://www.instagram.com/" });
    window.close();
    return false;
  } catch {
    return true;
  }
}

async function loadSettings() {
  try {
    const stored = await api.storage.sync.get("downloadSettings");
    return {
      ...DEFAULT_SETTINGS,
      ...(stored.downloadSettings || {})
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

async function saveSettings(settings) {
  await api.storage.sync.set({ downloadSettings: settings });
}

function bindSettings(initialSettings) {
  const settings = { ...initialSettings };
  const buttonMode = document.getElementById("button-mode");
  const enableSubfolders = document.getElementById("enable-subfolders");
  const subfolderMode = document.getElementById("subfolder-mode");
  const status = document.getElementById("status");

  buttonMode.checked = settings.buttonDisplayMode === "visible";
  enableSubfolders.checked = settings.enableSubfolders !== false;
  subfolderMode.value = settings.subfolderMode || "username";
  subfolderMode.disabled = !enableSubfolders.checked;

  const save = async () => {
    settings.buttonDisplayMode = buttonMode.checked ? "visible" : "hover";
    settings.enableSubfolders = enableSubfolders.checked;
    settings.subfolderMode = subfolderMode.value;
    subfolderMode.disabled = !enableSubfolders.checked;
    try {
      await saveSettings(settings);
      status.textContent = "设置已保存";
      setTimeout(() => {
        status.textContent = "";
      }, 1200);
    } catch {
      status.textContent = "保存失败，请重试";
    }
  };

  buttonMode.addEventListener("change", save);
  enableSubfolders.addEventListener("change", save);
  subfolderMode.addEventListener("change", save);
}

(async () => {
  if (!(await ensureInstagramTab())) return;
  bindSettings(await loadSettings());
})();
