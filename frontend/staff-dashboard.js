// Staff Dashboard JavaScript

Auth.requireAuth();

// Global state
let currentWeekStart = null;
let currentStaffId = null;
let currentStaffInfo = null;
let currentShifts = [];
let allStaff = [];
let currentView = 'fullRota'; // 'fullRota' or 'myShifts'

// Days of the week
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

    // Load data
    await loadAllData();

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

// Load all data for the current week
async function loadAllData() {
    try {
        // Update week display
        updateWeekDisplay();

        // Load all staff
        await loadAllStaff();

        // Load all shifts for the week
        await loadAllShifts();

        // Render the current view
        renderCurrentView();
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Failed to load schedule. Please try again.');
    }
}

// Load all staff members
async function loadAllStaff() {
    const response = await fetch('/api/staff', {
        headers: {
            'Authorization': `Bearer ${Auth.getToken()}`
        }
    });

    if (response.ok) {
        allStaff = await response.json();
    } else {
        throw new Error('Failed to load staff list');
    }
}

// Load all shifts for the current week
async function loadAllShifts() {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const startStr = formatDate(currentWeekStart);
    const endStr = formatDate(weekEnd);

    const response = await fetch(
        `/api/shifts?start_date=${startStr}&end_date=${endStr}`,
        {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        }
    );

    if (response.ok) {
        currentShifts = await response.json();
    } else {
        throw new Error('Failed to load shifts');
    }
}

// Render the current view based on selected tab
function renderCurrentView() {
    if (currentView === 'fullRota') {
        renderFullRota();
    } else {
        renderMyShifts();
    }
}

// Render the full rota view (all staff)
function renderFullRota() {
    const tbody = document.getElementById('rotaBody');
    tbody.innerHTML = '';

    // Update header dates
    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        document.getElementById(`day${i}`).innerHTML = `
            <div class="font-bold">${SHORT_DAYS[i]}</div>
            <div class="text-xs font-normal">${date.getDate()}/${date.getMonth() + 1}</div>
        `;
    }

    // Render each staff member's row
    allStaff.forEach(staff => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 transition duration-200';

        // Staff name cell with weekly hours
        const nameCell = document.createElement('td');
        nameCell.className = 'border border-gray-300 px-4 py-3 font-semibold bg-gray-50 sticky left-0';

        const weeklyHours = calculateStaffWeeklyHours(staff.id);
        const isCurrentUser = staff.id === currentStaffId;

        nameCell.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="${isCurrentUser ? 'text-blue-600' : 'text-gray-800'}">
                    ${isCurrentUser ? '<i class="fas fa-user-circle mr-2"></i>' : ''}${staff.name}
                </span>
                <span class="text-sm text-gray-500">${weeklyHours.toFixed(1)}h</span>
            </div>
        `;
        tr.appendChild(nameCell);

        // Day cells
        for (let i = 0; i < 7; i++) {
            const date = new Date(currentWeekStart);
            date.setDate(date.getDate() + i);
            const dateStr = formatDate(date);

            const dayCell = document.createElement('td');
            dayCell.className = 'border border-gray-300 px-2 py-2 align-top';

            const dayShifts = currentShifts.filter(
                shift => shift.staff_id === staff.id && shift.date === dateStr
            );

            if (dayShifts.length > 0) {
                dayCell.innerHTML = dayShifts.map(shift => renderShiftBadge(shift)).join('');
            }

            tr.appendChild(dayCell);
        }

        tbody.appendChild(tr);
    });
}

// Render shift badge for full rota view
function renderShiftBadge(shift) {
    if (shift.is_holiday) {
        return `<div class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs mb-1">
            <i class="fas fa-umbrella-beach"></i> Holiday
        </div>`;
    } else if (shift.is_day_off) {
        return `<div class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs mb-1">
            <i class="fas fa-bed"></i> Day Off
        </div>`;
    } else {
        const duration = calculateShiftDuration(shift.start_time, shift.end_time);
        const isLong = duration > 8;
        const badgeClass = isLong ? 'bg-orange-100 text-orange-800 long-shift' : 'bg-blue-100 text-blue-800';
        const warningIcon = isLong ? '<i class="fas fa-exclamation-triangle text-xs long-shift-warning"></i> ' : '';
        const roleText = shift.shift_type ? `<div class="text-xs font-semibold">${shift.shift_type}</div>` : '';

        return `<div class="${badgeClass} px-2 py-1 rounded text-xs mb-1">
            ${warningIcon}${shift.start_time} - ${shift.end_time}
            ${roleText}
        </div>`;
    }
}

// Render the personalized shifts view
function renderMyShifts() {
    const tbody = document.getElementById('scheduleBody');
    tbody.innerHTML = '';

    const myShifts = currentShifts.filter(shift => shift.staff_id === currentStaffId);

    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        const dateStr = formatDate(date);

        // Get shifts for this day
        const dayShifts = myShifts.filter(shift => shift.date === dateStr);

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

    // Update weekly hours
    calculateWeeklyHours();
}

// Calculate total weekly hours for a staff member
function calculateStaffWeeklyHours(staffId) {
    let totalHours = 0;
    const staffShifts = currentShifts.filter(shift => shift.staff_id === staffId);

    staffShifts.forEach(shift => {
        if (shift.is_holiday || shift.is_day_off || !shift.start_time || !shift.end_time) {
            return;
        }
        totalHours += calculateShiftDuration(shift.start_time, shift.end_time);
    });

    return totalHours;
}

// Calculate total weekly hours for current user
function calculateWeeklyHours() {
    const totalHours = calculateStaffWeeklyHours(currentStaffId);
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

// Switch view
function switchView(view) {
    currentView = view;

    // Update tabs
    const fullRotaTab = document.getElementById('fullRotaTab');
    const myShiftsTab = document.getElementById('myShiftsTab');
    const holidayRequestsTab = document.getElementById('holidayRequestsTab');
    const fullRotaView = document.getElementById('fullRotaView');
    const myShiftsView = document.getElementById('myShiftsView');
    const holidayRequestsView = document.getElementById('holidayRequestsView');
    const weeklyHoursSummary = document.getElementById('weeklyHoursSummary');

    // Reset all tabs
    const inactiveClass = 'flex-1 px-6 py-4 text-center font-semibold transition duration-200 border-b-4 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
    const activeClass = 'flex-1 px-6 py-4 text-center font-semibold transition duration-200 border-b-4 border-blue-600 text-blue-600';

    fullRotaTab.className = inactiveClass;
    myShiftsTab.className = inactiveClass;
    holidayRequestsTab.className = inactiveClass;

    // Hide all views
    fullRotaView.classList.add('hidden');
    myShiftsView.classList.add('hidden');
    holidayRequestsView.classList.add('hidden');
    weeklyHoursSummary.classList.add('hidden');

    if (view === 'fullRota') {
        fullRotaTab.className = activeClass;
        fullRotaView.classList.remove('hidden');
        renderCurrentView();
    } else if (view === 'myShifts') {
        myShiftsTab.className = activeClass;
        myShiftsView.classList.remove('hidden');
        weeklyHoursSummary.classList.remove('hidden');
        renderCurrentView();
    } else if (view === 'holidayRequests') {
        holidayRequestsTab.className = activeClass;
        holidayRequestsView.classList.remove('hidden');
        loadHolidayRequests();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    document.getElementById('fullRotaTab').addEventListener('click', () => {
        switchView('fullRota');
    });

    document.getElementById('myShiftsTab').addEventListener('click', () => {
        switchView('myShifts');
    });

    document.getElementById('holidayRequestsTab').addEventListener('click', () => {
        switchView('holidayRequests');
    });

    // Previous week
    document.getElementById('prevWeek').addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        loadAllData();
    });

    // Next week
    document.getElementById('nextWeek').addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        loadAllData();
    });

    // Date picker
    document.getElementById('datePicker').addEventListener('change', (e) => {
        const selectedDate = new Date(e.target.value);
        // Adjust to Monday of that week
        const dayOfWeek = selectedDate.getDay();
        const daysToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
        selectedDate.setDate(selectedDate.getDate() - daysToMonday);
        currentWeekStart = selectedDate;
        loadAllData();
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

// Holiday Request Functions

let holidayRequests = [];

async function loadHolidayRequests() {
    try {
        const response = await fetch('/api/holiday-requests/my-requests', {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });

        if (response.ok) {
            holidayRequests = await response.json();
            renderHolidayRequests();
        } else {
            console.error('Failed to load holiday requests');
        }
    } catch (error) {
        console.error('Error loading holiday requests:', error);
    }
}

function renderHolidayRequests() {
    const container = document.getElementById('holidayRequestsList');

    if (holidayRequests.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <i class="fas fa-umbrella-beach text-6xl mb-4 text-gray-300"></i>
                <p class="text-lg">No holiday requests yet</p>
                <p class="text-sm">Click "Request Holiday" to submit your first request</p>
            </div>
        `;
        return;
    }

    const html = holidayRequests.map(request => {
        const statusColor = {
            'pending': 'bg-yellow-100 text-yellow-800',
            'approved': 'bg-green-100 text-green-800',
            'denied': 'bg-red-100 text-red-800'
        }[request.status];

        const statusIcon = {
            'pending': 'fa-clock',
            'approved': 'fa-check-circle',
            'denied': 'fa-times-circle'
        }[request.status];

        const startDate = new Date(request.start_date).toLocaleDateString();
        const endDate = new Date(request.end_date).toLocaleDateString();
        const created = new Date(request.created_at).toLocaleDateString();

        const deleteButton = request.status === 'pending' ? `
            <button onclick="deleteHolidayRequest(${request.id})"
                class="text-red-600 hover:text-red-800 transition duration-200"
                title="Cancel request">
                <i class="fas fa-trash"></i>
            </button>
        ` : '';

        return `
            <div class="border border-gray-200 rounded-lg p-4 mb-4 hover:shadow-md transition duration-200">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="${statusColor} px-3 py-1 rounded-full text-sm font-semibold">
                                <i class="fas ${statusIcon} mr-1"></i>${request.status.toUpperCase()}
                            </span>
                            <span class="text-gray-500 text-sm">Requested on ${created}</span>
                        </div>
                        <div class="text-gray-800">
                            <i class="fas fa-calendar-alt mr-2 text-blue-500"></i>
                            <strong>${startDate}</strong> to <strong>${endDate}</strong>
                        </div>
                        ${request.reason ? `<div class="text-gray-600 text-sm mt-2"><i class="fas fa-comment mr-2"></i>${request.reason}</div>` : ''}
                    </div>
                    <div class="flex gap-2">
                        ${deleteButton}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

function openHolidayRequestModal() {
    document.getElementById('holidayRequestModal').classList.remove('hidden');
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').setAttribute('min', today);
    document.getElementById('endDate').setAttribute('min', today);
}

function closeHolidayRequestModal() {
    document.getElementById('holidayRequestModal').classList.add('hidden');
    document.getElementById('holidayRequestForm').reset();
    document.getElementById('holidayErrorMessage').classList.add('hidden');
}

async function deleteHolidayRequest(requestId) {
    if (!confirm('Are you sure you want to cancel this holiday request?')) {
        return;
    }

    try {
        const response = await fetch(`/api/holiday-requests/${requestId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });

        if (response.ok) {
            await loadHolidayRequests();
        } else {
            alert('Failed to cancel request');
        }
    } catch (error) {
        console.error('Error deleting holiday request:', error);
        alert('Failed to cancel request');
    }
}

// Holiday request form submission
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('holidayRequestForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const reason = document.getElementById('reason').value;

        const errorDiv = document.getElementById('holidayErrorMessage');
        const errorText = document.getElementById('holidayErrorText');

        // Validate dates
        if (new Date(endDate) < new Date(startDate)) {
            errorText.textContent = 'End date must be after or equal to start date';
            errorDiv.classList.remove('hidden');
            return;
        }

        errorDiv.classList.add('hidden');

        try {
            const response = await fetch('/api/holiday-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({
                    start_date: startDate,
                    end_date: endDate,
                    reason: reason || null
                })
            });

            if (response.ok) {
                closeHolidayRequestModal();
                await loadHolidayRequests();
                alert('Holiday request submitted successfully!');
            } else {
                const error = await response.json();
                errorText.textContent = error.detail || 'Failed to submit request';
                errorDiv.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error submitting holiday request:', error);
            errorText.textContent = 'Failed to submit request. Please try again.';
            errorDiv.classList.remove('hidden');
        }
    });
});

// Initialize when page loads
init();
