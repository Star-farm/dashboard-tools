# AI-Agent Backplane & API Server (Backend)

This is the backend of the Intensive Vibe Coding Capstone Project, powered by FastAPI, FastMCP, and Scikit-Learn.

---

## 🛠️ Installation & Setup (From Scratch)

If you have just cloned the repository, follow these steps to set up and run the backend locally.

### 1. Create a Virtual Environment
From the `backend/` directory, run:
```bash
python -m venv .venv
```

### 2. Activate the Environment
- **Windows (Command Prompt):**
  ```cmd
  .venv\Scripts\activate.bat
  ```
- **Windows (PowerShell):**
  ```powershell
  .venv\Scripts\Activate.ps1
  ```
- **macOS / Linux:**
  ```bash
  source .venv/bin/activate
  ```

### 3. Install Dependencies
Install all required application and development packages:
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Copy the example environment file to `.env`:
```bash
cp .env.example .env
```
*(On Windows cmd: `copy .env.example .env`)*

This ensures `API_KEYS` is defined, preventing the server from raising a `RuntimeError` at startup.

---

## 🚀 Running the Tests

Ensure your virtual environment is active, then run the tests from the `backend/` directory:

```bash
# Run all tests with verbose output
python -m pytest tests/ -v
```

---

## 📊 Measuring Code Coverage

We use `pytest-cov` to measure code coverage and find out which parts of the codebase are executed during tests.

### 1. Run Tests with Coverage Report
From the `backend/` directory, run:

```bash
python -m pytest --cov=. --cov-report=html tests/
```

### 2. View the Visual Report
- Navigate to the newly generated `htmlcov/` directory.
- Open the `index.html` file in your favorite web browser.
- This report will visually highlight executed lines in **green** and missed/uncovered lines in **red**.
