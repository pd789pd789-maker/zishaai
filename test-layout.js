import fetch from "node-fetch";

async function test() {
  const req = {
    images: [
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
    ]
  };
  const res = await fetch("http://127.0.0.1:3000/api/layout-generate-prompts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req)
  });
  
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
}

test();
