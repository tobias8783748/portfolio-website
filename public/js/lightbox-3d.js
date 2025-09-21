// Simple 3D Hover Effect for Lightbox Images
(function() {
  let lightboxImage = null;

  function updateImageRotation(e) {
    if (!lightboxImage) return;

    const rect = lightboxImage.getBoundingClientRect();
    const imageWidth = rect.width;
    const imageHeight = rect.height;

    // Get mouse position relative to image center
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const centerX = imageWidth / 2;
    const centerY = imageHeight / 2;

    // Calculate rotation (-1 to 1 range)
    const rotationFactorX = (mouseY - centerY) / (imageHeight / 2);
    const rotationFactorY = (mouseX - centerX) / (imageWidth / 2);

    // Simple rotation values
    const rotationX = -rotationFactorX * 10; // Max 10 degrees
    const rotationY = rotationFactorY * 15;  // Max 15 degrees

    // Simple translation
    const translateX = rotationFactorY * 5;
    const translateY = -rotationFactorX * 3;
    const translateZ = 15;

    // Apply transform
    const transform = `translate3d(${translateX}px, ${translateY}px, ${translateZ}px) rotateX(${rotationX}deg) rotateY(${rotationY}deg)`;
    lightboxImage.style.transform = transform;

    // Simple shadow
    const shadowX = rotationFactorY * 15;
    const shadowY = 10 + Math.abs(rotationFactorX) * 5;
    lightboxImage.style.boxShadow = `${shadowX}px ${shadowY}px 30px rgba(0, 0, 0, 0.2)`;
  }

  function initLightbox3D() {
    lightboxImage = document.getElementById('lightbox-img');
    
    if (!lightboxImage) return;

    lightboxImage.addEventListener('mouseenter', function(e) {
      // Expand to full height on hover
      lightboxImage.style.maxHeight = 'calc(100vh - 40px)';
      lightboxImage.style.height = 'calc(100vh - 40px)';
      lightboxImage.style.width = 'auto';
      lightboxImage.style.objectFit = 'contain';
      
      updateImageRotation(e);
    });

    lightboxImage.addEventListener('mousemove', function(e) {
      updateImageRotation(e);
    });

    lightboxImage.addEventListener('mouseleave', function() {
      // Reset to normal size and position
      lightboxImage.style.transform = 'translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg)';
      lightboxImage.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
      lightboxImage.style.maxHeight = '80vh';
      lightboxImage.style.height = 'auto';
      lightboxImage.style.width = 'auto';
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLightbox3D);
  } else {
    initLightbox3D();
  }

  // Re-initialize when lightbox opens (in case image is dynamically loaded)
  document.addEventListener('click', function(e) {
    if (e.target.closest('.card') || e.target.closest('.slide-photo')) {
      // Small delay to ensure lightbox is fully rendered
      setTimeout(initLightbox3D, 100);
    }
  });
})();
