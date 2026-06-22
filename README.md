# Omnidesk OS (Universal Cloud Office Suite)

Omnidesk OS is a collaborative, real-time, offline-first productivity workspace combining Notion-style documents, Airtable-style spreadsheet databases, and Retool-style drag-and-drop dashboard canvases.

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
Make sure you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed on your machine.

### Installation & Execution

1. Clone or navigate to the project directory:
   ```bash
   cd "C:\Users\ALZAFARTRADERS\Desktop\Omnidesk OS"
   ```

2. Copy the example environment variables:
   ```bash
   cp .env.example .env
   ```

3. Spin up the ecosystem containers:
   ```bash
   docker-compose up --build
   ```

Once Docker compilation completes, the following services will be running locally:
* **Frontend Web App**: [http://localhost:3000](http://localhost:3000) (Next.js)
* **Backend API Gateway**: [http://localhost:5000](http://localhost:5000) (Express REST/Fastify Websockets)
* **PostgreSQL Engine**: Port `5432`
* **Redis Cache Buffer**: Port `6379`
