import fetch from "node-fetch";
import fs from "fs";

async function test() {
  try {
     const imageRes = await fetch("https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/132_Kite_1_2.jpg/800px-132_Kite_1_2.jpg");
     const buffer = await imageRes.buffer();
     const base64Str = "data:image/jpeg;base64," + buffer.toString("base64");
     
     console.log("Base64 len:", base64Str.length);
     
     const res = await fetch("http://127.0.0.1:3000/api/generate-image/submit", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            ratio: "1:1",
            style: "A dog",
            image: base64Str
         })
     });
     console.log(res.status);
     const data = await res.json();
     console.log(data);
  } catch(e) { console.error(e) }
}
test();
