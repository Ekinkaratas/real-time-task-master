# 🚀 Real-Time Task Master API

![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgresql-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Jest](https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white)

An enterprise-grade, highly secure, and real-time Task Management backend API built with **NestJS**. This project serves as the robust foundation for a modern task-tracking application, featuring real-time bidirectional communication, advanced security layers, and comprehensive test coverage.

## ✨ Key Features

### 🛡️ Advanced Security & Authentication

- **JWT Access & Refresh Tokens:** Secure stateless authentication with Redis-backed token management.
- **Brute-Force Protection:** Account lockout mechanism (15-minute ban after 5 failed login attempts) to prevent credential stuffing.
- **WebSocket Security:** Handshake-level JWT verification to prevent IDOR (Insecure Direct Object Reference) and unauthorized room access.
- **Data Leakage Prevention:** Strict DTOs and ES6 destructuring to ensure sensitive data (like `lockoutUntil`, `failedAttempts`, `password`) never reaches the client.
- **Global Protections:** Configured with `Helmet` for secure HTTP headers and `@nestjs/throttler` for API rate limiting.

### ⚡ Real-Time Architecture (WebSockets)

- **Isolated Namespaces:** Separate gateways for `BoardEvents` and `UserEvents`.
- **Dynamic Rooms:** Users join specific Socket.io rooms (e.g., `user-room-{userId}` and directly via `{boardId}`) to receive only the events they are authorized for.
- **Live Updates:** Instant broadcasting for task movements, column reordering, user assignments, and profile updates.

### 🗄️ Relational Database & ORM

- **Prisma ORM:** Type-safe database queries with a strictly defined PostgreSQL schema.
- **Cascading Deletes:** Guaranteed data integrity. Deleting a board automatically wipes its columns, tasks, and subtasks without leaving orphaned records.
- **Account Anonymization:** Users can delete their accounts, which gracefully anonymizes their data (`status: DELETED`) rather than breaking task histories for other team members.

## 🛠️ Tech Stack

- **Framework:** NestJS (Node.js)
- **Language:** TypeScript (Strict Mode)
- **Database:** PostgreSQL
- **Caching & Sessions:** Redis
- **ORM:** Prisma
- **Real-time:** Socket.io
- **Security:** Argon2 (Hashing), Passport-JWT, Helmet
- **Testing:** Jest (100% Unit Test Coverage on Core Services & Gateways)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Docker & Docker Compose (for PostgreSQL and Redis)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Ekinkaratas/real-time-task-master.git
   cd real-time-task-master
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory and configure it based on your `.env.example` file:

   ```env
   # JWT keys
   ACCESS_TOKEN_KEY=YOUR_ACCESS_TOKEN_KEY
   REFRESH_TOKEN_KEY=YOUR_REFRESH_TOKEN_KEY

   PORT=3003
   FRONTEND_URL=http://localhost:3001

   # Database config
   DB_USER=YOUR_DB_USER
   DB_PASSWORD=YOUR_DB_PASSWORD
   DB_NAME=YOUR_DB_NAME
   DB_PORT=5432
   DATABASE_URL=postgres://user:password@localhost:5432/db

   ```

4. **Start the infrastructure (DB & Redis):**

   ```bash
   docker-compose up -d
   ```

5. **Run Prisma Migrations:**

   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

6. **Start the application:**
   ```bash
   # Development mode
   npm run start:dev
   ```

## 🧪 Testing

The project maintains a rigorous testing standard. Core business logic, including complex security scenarios and WebSocket broadcasts, are fully tested.

```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:cov
```

## 👨‍💻 Author

**Ekin Karataş**

- Software Engineering Student
- _Passionate about scalable architectures, microservices, and secure API design._

---

_This backend is designed to be consumed by a next.js web site._
