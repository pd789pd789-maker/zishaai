import fetch from "node-fetch";

async function testApimart2() {
  const apiKey = "sk-WtgcIw3flJOhtjGQAUcevn1fXW97ow4UIojLjRD3IVSNIVPu";
  try {
     const res = await fetch('https://api.apimart.ai/v1/chat/completions', {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gemini-3.1-pro-preview",
          messages: [{role: "user", content: "hello"}],
          stream: false
        })
     });
     console.log("Status:", res.status);
     const text = await res.text();
     console.log("Text:", text);
  } catch (e) {
     console.error("Error:", e.message);
  }
}
testApimart2();
