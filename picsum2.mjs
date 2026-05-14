async function run() {
  const res = await fetch('https://picsum.photos/v2/list?page=1&limit=20');
  const items = await res.json();
  const urls = items.map(i => i.download_url);
  console.log(urls);
}
run();
