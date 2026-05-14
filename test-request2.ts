import fs from 'fs';

async function test() {
  const req = {
    images: ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="]
  };
  try {
    const res = await fetch("http://localhost:3000/api/layout-generate-prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req)
    });
    const data = await res.json();
    console.log("PROMPTS:", JSON.stringify(data, null, 2));

    if (data.prompts && data.prompts.length > 0) {
      console.log("SENDING IMAGE GEN REQUEST");
      const imgRes = await fetch("http://localhost:3000/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: req.images,
          style: data.prompts[0],
          ratio: "2:3",
          resolution: "2K"
        })
      });
      const imgData = await imgRes.json();
      console.log("IMG ERROR:", imgData.error);
      console.log("IMG SUCCESS:", !!imgData.result);
    }
  } catch(e) {
    console.error(e);
  }
}
test();
