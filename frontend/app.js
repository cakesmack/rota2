// Global state
let currentWeekStart = null;
let staffMembers = [];
let currentShifts = [];

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initializeWeek();
    loadStaff();
    setupEventListeners();
});

// Initialize to current week (Monday)
function initializeWeek() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    currentWeekStart = monday;
    loadWeekRota();
}

// Format date to YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format date for display
function formatDisplayDate(date) {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Get week end date
function getWeekEnd(weekStart) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return weekEnd;
}

// Update week display
function updateWeekDisplay() {
    const weekEnd = getWeekEnd(currentWeekStart);
    document.getElementById('weekDisplay').textContent = `Week ${getWeekNumber(currentWeekStart)}`;
    document.getElementById('weekDates').textContent =
        `${formatDisplayDate(currentWeekStart)} - ${formatDisplayDate(weekEnd)}`;
}

// Get week number
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Navigate to previous week
function previousWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    loadWeekRota();
}

// Navigate to next week
function nextWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    loadWeekRota();
}

// Load week rota
async function loadWeekRota() {
    try {
        updateWeekDisplay();
        const weekStartStr = formatDate(currentWeekStart);
        const response = await fetch(`/api/rota/week?week_start=${weekStartStr}`);
        const data = await response.json();

        staffMembers = data.staff_list;
        currentShifts = data.shifts;

        renderRotaTable();
    } catch (error) {
        console.error('Error loading rota:', error);
        showToast('Error loading rota', 'error');
    }
}

// Calculate total hours for a staff member for the week
function calculateWeeklyHours(staffId) {
    const staffShifts = currentShifts.filter(shift => shift.staff_id === staffId);
    let totalMinutes = 0;

    staffShifts.forEach(shift => {
        // Skip holiday and day-off shifts from hours calculation
        if (shift.is_holiday || shift.is_day_off || !shift.start_time || !shift.end_time) {
            return;
        }

        const [startHour, startMinute] = shift.start_time.split(':').map(Number);
        const [endHour, endMinute] = shift.end_time.split(':').map(Number);

        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;

        totalMinutes += endTotalMinutes - startTotalMinutes;
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

// Render rota table
function renderRotaTable() {
    const tbody = document.getElementById('rotaBody');
    tbody.innerHTML = '';

    if (staffMembers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-8 text-gray-500">
                    <i class="fas fa-users text-4xl mb-4"></i>
                    <p class="text-lg">No staff members yet. Add your first staff member to get started!</p>
                </td>
            </tr>
        `;
        return;
    }

    staffMembers.forEach(staff => {
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-200 hover:bg-gray-50 transition duration-150';

        // Calculate weekly hours
        const weeklyHours = calculateWeeklyHours(staff.id);

        // Staff name cell
        const nameCell = document.createElement('td');
        nameCell.className = 'py-2 px-6 font-semibold text-gray-800 bg-gray-50';
        nameCell.innerHTML = `
            <div>
                <div class="text-lg">${staff.name}</div>
                ${staff.role ? `<div class="text-sm text-gray-500">${staff.role}</div>` : ''}
                <div class="text-sm font-bold text-blue-600 mt-1">
                    <i class="fas fa-clock mr-1"></i>${weeklyHours}
                </div>
            </div>
        `;
        row.appendChild(nameCell);

        // Day cells (Monday to Sunday)
        for (let i = 0; i < 7; i++) {
            const cellDate = new Date(currentWeekStart);
            cellDate.setDate(currentWeekStart.getDate() + i);
            const dateStr = formatDate(cellDate);

            const dayCell = document.createElement('td');
            dayCell.className = 'py-1 px-2 text-center border-l border-gray-200 align-top';

            // Find shifts for this staff member on this day
            const dayShifts = currentShifts.filter(shift =>
                shift.staff_id === staff.id && shift.date === dateStr
            );

            if (dayShifts.length > 0) {
                dayCell.className += ' shift-cell has-shift';
                const shiftsHtml = dayShifts.map(shift => createShiftBadge(shift)).join('');
                const addButton = `<button onclick="openShiftModal(staffMembers.find(s => s.id === ${staff.id}), '${dateStr}')" class="add-shift-btn" title="Add split shift"><i class="fas fa-plus"></i></button>`;
                dayCell.innerHTML = shiftsHtml + addButton;
            } else {
                dayCell.className += ' shift-cell empty-shift-cell';
                dayCell.innerHTML = '<div class="empty-cell-content"></div>';
                dayCell.onclick = () => openShiftModal(staff, dateStr);
            }

            row.appendChild(dayCell);
        }

        tbody.appendChild(row);
    });
}

// Create shift badge HTML
function createShiftBadge(shift) {
    let badgeClass = 'shift-badge';
    let badgeContent = '';

    // Determine badge style based on status
    if (shift.is_holiday) {
        badgeClass += ' holiday-badge';
        badgeContent = `<span class="shift-status"><i class="fas fa-umbrella-beach mr-1"></i>Holiday</span>`;
    } else if (shift.is_day_off) {
        badgeClass += ' day-off-badge';
        badgeContent = `<span class="shift-status"><i class="fas fa-coffee mr-1"></i>Day Off</span>`;
    } else {
        badgeContent = `<span class="shift-time">${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}</span>`;
        if (shift.shift_type) {
            badgeContent += `<span class="shift-type">${shift.shift_type}</span>`;
        }
    }

    return `
        <div class="${badgeClass} mb-2" onclick="editShift(${shift.id}, event)">
            ${badgeContent}
            <div class="delete-shift" onclick="deleteShift(${shift.id}, event)">
                <i class="fas fa-times"></i>
            </div>
        </div>
    `;
}

// Format time from HH:MM:SS to HH:MM
function formatTime(timeStr) {
    return timeStr.substring(0, 5);
}

// Load all staff
async function loadStaff() {
    try {
        const response = await fetch('/api/staff');
        staffMembers = await response.json();
        renderStaffList();
    } catch (error) {
        console.error('Error loading staff:', error);
        showToast('Error loading staff', 'error');
    }
}

// Render staff list
function renderStaffList() {
    const staffList = document.getElementById('staffList');

    if (staffMembers.length === 0) {
        staffList.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500">
                <i class="fas fa-user-plus text-4xl mb-4"></i>
                <p>No staff members yet. Click "Add Staff" to get started!</p>
            </div>
        `;
        return;
    }

    staffList.innerHTML = staffMembers.map(staff => `
        <div class="staff-card">
            <div class="staff-name">
                <i class="fas fa-user-circle text-blue-600 mr-2"></i>
                ${staff.name}
            </div>
            ${staff.role ? `<div class="staff-role"><i class="fas fa-briefcase mr-1"></i>${staff.role}</div>` : ''}
            <div class="staff-contact">
                ${staff.email ? `<div><i class="fas fa-envelope mr-2"></i>${staff.email}</div>` : ''}
                ${staff.phone ? `<div><i class="fas fa-phone mr-2"></i>${staff.phone}</div>` : ''}
            </div>
            <div class="staff-actions">
                <button onclick="editStaff(${staff.id})" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition duration-200">
                    <i class="fas fa-edit mr-1"></i>Edit
                </button>
                <button onclick="deleteStaffMember(${staff.id})" class="bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition duration-200">
                    <i class="fas fa-trash mr-1"></i>Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Staff Modal functions
function openStaffModal(staffId = null) {
    const modal = document.getElementById('staffModal');
    const form = document.getElementById('staffForm');
    form.reset();

    if (staffId) {
        const staff = staffMembers.find(s => s.id === staffId);
        if (staff) {
            document.getElementById('modalTitle').textContent = 'Edit Staff Member';
            document.getElementById('staffId').value = staff.id;
            document.getElementById('staffName').value = staff.name;
            document.getElementById('staffEmail').value = staff.email || '';
            document.getElementById('staffPhone').value = staff.phone || '';
            document.getElementById('staffRole').value = staff.role || '';
        }
    } else {
        document.getElementById('modalTitle').textContent = 'Add Staff Member';
        document.getElementById('staffId').value = '';
    }

    modal.classList.add('active');
}

function closeStaffModal() {
    document.getElementById('staffModal').classList.remove('active');
}

function editStaff(staffId) {
    openStaffModal(staffId);
}

async function deleteStaffMember(staffId) {
    if (!confirm('Are you sure you want to delete this staff member? This will also delete all their shifts.')) {
        return;
    }

    try {
        const response = await fetch(`/api/staff/${staffId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Staff member deleted successfully');
            loadStaff();
            loadWeekRota();
        } else {
            showToast('Error deleting staff member', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error deleting staff member', 'error');
    }
}

// Shift Modal functions
function openShiftModal(staff, dateStr, shiftId = null) {
    const modal = document.getElementById('shiftModal');
    const form = document.getElementById('shiftForm');
    form.reset();

    document.getElementById('shiftStaffId').value = staff.id;
    document.getElementById('shiftDate').value = dateStr;
    document.getElementById('shiftStaffName').textContent = staff.name;

    const date = new Date(dateStr);
    document.getElementById('shiftDateDisplay').textContent = formatDisplayDate(date);

    if (shiftId) {
        const shift = currentShifts.find(s => s.id === shiftId);
        if (shift) {
            document.getElementById('shiftModalTitle').textContent = 'Edit Shift';
            document.getElementById('shiftId').value = shift.id;
            document.getElementById('shiftStartTime').value = formatTime(shift.start_time);
            document.getElementById('shiftEndTime').value = formatTime(shift.end_time);
            document.getElementById('shiftRole').value = shift.shift_type || '';
            document.getElementById('shiftIsHoliday').checked = shift.is_holiday || false;
            document.getElementById('shiftIsDayOff').checked = shift.is_day_off || false;
            document.getElementById('shiftNotes').value = shift.notes || '';
        }
    } else {
        document.getElementById('shiftModalTitle').textContent = 'Add Shift';
        document.getElementById('shiftId').value = '';
    }

    // Update time field state based on holiday/day-off checkboxes
    toggleTimeFields();

    modal.classList.add('active');
}

function closeShiftModal() {
    document.getElementById('shiftModal').classList.remove('active');
}

async function editShift(shiftId, event) {
    event.stopPropagation();
    const shift = currentShifts.find(s => s.id === shiftId);
    if (shift) {
        const staff = staffMembers.find(s => s.id === shift.staff_id);
        if (staff) {
            openShiftModal(staff, shift.date, shiftId);
        }
    }
}

async function deleteShift(shiftId, event) {
    event.stopPropagation();

    if (!confirm('Are you sure you want to delete this shift?')) {
        return;
    }

    try {
        const response = await fetch(`/api/shifts/${shiftId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Shift deleted successfully');
            loadWeekRota();
        } else {
            showToast('Error deleting shift', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error deleting shift', 'error');
    }
}

// Toggle time fields based on holiday/day-off status
function toggleTimeFields() {
    const isHoliday = document.getElementById('shiftIsHoliday').checked;
    const isDayOff = document.getElementById('shiftIsDayOff').checked;
    const startTimeInput = document.getElementById('shiftStartTime');
    const endTimeInput = document.getElementById('shiftEndTime');
    const roleInput = document.getElementById('shiftRole');

    if (isHoliday || isDayOff) {
        // Disable time fields
        startTimeInput.disabled = true;
        endTimeInput.disabled = true;
        roleInput.disabled = true;
        startTimeInput.required = false;
        endTimeInput.required = false;
        startTimeInput.value = '';
        endTimeInput.value = '';
        roleInput.value = '';
    } else {
        // Enable time fields
        startTimeInput.disabled = false;
        endTimeInput.disabled = false;
        roleInput.disabled = false;
        startTimeInput.required = true;
        endTimeInput.required = true;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Holiday and day-off checkbox listeners
    document.getElementById('shiftIsHoliday').addEventListener('change', function() {
        if (this.checked) {
            document.getElementById('shiftIsDayOff').checked = false;
        }
        toggleTimeFields();
    });

    document.getElementById('shiftIsDayOff').addEventListener('change', function() {
        if (this.checked) {
            document.getElementById('shiftIsHoliday').checked = false;
        }
        toggleTimeFields();
    });

    // Staff form submission
    document.getElementById('staffForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const staffId = document.getElementById('staffId').value;
        const staffData = {
            name: document.getElementById('staffName').value,
            email: document.getElementById('staffEmail').value || null,
            phone: document.getElementById('staffPhone').value || null,
            role: document.getElementById('staffRole').value || null
        };

        try {
            let response;
            if (staffId) {
                // Update existing staff
                response = await fetch(`/api/staff/${staffId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(staffData)
                });
            } else {
                // Create new staff
                response = await fetch('/api/staff', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(staffData)
                });
            }

            if (response.ok) {
                showToast(staffId ? 'Staff member updated successfully' : 'Staff member added successfully');
                closeStaffModal();
                loadStaff();
                loadWeekRota();
            } else {
                showToast('Error saving staff member', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error saving staff member', 'error');
        }
    });

    // Shift form submission
    document.getElementById('shiftForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const shiftId = document.getElementById('shiftId').value;
        const isHoliday = document.getElementById('shiftIsHoliday').checked;
        const isDayOff = document.getElementById('shiftIsDayOff').checked;

        // Build shift data object
        const shiftData = {};

        // For new shifts, include staff_id and date
        if (!shiftId) {
            shiftData.staff_id = parseInt(document.getElementById('shiftStaffId').value);
            shiftData.date = document.getElementById('shiftDate').value;
        }

        // Always include holiday/day-off status
        shiftData.is_holiday = isHoliday;
        shiftData.is_day_off = isDayOff;

        // Only add time fields if not holiday/day-off
        if (!isHoliday && !isDayOff) {
            const startTime = document.getElementById('shiftStartTime').value;
            const endTime = document.getElementById('shiftEndTime').value;
            if (startTime) shiftData.start_time = startTime;
            if (endTime) shiftData.end_time = endTime;
        }

        // Add optional fields only if they have values
        const role = document.getElementById('shiftRole').value;
        if (role) shiftData.shift_type = role;

        const notes = document.getElementById('shiftNotes').value;
        if (notes) shiftData.notes = notes;

        console.log('Submitting shift data:', shiftData);

        try {
            let response;
            if (shiftId) {
                // Update existing shift
                response = await fetch(`/api/shifts/${shiftId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(shiftData)
                });
            } else {
                // Create new shift
                response = await fetch('/api/shifts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(shiftData)
                });
            }

            if (response.ok) {
                showToast(shiftId ? 'Shift updated successfully' : 'Shift added successfully');
                closeShiftModal();
                loadWeekRota();
            } else {
                const errorData = await response.json();
                console.error('Full server error response:', JSON.stringify(errorData, null, 2));

                // Extract detailed validation errors
                if (errorData.detail && Array.isArray(errorData.detail)) {
                    errorData.detail.forEach(err => {
                        console.error(`  - Field: ${err.loc?.join('.')}, Error: ${err.msg}`);
                    });
                }

                showToast(`Error saving shift: ${errorData.detail || 'Validation failed'}`, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error saving shift', 'error');
        }
    });

    // Close modals when clicking outside
    window.onclick = (event) => {
        const staffModal = document.getElementById('staffModal');
        const shiftModal = document.getElementById('shiftModal');

        if (event.target === staffModal) {
            closeStaffModal();
        }
        if (event.target === shiftModal) {
            closeShiftModal();
        }
    };
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} mr-2"></i>
        ${message}
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add slideOutRight animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
