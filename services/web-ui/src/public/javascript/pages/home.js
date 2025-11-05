// Home Page Specific Scripts
(function() {
    'use strict';

    // Add staggered delay to stat items
    const statItems = document.querySelectorAll('.stat-item');
    statItems.forEach((item, index) => {
        item.style.transitionDelay = `${index * 0.1}s`;
    });

    // Counter animation for stats
    const animateCounter = (element, target) => {
        let current = 0;
        const increment = target / 50;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }

            if (target === 99.9) {
                element.textContent = current.toFixed(1) + '%';
            } else if (element.textContent.includes('K')) {
                element.textContent = Math.floor(current / 1000) + 'K+';
            } else if (element.textContent.includes('+')) {
                element.textContent = Math.floor(current) + '+';
            } else {
                element.textContent = element.textContent.replace(/\d+/, Math.floor(current));
            }
        }, 30);
    };

    // Observe stats for counter animation
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statNumbers = entry.target.querySelectorAll('.stat-item h2');
                statNumbers.forEach(num => {
                    const text = num.textContent;
                    let target;

                    if (text.includes('K')) {
                        target = 50000;
                    } else if (text === '99.9%') {
                        target = 99.9;
                    } else if (text === '24/7') {
                        return; // Skip 24/7
                    } else if (text.includes('+')) {
                        target = parseInt(text);
                    }

                    if (target) {
                        animateCounter(num, target);
                    }
                });
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    const statsSection = document.querySelector('.stats');
    if (statsSection) {
        statsObserver.observe(statsSection);
    }

    // Removed parallax effect to keep icons static like on the about page
})();