const https = require('https');

https.get('https://en.wikipedia.org/w/api.php?action=query&prop=pageimages|images&titles=Teapot&pithumbsize=1000&format=json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(data);
  });
});
