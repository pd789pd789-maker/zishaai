import fetch from "node-fetch";

async function poll(taskId) {
  const apiKey = "sk-WtgcIw3flJOhtjGQAUcevn1fXW97ow4UIojLjRD3IVSNIVPu";
  const baseUrl = "https://api.apimart.ai/v1";
  for (let i = 0; i < 20; i++) {
   await new Promise(r => setTimeout(r, 4000));
   const pollRes = await fetch(`${baseUrl}/tasks/${taskId}`, { headers: { "Authorization": `Bearer ${apiKey}` } });
   const pollData = await pollRes.json();
   console.log("Poll status:", pollData?.data?.status);
   if (pollData?.data?.status === "completed" || pollData?.data?.status === "failed") {
      console.log(JSON.stringify(pollData, null, 2));
      break;
   }
  }
}
poll("task_01KRD422N44J57N43M5PZAVNKD");
