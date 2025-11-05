// Staff Dashboard JavaScript

Auth.requireAuth();

// Global state
let currentWeekStart = null;
let currentStaffId = null;
let currentStaffInfo = null;
let currentShifts = [];

// Days of the week
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Initialize the dashboard
async function init() {
    // Display username
    document.getElementById('usernameDisplay').textContent = Auth.getUsername();

    // Load staff information
    await loadStaffInfo();

    // Set current week to today's week
    const today = new Date();
    const monday = new Date(today);
    const dayOfWeek = today.getDay();
    const daysToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    monday.setDate(today.getDate() - daysToMonday);
    currentWeekStart = monday;

    // Load the schedule
    await loadSchedule();

    // Setup event listeners
    setupEventListeners();
}

// Load current user's staff information
async function loadStaffInfo() {
    try {
        const response = await fetch('/api/auth/me/staff', {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });

        if (response.ok) {
            currentStaffInfo = await response.json();
            currentStaffId = currentStaffInfo.id;
            document.getElementById('staffName').textContent = currentStaffInfo.name;
        } else if (response.status === 404) {
            alert('No staff record linked to your account. Please contact your administrator.');
            Auth.logout();
        } else {
            throw new Error('Failed to load staff information');
        }
    } catch (error) {
        console.error('Error loading staff info:', error);
        alert('Failed to load your staff information. Please try again.');
    }
}

// Load schedule for the current week
async function loadSchedule() {
    if (!currentStaffId) return;

    try {
        // Format dates
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const startStr = formatDate(currentWeekStart);
        const endStr = formatDate(weekEnd);

        // Update week display
        updateWeekDisplay();

        // Fetch shifts for this staff member
        const response = await fetch(
            `/api/staff/${currentStaffId}/shifts?start_date=${startStr}&end_date=${endStr}`,
            {
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`
                }
            }
        );

        if (response.ok) {
            currentShifts = await response.json();
            renderSchedule();
            calculateWeeklyHours();
        } else {
            throw new Error('Failed to load schedule');
        }
    } catch (error) {
        console.error('Error loading schedule:', error);
        alert('Failed to load your schedule. Please try again.');
    }
}

// Render the schedule grid
function renderSchedule() {
    const tbody = document.getElementById('scheduleBody');
    tbody.innerHTML = '';

    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        const dateStr = formatDate(date);

        // Get shifts for this day
        const dayShifts = currentShifts.filter(shift => shift.date === dateStr);

        const tr = document.createElement('tr');
        tr.className = 'border-b border-gray-200 hover:bg-gray-50 transition duration-200';

        // Day name
        const dayCell = document.createElement('td');
        dayCell.className = 'px-4 py-4 font-semibold text-gray-700';
        dayCell.innerHTML = `<i class="fas fa-calendar-day mr-2 text-blue-500"></i>${DAYS[i]}`;
        tr.appendChild(dayCell);

        // Date
        const dateCell = document.createElement('td');
        dateCell.className = 'px-4 py-4 text-gray-600';
        dateCell.textContent = formatDisplayDate(date);
        tr.appendChild(dateCell);

        // Shifts
        const shiftsCell = document.createElement('td');
        shiftsCell.className = 'px-4 py-4';

        if (dayShifts.length === 0) {
            shiftsCell.innerHTML = '<span class="text-gray-400 italic">No shifts</span>';
        } else {
            const shiftsHtml = dayShifts.map(shift => {
                if (shift.is_holiday) {
                    return '<div class="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm mr-2 mb-2"><i class="fas fa-umbrella-beach mr-1"></i>On Holiday</div>';
                } else if (shift.is_day_off) {
                    return '<div class="inline-block bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm mr-2 mb-2"><i class="fas fa-bed mr-1"></i>Day Off</div>';
                } else {
                    const duration = calculateShiftDuration(shift.start_time, shift.end_time);
                    const roleText = shift.shift_type ? ` - ${shift.shift_type}` : '';
                    const isLong = duration > 8;
                    const badgeClass = isLong ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800';
                    return `<div class="inline-block ${badgeClass} px-3 py-1 rounded-full text-sm mr-2 mb-2">
                        <i class="fas fa-clock mr-1"></i>${shift.start_time} - ${shift.end_time}${roleText} (${duration.toFixed(1)}h)
                    </div>`;
                }
            }).join('');
            shiftsCell.innerHTML = shiftsHtml;
        }
        tr.appendChild(shiftsCell);

        // Hours
        const hoursCell = document.createElement('td');
        hoursCell.className = 'px-4 py-4 font-semibold';
        const dayHours = dayShifts.reduce((total, shift) => {
            if (shift.is_holiday || shift.is_day_off) return total;
            return total + calculateShiftDuration(shift.start_time, shift.end_time);
        }, 0);
        hoursCell.textContent = dayHours > 0 ? `${dayHours.toFixed(1)}h` : '-';
        hoursCell.className += dayHours > 8 ? ' text-orange-600' : ' text-gray-700';
        tr.appendChild(hoursCell);

        tbody.appendChild(tr);
    }
}

// Calculate total weekly hours
function calculateWeeklyHours() {
    let totalHours = 0;

    currentShifts.forEach(shift => {
        if (shift.is_holiday || shift.is_day_off || !shift.start_time || !shift.end_time) {
            return;
        }
        totalHours += calculateShiftDuration(shift.start_time, shift.end_time);
    });

    document.getElementById('weeklyHours').textContent = totalHours.toFixed(1);
}

// Calculate shift duration in hours
function calculateShiftDuration(startTime, endTime) {
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    const diffMs = end - start;
    return diffMs / (1000 * 60 * 60);
}

// Update week display
function updateWeekDisplay() {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    document.getElementById('weekDisplay').textContent =
        `${formatDisplayDate(currentWeekStart)} - ${formatDisplayDate(weekEnd)}`;

    // Update date picker
    document.getElementById('datePicker').valueAsDate = currentWeekStart;
}

// Setup event listeners
function setupEventListeners() {
    // Previous week
    document.getElementById('prevWeek').addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        loadSchedule();
    });

    // Next week
    document.getElementById('nextWeek').addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        loadSchedule();
    });

    // Date picker
    document.getElementById('datePicker').addEventListener('change', (e) => {
        const selectedDate = new Date(e.target.value);
        // Adjust to Monday of that week
        const dayOfWeek = selectedDate.getDay();
        const daysToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
        selectedDate.setDate(selectedDate.getDate() - daysToMonday);
        currentWeekStart = selectedDate;
        loadSchedule();
    });
}

// Format date as YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format date for display (e.g., "Mon, Jan 1")
function formatDisplayDate(date) {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Initialize when page loads
init();
