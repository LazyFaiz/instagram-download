const api = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome;

api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "DOWNLOAD_FILE") return false;
  downloadFile(message, sendResponse);
  return true;
});

async function downloadFile(message, sendResponse) {
  try {
    const { blobUrl, filename, subfolder } = message;
    const path = subfolder ? `${subfolder}/${filename}` : filename;
    api.downloads.download(
      {
        url: blobUrl,
        filename: path,
        saveAs: false
      },
      (downloadId) => {
        if (api.runtime.lastError) {
          sendResponse({
            success: false,
            error: api.runtime.lastError.message
          });
          return;
        }
        sendResponse({ success: true, downloadId });
      }
    );
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "未知错误"
    });
  }
}
