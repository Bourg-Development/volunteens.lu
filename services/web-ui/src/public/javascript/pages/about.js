// About Page Specific Scripts
(function() {
    'use strict';

    // Add staggered animation delays to team cards
    const teamCards = document.querySelectorAll('.team-card');
    teamCards.forEach((card, index) => {
        card.style.transitionDelay = `${index * 0.15}s`;
    });

    // Timeline items animation on scroll
    const timelineObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
    });

    const timelineItems = document.querySelectorAll('.timeline-item');
    timelineItems.forEach(item => timelineObserver.observe(item));

    // Parallax effect ONLY for hero background element (not the entire section)
    window.addEventListener('scroll', () => {
        const heroBackground = document.querySelector('.about-hero::before');
        const hero = document.querySelector('.about-hero');

        if (hero) {
            const scrolled = window.pageYOffset;
            const heroHeight = hero.offsetHeight;

            // Only apply parallax while hero is visible
            if (scrolled < heroHeight) {
                // Apply transform to the pseudo-element via CSS variable
                hero.style.setProperty('--parallax-offset', `${scrolled * 0.3}px`);
            }
        }
    });

    // Counter animation for any stats (if you add stats later)
    const animateNumber = (element, target, duration = 2000) => {
        const start = 0;
        const increment = target / (duration / 16);
        let current = start;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current);
        }, 16);
    };

    // Observe stats if they exist
    const statsElements = document.querySelectorAll('[data-counter]');
    if (statsElements.length > 0) {
        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = parseInt(entry.target.getAttribute('data-counter'));
                    animateNumber(entry.target, target);
                    statsObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        statsElements.forEach(el => statsObserver.observe(el));
    }

    // Add hover effect to timeline years
    const timelineYears = document.querySelectorAll('.timeline-year');
    timelineYears.forEach(year => {
        year.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
            this.style.transition = 'transform 0.3s ease';
        });

        year.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
})();