/**
 * Shift Calendar Component
 * A weekly calendar for selecting event shifts
 */
class ShiftCalendar {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            startHour: 6,
            endHour: 22,
            slotMinutes: 30,
            minShiftMinutes: 30,
            ...options
        };

        this.shifts = [];
        this.currentWeekStart = this.getWeekStart(new Date());
        this.isDragging = false;
        this.dragStart = null;
        this.dragColumn = null;
        this.dragPreview = null;

        this.init();
    }

    init() {
        this.render();
        this.attachEventListeners();
    }

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    formatDate(date) {
        // Use local date components to avoid UTC timezone shift
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    formatTime(hours, minutes) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    parseTime(timeStr) {
        const [h, m] = timeStr.split(':').map(Number);
        return { hours: h, minutes: m };
    }

    getDayName(dayIndex) {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return days[dayIndex];
    }

    render() {
        const totalSlots = ((this.options.endHour - this.options.startHour) * 60) / this.options.slotMinutes;

        let html = `
            <div class="shift-calendar-container">
                <div class="week-selector">
                    <button type="button" class="week-nav" id="prev-week">
                        <span class="material-symbols-outlined">chevron_left</span>
                    </button>
                    <span class="week-label" id="week-label">${this.getWeekLabel()}</span>
                    <button type="button" class="week-nav" id="next-week">
                        <span class="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>
                <div class="shift-calendar" id="shift-calendar">
                    <div class="shift-calendar-grid">
                        <!-- Header row -->
                        <div class="time-header"></div>
                        ${this.renderDayHeaders()}

                        <!-- Time slots -->
                        ${this.renderTimeRows(totalSlots)}
                    </div>
                </div>
                <div class="shift-summary">
                    <span class="shift-count" id="shift-count">${this.shifts.length}</span> shift(s) scheduled
                </div>
                <div class="shift-list" id="shift-list">
                    ${this.renderShiftChips()}
                </div>
                <div id="shifts-container"></div>
            </div>
        `;

        this.container.innerHTML = html;
        this.renderShiftBlocks();
    }

    getWeekLabel() {
        const start = new Date(this.currentWeekStart);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);

        const options = { month: 'short', day: 'numeric' };
        const startStr = start.toLocaleDateString('en-GB', options);
        const endStr = end.toLocaleDateString('en-GB', { ...options, year: 'numeric' });

        return `${startStr} - ${endStr}`;
    }

    renderDayHeaders() {
        const today = this.formatDate(new Date());
        let html = '';

        for (let i = 0; i < 7; i++) {
            const date = new Date(this.currentWeekStart);
            date.setDate(date.getDate() + i);
            const isToday = this.formatDate(date) === today;

            html += `
                <div class="day-header ${isToday ? 'today' : ''}" data-date="${this.formatDate(date)}">
                    <span class="day-name">${this.getDayName(i)}</span>
                    <span class="day-date">${date.getDate()}</span>
                </div>
            `;
        }

        return html;
    }

    renderTimeRows(totalSlots) {
        let html = '';

        for (let slot = 0; slot < totalSlots; slot++) {
            const minutes = slot * this.options.slotMinutes;
            const hours = this.options.startHour + Math.floor(minutes / 60);
            const mins = minutes % 60;
            const isHourMark = mins === 0;

            // Time label
            if (isHourMark) {
                html += `<div class="time-label">${this.formatTime(hours, 0)}</div>`;
            } else {
                html += `<div class="time-label"></div>`;
            }

            // Day columns
            for (let day = 0; day < 7; day++) {
                const date = new Date(this.currentWeekStart);
                date.setDate(date.getDate() + day);
                const dateStr = this.formatDate(date);

                html += `
                    <div class="time-slot ${isHourMark ? 'hour-mark' : ''}"
                         data-date="${dateStr}"
                         data-time="${this.formatTime(hours, mins)}"
                         data-slot="${slot}">
                    </div>
                `;
            }
        }

        return html;
    }

    renderShiftBlocks() {
        // Remove existing blocks
        this.container.querySelectorAll('.shift-block').forEach(el => el.remove());

        const calendar = this.container.querySelector('#shift-calendar');
        if (!calendar) return;

        calendar.style.position = 'relative';

        this.shifts.forEach((shift, index) => {
            // Check if shift is in current week
            const shiftDate = new Date(shift.date);
            const weekEnd = new Date(this.currentWeekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);

            if (shiftDate >= this.currentWeekStart && shiftDate < weekEnd) {
                const block = this.createShiftBlock(shift, index);
                if (!block) return;

                // Calculate start and end slot indices
                const startTime = this.parseTime(shift.startTime);
                const endTime = this.parseTime(shift.endTime);
                const startMinutes = (startTime.hours - this.options.startHour) * 60 + startTime.minutes;
                const endMinutes = (endTime.hours - this.options.startHour) * 60 + endTime.minutes;
                const startSlotIdx = Math.floor(startMinutes / this.options.slotMinutes);
                const endSlotIdx = Math.floor(endMinutes / this.options.slotMinutes);

                // Find the actual slot elements to get precise positioning
                const startSlotEl = this.container.querySelector(
                    `.time-slot[data-date="${shift.date}"][data-slot="${startSlotIdx}"]`
                );
                const endSlotEl = this.container.querySelector(
                    `.time-slot[data-date="${shift.date}"][data-slot="${endSlotIdx - 1}"]`
                ) || startSlotEl;

                if (startSlotEl) {
                    const calendarRect = calendar.getBoundingClientRect();
                    const startRect = startSlotEl.getBoundingClientRect();
                    const endRect = endSlotEl.getBoundingClientRect();

                    const top = startRect.top - calendarRect.top;
                    const left = startRect.left - calendarRect.left + 2;
                    const width = startRect.width - 4;
                    const height = (endRect.bottom - startRect.top);

                    block.style.position = 'absolute';
                    block.style.top = `${top}px`;
                    block.style.left = `${left}px`;
                    block.style.width = `${width}px`;
                    block.style.height = `${height}px`;

                    calendar.appendChild(block);
                }
            }
        });
    }

    createShiftBlock(shift, index) {
        const startTime = this.parseTime(shift.startTime);
        const endTime = this.parseTime(shift.endTime);
        const durationMinutes = (endTime.hours * 60 + endTime.minutes) - (startTime.hours * 60 + startTime.minutes);
        const durationHours = (durationMinutes / 60).toFixed(1);

        const block = document.createElement('div');
        block.className = 'shift-block';
        block.dataset.index = index;
        block.innerHTML = `
            <div class="resize-handle resize-handle-top" data-index="${index}"></div>
            <div class="shift-body">
                <span class="shift-time">${shift.startTime.substring(0, 5)} - ${shift.endTime.substring(0, 5)}</span>
                <span class="shift-duration">${durationHours}h</span>
            </div>
            <button type="button" class="edit-btn" data-index="${index}">
                <span class="material-symbols-outlined">edit</span>
            </button>
            <button type="button" class="delete-btn" data-index="${index}">&times;</button>
            <div class="resize-handle resize-handle-bottom" data-index="${index}"></div>
        `;

        // Resize from top
        const topHandle = block.querySelector('.resize-handle-top');
        topHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startResize(index, 'top', e);
        });

        // Resize from bottom
        const bottomHandle = block.querySelector('.resize-handle-bottom');
        bottomHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startResize(index, 'bottom', e);
        });

        // Edit button click
        const editBtn = block.querySelector('.edit-btn');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.openEditModal(index);
        });

        // Drag to move (from body)
        const body = block.querySelector('.shift-body');
        body.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.edit-btn') && !e.target.closest('.delete-btn')) {
                e.stopPropagation();
                this.startMove(index, e);
            }
        });

        // Double-click to edit
        block.addEventListener('dblclick', (e) => {
            if (!e.target.closest('.delete-btn') && !e.target.closest('.resize-handle')) {
                this.openEditModal(index);
            }
        });

        return block;
    }

    startResize(index, edge, e) {
        e.preventDefault();
        const shift = this.shifts[index];
        if (!shift) return;

        const block = this.container.querySelector(`.shift-block[data-index="${index}"]`);
        if (block) block.classList.add('resizing');
        document.body.classList.add('shift-resizing');

        this.resizing = {
            index,
            edge,
            startY: e.clientY,
            originalShift: { ...shift }
        };

        document.addEventListener('mousemove', this.handleResize);
        document.addEventListener('mouseup', this.stopResize);
    }

    handleResize = (e) => {
        if (!this.resizing) return;

        const { index, edge, startY, originalShift } = this.resizing;
        const deltaY = e.clientY - startY;
        const slotHeight = 20;
        const slotDelta = Math.round(deltaY / slotHeight);
        const minutesDelta = slotDelta * this.options.slotMinutes;

        const origStart = this.parseTime(originalShift.startTime);
        const origEnd = this.parseTime(originalShift.endTime);
        const origStartMins = origStart.hours * 60 + origStart.minutes;
        const origEndMins = origEnd.hours * 60 + origEnd.minutes;

        let newStartMins = origStartMins;
        let newEndMins = origEndMins;

        if (edge === 'top') {
            newStartMins = origStartMins + minutesDelta;
            // Clamp to valid range
            newStartMins = Math.max(this.options.startHour * 60, newStartMins);
            newStartMins = Math.min(newEndMins - this.options.minShiftMinutes, newStartMins);
        } else {
            newEndMins = origEndMins + minutesDelta;
            // Clamp to valid range
            newEndMins = Math.min(this.options.endHour * 60, newEndMins);
            newEndMins = Math.max(newStartMins + this.options.minShiftMinutes, newEndMins);
        }

        // Update shift
        this.shifts[index].startTime = this.formatTime(Math.floor(newStartMins / 60), newStartMins % 60);
        this.shifts[index].endTime = this.formatTime(Math.floor(newEndMins / 60), newEndMins % 60);

        this.renderShiftBlocks();
        this.updateHiddenInputs();
    }

    stopResize = () => {
        document.body.classList.remove('shift-resizing');
        this.container.querySelectorAll('.shift-block.resizing').forEach(el => el.classList.remove('resizing'));
        this.resizing = null;
        document.removeEventListener('mousemove', this.handleResize);
        document.removeEventListener('mouseup', this.stopResize);
        this.updateUI();
    }

    startMove(index, e) {
        e.preventDefault();
        const shift = this.shifts[index];
        if (!shift) return;

        const block = this.container.querySelector(`.shift-block[data-index="${index}"]`);
        if (!block) return;

        block.classList.add('dragging');
        document.body.classList.add('shift-dragging');

        this.moving = {
            index,
            startY: e.clientY,
            startX: e.clientX,
            originalShift: { ...shift },
            blockRect: block.getBoundingClientRect()
        };

        document.addEventListener('mousemove', this.handleMove);
        document.addEventListener('mouseup', this.stopMove);
    }

    handleMove = (e) => {
        if (!this.moving) return;

        const { index, startY, startX, originalShift } = this.moving;
        const deltaY = e.clientY - startY;
        const slotHeight = 20;
        const slotDelta = Math.round(deltaY / slotHeight);
        const minutesDelta = slotDelta * this.options.slotMinutes;

        const origStart = this.parseTime(originalShift.startTime);
        const origEnd = this.parseTime(originalShift.endTime);
        const duration = (origEnd.hours * 60 + origEnd.minutes) - (origStart.hours * 60 + origStart.minutes);
        const origStartMins = origStart.hours * 60 + origStart.minutes;

        let newStartMins = origStartMins + minutesDelta;

        // Clamp to valid range
        newStartMins = Math.max(this.options.startHour * 60, newStartMins);
        newStartMins = Math.min(this.options.endHour * 60 - duration, newStartMins);

        const newEndMins = newStartMins + duration;

        // Update time
        this.shifts[index].startTime = this.formatTime(Math.floor(newStartMins / 60), newStartMins % 60);
        this.shifts[index].endTime = this.formatTime(Math.floor(newEndMins / 60), newEndMins % 60);

        // Check for horizontal movement (changing day)
        const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
        const slotUnderMouse = elementUnderMouse?.closest('.time-slot');
        if (slotUnderMouse) {
            const newDate = slotUnderMouse.dataset.date;
            if (newDate && newDate !== this.shifts[index].date) {
                // Check if new date is in current week view
                const newDateObj = new Date(newDate);
                const weekEnd = new Date(this.currentWeekStart);
                weekEnd.setDate(weekEnd.getDate() + 7);

                if (newDateObj >= this.currentWeekStart && newDateObj < weekEnd) {
                    this.shifts[index].date = newDate;
                }
            }
        }

        this.renderShiftBlocks();
    }

    stopMove = () => {
        document.body.classList.remove('shift-dragging');
        this.container.querySelectorAll('.shift-block.dragging').forEach(el => el.classList.remove('dragging'));
        this.moving = null;
        document.removeEventListener('mousemove', this.handleMove);
        document.removeEventListener('mouseup', this.stopMove);
        this.updateUI();
        this.updateHiddenInputs();
    }

    openEditModal(index) {
        const shift = this.shifts[index];
        if (!shift) return;

        // Remove any existing modal
        this.closeEditModal();

        const modal = document.createElement('div');
        modal.className = 'shift-edit-modal';
        modal.innerHTML = `
            <div class="shift-edit-content">
                <h4>Edit Shift</h4>
                <div class="shift-edit-date">${new Date(shift.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
                <div class="shift-edit-row">
                    <label>
                        Start
                        <input type="time" class="shift-start-input" value="${shift.startTime.substring(0, 5)}">
                    </label>
                    <label>
                        End
                        <input type="time" class="shift-end-input" value="${shift.endTime.substring(0, 5)}">
                    </label>
                </div>
                <div class="shift-edit-actions">
                    <button type="button" class="btn btn-sm btn-secondary shift-cancel-btn">Cancel</button>
                    <button type="button" class="btn btn-sm btn-primary shift-save-btn">Save</button>
                </div>
            </div>
        `;

        // Event listeners
        modal.querySelector('.shift-cancel-btn').addEventListener('click', () => this.closeEditModal());
        modal.querySelector('.shift-save-btn').addEventListener('click', () => {
            const startInput = modal.querySelector('.shift-start-input').value;
            const endInput = modal.querySelector('.shift-end-input').value;

            if (!startInput || !endInput) {
                alert('Please enter both start and end times');
                return;
            }

            if (startInput >= endInput) {
                alert('End time must be after start time');
                return;
            }

            // Update shift
            this.shifts[index].startTime = startInput + ':00';
            this.shifts[index].endTime = endInput + ':00';

            this.closeEditModal();
            this.updateUI();
            this.updateHiddenInputs();
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeEditModal();
            }
        });

        this.container.appendChild(modal);
        this.editModal = modal;

        // Focus start input
        modal.querySelector('.shift-start-input').focus();
    }

    closeEditModal() {
        if (this.editModal) {
            this.editModal.remove();
            this.editModal = null;
        }
    }

    renderShiftChips() {
        if (this.shifts.length === 0) return '';

        return this.shifts.map((shift, index) => {
            const date = new Date(shift.date);
            const dateStr = date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
            return `
                <div class="shift-chip">
                    <span>${dateStr} ${shift.startTime.substring(0, 5)}-${shift.endTime.substring(0, 5)}</span>
                    <button type="button" class="remove-shift" data-index="${index}">&times;</button>
                </div>
            `;
        }).join('');
    }

    attachEventListeners() {
        // Week navigation
        this.container.querySelector('#prev-week')?.addEventListener('click', () => {
            this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
            this.render();
            this.attachEventListeners();
        });

        this.container.querySelector('#next-week')?.addEventListener('click', () => {
            this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
            this.render();
            this.attachEventListeners();
        });

        // Drag to create shifts
        const calendar = this.container.querySelector('#shift-calendar');

        calendar?.addEventListener('mousedown', (e) => this.handleDragStart(e));
        calendar?.addEventListener('mousemove', (e) => this.handleDragMove(e));
        calendar?.addEventListener('mouseup', (e) => this.handleDragEnd(e));
        calendar?.addEventListener('mouseleave', (e) => this.handleDragEnd(e));

        // Touch events
        calendar?.addEventListener('touchstart', (e) => this.handleDragStart(e), { passive: false });
        calendar?.addEventListener('touchmove', (e) => this.handleDragMove(e), { passive: false });
        calendar?.addEventListener('touchend', (e) => this.handleDragEnd(e));

        // Delete shift
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-btn') || e.target.classList.contains('remove-shift')) {
                const index = parseInt(e.target.dataset.index);
                this.removeShift(index);
            }
        });
    }

    handleDragStart(e) {
        const slot = e.target.closest('.time-slot');
        if (!slot) return;

        e.preventDefault();

        this.isDragging = true;
        this.dragStart = {
            date: slot.dataset.date,
            time: slot.dataset.time,
            slot: parseInt(slot.dataset.slot)
        };
        this.dragColumn = slot.dataset.date;

        this.container.querySelector('#shift-calendar').classList.add('dragging');

        // Create preview
        this.createDragPreview(slot);
    }

    handleDragMove(e) {
        if (!this.isDragging) return;

        const touch = e.touches ? e.touches[0] : e;
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const slot = element?.closest('.time-slot');

        if (slot && slot.dataset.date === this.dragColumn) {
            this.updateDragPreview(slot);
        }
    }

    handleDragEnd(e) {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.container.querySelector('#shift-calendar').classList.remove('dragging');

        // Get end position
        const touch = e.changedTouches ? e.changedTouches[0] : e;
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const slot = element?.closest('.time-slot');

        if (slot && slot.dataset.date === this.dragColumn && this.dragStart) {
            const endSlot = parseInt(slot.dataset.slot);
            const startSlot = this.dragStart.slot;

            // Calculate start and end times
            const minSlot = Math.min(startSlot, endSlot);
            const maxSlot = Math.max(startSlot, endSlot) + 1; // +1 to include the end slot

            const startMinutes = minSlot * this.options.slotMinutes;
            const endMinutes = maxSlot * this.options.slotMinutes;

            const startHours = this.options.startHour + Math.floor(startMinutes / 60);
            const startMins = startMinutes % 60;
            const endHours = this.options.startHour + Math.floor(endMinutes / 60);
            const endMins = endMinutes % 60;

            // Only add if duration meets minimum
            const durationMinutes = endMinutes - startMinutes;
            if (durationMinutes >= this.options.minShiftMinutes) {
                this.addShift({
                    date: this.dragColumn,
                    startTime: this.formatTime(startHours, startMins),
                    endTime: this.formatTime(endHours, endMins)
                });
            }
        }

        // Remove preview
        this.removeDragPreview();
        this.dragStart = null;
        this.dragColumn = null;
    }

    createDragPreview(slot) {
        this.dragPreview = document.createElement('div');
        this.dragPreview.className = 'drag-preview';

        const slotRect = slot.getBoundingClientRect();
        const calendar = this.container.querySelector('#shift-calendar');
        const calendarRect = calendar.getBoundingClientRect();

        this.dragPreview.style.top = `${slotRect.top - calendarRect.top}px`;
        this.dragPreview.style.left = `${slotRect.left - calendarRect.left + 2}px`;
        this.dragPreview.style.width = `${slotRect.width - 4}px`;
        this.dragPreview.style.height = `${slotRect.height}px`;

        calendar.style.position = 'relative';
        calendar.appendChild(this.dragPreview);
    }

    updateDragPreview(slot) {
        if (!this.dragPreview || !this.dragStart) return;

        const calendar = this.container.querySelector('#shift-calendar');
        const calendarRect = calendar.getBoundingClientRect();

        const startSlot = this.dragStart.slot;
        const endSlot = parseInt(slot.dataset.slot);

        const minSlot = Math.min(startSlot, endSlot);
        const maxSlot = Math.max(startSlot, endSlot);

        const firstSlotEl = this.container.querySelector(`.time-slot[data-date="${this.dragColumn}"][data-slot="${minSlot}"]`);
        const lastSlotEl = this.container.querySelector(`.time-slot[data-date="${this.dragColumn}"][data-slot="${maxSlot}"]`);

        if (firstSlotEl && lastSlotEl) {
            const firstRect = firstSlotEl.getBoundingClientRect();
            const lastRect = lastSlotEl.getBoundingClientRect();

            this.dragPreview.style.top = `${firstRect.top - calendarRect.top}px`;
            this.dragPreview.style.left = `${firstRect.left - calendarRect.left + 2}px`;
            this.dragPreview.style.width = `${firstRect.width - 4}px`;
            this.dragPreview.style.height = `${lastRect.bottom - firstRect.top}px`;
        }
    }

    removeDragPreview() {
        if (this.dragPreview) {
            this.dragPreview.remove();
            this.dragPreview = null;
        }
    }

    addShift(shift) {
        // Check for overlapping shifts on same day
        const hasOverlap = this.shifts.some(existing => {
            if (existing.date !== shift.date) return false;

            const existStart = this.parseTime(existing.startTime);
            const existEnd = this.parseTime(existing.endTime);
            const newStart = this.parseTime(shift.startTime);
            const newEnd = this.parseTime(shift.endTime);

            const existStartMins = existStart.hours * 60 + existStart.minutes;
            const existEndMins = existEnd.hours * 60 + existEnd.minutes;
            const newStartMins = newStart.hours * 60 + newStart.minutes;
            const newEndMins = newEnd.hours * 60 + newEnd.minutes;

            return (newStartMins < existEndMins && newEndMins > existStartMins);
        });

        if (hasOverlap) {
            alert('Shifts cannot overlap on the same day');
            return;
        }

        this.shifts.push(shift);
        this.shifts.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.startTime.localeCompare(b.startTime);
        });

        this.updateUI();
        this.updateHiddenInputs();
    }

    removeShift(index) {
        this.shifts.splice(index, 1);
        this.updateUI();
        this.updateHiddenInputs();
    }

    updateUI() {
        this.container.querySelector('#shift-count').textContent = this.shifts.length;
        this.container.querySelector('#shift-list').innerHTML = this.renderShiftChips();
        this.renderShiftBlocks();
        // Note: chip delete listeners are handled by delegated event in attachEventListeners()
    }

    updateHiddenInputs() {
        const container = this.container.querySelector('#shifts-container');
        container.innerHTML = this.shifts.map((shift, i) => `
            <input type="hidden" name="shifts[${i}][date]" value="${shift.date}">
            <input type="hidden" name="shifts[${i}][startTime]" value="${shift.startTime}">
            <input type="hidden" name="shifts[${i}][endTime]" value="${shift.endTime}">
        `).join('');
    }

    // Public API
    getShifts() {
        return [...this.shifts];
    }

    setShifts(shifts) {
        this.shifts = shifts.map(s => ({
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime
        }));

        // Navigate to first shift's week if available
        if (this.shifts.length > 0) {
            this.currentWeekStart = this.getWeekStart(new Date(this.shifts[0].date));
        }

        this.render();
        this.attachEventListeners();
        this.updateHiddenInputs();
    }

    clear() {
        this.shifts = [];
        this.updateUI();
        this.updateHiddenInputs();
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShiftCalendar;
}
