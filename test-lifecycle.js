import fetch from "node-fetch";

async function test() {
  const buf = Buffer.alloc(10 * 1024, 'a');
  const base64Str = 'data:image/jpeg;base64,' + buf.toString('base64');

  const submitRes = await fetch("http://127.0.0.1:3000/api/generate-image/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ratio: "2:3", style: "a cat", image: base64Str })
  });

  const submitData = await submitRes.json();
  console.log("Submit:", submitData);

  const taskId = submitData.taskId;

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 4000));
    const statusRes = await fetch(`http://127.0.0.1:3000/api/generate-image/status?taskId=${taskId}`);
    const statusData = await statusRes.json();
    console.log("Status:", statusData);
    if (statusData.status === 'completed' || statusData.status === 'failed') break;
  }
}
test();
