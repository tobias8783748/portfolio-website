document.addEventListener('DOMContentLoaded', async () => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Populate featured grid with first 6 photos
  const featuredGrid = document.getElementById('featured-grid');
  if (featuredGrid) {
    try {
      let photos = [];
      try {
        const apiRes = await fetch('/api/photos');
        if (apiRes.ok) photos = await apiRes.json();
      } catch (_) { /* ignore */ }
      if (photos.length === 0) {
        const res = await fetch('/data/photos.json');
        photos = await res.json();
      }
      const featured = photos.slice(0, 6);
      featuredGrid.innerHTML = featured.map(p => `
        <a class="card" href="/gallery.html#${encodeURIComponent(p.id)}" aria-label="Open image">
          <img src="${p.src}" alt="">
        </a>
      `).join('');
    } catch (e) {
      featuredGrid.innerHTML = '<p>Unable to load photos right now.</p>';
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }
});


