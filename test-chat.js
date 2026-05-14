import fetch from "node-fetch";

async function testVectorengine() {
  const apiKey = "sk-WtgcIw3flJOhtjGQAUcevn1fXW97ow4UIojLjRD3IVSNIVPu";
  console.log("Testing vectorengine...");
  try {
     const res = await fetch('https://api.vectorengine.ai/v1/chat/completions', {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gemini-3.1-pro-preview",
          messages: [{role: "user", content: "hello"}]
        })
     });
     console.log("Status:", res.status);
     const text = await res.text();
     console.log("Text:", text);
  } catch (e) {
     console.error("Error:", e.message);
  }
}

testVectorengine();

async function testApimart() {
  const apiKey = "sk-WtgcIw3flJOhtjGQAUcevn1fXW97ow4UIojLjRD3IVSNIVPu";
  console.log("Testing apimart...");
  try {
     const res = await fetch('https://api.apimart.ai/v1/chat/completions', {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gemini-3.1-pro-preview",
          messages: [{role: "user", content: "hello"}]
        })
     });
     console.log("Status:", res.status);
     const text = await res.text();
     console.log("Text:", text);
  } catch (e) {
     console.error("Error:", e.message);
  }
}
testApimart();
