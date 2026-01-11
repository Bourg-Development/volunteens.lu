// Events Page - Fetches events from API
(function() {
    'use strict';

    const eventsContainer = document.getElementById('eventsContainer');
    const loadingState = document.getElementById('loadingState');
    const EVENTS_URL = window.EVENTS_URL || 'http://localhost:3004';
    const DASH_URL = window.DASH_URL || 'http://localhost:3005';

    // Fetch and render events
    async function loadEvents() {
        try {
            const response = await fetch(`${EVENTS_URL}/api/v1/events/public`);
            const data = await response.json();

            if (loadingState) {
                loadingState.remove();
            }

            if (!data.success || !data.events || data.events.length === 0) {
                eventsContainer.innerHTML = `
                    <div class="empty-state">
                        <span class="material-symbols-outlined">event_busy</span>
                        <h3>No Upcoming Events</h3>
                        <p>Check back soon for new volunteer opportunities!</p>
                    </div>
                `;
                return;
            }

            // Render event cards
            eventsContainer.innerHTML = data.events.map((event, index) => createEventCard(event, index)).join('');

            // Add event listeners to cards
            setupEventListeners();

        } catch (err) {
            console.error('Error loading events:', err);
            if (loadingState) {
                loadingState.remove();
            }
            eventsContainer.innerHTML = `
                <div class="empty-state error">
                    <span class="material-symbols-outlined">error</span>
                    <h3>Failed to Load Events</h3>
                    <p>Please try again later.</p>
                    <button class="btn btn-primary" onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }

    function createEventCard(event, index) {
        // Get date from first shift
        const firstShift = event.shifts && event.shifts[0];
        const eventDate = firstShift ? new Date(firstShift.date) : new Date();
        const day = eventDate.getDate().toString().padStart(2, '0');
        const month = eventDate.toLocaleString('en-US', { month: 'short' });

        // Format shift times
        let time = 'TBD';
        let endTime = '';
        if (firstShift) {
            if (firstShift.startTime) {
                time = firstShift.startTime.substring(0, 5); // HH:MM
            }
            if (firstShift.endTime) {
                endTime = ` - ${firstShift.endTime.substring(0, 5)}`;
            }
        }

        const location = event.location || 'Location TBD';
        const description = event.description
            ? (event.description.length > 150 ? event.description.substring(0, 150) + '...' : event.description)
            : 'No description available.';

        const spotsLeft = event.capacity ? event.capacity - (event.signupCount || 0) : null;
        const spotsText = spotsLeft !== null ? `${spotsLeft} spots left` : 'Unlimited spots';

        return `
            <div class="event-card fade-in" data-event-id="${event.id}" style="animation-delay: ${index * 0.1}s">
                <div class="event-date">
                    <span class="day">${day}</span>
                    <span class="month">${month}</span>
                </div>
                <div class="event-image">
                    <div class="event-image-placeholder">
                        <span class="material-symbols-outlined">volunteer_activism</span>
                    </div>
                </div>
                <div class="event-content">
                    <h3>${escapeHtml(event.title)}</h3>
                    <div class="event-meta">
                        <div class="meta-item">
                            <span class="material-symbols-outlined">schedule</span>
                            <span>${time}${endTime}</span>
                        </div>
                        <div class="meta-item">
                            <span class="material-symbols-outlined">location_on</span>
                            <span>${escapeHtml(location)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="material-symbols-outlined">group</span>
                            <span>${spotsText}</span>
                        </div>
                    </div>
                    <p>${escapeHtml(description)}</p>
                    <div class="event-footer">
                        <a href="${DASH_URL}/event/${event.id}" class="event-btn">Sign Up</a>
                    </div>
                </div>
            </div>
        `;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function setupEventListeners() {
        // Add hover effects
        document.querySelectorAll('.event-card').forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-5px)';
            });
            card.addEventListener('mouseleave', function() {
                this.style.transform = '';
            });
        });
    }

    // Add loading spinner animation
    const style = document.createElement('style');
    style.textContent = `
        .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            color: #6b7280;
        }
        .loading-state .spinning {
            font-size: 48px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            text-align: center;
            color: #6b7280;
            grid-column: 1 / -1;
        }
        .empty-state .material-symbols-outlined {
            font-size: 64px;
            margin-bottom: 16px;
            color: #9ca3af;
        }
        .empty-state.error .material-symbols-outlined {
            color: #ef4444;
        }
        .empty-state h3 {
            margin: 0 0 8px 0;
            color: #374151;
        }
        .empty-state p {
            margin: 0 0 16px 0;
        }
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
        .event-card {
            animation: fadeInUp 0.5s ease forwards;
            opacity: 0;
        }
    `;
    document.head.appendChild(style);

    // Load events on page load
    loadEvents();

})();
