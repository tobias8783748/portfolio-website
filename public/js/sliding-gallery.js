class SlidingGallery {
  constructor() {
    this.gallery = document.getElementById('sliding-gallery');
    this.favoritePhotos = [];
    this.isAutoPlaying = true;
    this.autoPlayInterval = null;
    this.currentPosition = 0;
    this.slideSpeed = 0.2; // pixels per frame for slower continuous movement
    this.animationId = null;
    
    if (this.gallery) {
      this.init();
    }
  }

  async init() {
    console.log('SlidingGallery init started');
    console.log('Gallery element found:', !!this.gallery);
    await this.loadPhotos();
    console.log('Photos loaded, count:', this.favoritePhotos.length);
    this.render();
    this.setupEventListeners();
    this.startContinuousMovement();
  }

  async loadPhotos() {
    try {
      console.log('Fetching photos from API...');
      const response = await fetch('/api/photos');
      const photos = await response.json();
      console.log('API response:', photos.length, 'total photos');
      
      // Filter for development photos with favorites tag
      this.favoritePhotos = photos.filter(photo => 
        photo.tags && photo.tags.includes('favorites')
      );
      
      // Randomize the order of photos
      this.favoritePhotos = this.shuffleArray(this.favoritePhotos);
      
      console.log('Filtered to', this.favoritePhotos.length, 'favorite photos (randomized)');
      console.log('Favorite photos:', this.favoritePhotos.map(p => ({id: p.id, location: p.location, src: p.src})));
      
      // Test first image URL
      if (this.favoritePhotos.length > 0) {
        const testImg = new Image();
        testImg.onload = () => console.log('✅ Test image loaded:', this.favoritePhotos[0].src);
        testImg.onerror = () => console.error('❌ Test image failed:', this.favoritePhotos[0].src);
        testImg.src = this.favoritePhotos[0].src;
      }
    } catch (error) {
      console.error('Error loading photos:', error);
      this.favoritePhotos = [];
    }
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  render() {
    if (!this.gallery || this.favoritePhotos.length === 0) {
      console.log('No gallery or no favorite photos');
      console.log('Gallery element:', this.gallery);
      console.log('Favorite photos length:', this.favoritePhotos.length);
      return;
    }

    console.log('Rendering continuous sliding gallery with', this.favoritePhotos.length, 'photos');
    
    // Clear existing content
    this.gallery.innerHTML = '';

    // Create a true infinite loop by duplicating photos multiple times
    // This ensures seamless continuous scrolling
    const totalPhotos = this.favoritePhotos.length;
    const photosToCreate = totalPhotos * 3; // Triple the photos for smooth infinite loop
    
    console.log('Creating', photosToCreate, 'photo elements for infinite loop');
    
    for (let i = 0; i < photosToCreate; i++) {
      const photoIndex = i % totalPhotos;
      const photo = this.favoritePhotos[photoIndex];
      const photoElement = document.createElement('div');
      photoElement.className = 'slide-photo';
      
      // Create image element
      const img = document.createElement('img');
      img.src = photo.src;
      img.alt = photo.location;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      
      img.onload = () => {
        console.log('✅ Image loaded successfully:', photo.src);
      };
      
      img.onerror = (e) => {
        console.error('❌ Image failed to load:', photo.src, e);
      };
      
      photoElement.appendChild(img);
      
      // Add overlay
      const overlay = document.createElement('div');
      overlay.className = 'slide-overlay';
      overlay.innerHTML = `
        <h3>${photo.location}</h3>
        <p>${photo.country}</p>
      `;
      photoElement.appendChild(overlay);
      
      // Add click handler to open lightbox
      photoElement.addEventListener('click', () => {
        this.openLightbox(photo);
      });
      
      // Add hover events to pause/resume auto-play
      photoElement.addEventListener('mouseenter', () => {
        this.pauseAutoPlay();
      });
      
      photoElement.addEventListener('mouseleave', () => {
        this.resumeAutoPlay();
      });
      
      this.gallery.appendChild(photoElement);
    }

    // Set initial position to show 2 full images in middle with half images on both sides
    // This means we start at position 0.5 (halfway through the first image)
    this.currentPosition = 0.5;
    this.updatePosition();
    
    console.log('Gallery rendered with', this.gallery.children.length, 'photo elements');
  }

  updatePosition() {
    if (!this.gallery) return;
    
    // Calculate position for continuous loop
    // Each photo is 33.333vw wide, so we move by that amount
    const photoWidth = 33.333; // 33.333vw
    const translateX = -(this.currentPosition * photoWidth);
    
    this.gallery.style.transform = `translateX(${translateX}vw)`;
  }

  startContinuousMovement() {
    if (!this.gallery || this.favoritePhotos.length === 0) return;
    
    const animate = () => {
      if (this.isAutoPlaying) {
        this.currentPosition += this.slideSpeed / 60; // 60fps
        
        // Reset position when we've gone through all photos once
        if (this.currentPosition >= this.favoritePhotos.length) {
          this.currentPosition = 0;
        }
        
        this.updatePosition();
      }
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }

  stopContinuousMovement() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }


  setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Pause on gallery hover
    if (this.gallery) {
      this.gallery.addEventListener('mouseenter', () => {
        this.pauseAutoPlay();
      });
      
      this.gallery.addEventListener('mouseleave', () => {
        this.resumeAutoPlay();
      });
    }
  }

  pauseAutoPlay() {
    this.isAutoPlaying = false;
    console.log('Continuous movement paused on hover');
  }

  resumeAutoPlay() {
    this.isAutoPlaying = true;
    console.log('Continuous movement resumed');
  }

  openLightbox(photo) {
    // Open lightbox with the photo
    if (window.openLightbox) {
      window.openLightbox(photo);
    } else {
      console.log('Lightbox not available');
    }
  }

}

// Initialize the sliding gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing sliding gallery...');
  console.log('Gallery element exists:', !!document.getElementById('sliding-gallery'));
  
  
  new SlidingGallery();
});