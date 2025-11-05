// Authentication module
const Auth = {
    // Check if user is logged in
    isAuthenticated() {
        return !!localStorage.getItem('access_token');
    },

    // Get auth token
    getToken() {
        return localStorage.getItem('access_token');
    },

    // Get user role
    getRole() {
        return localStorage.getItem('user_role');
    },

    // Get username
    getUsername() {
        return localStorage.getItem('username');
    },

    // Check if user is manager
    isManager() {
        return this.getRole() === 'manager';
    },

    // Get auth headers for API calls
    getAuthHeaders() {
        const token = this.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    },

    // Logout
    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('token_type');
        localStorage.removeItem('user_role');
        localStorage.removeItem('username');
        window.location.href = '/static/login.html';
    },

    // Require authentication - redirect to login if not authenticated
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/static/login.html';
        }
    },

    // Require manager role
    requireManager() {
        this.requireAuth();
        if (!this.isManager()) {
            alert('Access denied. Manager role required.');
            window.location.href = '/';
        }
    }
};

// Make Auth available globally
window.Auth = Auth;
