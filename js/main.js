document.addEventListener('DOMContentLoaded', function() {
  // Mobile menu functionality
  initMobileMenu();

  // Carousel functionality
  initCarousel();

  // Form handling
  initFormHandling();
});

// Mobile menu initialization
function initMobileMenu() {
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');

  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }
}

// Carousel initialization and functionality
function initCarousel() {
  // Carousel elements
  const carouselSlides = document.querySelector('.carousel-slides');
  const prevButton = document.querySelector('.carousel-prev');
  const nextButton = document.querySelector('.carousel-next');
  const indicators = document.querySelectorAll('.carousel-indicator');

  // Guard: Check if carousel elements exist on this page
  if (!carouselSlides || !prevButton || !nextButton) return;

  let currentSlide = 0;
  const slideCount = document.querySelectorAll('.carousel-slide').length;

  // Update carousel position
  function updateCarousel() {
    // Update slide position
    carouselSlides.style.transform = `translateX(-${currentSlide * 100}%)`;

    // Update indicators
    indicators.forEach((indicator, index) => {
      indicator.style.opacity = index === currentSlide ? '1' : '0.3';
    });
  }

  // Previous slide
  prevButton.addEventListener('click', () => {
    currentSlide = (currentSlide - 1 + slideCount) % slideCount;
    updateCarousel();
  });

  // Next slide
  nextButton.addEventListener('click', () => {
    currentSlide = (currentSlide + 1) % slideCount;
    updateCarousel();
  });

  // Indicator buttons
  indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => {
      currentSlide = index;
      updateCarousel();
    });
  });

  // Auto-advance carousel every 5 seconds
  const autoAdvance = setInterval(() => {
    currentSlide = (currentSlide + 1) % slideCount;
    updateCarousel();
  }, 5000);

  // Stop auto-advance on user interaction
  const carouselContainer = document.querySelector('.carousel-container');
  carouselContainer.addEventListener('mouseenter', () => {
    clearInterval(autoAdvance);
  });
}

// Form handling initialization
function initFormHandling() {
  const emailForm = document.querySelector('form');

  if (emailForm) {
    emailForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const email = this.querySelector('input[type="email"]').value;
      const button = this.querySelector('button[type="submit"]');
      const originalButtonText = button.textContent;

      // Show loading state
      button.disabled = true;
      button.textContent = 'Sending...';

      fetch('https://formspree.io/f/xeoqvypl', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email })
      })
      .then(response => {
        if (response.ok) {
          // Create success message element
          const successMessage = document.createElement('div');
          successMessage.className = 'mt-4 p-3 bg-venomous/30 text-primary rounded-md';
          successMessage.textContent = 'Thanks for your interest! We\'ll keep you updated.';

          // Insert after form
          emailForm.parentNode.insertBefore(successMessage, emailForm.nextSibling);

          // Reset the form
          this.reset();
        } else {
          throw new Error('Network response was not ok');
        }
      })
      .catch(error => {
        // Create error message element
        const errorMessage = document.createElement('div');
        errorMessage.className = 'mt-4 p-3 bg-[#ff6b1f]/30 text-primary rounded-md';
        errorMessage.textContent = 'There was an error sending your message. Please try again later.';

        // Insert after form
        emailForm.parentNode.insertBefore(errorMessage, emailForm.nextSibling);
      })
      .finally(() => {
        // Restore button state
        button.disabled = false;
        button.textContent = originalButtonText;
      });
    });
  }
}
