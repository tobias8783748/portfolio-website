// Auto-hide header on scroll
(function() {
  let lastScrollTop = 0;
  let header = null;
  let ticking = false;
  
  function init() {
    header = document.querySelector('.site-header');
    
    if (!header) {
      console.log('Header not found');
      return;
    }
    
    console.log('Header auto-hide initialized');
    console.log('Document height:', document.documentElement.scrollHeight);
    console.log('Window height:', window.innerHeight);
    console.log('Can scroll?', document.documentElement.scrollHeight > window.innerHeight);
    
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
    
    // More reliable scroll detection
    const currentScroll = window.pageYOffset || window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    
    console.log('Scroll detected:', currentScroll, 'Last:', lastScrollTop);
    
    // Always show header at the very top
    if (currentScroll <= 0) {
      console.log('At top - showing header');
      showHeader();
      lastScrollTop = currentScroll;
      return;
    }
    
    // Only process if there's a meaningful scroll difference
    if (Math.abs(currentScroll - lastScrollTop) < 3) {
      return;
    }
    
    // Scrolling down - hide header after 40px
    if (currentScroll > lastScrollTop && currentScroll > 40) {
      console.log('Hiding header - scrolling down');
      hideHeader();
    } 
    // Scrolling up - show header immediately
    else if (currentScroll < lastScrollTop) {
      console.log('Showing header - scrolling up');
      showHeader();
    }
    
    lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
  }
  
  function hideHeader() {
    document.body.classList.add('header-hidden');
    header.classList.add('header-hidden');
    header.style.transform = 'translateY(-100%)';
  }
  
  function showHeader() {
    document.body.classList.remove('header-hidden');
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
