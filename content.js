let isCollecting = false;
let timer = null;

// 采集笔记内容
async function collectNoteContent() {
  try {
    // 更新选择器以匹配小红书实际DOM结构
    const content = {
      title: document.querySelector('.title')?.innerText?.trim() || 
             document.querySelector('.note-detail .title')?.innerText?.trim(),
      content: document.querySelector('.desc')?.innerText?.trim() || 
               document.querySelector('.note-detail .content')?.innerText?.trim(),
      images: Array.from(document.querySelectorAll('.note-detail img')).map(img => img.src),
      likes: document.querySelector('.like-count')?.innerText?.trim() ||
             document.querySelector('.like-wrapper .count')?.innerText?.trim(),
      timestamp: document.querySelector('.date')?.innerText?.trim() ||
                document.querySelector('.publish-time')?.innerText?.trim()
    };
    console.log('采集到的笔记内容:', content);
    return content;
  } catch (error) {
    console.error('采集笔记内容错误:', error);
    return {};
  }
}

// 采集作者信息
async function collectAuthorInfo() {
  try {
    // 更新选择器以匹配小红书实际DOM结构
    const author = {
      name: document.querySelector('.user-nickname')?.innerText?.trim() ||
            document.querySelector('.author-name')?.innerText?.trim(),
      id: document.querySelector('.user-id')?.innerText?.trim() ||
          document.querySelector('.author-id')?.innerText?.trim(),
      followers: document.querySelector('.user-follows')?.innerText?.trim() ||
                document.querySelector('.follows-count')?.innerText?.trim(),
      description: document.querySelector('.user-desc')?.innerText?.trim() ||
                  document.querySelector('.author-desc')?.innerText?.trim()
    };
    console.log('采集到的作者信息:', author);
    return author;
  } catch (error) {
    console.error('采集作者信息错误:', error);
    return {};
  }
}

// 采集评论
async function collectComments() {
  try {
    // 等待评论加载
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 点击加载更多评论
    const loadMoreComments = async () => {
      const loadMoreBtn = document.querySelector('.load-more') || 
                         document.querySelector('.show-more');
      if (loadMoreBtn && loadMoreBtn.style.display !== 'none') {
        loadMoreBtn.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await loadMoreComments();
      }
    };
    await loadMoreComments();

    // 采集评论数据
    const comments = Array.from(document.querySelectorAll('.comment-item, .comment-wrapper')).map(item => ({
      user: item.querySelector('.user-nickname, .nickname')?.innerText?.trim(),
      content: item.querySelector('.content, .comment-content')?.innerText?.trim(),
      likes: item.querySelector('.like-count, .like-wrapper .count')?.innerText?.trim(),
      time: item.querySelector('.time, .date')?.innerText?.trim()
    }));

    console.log('采集到的评论:', comments);
    return comments;
  } catch (error) {
    console.error('采集评论错误:', error);
    return [];
  }
}

// 保存采集的数据
function saveCollectedData(data) {
  chrome.storage.local.get(['collectedData'], function(result) {
    const collectedData = result.collectedData || [];
    const newData = {
      ...data,
      url: window.location.href,
      collectTime: new Date().toISOString()
    };
    collectedData.push(newData);
    chrome.storage.local.set({ collectedData }, () => {
      console.log('数据保存成功:', newData);
      // 通过background script转发消息
      chrome.runtime.sendMessage({
        action: 'updateStatus',
        message: `成功采集数据：${newData.content?.title || '未知标题'}`
      }).catch(error => {
        console.log('发送状态更新消息失败:', error);
      });
    });
  });
}

// 采集当前页面数据
async function collectCurrentPage(settings) {
  try {
    console.log('开始采集页面数据，设置:', settings);
    const data = {};

    if (settings.content) {
      data.content = await collectNoteContent();
    }

    if (settings.author) {
      data.author = await collectAuthorInfo();
    }

    if (settings.comments) {
      data.comments = await collectComments();
    }

    // 检查是否采集到有效数据
    if (Object.keys(data).length > 0 && 
        (data.content?.title || data.content?.content || data.author?.name)) {
      saveCollectedData(data);
    } else {
      console.warn('未采集到有效数据');
    }

  } catch (error) {
    console.error('采集页面数据错误:', error);
  }
}

// 自动采集流程
async function autoCollect(settings) {
  if (!isCollecting) return;

  await collectCurrentPage(settings);

  // 根据模式决定下一步操作
  if (settings.mode === 'author') {
    const nextPost = document.querySelector('.author-note:not(.collected), .note-item:not(.collected)');
    if (nextPost) {
      nextPost.classList.add('collected');
      nextPost.click();
      timer = setTimeout(() => autoCollect(settings), (settings.interval || 3) * 1000);
    } else {
      console.log('没有更多笔记可采集');
      isCollecting = false;
    }
  } else if (settings.mode === 'search') {
    const nextPost = document.querySelector('.search-item:not(.collected), .note-item:not(.collected)');
    if (nextPost) {
      nextPost.classList.add('collected');
      nextPost.click();
      timer = setTimeout(() => autoCollect(settings), (settings.interval || 3) * 1000);
    } else {
      console.log('没有更多搜索结果可采集');
      isCollecting = false;
    }
  }
}

// 监听消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('收到消息:', request);
  if (request.action === 'startCollect') {
    isCollecting = true;
    autoCollect(request.settings);
    sendResponse({ status: 'started' });
  } else if (request.action === 'stopCollect') {
    isCollecting = false;
    if (timer) {
      clearTimeout(timer);
    }
    sendResponse({ status: 'stopped' });
  }
  return true;
});

// 初始化
console.log('小红书数据采集插件已启动'); 