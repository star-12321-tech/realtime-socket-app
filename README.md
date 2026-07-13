# ⚡ Full-Stack Real-Time Stream Engine with JWT Authentication (Node.js + MySQL + React)

A secured, enterprise-grade, data-persistent real-time communications architecture built with a high-performance decoupled stack. This system leverages bidirectional event-driven pooling channels protected by stateless JSON Web Token (JWT) handshakes to seamlessly broadcast data feeds down to authenticated client interfaces while guaranteeing database logging on local disks.

## 🔒 Architectural Security & Technical Breakdown

* **Token-Guarded Handshake Middleware**: Connection access is managed by an isolated `io.use()` socket router gate. The server completely strips and rejects any incoming real-time socket connections lacking a verified cryptographic signature payload.
* **Cryptographic Identity Architecture**: Sensitive authentication data structures rely on decoupled asynchronous **BcryptJS hashing calculations** (salted at 10 rounds of computational complexity), protecting user integrity across communication sessions.
* **Relational Database Synchronization**: Data interactions run via asynchronous non-blocking connection pools, leveraging relational SQL table joining layouts to dynamically pair user identities with text events on page boot.
* **Reactive State Component Architecture**: The front-end context runs isolated user status blocks, caching validated web tokens locally inside native browser engine parameters (`localStorage`) to guarantee session persistent memory without losing historical states on reload.

---

## 🛠️ System Stack & Core Dependencies

### Frontend Architecture
* **React 18** (Functional State Engine & Interface Layouts)
* **Vite** (Next-Generation Fast Hot-Module Bundling Environment)
* **Socket.io-Client** (Asynchronous Event Handshake Handlers)

### Backend Architecture
* **Node.js + Express** (HTTP Authentication Controller API Routing)
* **Socket.io Server** (CORS-Sanitized Network Transport Orchestrator)
* **JSONWebToken** (Stateless Bearer Encryption & Token Signing)
* **BcryptJS** (Asynchronous Database Password Salting & Verification)
* **MySQL 2** (Non-Blocking Promise-Based Pooling Database Driver)
* **Dotenv** (Environment Isolation Strategy Architecture)

---

## 🗄️ Relational Database Schema Setup

The storage layer relies on a two-tier relational configuration linking message structures with authenticated identities:

```sql
CREATE DATABASE IF NOT EXISTS realtime_db;
USE realtime_db;

-- 1. Identity Infrastructure Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Persistent Live Stream Content Storage Table
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    socket_id VARCHAR(255) NOT NULL,
    user_id INT NOT NULL,
    message_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## ⚙️ Quick-Start Deployment Operations Guide

Follow these exact operational directives to spin up and review this secured application locally:

### 1. Environment Credentials Setup
Create a file named exactly `.env` inside your root `/backend` directory before initialization:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_local_mysql_password
DB_NAME=realtime_db
PORT=3001
JWT_SECRET=any_highly_secure_random_string_signature_key
```
*(Note: If using standard local development bundles like XAMPP, leave the `DB_PASSWORD` value entirely blank).*

### 2. Launch Execution Routines
To execute your node process modules, run the terminal threads concurrently inside two separate panels:

* **Terminal Window One (Backend Gateway API Server)**:
  ```bash
  cd backend
  npm install
  node server.js
  ```
* **Terminal Window Two (Frontend React Interface UI)**:
  ```bash
  cd frontend
  npm install
  npm run dev
  ```

---
💡 *Built with modern software development best-practices for database optimization, real-time message broadcasting, and full-stack event lifecycle handling.*