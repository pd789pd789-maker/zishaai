async function check() {
  const res = await fetch('https://images.unsplash.com/photo-1588147440316-98dc46274431?q=80');
  console.log(res.status);
}
check();
