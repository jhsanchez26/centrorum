---

# 🏫 CentroRUM — UPRM Capstone Project

**CentroRUM** is a full-stack web platform developed at the **University of Puerto Rico at Mayagüez (UPRM)**.
It serves as a **centralized hub for job, tutoring, and academic opportunities**, allowing professors to post TA and work-study positions, students to apply or offer tutoring services, and organizations to share verified listings in one accessible, student-friendly interface.

---

## 📘 Table of Contents

* [About the Project](#about-the-project)
* [Core Features](#core-features)
* [System Architecture](#system-architecture)
* [Tech Stack](#tech-stack)
* [Installation & Setup](#installation--setup)
* [Usage](#usage)
* [Testing](#testing)
* [Future Improvements](#future-improvements)
* [Contributors](#contributors)
* [License](#license)

---

## 🧭 About the Project

CentroRUM was created as part of the **Computer Science and Engineering Capstone Project** at UPRM.
The goal is to address information fragmentation caused by scattered communication tools such as WhatsApp, Instagram, and flyers. By consolidating everything in one verified system, CentroRUM makes it easier for students, professors, and organizations to share and access opportunities.

The system currently runs locally in **Docker containers** and includes verified authentication, role-based permissions, listing management, and an accessible interface optimized for both desktop and mobile use.

---

## ⚙️ Core Features

* 🔐 **Secure Sign-Up and Login** — Registration limited to `@upr.edu` addresses with email verification.
* 🧾 **Create and Manage Listings** — Professors, tutors, and organizations can post jobs, TA offers, or tutoring opportunities.
* 🎓 **Apply and Track Applications** — Students can apply to listings and view their application status.
* 🛡️ **Admin Moderation Tools** — Admins can manage reports, verify users, and maintain platform integrity.
* 🔎 **Advanced Search and Filtering** — Filter by department, course, modality, or paid/unpaid.
* ♿ **Accessibility and Responsiveness** — WCAG 2.1 AA compliant, mobile-friendly, and responsive across browsers.

---

## 🏗️ System Architecture

CentroRUM uses a **three-tier architecture** built around containerized services:

```
[React + TypeScript Frontend]
          │
          ▼
[Django REST API Backend]
          │
          ▼
[PostgreSQL Database (Docker)]
```

All components are orchestrated with **Docker Compose** to ensure consistent setup and testing across development environments.

---

## 💻 Tech Stack

**Frontend**

* React 18 + TypeScript
* React Router
* CSS Modules / Tailwind
* Axios for API communication

**Backend**

* Django 4.x + Django REST Framework
* Python 3.11
* PostgreSQL (Docker)
* Email verification (restricted to @upr.edu domain)

**Development Tools**

* Docker & Docker Compose
* Git + GitHub for version control
* ESLint, Prettier, and Black for code formatting
* Jest, React Testing Library, and Pytest for testing

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/jhsanchez26/centrorum.git
cd centrorum
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
# Activate the environment:
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

The backend will be available at **[http://localhost:8000](http://localhost:8000)**

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at **[http://localhost:5173](http://localhost:5173)**

### 4. Run with Docker (Recommended)

```bash
docker compose up --build
```

Access the application:

* Frontend → [http://localhost:5173](http://localhost:5173)
* Backend → [http://localhost:8000](http://localhost:8000)

---

## 🧪 Testing

CentroRUM includes automated and manual testing to ensure stability and compliance with engineering constraints.

**Testing Layers**

* **Unit Testing:** Validates individual backend and frontend functions.
* **Integration Testing:** Ensures smooth data exchange between components.
* **Regression Testing:** Confirms new updates don’t break existing features.
* **Stress Testing:** Simulates heavy usage to evaluate performance.
* **Security Testing:** Verifies access control and protection of data.
* **User Acceptance Testing:** Conducted with UPRM students and staff.
* **Accessibility Testing:** Confirms compliance with WCAG 2.1 AA standards.

To run backend tests:

```bash
pytest
```

To run frontend tests:

```bash
npm test
```

---

## 📈 Future Improvements

* Implement notification and calendar integration
* Add “Follow” functionality and enhanced organization pages
* Improve performance through query optimization and caching
* Conduct full accessibility audit
* Develop a fully optimized mobile browser experience
* Explore cloud deployment (Heroku, GCP, or Vercel)

---

## 👩‍💻 Contributors

* **Juan Sánchez Ponte** — Backend Developer · Database · Mobile Optimization
* **Fabián Pérez Muñoz** — Authentication · Integration · Performance Metrics
* **Frances Sepúlveda Alvarado** — Frontend Development · Accessibility · Usability Testing

All members contribute to design, documentation, testing, and final presentation deliverables.

---

## 📜 License

This project was developed for educational purposes as part of the
**University of Puerto Rico at Mayagüez Capstone Course (INSO/CIIC 4151)**.

© 2025 CentroRUM Team — All Rights Reserved.





