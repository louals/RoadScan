# RoadScan Vision - Backend API Service

A Backend designed to power the RoadScan Vision system. Built with **FastAPI** for asynchronous RESTful routing and **SQLAlchemy** for ORM and database management, fully integrated with a hosted **Supabase PostgreSQL** cluster.

---

## Overview

* **Framework:** FastAPI (Python 3.8+)
* **Database Engine:** PostgreSQL 17 (via Supabase Managed Database)
* **ORM / Database Access:** SQLAlchemy Object-Relational Mapper
* **Connection Pooling:** Supabase Transaction Connection Pooler (Port 6543 / Session pooling over TLS)
* **ASGI Server:** Uvicorn

---


## Visual Documentation 

Visual references detailing the structural setup, model training using Google Colab, and execution verification logs are archived in the docu_images/ directory.

---

## System Architecture & Network Design

To mitigate DNS resolution degradation and local network socket exhaustion, the application routes database queries through Supabase's dedicated connection pooler rather than direct TCP connections to the PostgreSQL primary node.

```
+------------------+         HTTP/REST         +------------------------+
|   Client / UI    | <-----------------------> |  FastAPI ASGI Service  |
+------------------+                           +------------------------+
                                                           |
                                                  SQLAlchemy Connection
                                                           |
                                                           v
                                               +------------------------+
                                               |  Supabase Pooler       |
                                               |  (aws-0-eu-west-1)     |
                                               |  Port: 6543            |
                                               +------------------------+
                                                           |
                                                           v
                                               +------------------------+
                                               | PostgreSQL Primary Node|
                                               +------------------------+
```

---

## Prerequisites

* Python 3.8 or higher
* PostgreSQL client libraries (`libpq-dev` or binary equivalent)
* Access credentials for the target Supabase project (`ytqwrnfyqozzlmnatclr`)

---

## Environment Configuration

Create a `.env` file in the root execution directory containing the required runtime parameters.

```env
DATABASE_URL=postgresql://postgres.ytqwrnfyqozzlmnatclr:<PASSWORD>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require
```

> **Note:** Ensure that `<PASSWORD>` is replaced with the valid database user credential and that `sslmode=require` is enforced for secure encrypted transit over SSL/TLS.

---

## Dependency Management & Installation

Initialize your virtual environment and install all pinned production and development dependencies:

```powershell
# Create virtual environment
python -m venv venv

# Activate environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Install core runtime dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-dotenv
```

---

## Local Development & Execution

Start the ASGI server instance with hot-reloading enabled for local iteration:

```powershell
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Upon startup, the application executes a database readiness check (`SELECT version();`) via the SQLAlchemy engine lifecycle hook to verify valid connection pool setup.

---

## API Reference

| HTTP Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Health check endpoint returning service execution state. |
| `GET` | `/tables` | Schema inspection query returning active tables in the `public` schema. |
| `GET` | `/docs` | OpenAPI 3.0 specification UI (Swagger). |
| `GET` | `/redoc` | Alternative ReDoc interface for OpenAPI documentation. |

---

## Versioning & Git Initialization

Recommended initial commit workflow:

```powershell
git init
git add .
git commit -m "feat(core): initial backend layout with Supabase connection pooling and dynamic schema endpoint"
```