// Contact Page Specific Scripts
(function() {
    'use strict';

    // Form elements
    const contactForm = document.getElementById('contactForm');
    const formMessage = document.getElementById('formMessage');
    const submitBtn = contactForm.querySelector('.btn-primary');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');

    // Email validation
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Phone validation (optional field)
    function isValidPhone(phone) {
        if (!phone) return true; // Optional field
        const re = /^[\d\s\-\+\(\)]+$/;
        return re.test(phone) && phone.replace(/\D/g, '').length >= 10;
    }

    // Show message
    function showMessage(message, type) {
        formMessage.textContent = message;
        formMessage.className = 'form-message ' + type;
        formMessage.style.display = 'block';

        // Auto hide after 5 seconds
        setTimeout(() => {
            formMessage.style.display = 'none';
        }, 5000);
    }

    // Form validation
    function validateForm(formData) {
        const name = formData.get('name').trim();
        const email = formData.get('email').trim();
        const phone = formData.get('phone').trim();
        const subject = formData.get('subject').trim();
        const message = formData.get('message').trim();

        if (!name || name.length < 2) {
            showMessage('Please enter a valid name (at least 2 characters).', 'error');
            return false;
        }

        if (!isValidEmail(email)) {
            showMessage('Please enter a valid email address.', 'error');
            return false;
        }

        if (phone && !isValidPhone(phone)) {
            showMessage('Please enter a valid phone number.', 'error');
            return false;
        }

        if (!subject || subject.length < 3) {
            showMessage('Please enter a subject (at least 3 characters).', 'error');
            return false;
        }

        if (!message || message.length < 10) {
            showMessage('Please enter a message (at least 10 characters).', 'error');
            return false;
        }

        return true;
    }

    // Handle form submission
    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData(contactForm);

        // Validate form
        if (!validateForm(formData)) {
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';
        formMessage.style.display = 'none';

        try {
            // Simulate API call (replace with your actual endpoint)
            const response = await fetch('/api/contact', {
                method: 'POST',
                body: formData
            });

            // For demo purposes, simulate success after 1.5 seconds
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Simulated success (replace with actual response handling)
            if (true) { // Replace with: if (response.ok)
                showMessage('Thank you for your message! We\'ll get back to you soon.', 'success');
                contactForm.reset();

                // Add success animation to form
                contactForm.style.animation = 'pulse 0.5s ease';
                setTimeout(() => {
                    contactForm.style.animation = '';
                }, 500);
            } else {
                throw new Error('Failed to send message');
            }

        } catch (error) {
            console.error('Error:', error);
            showMessage('Sorry, there was an error sending your message. Please try again or contact us directly.', 'error');
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            btnText.style.display = 'block';
            btnLoading.style.display = 'none';
        }
    });

    // Add input animations
    const inputs = contactForm.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.01)';
            this.parentElement.style.transition = 'transform 0.2s ease';
        });

        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1)';
        });
    });

    // Add staggered animation to info cards
    const infoCards = document.querySelectorAll('.info-card');
    infoCards.forEach((card, index) => {
        card.style.transitionDelay = `${index * 0.1}s`;
    });

    // FAQ Accordion functionality
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const item = this.parentElement;
            const isActive = item.classList.contains('active');

            // Close all other items
            document.querySelectorAll('.faq-accordion-item').forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });

            // Toggle current item
            if (isActive) {
                item.classList.remove('active');
            } else {
                item.classList.add('active');
            }
        });
    });

    // Character counter for message (optional enhancement)
    const messageField = document.getElementById('message');
    const minChars = 10;

    messageField.addEventListener('input', function() {
        const currentLength = this.value.length;
        const label = this.parentElement.querySelector('label');

        if (currentLength > 0 && currentLength < minChars) {
            label.style.color = '#e74c3c';
        } else if (currentLength >= minChars) {
            label.style.color = '#27ae60';
        } else {
            label.style.color = '';
        }
    });

    // Add pulse animation to social icons on hover
    const socialIcons = document.querySelectorAll('.social-icon');
    socialIcons.forEach(icon => {
        icon.addEventListener('mouseenter', function() {
            this.style.animation = 'pulse 0.5s ease';
        });

        icon.addEventListener('animationend', function() {
            this.style.animation = '';
        });
    });

    // Add keyframes for pulse animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);

})();