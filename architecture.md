# AgentHire Architecture Diagrams

## 1) Logical Service Architecture

```mermaid
graph LR
  SA["求职 Agent"]
  RA["招聘 Agent"]
  EW["企业工作台"]
  AD["管理后台"]

  GW["Gateway / Access Layer
(API入口, 鉴权, 限流, 校验, request_id)"]

  SA --> GW
  RA --> GW
  EW --> GW
  AD --> GW

  ID["Identity & Access Service"]
  ET["Enterprise Trust Service"]
  PF["Candidate Profile Service"]
  JB["Job Service"]
  DC["Discovery Service"]
  AP["Application Service"]
  BM["Billing & Metering Service"]
  NT["Notification / Webhook Service"]
  AU["Audit & Compliance Service"]

  GW --> ID
  GW --> ET
  GW --> PF
  GW --> JB
  GW --> DC
  GW --> AP
  GW --> BM
  GW --> NT
  GW --> AU

  AP --> PF
  AP --> JB
  AP --> ET
  DC --> JB
  DC --> PF

  BUS["Event Bus / Domain Events"]
  ET --> BUS
  PF --> BUS
  JB --> BUS
  AP --> BUS
  BM --> BUS
  NT --> BUS
  AU --> BUS

  DB["主业务库
(tenants, principals, profiles, jobs, applications, ...)"]
  OBJ["对象存储
(企业资质材料, 附件)"]
  AUD["审计与计量存储
(audit_logs, metering_events, application_events)"]

  ID --> DB
  ET --> DB
  ET --> OBJ
  PF --> DB
  JB --> DB
  DC --> DB
  AP --> DB
  BM --> AUD
  AU --> AUD
  NT --> AUD
```

## 2) Deployment Architecture

```mermaid
graph TB
  subgraph Client["客户端层"]
    SA["求职 Agent"]
    RA["招聘 Agent"]
    EW["企业工作台"]
    AD["管理后台"]
  end

  subgraph Edge["接入层"]
    CDN["CDN / WAF"]
    GW["Gateway / Access Layer"]
  end

  subgraph App["应用服务层"]
    ID["Identity & Access"]
    ET["Enterprise Trust"]
    PF["Profile Service"]
    JB["Job Service"]
    DC["Discovery Service"]
    AP["Application Service"]
    NT["Notification / Webhook"]
    BM["Billing & Metering"]
    AU["Audit & Compliance"]
  end

  subgraph Infra["基础设施层"]
    MQ["Event Bus / MQ"]
    RDS["PostgreSQL (主业务库)"]
    ES["Search Index (OpenSearch/ES)"]
    REDIS["Redis (缓存/限流)"]
    OBJ["Object Storage (资质/附件)"]
    AUD["Audit & Metering Store"]
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

  DC --> ES
  ID --> RDS
  ET --> RDS
  PF --> RDS
  JB --> RDS
  AP --> RDS
  ET --> OBJ
  GW --> REDIS
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
  autonumber
  participant ER as 企业操作员/招聘Agent
  participant GW as Gateway
  participant AP as Application Service
  participant CU as Contact Unlock Service
  participant PF as Profile Service
  participant NT as Notification
  participant AU as Audit & Compliance

  ER->>GW: 请求解锁候选人联系方式
  GW->>AP: 校验申请状态
  AP-->>GW: 仅允许 Shortlisted/InterviewRequested
  GW->>CU: 创建解锁请求 (state=Locked)

  CU-->>AU: 记录解锁申请审计
  CU-->>NT: 通知候选人授权
  NT-->>PF: 发送授权待处理事件

  PF-->>CU: 候选人同意授权 (CandidateAuthorized)
  CU->>CU: 状态迁移 Locked -> CandidateAuthorized -> Unlocked

  CU->>PF: 获取并解密联系方式(最小字段)
  PF-->>CU: 返回联系方式
  CU-->>GW: 返回已解锁联系方式
  GW-->>ER: 展示联系方式

  CU-->>AU: 记录查看行为与操作者
  Note over CU,AU: 如撤销授权: Unlocked -> Revoked 并停止后续访问
```

## 4) Hiring Core Flow Sequence

```mermaid
sequenceDiagram
  autonumber
  participant EA as 企业操作员/招聘Agent
  participant SA as 求职Agent
  participant GW as Gateway
  participant ET as Enterprise Trust Service
  participant JB as Job Service
  participant PF as Profile Service
  participant DC as Discovery Service
  participant AP as Application Service
  participant NT as Notification Service
  participant AU as Audit & Compliance

  EA->>GW: 企业注册并提交资质
  GW->>ET: 创建审核单 (Submitted)
  ET-->>AU: 记录审核事件
  ET-->>EA: 审核通过 (Approved)

  EA->>GW: 发布职位
  GW->>JB: Job Create/Publish (Active)
  JB-->>AU: 记录职位状态变更

  SA->>GW: 注册/鉴权并更新 Profile
  GW->>PF: Profile Upsert (Active)
  PF-->>AU: 记录档案变更

  SA->>GW: 搜索职位 (filters)
  GW->>DC: Discovery Query
  DC->>JB: 拉取 Active 职位
  JB-->>DC: 返回职位数据
  DC-->>SA: 返回排序/去重结果

  SA->>GW: 提交申请 (idempotency key)
  GW->>AP: Create Application (Submitted)
  AP->>ET: 校验企业 Approved
  AP->>JB: 校验职位 Active
  AP->>PF: 校验 Profile Active
  AP-->>AU: 记录申请事件
  AP-->>NT: 通知企业有新申请

  EA->>GW: 查看并更新申请状态
  GW->>AP: Submitted -> Viewed/Rejected/Shortlisted/InterviewRequested
  AP-->>AU: 记录状态流转
  AP-->>NT: 通知求职Agent状态变更
  NT-->>SA: 回调/推送结果
```

## 5) State Machines Overview

```mermaid
graph LR
  subgraph EV["Enterprise Verification"]
    E1[Draft] --> E2[Submitted] --> E3[UnderReview]
    E3 --> E4[NeedsResubmission]
    E4 --> E2
    E3 --> E5[Approved]
    E3 --> E6[Rejected]
    E5 --> E7[Suspended]
  end

  subgraph JS["Job"]
    J1[Draft] --> J2[Active]
    J2 --> J3[Paused]
    J3 --> J2
    J2 --> J4[Closed]
    J2 --> J5[Expired]
  end

  subgraph PS["Candidate Profile"]
    P1[Draft] --> P2[Active]
    P2 --> P3[Hidden]
    P3 --> P2
    P2 --> P4[Deleted]
  end

  subgraph AS["Application"]
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

  subgraph CU["Contact Unlock"]
    C1[Locked] --> C2[CandidateAuthorized] --> C3[Unlocked]
    C3 --> C4[Revoked]
  end
```

## 6) Tenant And Access Model

```mermaid
graph TB
  subgraph Platform["AgentHire Platform"]
    T1[Seeker Tenant]
    T2[Enterprise Tenant]

    P1[Principal: seeker owner]
    P2[Principal: enterprise operator]
    P3[Principal: admin]

    A1[Agent: seeker agent]
    A2[Agent: hiring agent]

    C1[Credential: seeker signature key/token]
    C2[Credential: enterprise API key]

    R1[Roles: seeker_agent, enterprise_operator, admin]
    M1[Tenant Memberships]
  end

  P1 --> M1 --> T1
  P2 --> M1 --> T2
  P3 --> M1

  A1 --> T1
  A2 --> T2

  A1 --> C1
  A2 --> C2

  P1 --> R1
  P2 --> R1
  P3 --> R1

  subgraph AccessRules["Access Boundaries"]
    B1[Seeker agent only accesses own tenant profiles/applications]
    B2[Enterprise agent only accesses own tenant jobs/applications]
    B3[Admin actions require audit trail and scoped privileges]
  end

  T1 --> B1
  T2 --> B2
  P3 --> B3
```

## 7) Core Data Model (ER)

```mermaid
erDiagram
  TENANTS ||--o{ TENANT_MEMBERSHIPS : has
  PRINCIPALS ||--o{ TENANT_MEMBERSHIPS : joins
  TENANTS ||--o{ AGENTS : owns
  AGENTS ||--o{ CREDENTIALS : uses

  TENANTS ||--o{ ENTERPRISES : maps_to
  ENTERPRISES ||--o{ ENTERPRISE_VERIFICATION_CASES : submits
  ENTERPRISES ||--o{ ENTERPRISE_DOCUMENTS : uploads

  TENANTS ||--o{ PROFILES : owns
  PROFILES ||--o{ PROFILE_VERSIONS : versions
  PROFILES ||--o{ PROFILE_CONTACTS : secures

  TENANTS ||--o{ JOBS : owns
  JOBS ||--o{ JOB_VERSIONS : versions

  JOBS ||--o{ APPLICATIONS : receives
  PROFILES ||--o{ APPLICATIONS : submits
  APPLICATIONS ||--o{ APPLICATION_EVENTS : emits
  APPLICATIONS ||--o{ CONTACT_UNLOCKS : gates

  TENANTS ||--o{ METERING_EVENTS : records
  TENANTS ||--o{ AUDIT_LOGS : records
```

## 8) Security And Governance Controls

```mermaid
graph TB
  REQ[Incoming API Request]
  AUTH["AuthN and AuthZ: signature or API key with tenant scope"]
  RATE[Rate Limit / Abuse Guard]
  SCHEMA[Schema Validation]
  IDEMP[Idempotency Guard (write APIs)]
  POLICY["Data access policy: sensitive fields masked by default"]
  FSM["State machine guard: valid transitions only"]
  AUDIT["Audit log: who, when, action, resource"]
  RISK["Risk engine: fake enterprise and spam application detection"]
  RESP[Response with request_id]

  REQ --> AUTH --> RATE --> SCHEMA --> IDEMP --> POLICY --> FSM --> RESP
  POLICY --> AUDIT
  FSM --> AUDIT
  RATE --> RISK
  RISK --> AUDIT

  subgraph ContactUnlockGate["Contact Unlock Gate"]
    U1[Application state in Shortlisted/InterviewRequested]
    U2[Candidate authorization required]
    U3[Unlock granted with audit trace]
  end

  FSM --> U1 --> U2 --> U3
  U3 --> AUDIT
```
