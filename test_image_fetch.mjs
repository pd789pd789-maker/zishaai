import fetch from "node-fetch";

async function run() {
  try {
    const imgResp = await fetch("https://picsum.photos/id/1025/800/800");
    const arrayBuffer = await imgResp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    
    // Now request image from model
    const apiKey = "sk-ye9G96XpJ5V2g1gj5DskvyL1CT6yw4NGjis6nOFVNT2Phc5Q";
    
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            },
            { text: "draw a red circle around this image" }
          ]
        }
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
        temperature: 0.1,
        topP: 0.1
      }
    };

    const response = await fetch("https://api.vectorengine.ai/v1beta/models/gemini-3.1-flash-image-preview:generateContent", {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    console.log(response.status);
    if (!response.ok) {
        console.error(data);
    } else {
        const candidate = data.candidates?.[0];
        console.log("Success! Has image:", !!candidate?.content?.parts?.[0]?.inlineData);
    }
  } catch(e) {
      console.error(e);
  }
}
run();
