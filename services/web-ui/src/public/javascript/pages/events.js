// Events Page Specific Scripts
(function() {
    'use strict';

    // Filter functionality
    const filterBtns = document.querySelectorAll('.filter-btn');
    const eventCards = document.querySelectorAll('.event-card');
    const eventsContainer = document.querySelector('.events-container');

    // Add empty state element
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
        <span class="material-symbols-outlined">event_busy</span>
        <h3>No Events Found</h3>
        <p>There are no events in this category at the moment.</p>
    `;

    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            filterBtns.forEach(b => b.classList.remove('active'));

            // Add active class to clicked button
            this.classList.add('active');

            // Get filter category
            const filterValue = this.getAttribute('data-filter');

            // Filter cards
            let visibleCount = 0;
            eventCards.forEach(card => {
                const category = card.getAttribute('data-category');

                if (filterValue === 'all' || category === filterValue) {
                    card.classList.remove('hidden');
                    visibleCount++;

                    // Add animation
                    card.style.animation = 'fadeInUp 0.5s ease';
                } else {
                    card.classList.add('hidden');
                }
            });

            // Show/hide empty state
            const existingEmptyState = eventsContainer.querySelector('.empty-state');
            if (visibleCount === 0) {
                if (!existingEmptyState) {
                    eventsContainer.appendChild(emptyState);
                }
            } else {
                if (existingEmptyState) {
                    existingEmptyState.remove();
                }
            }
        });
    });

    // Newsletter subscription
    const subscribeBtn = document.getElementById('subscribeBtn');
    const newsletterEmail = document.getElementById('newsletterEmail');

    subscribeBtn.addEventListener('click', async function() {
        const email = newsletterEmail.value.trim();

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            showNotification('Please enter a valid email address.', 'error');
            newsletterEmail.focus();
            return;
        }

        // Show loading state
        const originalText = subscribeBtn.textContent;
        subscribeBtn.disabled = true;
        subscribeBtn.textContent = 'Subscribing...';

        try {
            // Simulate API call (replace with your actual endpoint)
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Success
            showNotification('Thank you for subscribing! Check your email for confirmation.', 'success');
            newsletterEmail.value = '';

        } catch (error) {
            console.error('Error:', error);
            showNotification('Sorry, something went wrong. Please try again.', 'error');
        } finally {
            subscribeBtn.disabled = false;
            subscribeBtn.textContent = originalText;
        }
    });

    // Allow Enter key to submit newsletter
    newsletterEmail.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            subscribeBtn.click();
        }
    });

    // Notification function
    function showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Add styles
        Object.assign(notification.style, {
            position: 'fixed',
            top: '100px',
            right: '20px',
            padding: '15px 25px',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: '500',
            zIndex: '10000',
            animation: 'slideInRight 0.3s ease',
            maxWidth: '400px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        });

        if (type === 'success') {
            notification.style.background = '#d4edda';
            notification.style.color = '#155724';
            notification.style.border = '1px solid #c3e6cb';
        } else {
            notification.style.background = '#f8d7da';
            notification.style.color = '#721c24';
            notification.style.border = '1px solid #f5c6cb';
        }

        document.body.appendChild(notification);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        @keyframes slideOutRight {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100px);
            }
        }
    `;
    document.head.appendChild(style);

    // Add staggered animation to event cards on load
    eventCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });

    // Smooth scroll for register buttons
    document.querySelectorAll('.event-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();

            // Add click animation
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);

            // Show notification (replace with actual registration logic)
            showNotification('Registration feature coming soon!', 'success');
        });
    });

    // Add hover effect to event cards
    eventCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            const badge = this.querySelector('.event-badge');
            if (badge) {
                badge.style.transform = 'scale(1.1)';
                badge.style.transition = 'transform 0.3s ease';
            }
        });

        card.addEventListener('mouseleave', function() {
            const badge = this.querySelector('.event-badge');
            if (badge) {
                badge.style.transform = 'scale(1)';
            }
        });
    });

    // Date countdown (optional enhancement)
    function updateCountdowns() {
        eventCards.forEach(card => {
            const dateElement = card.querySelector('.event-date');
            if (dateElement) {
                const day = parseInt(dateElement.querySelector('.day').textContent);
                const month = dateElement.querySelector('.month').textContent;

                // Simple visual indicator for upcoming events
                const eventDate = new Date(2024, getMonthNumber(month), day);
                const today = new Date();
                const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));

                if (daysUntil <= 7 && daysUntil > 0) {
                    dateElement.style.background = '#fff3cd';
                    dateElement.style.borderLeft = '3px solid #f39c12';
                }
            }
        });
    }

    function getMonthNumber(monthName) {
        const months = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        return months[monthName] || 0;
    }

    updateCountdowns();

})();