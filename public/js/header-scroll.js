// Auto-hide header on scroll
(function() {
  let lastScrollTop = 0;
  let header = null;
  let ticking = false;
  
  function init() {
    header = document.querySelector('.site-header');
    
    if (!header) {
      return;
    }
    
    // Add scroll listener
    window.addEventListener('scroll', requestTick, { passive: true });
  }
  
  function requestTick() {
    if (!ticking) {
      requestAnimationFrame(handleScroll);
      ticking = true;
    }
  }
  
  function handleScroll() {
    ticking = false;
    
    if (!header) return;
    
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    
    // Always show header at the very top
    if (currentScroll <= 0) {
      showHeader();
      lastScrollTop = currentScroll;
      return;
    }
    
    // Only process if there's a meaningful scroll difference
    if (Math.abs(currentScroll - lastScrollTop) < 5) {
      return;
    }
    
    // Scrolling down - hide header after 100px
    if (currentScroll > lastScrollTop && currentScroll > 100) {
      hideHeader();
    } 
    // Scrolling up - show header immediately
    else if (currentScroll < lastScrollTop) {
      showHeader();
    }
    
    lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
  }
  
  function hideHeader() {
    header.classList.add('header-hidden');
    header.style.transform = 'translateY(-100%)';
  }
  
  function showHeader() {
    header.classList.remove('header-hidden');
    header.style.transform = 'translateY(0px)';
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
