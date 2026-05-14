import fetch from "node-fetch";

const apiKey = "sk-WtgcIw3flJOhtjGQAUcevn1fXW97ow4UIojLjRD3IVSNIVPu";
const baseUrl = "https://api.apimart.ai/v1";

async function test() {
  console.log("Submitting...");
  const res = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-image-2",
      prompt: "一只小黄狗",
      n: 1,
      size: "1:1",
      resolution: "1k"
    })
  });
  
  const text = await res.text();
  console.log("Submit Response:", res.status, text);
  
  let data;
  try {
     data = JSON.parse(text);
  } catch (e) {
     return;
  }
  
  if (data.data && data.data[0] && data.data[0].task_id) {
    const taskId = data.data[0].task_id;
    console.log("Got task id:", taskId);
    
    for (let i = 0; i < 10; i++) {
       await new Promise(r => setTimeout(r, 5000));
       const pollRes = await fetch(`${baseUrl}/tasks/${taskId}`, {
          headers: { "Authorization": `Bearer ${apiKey}` }
       });
       const pollData = await pollRes.json();
       console.log("Poll status:", pollData?.data?.status);
       if (pollData?.data?.status === "completed") {
         console.log("Result:", JSON.stringify(pollData.data.result));
         break;
       } else if (pollData?.data?.status === "failed") {
         console.log("Failed:", pollData);
         break;
       }
    }
  }
}

test();
