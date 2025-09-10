document.addEventListener('DOMContentLoaded', async () => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const grid = document.getElementById('gallery-grid');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');
  
  // Hamburger menu functionality
  const navMenuBtn = document.getElementById('nav-menu-btn');
  const navMenu = document.getElementById('nav-menu');
  
  if (navMenuBtn && navMenu) {
    navMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navMenuBtn.classList.toggle('active');
      navMenu.classList.toggle('show');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!navMenuBtn.contains(e.target) && !navMenu.contains(e.target)) {
        navMenuBtn.classList.remove('active');
        navMenu.classList.remove('show');
      }
    });
    
    // Close menu when clicking on a link
    navMenu.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        navMenuBtn.classList.remove('active');
        navMenu.classList.remove('show');
      }
    });
  }

  let photos = [];
  let currentFilter = 'favorites'; // Start with 'all' filter as default
  let currentRegion = null; // For Japan region filtering
  let currentPhotoIndex = 0;
  let filteredPhotos = [];
  const params = new URLSearchParams(location.search);
  const regionParam = params.get('region');

  try {
    const res = await fetch('/api/photos');
    photos = await res.json();
    render();
    // If navigated with hash, open that image
    const idFromHash = decodeURIComponent(location.hash.replace('#', ''));
    if (idFromHash) {
      const photo = photos.find(p => p.id === idFromHash);
      if (photo) openLightbox(photo.src, photo.location);
    }
  } catch (e) {
    grid.innerHTML = '<p>Unable to load photos.</p>';
    // eslint-disable-next-line no-console
    console.error(e);
  }

  function render() {
    let filtered = photos;
    
    // Apply country filter
    if (currentFilter !== 'all') {
      if (currentFilter === 'best') {
        filtered = photos.filter(p => p.tags && p.tags.includes('best'));
      } else if (currentFilter === 'favorites') {
        filtered = photos.filter(p => p.tags && p.tags.includes('favorites'));
      } else {
        filtered = photos.filter(p => p.country === currentFilter);
      }
    }
    
    // Apply region filter (for Japan regions)
    if (currentRegion) {
      filtered = filtered.filter(p => p.location && p.location.toLowerCase().includes(currentRegion.toLowerCase()));
    } else if (regionParam) {
      filtered = filtered.filter(p => p.location && p.location.toLowerCase().includes(regionParam.toLowerCase()));
    }
    
    // Shuffle the filtered photos for random order
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    
    // Store shuffled photos for lightbox navigation
    filteredPhotos = shuffled;
    
    grid.innerHTML = shuffled.map((p, index) => `
      <button class="card" data-id="${p.id}" data-src="${p.src}" data-title="${p.location}" data-index="${index}" style="text-align:left; padding:0; border:none; background:transparent; cursor:pointer; border-radius:0;">
        <img src="${p.src}" alt="${p.location}" style="border-radius:0 !important; -webkit-border-radius:0 !important; -moz-border-radius:0 !important;">
        <div class="location-overlay">${p.location}</div>
        <div class="info">
          <p class="title">${p.location}</p>
          <p class="sub">${p.country} • ${p.tags ? p.tags.join(', ') : ''}</p>
        </div>
      </button>
    `).join('');
    
    // Update image counter
    const imageCounter = document.getElementById('image-counter');
    if (imageCounter) {
      imageCounter.textContent = `${filtered.length} image${filtered.length !== 1 ? 's' : ''}`;
    }
  }

  // Handle filter clicks
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    
    // Check for region filter (Japan regions)
    const region = target.getAttribute('data-region');
    if (region) {
      currentFilter = 'Japan';
      currentRegion = region;
      updateActiveFilter();
      render();
      return;
    }
    
    // Check for country filter
    const country = target.getAttribute('data-country');
    if (country) {
      currentFilter = country;
      currentRegion = null; // Reset region when selecting country
      updateActiveFilter();
      render();
      return;
    }
    
    // Check for tag filter
    const tag = target.getAttribute('data-tag');
    if (tag) {
      currentFilter = tag;
      currentRegion = null; // Reset region when selecting tag
      updateActiveFilter();
      render();
      return;
    }
  });
  
  function updateActiveFilter() {
    // Remove active state from all filter buttons
    document.querySelectorAll('.filter-link, .dropdown-item').forEach(btn => {
      btn.removeAttribute('aria-current');
    });
    
    // Add active state to current filter button
    if (currentRegion) {
      // If a region is selected, highlight the region button
      const activeBtn = document.querySelector(`[data-region="${currentRegion}"]`);
      if (activeBtn) {
        activeBtn.setAttribute('aria-current', 'true');
      }
    } else {
      // Otherwise highlight the country/tag button
      const activeBtn = document.querySelector(`[data-country="${currentFilter}"], [data-tag="${currentFilter}"]`);
      if (activeBtn) {
        activeBtn.setAttribute('aria-current', 'true');
      }
    }
  }

  grid.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const card = target.closest('.card');
    if (!card) return;
    const src = card.getAttribute('data-src');
    const title = card.getAttribute('data-title') || '';
    const index = parseInt(card.getAttribute('data-index')) || 0;
    if (src) openLightbox(src, title, index);
  });

  function openLightbox(src, title, index) {
    currentPhotoIndex = index;
    lightboxImg.src = src;
    lightboxImg.alt = title;
    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Update lightbox metadata
    const photo = filteredPhotos[index];
    if (photo) {
      const locationEl = document.getElementById('lightbox-location');
      const detailsEl = document.getElementById('lightbox-details');
      const tagsEl = document.getElementById('lightbox-tags');
      
      if (locationEl) locationEl.textContent = `${photo.location}, ${photo.country}`;
      if (detailsEl) detailsEl.textContent = `${photo.camera} • ${photo.focal_length} • ${photo.aperture} • ${photo.shutter_speed} • ${photo.iso}`;
      if (tagsEl) tagsEl.style.display = 'none';
    }
  }
  
  function closeLightbox() {
    lightbox.style.display = 'none';
    lightboxImg.src = '';
    document.body.style.overflow = '';
    history.replaceState(null, '', location.pathname + location.search);
  }
  
  function showNextPhoto() {
    if (currentPhotoIndex < filteredPhotos.length - 1) {
      currentPhotoIndex++;
      const photo = filteredPhotos[currentPhotoIndex];
      openLightbox(photo.src, photo.location, currentPhotoIndex);
    }
  }
  
  function showPrevPhoto() {
    if (currentPhotoIndex > 0) {
      currentPhotoIndex--;
      const photo = filteredPhotos[currentPhotoIndex];
      openLightbox(photo.src, photo.location, currentPhotoIndex);
    }
  }
  
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  lightboxClose.addEventListener('click', closeLightbox);
  
  const lightboxNext = document.getElementById('lightbox-next');
  const lightboxPrev = document.getElementById('lightbox-prev');
  
  if (lightboxNext) lightboxNext.addEventListener('click', showNextPhoto);
  if (lightboxPrev) lightboxPrev.addEventListener('click', showPrevPhoto);
  
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') showNextPhoto();
    if (e.key === 'ArrowLeft') showPrevPhoto();
  });
});


