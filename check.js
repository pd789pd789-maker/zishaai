async function check() {
  const res = await fetch('https://images.unsplash.com/photo-1594535311953-adcb630db004');
  console.log(res.status);
}
check();
