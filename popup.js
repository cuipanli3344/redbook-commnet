document.addEventListener('DOMContentLoaded', function() {
  // 加载保存的设置
  chrome.storage.local.get(['collectSettings'], function(result) {
    const settings = result.collectSettings || {};
    document.getElementById('collectContent').checked = settings.content !== false;
    document.getElementById('collectComments').checked = settings.comments !== false;
    document.getElementById('collectAuthor').checked = settings.author !== false;
    document.getElementById('collectImages').checked = settings.images !== false;
    document.getElementById('collectMode').value = settings.mode || 'single';
    document.getElementById('interval').value = settings.interval || 3;
  });

  // 保存设置
  function saveSettings() {
    const settings = {
      content: document.getElementById('collectContent').checked,
      comments: document.getElementById('collectComments').checked,
      author: document.getElementById('collectAuthor').checked,
      images: document.getElementById('collectImages').checked,
      mode: document.getElementById('collectMode').value,
      interval: parseInt(document.getElementById('interval').value) || 3
    };
    chrome.storage.local.set({ collectSettings: settings });
    return settings;
  }

  // 开始采集
  document.getElementById('startCollect').addEventListener('click', function() {
    const settings = saveSettings();
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url.includes('xiaohongshu.com')) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'startCollect',
          settings: settings
        }, response => {
          if (chrome.runtime.lastError) {
            document.getElementById('status').textContent = '请在小红书页面使用此插件';
          }
        });
        document.getElementById('status').textContent = '正在采集中...';
      } else {
        document.getElementById('status').textContent = '请在小红书页面使用此插件';
      }
    });
  });

  // 停止采集
  document.getElementById('stopCollect').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url.includes('xiaohongshu.com')) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'stopCollect'
        }, response => {
          if (chrome.runtime.lastError) {
            console.log('停止采集时出错:', chrome.runtime.lastError);
          }
        });
        document.getElementById('status').textContent = '已停止采集';
      }
    });
  });

  // 监听状态更新消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateStatus') {
      document.getElementById('status').textContent = message.message;
    }
  });

  // 转换数据为CSV格式
  function convertToCSV(data) {
    // CSV表头
    const headers = [
      '采集时间',
      'URL',
      '标题',
      '内容',
      '图片链接',
      '点赞数',
      '发布时间',
      '作者名称',
      '作者ID',
      '粉丝数',
      '作者简介',
      '评论数',
      '评论详情'
    ];

    // 转换数据
    const rows = data.map(item => [
      new Date(item.collectTime).toLocaleString('zh-CN'),
      item.url || '',
      item.content?.title || '',
      item.content?.content || '',
      (item.content?.images || []).join('; '),
      item.content?.likes || '',
      item.content?.timestamp || '',
      item.author?.name || '',
      item.author?.id || '',
      item.author?.followers || '',
      item.author?.description || '',
      (item.comments || []).length || '0',
      (item.comments || []).map(c => 
        `${c.user || ''}: ${c.content || ''} (${c.likes || '0'}赞, ${c.time || ''})`
      ).join('; ') || ''
    ]);

    // 添加BOM以确保Excel正确识别中文
    const BOM = '\uFEFF';
    
    // 转换为CSV字符串
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => 
          // 处理包含逗号、换行符或引号的单元格
          typeof cell === 'string' && (cell.includes(',') || cell.includes('\n') || cell.includes('"')) 
            ? `"${cell.replace(/"/g, '""')}"` 
            : cell
        ).join(',')
      )
    ].join('\n');

    return csvContent;
  }

  // 导出数据
  document.getElementById('exportData').addEventListener('click', function() {
    chrome.storage.local.get(['collectedData'], function(result) {
      const data = result.collectedData || [];
      const format = document.getElementById('exportFormat').value;
      
      if (format === 'csv' && data.length > 0) {
        try {
          // 转换为CSV格式
          const csvContent = convertToCSV(data);
          
          // 创建Blob
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
          
          // 生成文件名
          const timestamp = new Date().toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }).replace(/[/:]/g, '-');
          
          // 使用chrome.downloads API下载文件
          const url = URL.createObjectURL(blob);
          chrome.downloads.download({
            url: url,
            filename: `小红书数据_${timestamp}.csv`,
            saveAs: true
          }, () => {
            URL.revokeObjectURL(url);
          });
          
          document.getElementById('status').textContent = '导出CSV成功！';
        } catch (error) {
          console.error('导出CSV错误:', error);
          document.getElementById('status').textContent = '导出CSV失败：' + error.message;
        }
      } else if (data.length === 0) {
        document.getElementById('status').textContent = '没有可导出的数据！';
      } else {
        // JSON导出逻辑
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({
          url: url,
          filename: `小红书数据_${new Date().toLocaleString('zh-CN').replace(/[/:]/g, '-')}.json`,
          saveAs: true
        }, () => {
          URL.revokeObjectURL(url);
        });
        document.getElementById('status').textContent = '导出JSON成功！';
      }
    });
  });
}); 