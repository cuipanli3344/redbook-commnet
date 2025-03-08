function convertToExcelData(data) {
  // 准备Excel数据
  const excelData = data.map(item => ({
    '采集时间': item.collectTime,
    'URL': item.url,
    '标题': item.content?.title || '',
    '内容': item.content?.content || '',
    '图片链接': (item.content?.images || []).join('; '),
    '点赞数': item.content?.likes || '',
    '发布时间': item.content?.timestamp || '',
    '作者名称': item.author?.name || '',
    '作者ID': item.author?.id || '',
    '粉丝数': item.author?.followers || '',
    '作者简介': item.author?.description || '',
    '评论数': (item.comments || []).length,
    '评论详情': (item.comments || []).map(c => 
      `${c.user}: ${c.content} (${c.likes}赞, ${c.time})`
    ).join('\n')
  }));
  
  return excelData;
} 