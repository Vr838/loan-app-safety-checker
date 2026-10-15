# Architecture Decision Records (ADRs)

This log records the core architectural and technical decisions made during the design and implementation of the Loan App Safety Checker platform.

---

## ADR-001: Separate Scanning from Web Requests
**Status:** Accepted  
**Context:** Public-source collection and review analysis can be slow, subject to rate limits, and vulnerable to upstream latency spikes.  
**Decision:** Execute scans strictly as background jobs (via CLI commands or authenticated admin API calls). The Next.js frontend reads persisted scan results asynchronously through the FastAPI REST layer.  
**Consequences:** Frontend pages load instantaneously with zero network scraping overhead. Results reflect the latest recorded scan snapshot.

---

## ADR-002: Modular Monolith vs. Premature Microservices
**Status:** Accepted  
**Context:** Designing separate microservices for collectors, analysis, databases, and APIs would introduce message queues, distributed failure modes, and increased hosting costs.  
**Decision:** Implement the backend as a cohesive modular monolith within `backend/app/`, maintaining clean internal separation between `collectors/`, `analysis/`, `services/`, and `api/`.  
**Consequences:** Simplified deployment to single-container hosts (Render/Railway), shared typed Pydantic models, in-memory function calls, and straightforward local testing.

---

## ADR-003: Deterministic Rule Engine vs. Black-Box LLM Judging
**Status:** Accepted  
**Context:** Generative Large Language Models (LLMs) can produce persuasive but non-deterministic, hallucinatory, or un-auditable outputs when evaluating safety risk.  
**Decision:** Use a deterministic, versioned mathematical scoring engine (`v1.0.0`) based on explicit weights, positive mitigations, and regex financial complaint lexicons.  
**Consequences:** Every score is 100% reproducible. The exact formula, weight breakdown, and evidence citations can be displayed directly in the dashboard and audited by reviewers.

---

## ADR-004: Dual Database Support (PostgreSQL for Production, SQLite for Local Dev & Testing)
**Status:** Accepted  
**Context:** Requiring a running PostgreSQL instance for running basic unit tests or reviewing local code increases contributor friction.  
**Decision:** Build the data layer using SQLAlchemy 2.0 with standard relational types and JSON columns that run seamlessly on both PostgreSQL (`asyncpg`) and SQLite (`aiosqlite`).  
**Consequences:** Contributors can run `pytest` and seed the database instantly with zero external dependencies, while production maintains high-concurrency ACID guarantees on managed PostgreSQL.

---

## ADR-005: Rejection of Redis/Celery and Vector DBs
**Status:** Accepted  
**Context:** Earlier proposals suggested introducing Redis, Celery, and pgvector.  
**Decision:** Omit Redis and vector databases in favor of native FastAPI `BackgroundTasks`, standard SQL relational indexes, and keyword extraction.  
**Consequences:** Saves hosting infrastructure costs, eliminates worker synchronization bugs, and keeps the codebase simple and maintainable without sacrificing required functionality.
