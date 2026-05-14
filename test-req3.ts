import fs from 'fs';

async function test() {
  const req = {
    images: ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="]
  };
  try {
    const imgRes = await fetch("http://localhost:3000/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        images: req.images,
        style: "Just draw an apple.",
        ratio: "1:1",
        resolution: "1K"
      })
    });
    const imgData = await imgRes.json();
    console.log("IMG ERROR:", imgData.error);
    console.log("IMG SUCCESS:", !!imgData.result);
  } catch(e) {
    console.error(e);
  }
}
test();
