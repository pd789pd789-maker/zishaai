async function run() {
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '你好，请介绍你自己。' })
    });
    const data = await response.json();
    console.log("Local API test complete", data);
  } catch (err) {
    console.error("Local API test failed", err);
  }
}
run();
