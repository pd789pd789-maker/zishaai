import fetch from "node-fetch";

async function test() {
  try {
     const res = await fetch("http://127.0.0.1:3000/api/generate-image/submit", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            ratio: "1:1",
            style: "A dog",
            image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
         })
     });
     console.log(res.status);
     const data = await res.json();
     console.log(data);
  } catch(e) { console.error(e) }
}
test();
