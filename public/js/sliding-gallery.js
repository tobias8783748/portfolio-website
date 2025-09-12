// Sliding Gallery JavaScript
class SlidingGallery {
  constructor() {
    this.gallery = document.getElementById('sliding-gallery');
    this.slider = document.getElementById('sliding-gallery-slider');
    this.photos = [];
    this.favoritePhotos = [];
    this.currentIndex = 0;
    this.isAutoPlaying = true;
    this.autoPlayInterval = null;
    this.autoPlayDelay = 4000; // 4 seconds between slides
    
    this.init();
  }

  async init() {
    console.log('SlidingGallery init started');
    console.log('Gallery element:', this.gallery);
    console.log('Slider element:', this.slider);
    
    await this.loadPhotos();
    this.setupEventListeners();
    this.render();
    
    // Debug gallery dimensions
    console.log('Gallery dimensions after render:', {
      offsetWidth: this.gallery.offsetWidth,
      offsetHeight: this.gallery.offsetHeight,
      clientWidth: this.gallery.clientWidth,
      clientHeight: this.gallery.clientHeight,
      scrollWidth: this.gallery.scrollWidth,
      scrollHeight: this.gallery.scrollHeight
    });
    
    // Start auto-play after a longer delay to ensure everything is stable
    setTimeout(() => {
      this.startAutoPlay();
    }, 3000);
  }

  async loadPhotos() {
    try {
      const response = await fetch('/api/photos');
      this.photos = await response.json();
      
      // Filter for favorite photos only
      this.favoritePhotos = this.photos.filter(photo => 
        photo.tags && photo.tags.includes('favorites')
      );
      
      // If we have less than 3 favorites, add some regular photos to fill
      if (this.favoritePhotos.length < 3) {
        const additionalPhotos = this.photos
          .filter(photo => !photo.tags || !photo.tags.includes('favorites'))
          .slice(0, 3 - this.favoritePhotos.length);
        this.favoritePhotos = [...this.favoritePhotos, ...additionalPhotos];
      }
      
      // Shuffle the photos for variety
      this.favoritePhotos = this.favoritePhotos.sort(() => Math.random() - 0.5);
      
    } catch (error) {
      console.error('Error loading photos:', error);
      this.favoritePhotos = [];
    }
  }

  setupEventListeners() {
    if (this.slider) {
      this.slider.addEventListener('input', (e) => {
        this.currentIndex = parseInt(e.target.value);
        this.updateSlidePosition();
        this.stopAutoPlay();
      });
      
      this.slider.addEventListener('change', () => {
        this.startAutoPlay();
      });
    }

    // Pause auto-play on hover
    if (this.gallery) {
      this.gallery.addEventListener('mouseenter', () => this.stopAutoPlay());
      this.gallery.addEventListener('mouseleave', () => this.startAutoPlay());
    }

    // Touch/swipe support
    let startX = 0;
    let startY = 0;
    let isDragging = false;

    if (this.gallery) {
      this.gallery.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = true;
        this.stopAutoPlay();
      });

      this.gallery.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
      });

      this.gallery.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const diffX = startX - endX;
        const diffY = startY - endY;
        
        // Only trigger if horizontal swipe is more significant than vertical
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
          if (diffX > 0) {
            this.nextSlide();
          } else {
            this.previousSlide();
          }
        }
        
        isDragging = false;
        this.startAutoPlay();
      });
    }
  }

  render() {
    if (!this.gallery || this.favoritePhotos.length === 0) {
      console.log('No gallery or no favorite photos');
      console.log('Gallery element:', this.gallery);
      console.log('Favorite photos length:', this.favoritePhotos.length);
      return;
    }

    console.log('Rendering sliding gallery with', this.favoritePhotos.length, 'photos');
    console.log('Gallery element before render:', this.gallery);
    console.log('Gallery parent element:', this.gallery.parentElement);

    // Clear existing content
    this.gallery.innerHTML = '';

    // Create slides - 3 images per slide
    const totalSlides = Math.ceil(this.favoritePhotos.length / 3);
    
    for (let i = 0; i < totalSlides; i++) {
      const slide = document.createElement('div');
      slide.className = 'sliding-gallery-slide';
      
      const startIndex = i * 3;
      const endIndex = Math.min(startIndex + 3, this.favoritePhotos.length);
      
      for (let j = startIndex; j < endIndex; j++) {
        const photo = this.favoritePhotos[j];
        const photoElement = document.createElement('div');
        photoElement.className = 'slide-photo';
        
        photoElement.innerHTML = `
          <img src="${photo.src}" alt="${photo.location}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;">
          <div class="slide-overlay">
            <h3>${photo.location}</h3>
            <p>${photo.country}</p>
          </div>
        `;
        
        console.log('Created photo element for:', photo.location, 'src:', photo.src);
        
        // Add click handler to open lightbox
        photoElement.addEventListener('click', () => {
          this.openLightbox(photo);
        });
        
        slide.appendChild(photoElement);
      }
      
      this.gallery.appendChild(slide);
    }

    // Setup slider
    if (this.slider) {
      this.slider.max = totalSlides - 1;
      this.slider.value = 0;
    }

    this.currentIndex = 0;
    this.updateSlidePosition();
    
    // Debug: Check if content was added
    console.log('Gallery after render:', this.gallery);
    console.log('Gallery children count:', this.gallery.children.length);
    console.log('Gallery innerHTML length:', this.gallery.innerHTML.length);
    
    // Check if images are visible
    const images = this.gallery.querySelectorAll('img');
    console.log('Images found:', images.length);
    images.forEach((img, index) => {
      console.log(`Image ${index}:`, {
        src: img.src,
        alt: img.alt,
        width: img.offsetWidth,
        height: img.offsetHeight,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      });
    });
  }

  updateSlidePosition() {
    if (!this.gallery) return;
    
    const slideWidth = 100;
    const translateX = -this.currentIndex * slideWidth;
    console.log('Updating slide position:', {
      currentIndex: this.currentIndex,
      translateX: translateX
    });
    
    this.gallery.style.transform = `translateX(${translateX}%)`;
    
    // Update slider
    if (this.slider) {
      this.slider.value = this.currentIndex;
    }
  }

  nextSlide() {
    const totalSlides = Math.ceil(this.favoritePhotos.length / 3);
    this.currentIndex = (this.currentIndex + 1) % totalSlides;
    this.updateSlidePosition();
  }

  previousSlide() {
    const totalSlides = Math.ceil(this.favoritePhotos.length / 3);
    this.currentIndex = this.currentIndex === 0 ? totalSlides - 1 : this.currentIndex - 1;
    this.updateSlidePosition();
  }

  goToSlide(index) {
    const totalSlides = Math.ceil(this.favoritePhotos.length / 3);
    if (index >= 0 && index < totalSlides) {
      this.currentIndex = index;
      this.updateSlidePosition();
    }
  }

  startAutoPlay() {
    this.stopAutoPlay();
    const totalSlides = Math.ceil(this.favoritePhotos.length / 3);
    console.log('Starting auto-play:', {
      isAutoPlaying: this.isAutoPlaying,
      favoritePhotosLength: this.favoritePhotos.length,
      totalSlides: totalSlides,
      currentIndex: this.currentIndex
    });
    
    if (this.isAutoPlaying && totalSlides > 1) {
      this.autoPlayInterval = setInterval(() => {
        console.log('Auto-sliding to next slide, current:', this.currentIndex);
        this.nextSlide();
      }, this.autoPlayDelay);
    } else {
      console.log('Auto-play not started - not enough slides or disabled');
    }
  }

  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }

  openLightbox(photo) {
    // Use the existing lightbox functionality from gallery.js
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxLocation = document.getElementById('lightbox-location');
    const lightboxDescription = document.getElementById('lightbox-description');
    const lightboxDetails = document.getElementById('lightbox-details');
    const lightboxTags = document.getElementById('lightbox-tags');
    
    if (lightbox && lightboxImg) {
      lightboxImg.src = photo.src;
      lightboxImg.alt = photo.location;
      
      if (lightboxLocation) lightboxLocation.textContent = photo.location;
      if (lightboxDescription) lightboxDescription.textContent = photo.description || '';
      if (lightboxDetails) lightboxDetails.textContent = `${photo.country} • ${photo.camera || ''} • ${photo.lens || ''}`;
      if (lightboxTags) lightboxTags.textContent = photo.tags ? photo.tags.join(', ') : '';
      
      lightbox.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }
}

// Initialize sliding gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SlidingGallery();
});
