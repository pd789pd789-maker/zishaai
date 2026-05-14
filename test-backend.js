import fetch from "node-fetch";

async function testBackend() {
  console.log("Testing backend...");
  try {
     const res = await fetch('http://localhost:3000/api/generate-image', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style: "一只小黄狗",
          ratio: "1:1",
          resolution: "1k"
        })
     });
     console.log("Status:", res.status);
     const text = await res.text();
     console.log("Text:", text);
  } catch (e) {
     console.error("Error:", e.message);
  }
}

testBackend();
