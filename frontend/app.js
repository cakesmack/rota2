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

        // Staff name cell
        const nameCell = document.createElement('td');
        nameCell.className = 'py-4 px-6 font-semibold text-gray-800 bg-gray-50';
        nameCell.innerHTML = `
            <div>
                <div class="text-lg">${staff.name}</div>
                ${staff.role ? `<div class="text-sm text-gray-500">${staff.role}</div>` : ''}
            </div>
        `;
        row.appendChild(nameCell);

        // Day cells (Monday to Sunday)
        for (let i = 0; i < 7; i++) {
            const cellDate = new Date(currentWeekStart);
            cellDate.setDate(currentWeekStart.getDate() + i);
            const dateStr = formatDate(cellDate);

            const dayCell = document.createElement('td');
            dayCell.className = 'py-4 px-4 text-center border-l border-gray-200';

            // Find shifts for this staff member on this day
            const dayShifts = currentShifts.filter(shift =>
                shift.staff_id === staff.id && shift.date === dateStr
            );

            if (dayShifts.length > 0) {
                dayCell.className += ' shift-cell has-shift';
                dayCell.innerHTML = dayShifts.map(shift => createShiftBadge(shift)).join('');
            } else {
                dayCell.className += ' shift-cell empty-shift-cell';
                dayCell.onclick = () => openShiftModal(staff, dateStr);
            }

            row.appendChild(dayCell);
        }

        tbody.appendChild(row);
    });
}

// Create shift badge HTML
function createShiftBadge(shift) {
    const shiftTypeClass = shift.shift_type ? shift.shift_type.toLowerCase() : '';
    return `
        <div class="shift-badge ${shiftTypeClass} mb-2" onclick="editShift(${shift.id}, event)">
            <span class="shift-time">${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}</span>
            ${shift.shift_type ? `<span class="shift-type">${shift.shift_type}</span>` : ''}
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
            document.getElementById('shiftType').value = shift.shift_type || '';
            document.getElementById('shiftNotes').value = shift.notes || '';
        }
    } else {
        document.getElementById('shiftModalTitle').textContent = 'Add Shift';
        document.getElementById('shiftId').value = '';
    }

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

// Setup event listeners
function setupEventListeners() {
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
        const shiftData = {
            staff_id: parseInt(document.getElementById('shiftStaffId').value),
            date: document.getElementById('shiftDate').value,
            start_time: document.getElementById('shiftStartTime').value,
            end_time: document.getElementById('shiftEndTime').value,
            shift_type: document.getElementById('shiftType').value || null,
            notes: document.getElementById('shiftNotes').value || null
        };

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
                showToast('Error saving shift', 'error');
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
