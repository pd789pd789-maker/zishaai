import fs from 'fs';
import fetch from 'node-fetch';

async function testGen(targetConfig, filename) {
    const apiKey = "sk-ye9G96XpJ5V2g1gj5DskvyL1CT6yw4NGjis6nOFVNT2Phc5Q";
    const base64Image = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Image } },
            { text: "draw a red circle around this image" }
          ]
        }
      ],
      ...targetConfig
    };

    console.log(`Testing...`, JSON.stringify(targetConfig));
    const response = await fetch("https://api.vectorengine.ai/v1beta/models/gemini-3.1-flash-image-preview:generateContent", {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
        const base64Data = data.candidates[0].content.parts[0].inlineData.data;
        console.log(`Success length: ${base64Data.length}`);
    } else {
        console.log("Failed:", data);
    }
}

async function run() {
    await testGen({
      generationConfig: {
        responseModalities: ["IMAGE"],
        temperature: 0.1,
        // using google genai standard:
      },
      imageGenerationConfig: {
        aspectRatio: "16:9",
        imageResolution: "1K" // Or imageSize? we will see if we get a size difference
      }
    }, 'test1.jpeg');
    
    await testGen({
      generationConfig: {
        responseModalities: ["IMAGE"],
        aspectRatio: "16:9", 
        imageSize: "1K", // Or maybe inside generationConfig?
      }
    }, 'test2.jpeg');
    
}
run();
