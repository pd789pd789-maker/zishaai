import fetch from "node-fetch";

async function testResolution(ratio, size) {
    const imgResp = await fetch("https://picsum.photos/id/1025/800/800");
    const arrayBuffer = await imgResp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    
    const apiKey = "sk-ye9G96XpJ5V2g1gj5DskvyL1CT6yw4NGjis6nOFVNT2Phc5Q";
    
    // As in Python SDK for user, the parameters were:
    // image_size="2K"
    // So let's send outputOptions
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
        // Wait, Python API translates to outputOptions? Or just imageSize?
      }
    };
    
    // We will test 3 variations:
    requestBody.generationConfig.aspectRatio = ratio;
    requestBody.generationConfig.imageSize = size; // Try camelCase
    requestBody.generationConfig.aspect_ratio = ratio; // Try snake_case
    requestBody.generationConfig.image_size = size;

    console.log(`Testing ${ratio} - ${size}`);
    const response = await fetch("https://api.vectorengine.ai/v1beta/models/gemini-3.1-flash-image-preview:generateContent", {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    if (!response.ok) {
        console.log(data);
    } else {
        const base64Data = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Data) {
            console.log(`Success! Base64 Length: ${base64Data.length}`);
        } else {
            console.log("Success but no image returned");
        }
    }
}

async function run() {
  await testResolution("16:9", "1K");
  await testResolution("9:16", "2K");
  await testResolution("1:1", "4K");
}
run();
