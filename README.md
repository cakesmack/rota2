# Rota Management App

A beautiful and intuitive rota (schedule) management application for managing staff shifts.

## Features

- Beautiful dashboard with weekly rota grid view
- Staff member management
- Shift assignment and management
- Navigate through different weeks
- RESTful API backend with FastAPI
- Modern, responsive frontend

## Tech Stack

- **Backend**: FastAPI (Python)
- **Database**: SQLite with SQLAlchemy
- **Frontend**: HTML, CSS, JavaScript with Tailwind CSS

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the application:
```bash
uvicorn backend.main:app --reload
```

3. Open your browser and navigate to:
- App: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Usage

1. Add staff members using the "Add Staff" button
2. Click on any cell in the rota grid to assign shifts
3. Navigate between weeks using the arrow buttons
4. View and manage all shifts from the dashboard
