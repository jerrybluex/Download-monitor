# AgentHire Architecture (VSCode Compatible)

## 1) Logical Service Architecture

```mermaid
graph LR
  SA[Seeker Agent] --> GW[Gateway]
  RA[Recruiter Agent] --> GW
  EW[Enterprise Web] --> GW
  AD[Admin Console] --> GW

  GW --> ID[Identity Access Service]
  GW --> ET[Enterprise Trust Service]
  GW --> PF[Profile Service]
  GW --> JB[Job Service]
  GW --> DC[Discovery Service]
  GW --> AP[Application Service]
  GW --> BM[Billing Metering Service]
  GW --> NT[Notification Webhook Service]
  GW --> AU[Audit Compliance Service]

  AP --> PF
  AP --> JB
  AP --> ET
  DC --> JB
  DC --> PF

  ET --> BUS[Event Bus]
  PF --> BUS
  JB --> BUS
  AP --> BUS
  BM --> BUS
  NT --> BUS
  AU --> BUS

  ID --> DB[Main Database]
  ET --> DB
  PF --> DB
  JB --> DB
  DC --> DB
  AP --> DB
  ET --> OBJ[Object Storage]
  BM --> AUD[Audit Metering Store]
  AU --> AUD
  NT --> AUD
```

## 2) Deployment Architecture

```mermaid
graph TB
  subgraph Client
    SA[Seeker Agent]
    RA[Recruiter Agent]
    EW[Enterprise Web]
    AD[Admin Console]
  end

  subgraph Edge
    CDN[CDN WAF]
    GW[Gateway]
  end

  subgraph App
    ID[Identity Access]
    ET[Enterprise Trust]
    PF[Profile]
    JB[Job]
    DC[Discovery]
    AP[Application]
    NT[Notification]
    BM[Billing Metering]
    AU[Audit Compliance]
  end

  subgraph Infra
    MQ[Event Bus]
    RDS[PostgreSQL]
    ES[Search Index]
    REDIS[Redis]
    OBJ[Object Storage]
    AUD[Audit Store]
  end

  SA --> CDN --> GW
  RA --> CDN --> GW
  EW --> CDN --> GW
  AD --> CDN --> GW

  GW --> ID
  GW --> ET
  GW --> PF
  GW --> JB
  GW --> DC
  GW --> AP
  GW --> NT
  GW --> BM
  GW --> AU

  ID --> RDS
  ET --> RDS
  PF --> RDS
  JB --> RDS
  AP --> RDS
  DC --> ES
  GW --> REDIS
  ET --> OBJ
  BM --> AUD
  AU --> AUD
  NT --> AUD

  ET --> MQ
  PF --> MQ
  JB --> MQ
  AP --> MQ
  NT --> MQ
  BM --> MQ
  AU --> MQ
```

## 3) Contact Unlock Sequence

```mermaid
sequenceDiagram
  participant ER as Enterprise Operator
  participant GW as Gateway
  participant AP as Application Service
  participant CU as Contact Unlock Service
  participant PF as Profile Service
  participant NT as Notification Service
  participant AU as Audit Service

  ER->>GW: Request contact unlock
  GW->>AP: Check application state
  AP-->>GW: Allow only shortlisted or interview requested
  GW->>CU: Create unlock request locked
  CU-->>AU: Log unlock request
  CU-->>NT: Notify candidate
  NT-->>PF: Send authorization request
  PF-->>CU: Candidate authorized
  CU->>CU: State locked to authorized to unlocked
  CU->>PF: Get contact data
  PF-->>CU: Return contact data
  CU-->>GW: Return unlocked contact
  GW-->>ER: Show contact data
  CU-->>AU: Log access
```

## 4) Hiring Core Flow Sequence

```mermaid
sequenceDiagram
  participant EA as Enterprise Agent
  participant SA as Seeker Agent
  participant GW as Gateway
  participant ET as Enterprise Trust
  participant JB as Job Service
  participant PF as Profile Service
  participant DC as Discovery Service
  participant AP as Application Service
  participant NT as Notification Service
  participant AU as Audit Service

  EA->>GW: Register enterprise and submit docs
  GW->>ET: Create review case submitted
  ET-->>AU: Log review event
  ET-->>EA: Approved

  EA->>GW: Publish job
  GW->>JB: Create and publish active job
  JB-->>AU: Log job state change

  SA->>GW: Register and update profile
  GW->>PF: Upsert active profile
  PF-->>AU: Log profile change

  SA->>GW: Search jobs
  GW->>DC: Query
  DC->>JB: Get active jobs
  JB-->>DC: Jobs
  DC-->>SA: Search results

  SA->>GW: Submit application with idempotency key
  GW->>AP: Create submitted application
  AP->>ET: Check enterprise approved
  AP->>JB: Check job active
  AP->>PF: Check profile active
  AP-->>AU: Log application event
  AP-->>NT: Notify enterprise

  EA->>GW: Update application state
  GW->>AP: submitted to viewed rejected shortlisted interview requested
  AP-->>AU: Log state transition
  AP-->>NT: Notify seeker
  NT-->>SA: Push update
```

## 5) State Machines Overview

```mermaid
graph LR
  subgraph EnterpriseVerification
    E1[Draft] --> E2[Submitted] --> E3[UnderReview]
    E3 --> E4[NeedsResubmission]
    E4 --> E2
    E3 --> E5[Approved]
    E3 --> E6[Rejected]
    E5 --> E7[Suspended]
  end

  subgraph Job
    J1[Draft] --> J2[Active]
    J2 --> J3[Paused]
    J3 --> J2
    J2 --> J4[Closed]
    J2 --> J5[Expired]
  end

  subgraph Profile
    P1[Draft] --> P2[Active]
    P2 --> P3[Hidden]
    P3 --> P2
    P2 --> P4[Deleted]
  end

  subgraph Application
    A1[Draft] --> A2[Submitted]
    A2 --> A3[Viewed]
    A2 --> A4[Rejected]
    A2 --> A5[Shortlisted]
    A5 --> A6[InterviewRequested]
    A6 --> A7[InterviewScheduled]
    A3 --> A8[Closed]
    A4 --> A8
    A7 --> A8
  end

  subgraph ContactUnlock
    C1[Locked] --> C2[CandidateAuthorized] --> C3[Unlocked]
    C3 --> C4[Revoked]
  end
```

## 6) Tenant And Access Model

```mermaid
graph TB
  T1[Seeker Tenant]
  T2[Enterprise Tenant]

  P1[Principal Seeker Owner]
  P2[Principal Enterprise Operator]
  P3[Principal Admin]

  A1[Seeker Agent]
  A2[Hiring Agent]

  C1[Seeker Credential]
  C2[Enterprise Credential]

  M1[Tenant Membership]
  R1[Role Seeker Agent]
  R2[Role Enterprise Operator]
  R3[Role Admin]

  P1 --> M1 --> T1
  P2 --> M1 --> T2

  A1 --> T1
  A2 --> T2
  A1 --> C1
  A2 --> C2

  P1 --> R1
  P2 --> R2
  P3 --> R3

  B1[Seeker agent only own tenant data]
  B2[Enterprise agent only own tenant data]
  B3[Admin must be audited and scoped]

  T1 --> B1
  T2 --> B2
  P3 --> B3
```

## 7) Core Data Model

```mermaid
graph TB
  TENANTS[tenants]
  PRINCIPALS[principals]
  MEMBERSHIPS[tenant_memberships]
  AGENTS[agents]
  CREDENTIALS[credentials]

  ENTERPRISES[enterprises]
  CASES[enterprise_verification_cases]
  EDOCS[enterprise_documents]

  PROFILES[profiles]
  PVERS[profile_versions]
  PCONTACTS[profile_contacts]

  JOBS[jobs]
  JVERS[job_versions]

  APPS[applications]
  AEVENTS[application_events]
  CUNLOCK[contact_unlocks]

  METER[metering_events]
  AUDIT[audit_logs]

  TENANTS --> MEMBERSHIPS
  PRINCIPALS --> MEMBERSHIPS
  TENANTS --> AGENTS --> CREDENTIALS

  TENANTS --> ENTERPRISES --> CASES
  ENTERPRISES --> EDOCS

  TENANTS --> PROFILES --> PVERS
  PROFILES --> PCONTACTS

  TENANTS --> JOBS --> JVERS

  JOBS --> APPS
  PROFILES --> APPS --> AEVENTS
  APPS --> CUNLOCK

  TENANTS --> METER
  TENANTS --> AUDIT
```

## 8) Security And Governance Controls

```mermaid
graph TB
  REQ[Incoming API Request]
  AUTH[Authentication and Authorization]
  RATE[Rate Limit and Abuse Guard]
  SCHEMA[Schema Validation]
  IDEMP[Idempotency Guard]
  POLICY[Data Access Policy]
  FSM[State Machine Guard]
  RESP[Response with request id]

  AUDIT[Audit Log]
  RISK[Risk Engine]

  REQ --> AUTH --> RATE --> SCHEMA --> IDEMP --> POLICY --> FSM --> RESP
  POLICY --> AUDIT
  FSM --> AUDIT
  RATE --> RISK --> AUDIT

  U1[Check application state]
  U2[Check candidate authorization]
  U3[Unlock contact with audit]

  FSM --> U1 --> U2 --> U3 --> AUDIT
```
