// Global state
let currentWeekStart = null;
let staffMembers = [];
let currentShifts = [];

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Display user info
    displayUserInfo();

    // Initialize app
    initializeWeek();
    loadStaff();
    setupEventListeners();

    // Setup role-based UI
    setupRoleBasedUI();
});

// Display user info in header
function displayUserInfo() {
    document.getElementById('usernameDisplay').textContent = Auth.getUsername();
    const role = Auth.getRole();
    const roleDisplay = role === 'manager' ? 'Manager' : 'Staff Member';
    document.getElementById('roleDisplay').textContent = roleDisplay;
}

// Setup role-based UI visibility
function setupRoleBasedUI() {
    const isManager = Auth.isManager();

    // Only managers can add/edit/delete staff and shifts
    if (!isManager) {
        // Hide manager-only features
        document.getElementById('addStaffBtn').style.display = 'none';

        // TODO: Hide staff management section, disable shift creation
        // For now, we'll allow viewing but add restrictions later
    }
}

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

    // Update date picker to show current week's Monday
    document.getElementById('weekPicker').value = formatDate(currentWeekStart);
}

// Get Monday of the week for a given date
function getMondayOfWeek(date) {
    const day = date.getDay();
    const diff = date.getDate() - (day === 0 ? 6 : day - 1); // adjust when day is Sunday
    const monday = new Date(date);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
}

// Jump to a specific week
function jumpToWeek(dateStr) {
    const selectedDate = new Date(dateStr);
    currentWeekStart = getMondayOfWeek(selectedDate);
    loadWeekRota();
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
        const response = await fetch(`/api/rota/week?week_start=${weekStartStr}`, {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
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
    let warningIndicator = '';

    // Determine badge style based on status
    if (shift.is_holiday) {
        badgeClass += ' holiday-badge';
        badgeContent = `<span class="shift-status"><i class="fas fa-umbrella-beach mr-1"></i>Holiday</span>`;
    } else if (shift.is_day_off) {
        badgeClass += ' day-off-badge';
        badgeContent = `<span class="shift-status"><i class="fas fa-coffee mr-1"></i>Day Off</span>`;
    } else {
        // Calculate shift duration and add warning for long shifts
        const duration = calculateShiftDuration(shift.start_time, shift.end_time);
        if (duration > 8) {
            badgeClass += ' long-shift';
            warningIndicator = `<i class="fas fa-exclamation-triangle long-shift-warning" title="Long shift (${duration.toFixed(1)}h)"></i>`;
        }

        badgeContent = `<span class="shift-time">${formatTime(shift.start_time)} - ${formatTime(shift.end_time)} ${warningIndicator}</span>`;
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

// Calculate shift duration in hours
function calculateShiftDuration(startTime, endTime) {
    if (!startTime || !endTime) return 0;

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    const durationMinutes = endTotalMinutes - startTotalMinutes;
    return durationMinutes / 60;
}

// Format time from HH:MM:SS to HH:MM
function formatTime(timeStr) {
    return timeStr.substring(0, 5);
}

// Load all staff
async function loadStaff() {
    try {
        const response = await fetch('/api/staff-with-status', {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
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

    staffList.innerHTML = staffMembers.map(staff => {
        // Determine status badge
        let statusBadge = '';
        if (staff.invitation_status === 'active') {
            statusBadge = '<span class="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full"><i class="fas fa-check-circle mr-1"></i>Active</span>';
        } else if (staff.invitation_status === 'pending') {
            statusBadge = '<span class="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full"><i class="fas fa-clock mr-1"></i>Invitation Sent</span>';
        } else if (staff.invitation_status === 'expired') {
            statusBadge = '<span class="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full"><i class="fas fa-exclamation-triangle mr-1"></i>Invitation Expired</span>';
        }

        // Add resend button for pending/expired invitations
        let resendButton = '';
        if (staff.invitation_status === 'pending' || staff.invitation_status === 'expired') {
            resendButton = `
                <button onclick="resendInvitation(${staff.id})" class="bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg transition duration-200" title="Resend invitation email">
                    <i class="fas fa-envelope mr-1"></i>Resend
                </button>
            `;
        }

        return `
            <div class="staff-card">
                <div class="flex justify-between items-start mb-2">
                    <div class="staff-name">
                        <i class="fas fa-user-circle text-blue-600 mr-2"></i>
                        ${staff.name}
                    </div>
                    ${statusBadge}
                </div>
                ${staff.role ? `<div class="staff-role"><i class="fas fa-briefcase mr-1"></i>${staff.role}</div>` : ''}
                <div class="staff-contact">
                    ${staff.email ? `<div><i class="fas fa-envelope mr-2"></i>${staff.email}</div>` : ''}
                    ${staff.phone ? `<div><i class="fas fa-phone mr-2"></i>${staff.phone}</div>` : ''}
                </div>
                <div class="staff-actions">
                    ${resendButton}
                    <button onclick="editStaff(${staff.id})" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition duration-200">
                        <i class="fas fa-edit mr-1"></i>Edit
                    </button>
                    <button onclick="deleteStaffMember(${staff.id})" class="bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition duration-200">
                        <i class="fas fa-trash mr-1"></i>Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
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
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
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
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
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
    // Date picker listener
    document.getElementById('weekPicker').addEventListener('change', function() {
        if (this.value) {
            jumpToWeek(this.value);
        }
    });

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
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${Auth.getToken()}`
                    },
                    body: JSON.stringify(staffData)
                });
            } else {
                // Create new staff
                response = await fetch('/api/staff', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${Auth.getToken()}`
                    },
                    body: JSON.stringify(staffData)
                });
            }

            if (response.ok) {
                const createdStaff = await response.json();

                if (staffId) {
                    showToast('Staff member updated successfully');
                } else {
                    showToast('Staff member added! Invitation sent to ' + createdStaff.email);

                    // Get test invitation link for development
                    try {
                        const testResponse = await fetch(`/api/invitations/test/${createdStaff.id}`, {
                            headers: {
                                'Authorization': `Bearer ${Auth.getToken()}`
                            }
                        });

                        if (testResponse.ok) {
                            const testData = await testResponse.json();
                            console.log('='.repeat(80));
                            console.log('📧 NEW STAFF INVITATION - TEST LINK:');
                            console.log(`Staff: ${createdStaff.name}`);
                            console.log(`Email: ${createdStaff.email}`);
                            console.log(`Token: ${testData.token}`);
                            console.log(`\nInvitation URL:\n${testData.invitation_url}`);
                            console.log('='.repeat(80));
                        }
                    } catch (err) {
                        console.log('Could not fetch test invitation link');
                    }
                }

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

            // Check for double-booking (if creating new shift)
            if (!shiftId) {
                const staffId = parseInt(document.getElementById('shiftStaffId').value);
                const shiftDate = document.getElementById('shiftDate').value;
                const staffName = document.getElementById('shiftStaffName').textContent;

                const existingShifts = currentShifts.filter(shift =>
                    shift.staff_id === staffId &&
                    shift.date === shiftDate &&
                    !shift.is_holiday &&
                    !shift.is_day_off
                );

                if (existingShifts.length > 0) {
                    const existingShiftTimes = existingShifts.map(s =>
                        `${formatTime(s.start_time)} - ${formatTime(s.end_time)}`
                    ).join(', ');

                    alert(
                        `❌ Double Booking Detected\n\n` +
                        `${staffName} already has a shift on this day:\n` +
                        `${existingShiftTimes}\n\n` +
                        `Please delete the existing shift first or choose a different day.`
                    );
                    return; // Block shift creation
                }
            }

            // Check for long shifts (> 8 hours) and warn user
            const duration = calculateShiftDuration(startTime, endTime);
            if (duration > 8) {
                const staffName = document.getElementById('shiftStaffName').textContent;
                const confirmLongShift = confirm(
                    `⚠️ Long Shift Warning\n\n` +
                    `This shift is ${duration.toFixed(1)} hours long for ${staffName}.\n` +
                    `Shifts longer than 8 hours may require additional breaks.\n\n` +
                    `Do you want to continue?`
                );
                if (!confirmLongShift) {
                    return; // Cancel shift creation
                }
            }
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
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${Auth.getToken()}`
                    },
                    body: JSON.stringify(shiftData)
                });
            } else {
                // Create new shift
                response = await fetch('/api/shifts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${Auth.getToken()}`
                    },
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

// Holiday Request Management Functions

async function openHolidayRequestsModal() {
    document.getElementById('holidayRequestsModal').classList.remove('hidden');
    await loadHolidayRequests();
}

function closeHolidayRequestsModal() {
    document.getElementById('holidayRequestsModal').classList.add('hidden');
}

async function loadHolidayRequests() {
    try {
        const response = await fetch('/api/holiday-requests/pending', {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });

        if (response.ok) {
            const requests = await response.json();
            renderHolidayRequests(requests);
            updatePendingBadge(requests.length);
        } else {
            console.error('Failed to load holiday requests');
        }
    } catch (error) {
        console.error('Error loading holiday requests:', error);
    }
}

function updatePendingBadge(count) {
    const badge = document.getElementById('pendingRequestsBadge');
    if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function renderHolidayRequests(requests) {
    const container = document.getElementById('holidayRequestsContent');

    if (requests.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <i class="fas fa-inbox text-6xl mb-4 text-gray-300"></i>
                <p class="text-lg">No pending holiday requests</p>
            </div>
        `;
        return;
    }

    const html = requests.map(request => {
        const startDate = new Date(request.start_date).toLocaleDateString();
        const endDate = new Date(request.end_date).toLocaleDateString();
        const created = new Date(request.created_at).toLocaleDateString();
        const days = Math.ceil((new Date(request.end_date) - new Date(request.start_date)) / (1000 * 60 * 60 * 24)) + 1;

        return `
            <div class="border border-gray-200 rounded-lg p-6 mb-4 hover:shadow-lg transition duration-200">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                            <h4 class="text-xl font-bold text-gray-800">
                                <i class="fas fa-user mr-2 text-blue-500"></i>${request.staff.name}
                            </h4>
                            <span class="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                                <i class="fas fa-clock mr-1"></i>PENDING
                            </span>
                        </div>
                        <div class="text-gray-600 mb-2">
                            <i class="fas fa-calendar-alt mr-2"></i>
                            <strong>${startDate}</strong> to <strong>${endDate}</strong>
                            <span class="ml-2 text-sm">(${days} ${days === 1 ? 'day' : 'days'})</span>
                        </div>
                        ${request.reason ? `
                            <div class="text-gray-600 text-sm mt-2">
                                <i class="fas fa-comment mr-2"></i>
                                <em>"${request.reason}"</em>
                            </div>
                        ` : ''}
                        <div class="text-gray-500 text-xs mt-2">
                            <i class="fas fa-info-circle mr-1"></i>Requested on ${created}
                        </div>
                    </div>
                </div>
                <div class="flex gap-3 pt-4 border-t border-gray-200">
                    <button onclick="approveHolidayRequest(${request.id})"
                        class="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200">
                        <i class="fas fa-check mr-2"></i>Approve
                    </button>
                    <button onclick="denyHolidayRequest(${request.id})"
                        class="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200">
                        <i class="fas fa-times mr-2"></i>Deny
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

async function approveHolidayRequest(requestId) {
    if (!confirm('Approve this holiday request?\n\nHoliday shifts will be automatically created for the requested dates.')) {
        return;
    }

    try {
        const response = await fetch(`/api/holiday-requests/${requestId}/approve`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });

        if (response.ok) {
            showToast('Holiday request approved! Shifts created.', 'success');
            await loadHolidayRequests();
            await loadWeekRota(); // Refresh the rota
        } else {
            const error = await response.json();
            showToast(error.detail || 'Failed to approve request', 'error');
        }
    } catch (error) {
        console.error('Error approving holiday request:', error);
        showToast('Failed to approve request', 'error');
    }
}

async function denyHolidayRequest(requestId) {
    if (!confirm('Deny this holiday request?')) {
        return;
    }

    try {
        const response = await fetch(`/api/holiday-requests/${requestId}/deny`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });

        if (response.ok) {
            showToast('Holiday request denied', 'success');
            await loadHolidayRequests();
        } else {
            const error = await response.json();
            showToast(error.detail || 'Failed to deny request', 'error');
        }
    } catch (error) {
        console.error('Error denying holiday request:', error);
        showToast('Failed to deny request', 'error');
    }
}

// Shift Swap Functions

async function openShiftSwapsModal() {
    document.getElementById('shiftSwapsModal').classList.remove('hidden');
    await loadShiftSwaps();
}

function closeShiftSwapsModal() {
    document.getElementById('shiftSwapsModal').classList.add('hidden');
}

async function loadShiftSwaps() {
    try {
        const response = await fetch('/api/shift-swaps/pending', {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });

        if (response.ok) {
            const swaps = await response.json();
            renderShiftSwaps(swaps);
            updatePendingSwapsBadge(swaps.length);
        } else {
            console.error('Failed to load shift swaps');
        }
    } catch (error) {
        console.error('Error loading shift swaps:', error);
    }
}

function updatePendingSwapsBadge(count) {
    const badge = document.getElementById('pendingSwapsBadge');
    if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function renderShiftSwaps(swaps) {
    const container = document.getElementById('shiftSwapsContent');

    if (swaps.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <i class="fas fa-exchange-alt text-6xl mb-4 text-gray-300"></i>
                <p class="text-lg">No pending shift swaps</p>
            </div>
        `;
        return;
    }

    const html = swaps.map(swap => {
        const initiatorDate = new Date(swap.initiator_shift.date).toLocaleDateString();
        const recipientDate = swap.recipient_shift ? new Date(swap.recipient_shift.date).toLocaleDateString() : null;
        const created = new Date(swap.created_at).toLocaleDateString();

        const swapType = swap.recipient_shift ? 'True Swap' : 'Give-away';
        const swapTypeColor = swap.recipient_shift ? 'text-purple-600' : 'text-blue-600';

        return `
            <div class="border border-gray-200 rounded-lg p-6 mb-4 hover:shadow-lg transition duration-200">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-3">
                            <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                                <i class="fas fa-clock mr-1"></i>AWAITING APPROVAL
                            </span>
                            <span class="${swapTypeColor} text-sm font-semibold">
                                <i class="fas fa-exchange-alt mr-1"></i>${swapType}
                            </span>
                        </div>

                        <div class="bg-gray-50 rounded-lg p-4 mb-3">
                            <div class="mb-3">
                                <div class="font-bold text-gray-800 mb-1">
                                    <i class="fas fa-user mr-2 text-purple-500"></i>
                                    ${swap.initiator_staff.name} gives:
                                </div>
                                <div class="ml-6 text-gray-700">
                                    <i class="fas fa-calendar mr-2"></i>${initiatorDate}
                                    <span class="ml-2">
                                        ${swap.initiator_shift.start_time} - ${swap.initiator_shift.end_time}
                                        ${swap.initiator_shift.shift_type ? ` (${swap.initiator_shift.shift_type})` : ''}
                                    </span>
                                </div>
                            </div>

                            ${recipientDate ? `
                                <div class="pt-3 border-t border-gray-200">
                                    <div class="font-bold text-gray-800 mb-1">
                                        <i class="fas fa-user mr-2 text-blue-500"></i>
                                        ${swap.recipient_staff.name} gives:
                                    </div>
                                    <div class="ml-6 text-gray-700">
                                        <i class="fas fa-calendar mr-2"></i>${recipientDate}
                                        <span class="ml-2">
                                            ${swap.recipient_shift.start_time} - ${swap.recipient_shift.end_time}
                                            ${swap.recipient_shift.shift_type ? ` (${swap.recipient_shift.shift_type})` : ''}
                                        </span>
                                    </div>
                                </div>
                            ` : `
                                <div class="pt-3 border-t border-gray-200 text-gray-600 text-sm italic">
                                    <i class="fas fa-arrow-right mr-2"></i>
                                    One-way transfer to ${swap.recipient_staff.name}
                                </div>
                            `}
                        </div>

                        ${swap.message ? `
                            <div class="text-gray-600 text-sm mt-2 bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                                <i class="fas fa-comment mr-2"></i>
                                <em>"${swap.message}"</em>
                            </div>
                        ` : ''}

                        <div class="text-gray-500 text-xs mt-2">
                            <i class="fas fa-info-circle mr-1"></i>Requested on ${created}, accepted by ${swap.recipient_staff.name}
                        </div>
                    </div>
                </div>
                <div class="flex gap-3 pt-4 border-t border-gray-200">
                    <button onclick="approveShiftSwap(${swap.id})"
                        class="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200">
                        <i class="fas fa-check mr-2"></i>Approve Swap
                    </button>
                    <button onclick="denyShiftSwap(${swap.id})"
                        class="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200">
                        <i class="fas fa-times mr-2"></i>Deny Swap
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

async function approveShiftSwap(swapId) {
    if (!confirm('Approve this shift swap?\n\nThe shifts will be automatically reassigned.')) {
        return;
    }

    try {
        const response = await fetch(`/api/shift-swaps/${swapId}/approve`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });

        if (response.ok) {
            showToast('Shift swap approved! Shifts updated.', 'success');
            await loadShiftSwaps();
            await loadWeekRota(); // Refresh the rota
        } else {
            const error = await response.json();
            showToast(error.detail || 'Failed to approve swap', 'error');
        }
    } catch (error) {
        console.error('Error approving shift swap:', error);
        showToast('Failed to approve swap', 'error');
    }
}

async function denyShiftSwap(swapId) {
    if (!confirm('Deny this shift swap?')) {
        return;
    }

    try {
        const response = await fetch(`/api/shift-swaps/${swapId}/deny`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });

        if (response.ok) {
            showToast('Shift swap denied', 'success');
            await loadShiftSwaps();
        } else {
            const error = await response.json();
            showToast(error.detail || 'Failed to deny swap', 'error');
        }
    } catch (error) {
        console.error('Error denying shift swap:', error);
        showToast('Failed to deny swap', 'error');
    }
}

// Staff Invitation Functions

async function resendInvitation(staffId) {
    if (!confirm('Resend invitation email to this staff member?')) {
        return;
    }

    try {
        const response = await fetch(`/api/invitations/resend/${staffId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            showToast('Invitation resent successfully!', 'success');

            // Show test link in console for development
            console.log('='.repeat(80));
            console.log('📧 Invitation Resent - TEST LINK:');
            console.log(`Token: ${data.token}`);
            console.log(`\nTo test, visit: http://localhost:8000/static/accept-invitation.html?token=${data.token}`);
            console.log('='.repeat(80));

            await loadStaff(); // Refresh staff list
        } else {
            const error = await response.json();
            showToast(error.detail || 'Failed to resend invitation', 'error');
        }
    } catch (error) {
        console.error('Error resending invitation:', error);
        showToast('Failed to resend invitation', 'error');
    }
}

// Load pending requests and swaps badges on page load
window.addEventListener('DOMContentLoaded', async () => {
    if (Auth.isManager()) {
        try {
            // Load holiday requests count
            const holidayResponse = await fetch('/api/holiday-requests/pending', {
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`
                }
            });

            if (holidayResponse.ok) {
                const requests = await holidayResponse.json();
                updatePendingBadge(requests.length);
            }

            // Load shift swaps count
            const swapsResponse = await fetch('/api/shift-swaps/pending', {
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`
                }
            });

            if (swapsResponse.ok) {
                const swaps = await swapsResponse.json();
                updatePendingSwapsBadge(swaps.length);
            }
        } catch (error) {
            console.error('Error loading pending counts:', error);
        }
    }
});
