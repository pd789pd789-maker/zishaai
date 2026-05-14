import fetch from "node-fetch";

async function run() {
  try {
    const imgResp = await fetch("https://picsum.photos/id/1025/800/800");
    const arrayBuffer = await imgResp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = "data:image/jpeg;base64," + buffer.toString('base64');
    
    console.log("Sending request to local api...");
    const response = await fetch("http://localhost:3000/api/generate-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageBase64: base64Image })
    });

    const data = await response.json();
    console.log(response.status);
    if (!response.ok) {
        console.error(data);
    } else {
        console.log("Success! Has image:", !!data.result);
        console.log(data.result.substring(0, 50) + "...");
    }
  } catch(e) {
      console.error(e);
  }
}
run();
