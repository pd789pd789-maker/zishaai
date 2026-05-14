import fs from 'fs';

async function test() {
  const req = {
    images: Array(9).fill("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=")
  };
  try {
    const res = await fetch("https://api.vectorengine.ai/v1beta/models/gemini-3.1-flash-image-preview:generateContent", {
      method: "POST",
      headers: { 
          "x-goog-api-key": process.env.VECTORENGINE_API_KEY || "sk-ye9G96XpJ5V2g1gj5DskvyL1CT6yw4NGjis6nOFVNT2Phc5Q",
          "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [...req.images.map(img => ({inlineData: {mimeType: "image/png", data: img.split(",")[1]}})), { text: "apple" }] }],
        generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: { imageSize: "4K" }
        }
      })
    });
    const imgData = await res.json();
    fs.writeFileSync("out2.json", JSON.stringify({
       error: imgData.error,
       hasImage: !!imgData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
    }));
  } catch(e) {
    fs.writeFileSync("out2.json", JSON.stringify({ error: String(e) }));
  }
}
test();
