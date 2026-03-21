# Local Testing & Access Guide

This document maps all the access points for the EdEspetoHub (Já no Caminho) platform when running on `localhost`.

## 🌐 Frontend (Consumer & Merchant)
**Base URL:** `http://localhost:8080`

| Experience | URL Path | Description |
| :--- | :--- | :--- |
| **Landing Page** | `/` | Main portal for signups and platform info. |
| **Digital Menu** | `/<store-slug>` | The customer ordering interface (try `/demo`). |
| **Order Tracking** | `/track/<orderId>` | Real-time status for consumers. |
| **Merchant Login** | `/admin` | Entry point for store owners. |
| **Admin Dashboard**| `/admin/dashboard` | Product management, settings, and metrics. |
| **Kitchen Queue** | `/admin/queue` | Real-time prep management for operators. |
| **Motoboy Portal** | `/motoboy` | Interface for delivery drivers. |
| **Super Admin** | `/super-admin` | Platform-wide management. |

---

## ⚙️ Backend & API (Developer)
**Base URL:** `http://localhost:4000`

| Service | URL Path | Description |
| :--- | :--- | :--- |
| **API Documentation** | `/api-docs` | **Swagger UI** for testing all refactored endpoints. |
| **Health Check** | `/health` | Verify if the API is UP and connected to DB. |
| **API v1 Base** | `/api/v1` | Root for all versioned endpoints. |

---

## 🛠️ Infrastructure & Support
| Service | URL | Default Credentials |
| :--- | :--- | :--- |
| **Database (pgAdmin)** | `http://localhost:5050` | User: `admin@janocaminho.com.br` <br> Pass: `ChamaNoEspeto20025#!` |
| **Maps Service** | `http://localhost:5051` | Internal logic for ETA and Distance. |
| **PostgreSQL** | `localhost:5432` | User: `postgres` <br> Pass: `postgres` |

---

## 📝 Quick Testing Tips
1.  **First Run**: Use `http://localhost:8080/demo` to see the menu without needing to create a store first.
2.  **API Verification**: Use the Swagger UI at `http://localhost:4000/api-docs` to test the new class-driven architecture. Every controller I refactored is listed there.
3.  **Authentication**: When testing APIs via Swagger or Postman, remember to use the `Bearer <token>` in the Authorization header for protected routes (marked with `@Authorize`).
4.  **Database**: If you need to manually verify migrations or table structures, use the pgAdmin interface or connect directly to port `5432`.
