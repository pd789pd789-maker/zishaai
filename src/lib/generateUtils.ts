import { auth } from './firebase';

export function getCreditCost(resolution: string): number {
  switch (resolution) {
    case "4K": return 10;
    case "2K": return 8;
    case "1K": return 6;
    case "512": return 4;
    default: return 6;
  }
}

export async function generateImageWithPolling(body: any, signal?: AbortSignal): Promise<string> {
  const requestBody = { ...body, clientOrigin: window.location.origin };
  
  const idToken = auth.currentUser?.getIdToken() || localStorage.getItem('beta_id_token');
  if (!idToken) throw new Error("请先登录");

  const submitRes = await fetch('/api/generate-image/submit', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify(requestBody),
    signal
  });
  
  let submitData;
  const contentType = submitRes.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    submitData = await submitRes.json();
  } else {
    const textData = await submitRes.text();
    if (!submitRes.ok) throw new Error(textData || "图片提交接口异常");
  }

  if (!submitRes.ok || (submitData && submitData.error)) {
     throw new Error((submitData && submitData.error) || '图片任务提交失败');
  }
  
  const taskId = submitData.taskId;
  if (!taskId) throw new Error('任务ID未返回');
  
  const maxRetries = 90; // 90 * 4s = 360s
  let retries = 0;
  
  while (retries < maxRetries) {
      if (signal?.aborted) throw new Error('已取消');
      await new Promise(r => setTimeout(r, 4000));
      if (signal?.aborted) throw new Error('已取消');
      
      const statusRes = await fetch(`/api/generate-image/status?taskId=${taskId}`, { signal });
      const statusData = await statusRes.json();
      
      if (!statusRes.ok || statusData.error) {
         throw new Error(statusData.error || '查询任务状态失败');
      }
      
      if (statusData.status === 'completed') {
         // Optionally refresh profile here to show deducted points
         return statusData.resultUrl;
      } else if (statusData.status === 'failed') {
         throw new Error(statusData.error || '图片生成失败');
      }
      retries++;
  }
  
  throw new Error('生图超时：任务超过等待时间');
}
