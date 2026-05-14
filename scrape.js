// get some good images using fetch
async function run() {
  const res = await fetch('https://en.wikipedia.org/w/api.php?action=query&generator=images&titles=Teapot&prop=imageinfo&iiprop=url&format=json');
  const data = await res.json();
  const pages = data.query.pages;
  for (const [, page] of Object.entries(pages)) {
    if (page.imageinfo && page.imageinfo[0].url.endsWith('.jpg')) {
      console.log(page.imageinfo[0].url);
    }
  }
}
run();
