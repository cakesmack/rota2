# Rota Management App

A beautiful and intuitive rota (schedule) management application for managing staff shifts with user authentication and role-based access control.

## Features

### Manager Features
- View weekly rota in grid format
- Add, edit, and delete staff members
- Create and manage shifts
- Navigate between weeks with date picker
- Assign roles to shifts (e.g., Duty Manager)
- Mark staff holidays and days off
- View total weekly hours per staff member
- Long shift warnings (>8 hours)
- Double-booking prevention

### Staff Features (Coming Soon)
- View personal shifts
- Request holidays
- Request shift swaps

## Tech Stack

- **Backend**: FastAPI (Python)
- **Database**: SQLite with SQLAlchemy
- **Authentication**: JWT tokens with bcrypt password hashing
- **Frontend**: HTML, CSS, JavaScript with Tailwind CSS

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Initialize Database

**Option A: With default admin account (recommended)**
```bash
python init_db.py --create-admin
```

This creates:
- All database tables
- Admin user with credentials:
  - Username: `admin`
  - Password: `admin123`
  - Role: Manager

**Option B: Manual setup**
```bash
python init_db.py
```

Then create your own admin account via the API at http://localhost:8000/docs

### 3. Run the Application

```bash
uvicorn backend.main:app --reload
```

### 4. Access the Application

- **Login Page**: http://localhost:8000/static/login.html
- **Main App**: http://localhost:8000 (requires login)
- **API Docs**: http://localhost:8000/docs

## First Login

1. Go to http://localhost:8000/static/login.html
2. Login with:
   - Username: `admin`
   - Password: `admin123`
3. **Change your password immediately!** (via API docs for now)

## Creating Additional Users

1. First create Staff members in the app (as admin)
2. Then create user accounts via API docs (`/api/auth/register`)
3. Link users to staff by providing `staff_id` during registration

Example registration JSON:
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "secure-password",
  "role": "staff",
  "staff_id": 1
}
```

## User Roles

- **Manager**: Full access to all features
- **Staff**: View-only access (limited features - more coming soon)

## Database Reset

If you need to start fresh:

```bash
# Windows
del rota.db

# Mac/Linux
rm rota.db

# Then re-run initialization
python init_db.py --create-admin
```

## Development

The project structure:
```
rota2/
├── backend/
│   ├── auth.py          # Authentication utilities
│   ├── crud.py          # Database operations
│   ├── database.py      # Database connection
│   ├── main.py          # FastAPI app and routes
│   ├── models.py        # SQLAlchemy models
│   ├── schemas.py       # Pydantic schemas
│   └── routers/
│       └── auth.py      # Auth endpoints
├── frontend/
│   ├── index.html       # Main app page
│   ├── login.html       # Login page
│   ├── app.js          # Main app logic
│   ├── auth.js         # Auth module
│   └── styles.css      # Custom styles
├── init_db.py          # Database initialization
└── requirements.txt    # Python dependencies
```

## Security Notes

⚠️ **Important for Production:**
1. Change the SECRET_KEY in `backend/auth.py`
2. Use environment variables for secrets
3. Enable HTTPS
4. Set specific CORS origins (not "*")
5. Use strong passwords
6. Consider password reset functionality
