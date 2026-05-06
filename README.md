# Adaptive LMS

An Adaptive Learning Management System (LMS) with a decoupled architecture featuring a **FastAPI backend** and a **React frontend**.

## Prerequisites

Before you begin, make sure you have installed:
- **Python** (3.9+)
- **Node.js** and **Yarn** 
- **MongoDB** (You can run it locally or use a free cluster on MongoDB Atlas)
- A **Groq API Key** (for the AI features)

---

## Step 1: Start the Backend (FastAPI)

1. **Open a terminal** (like PowerShell or Command Prompt).
2. **Navigate to the backend directory**:
   ```powershell
   cd backend
   ```
3. **Create and activate a Python virtual environment** (recommended):
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```
4. **Install Python dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```
5. **Configure environment variables**:
   Open the `.env` file in the `backend` folder and ensure it contains the necessary keys:
   ```env
   MONGO_URL=mongodb://localhost:27017  # Change if using MongoDB Atlas
   DB_NAME=adaptive_lms
   GROQ_API_KEY=your_groq_api_key_here
   JWT_SECRET=your_super_secret_jwt_string
   ```
6. **Run the server**:
   ```powershell
   uvicorn server:app --reload
   ```
   *Your backend should now be running at `http://127.0.0.1:8000`.*

---

## Step 2: Start the Frontend (React)

1. **Open a new, separate terminal window**.
2. **Navigate to the frontend directory**:
   ```powershell
   cd frontend
   ```
3. **Install JavaScript dependencies**:
   ```powershell
   yarn install
   ```
4. **Configure the API endpoint**:
   Open the `.env` file in the `frontend` folder. Change the backend URL from the preview link to your local server by updating it to look like this:
   ```env
   REACT_APP_BACKEND_URL=http://127.0.0.1:8000
   ```
5. **Start the development server**:
   ```powershell
   yarn start
   ```

Once the frontend compiles successfully, it should automatically open your browser to `http://localhost:3000`. You can now use the application locally.

*(Note: The database seeds default test users like `admin@lms.com`, `teacher@lms.com`, and `student@lms.com` automatically when the backend starts up!)*
"# adaptive_lms" 
"# adaptive_lms" 
"# adaptive_lms" 
