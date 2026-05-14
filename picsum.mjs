async function run() {
  const res = await fetch('https://picsum.photos/v2/list?page=3&limit=50');
  const items = await res.json();
  const urls = items.map(i => i.url);
  console.log(urls.filter(u => u.includes('unsplash')));
}
run();
