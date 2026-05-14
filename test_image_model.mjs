import fs from "fs";

async function run() {
  try {
    const apiKey = "sk-ye9G96XpJ5V2g1gj5DskvyL1CT6yw4NGjis6nOFVNT2Phc5Q";
    
    // Create a 1x1 black jpeg in base64
    const base64Image = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

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
            { text: "draw a red circle" }
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
        console.log(Object.keys(data));
        const candidate = data.candidates?.[0];
        console.log(candidate?.content?.parts?.[0]);
    }
  } catch (err) {
    console.error("Test failed", err);
  }
}
run();
