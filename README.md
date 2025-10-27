# CentroRUM Capstone Project

## Documentation

- [CentroRum Capstone Documentation (Google Doc)](https://docs.google.com/document/d/1_20_PFv7aWkBG71SOGTDo1MJX6dtkQPJAxAFXWvXKyU/edit?usp=sharing)

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/jhsanchez26/centrorum.git
cd centrorum
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv

# On Windows:
# you may need to do this additional first step if PowerShell gives you trouble:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
# If you have no issues, only run:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt

python manage.py makemigrations
python manage.py migrate

python manage.py runserver
```

The backend will be available at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

The frontend will be available at `http://localhost:5173`

### 4. Running the Application

1. **Start Application**:
   '''
   docker compose up --build
   '''

2. **Access the Application**:
   - Frontend: 'http://localhost:5173'