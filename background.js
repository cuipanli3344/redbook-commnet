// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 转发消息给popup
  if (message.action === 'updateStatus') {
    chrome.runtime.sendMessage(message);
  }
  return true;
}); 