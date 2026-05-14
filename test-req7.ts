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

  } catch(e) {
    console.error(e);
  }
}
test();
