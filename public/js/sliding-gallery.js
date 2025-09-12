// Sliding Gallery JavaScript
class SlidingGallery {
  constructor() {
    this.gallery = document.getElementById('sliding-gallery');
    this.slider = document.getElementById('sliding-gallery-slider');
    this.photos = [];
    this.favoritePhotos = [];
    this.currentIndex = 0;
    this.slidesPerView = 3;
    this.isAutoPlaying = true;
    this.autoPlayInterval = null;
    this.autoPlayDelay = 5000; // 5 seconds
    
    this.init();
  }

  async init() {
    await this.loadPhotos();
    this.setupEventListeners();
    this.render();
    
    // Start auto-play after a short delay to ensure everything is rendered
    setTimeout(() => {
      this.startAutoPlay();
    }, 1000);
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
        const totalSlides = Math.ceil(this.favoritePhotos.length / this.slidesPerView);
        const sliderValue = parseInt(e.target.value);
        // Map slider value to middle set
        this.currentIndex = totalSlides + sliderValue;
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
    if (!this.gallery || this.favoritePhotos.length === 0) return;

    // Clear existing content
    this.gallery.innerHTML = '';

    // Create a continuous loop by duplicating images
    const totalImages = this.favoritePhotos.length;
    const totalSlides = Math.ceil(totalImages / this.slidesPerView);
    
    // Create enough slides for smooth looping (3 sets of images)
    for (let set = 0; set < 3; set++) {
      for (let i = 0; i < totalSlides; i++) {
        const slide = document.createElement('div');
        slide.className = 'sliding-gallery-slide';
        
        const startIndex = i * this.slidesPerView;
        const endIndex = Math.min(startIndex + this.slidesPerView, totalImages);
        
        for (let j = startIndex; j < endIndex; j++) {
          const photo = this.favoritePhotos[j];
          const photoElement = document.createElement('div');
          photoElement.className = 'slide-photo';
          photoElement.style.flex = `0 0 ${100 / this.slidesPerView}%`;
          
          photoElement.innerHTML = `
            <img src="${photo.src}" alt="${photo.location}" loading="lazy">
            <div class="slide-overlay">
              <h3>${photo.location}</h3>
              <p>${photo.country}</p>
            </div>
          `;
          
          // Add click handler to open lightbox
          photoElement.addEventListener('click', () => {
            this.openLightbox(photo);
          });
          
          slide.appendChild(photoElement);
        }
        
        this.gallery.appendChild(slide);
      }
    }

    // Setup slider for the original set of slides
    if (this.slider) {
      this.slider.max = totalSlides - 1;
      this.slider.value = 0;
    }

    // Start from the middle set (second set) for seamless looping
    this.currentIndex = totalSlides;
    this.updateSlidePosition();
  }

  updateSlidePosition() {
    if (!this.gallery) return;
    
    const slideWidth = 100 / this.slidesPerView;
    const translateX = -this.currentIndex * slideWidth;
    this.gallery.style.transform = `translateX(${translateX}%)`;
    
    // Update slider to show position within the original set
    if (this.slider) {
      const totalSlides = Math.ceil(this.favoritePhotos.length / this.slidesPerView);
      const sliderValue = this.currentIndex - totalSlides;
      this.slider.value = Math.max(0, Math.min(totalSlides - 1, sliderValue));
    }
  }

  nextSlide() {
    const totalSlides = Math.ceil(this.favoritePhotos.length / this.slidesPerView);
    this.currentIndex++;
    
    // Reset to beginning of middle set when reaching end of third set
    if (this.currentIndex >= totalSlides * 2) {
      this.currentIndex = totalSlides;
      // Smoothly transition without animation
      this.gallery.style.transition = 'none';
      this.updateSlidePosition();
      // Re-enable transition after a brief delay
      setTimeout(() => {
        this.gallery.style.transition = 'transform 0.5s ease-in-out';
      }, 50);
    } else {
      this.updateSlidePosition();
    }
  }

  previousSlide() {
    const totalSlides = Math.ceil(this.favoritePhotos.length / this.slidesPerView);
    this.currentIndex--;
    
    // Jump to end of middle set when reaching beginning of first set
    if (this.currentIndex < totalSlides) {
      this.currentIndex = totalSlides * 2 - 1;
      // Smoothly transition without animation
      this.gallery.style.transition = 'none';
      this.updateSlidePosition();
      // Re-enable transition after a brief delay
      setTimeout(() => {
        this.gallery.style.transition = 'transform 0.5s ease-in-out';
      }, 50);
    } else {
      this.updateSlidePosition();
    }
  }

  goToSlide(index) {
    const totalSlides = Math.ceil(this.favoritePhotos.length / this.slidesPerView);
    if (index >= 0 && index < totalSlides) {
      // Map slider index to middle set
      this.currentIndex = totalSlides + index;
      this.updateSlidePosition();
    }
  }

  startAutoPlay() {
    this.stopAutoPlay();
    const totalSlides = Math.ceil(this.favoritePhotos.length / this.slidesPerView);
    console.log('Starting auto-play:', {
      isAutoPlaying: this.isAutoPlaying,
      favoritePhotosLength: this.favoritePhotos.length,
      slidesPerView: this.slidesPerView,
      totalSlides: totalSlides
    });
    
    if (this.isAutoPlaying && totalSlides > 1) {
      this.autoPlayInterval = setInterval(() => {
        console.log('Auto-sliding to next slide');
        this.nextSlide();
      }, this.autoPlayDelay);
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
