# PedolOne: Privacy-First Data Vault & Sharing Platform

**Team NFSU**  
Contributors: Bhaskar Bhar, Aryan Sakaria, Deeksha Singh

---

## Executive Summary

PedolOne is a privacy-first data vaulting and controlled sharing platform tailored for fintech organizations. This README outlines the architecture, implemented features, security measures, compliance mechanisms, and future scope.

---

##  1. System Overview

### 1.1 Architecture
- **Backend**: FastAPI (Python) + MongoDB
- **Frontend**: ReactJS with WebSocket support
- **Authentication**: JWT-based + OTP verification
- **Database**: MongoDB with TTL-based expiration

### 1.2 Core Functionalities
- PII tokenization and encryption  
- Consent-based data sharing with OTP  
- Inter-org data contracts  
- Real-time monitoring and alerting  
- Audit logging and access control  

---

## 2. Data Protection & Privacy

### 2.1 Supported PII Types
Aadhaar, PAN, Bank Account, UPI, GST, IT Form 16, Passport, Driving License, IFSC, Credit/Debit Cards

### 2.2 Encryption & Tokenization
- AES-256 (Fernet), HMAC-SHA256, Format-Preserving Encryption
- BIN-preserving (future scope)

### 2.3 Consent Management
- OTP-based consent  
- Purpose-level granularity  
- Consent audit trails  
- Consent revocation (future scope)

---

##  3. Security & Monitoring

### 3.1 Authentication & Authorization
- Email OTP, SMS OTP (planned), JWTs  
- Role-based access & session cleanup  

### 3.2 Real-time Monitoring
- IP geolocation & alerting  
- Failed login, data request thresholds  
- Suspicious activity detection (future AI)

### 3.3 Data Integrity
- HMAC for data & file integrity  
- CSV signature checks

---

## 4. Audit & Compliance Logging

### 4.1 Audit Trail
Tracks user ID, actions, IP, location, timestamps, and data type

### 4.2 Geolocation Tracking
IP-based tracking with anonymization and user consent

### 4.3 Contract Audits
Logs contract IDs, action types, IP, geo-info, and timestamps

---

##  5. Policy Management

### 5.1 Policy Structure
Includes tokenized ID, resource type, purposes, retention, timestamps, signatures

### 5.2 Compliance Metrics
Live dashboards for:
- Consent
- Purpose specificity  
- Retention compliance  
- Security policy adoption  

---

## 6. Inter-Organization Data Sharing

### 6.1 Contract Management
- Bilateral contracts with defined PII, purpose, and duration  
- Audit-ready provisions

### 6.2 Data Request Flow
- Individual or bulk  
- OTP-based user consent  
- Policy generation and audit logging

---

## 7. Regulatory Compliance

### 7.1 GDPR
- Access, portability, lawful processing, minimization, encryption

### 7.2 Indian Regulations
- Aadhaar Act: Consent, purpose limitation, logging  
- RBI Guidelines: Localization, encryption, audit trails

---

##  8. Risk & Incident Management

### 8.1 Risk Assessment
Mitigates: breaches, consent violations, retention risks

### 8.2 Incident Response
Includes: detection, assessment, remediation, user & regulator notification

---

## 9. Technical Security

### 9.1 Network Security
- Secure HTTP headers (X-Content, X-Frame, XSS Protection, etc.)
- CORS restrictions & token-safe sessions

### 9.2 Application Security
- PII validation, input sanitization  
- Token expiration & secure logout

### 9.3 Database Security (Planned)
- TLS, access controls, encrypted backups  
- Audit logging for DB access

---

## 10. Recommendations

### 10.1 Immediate
- Add rate-limiting, fine-grained roles  
- Expand consent features  
- Draft privacy & incident response policies

### 10.2 Long-Term
- Zero-trust security  
- Automated compliance checks  
- Enhanced UX for privacy & transparency  

---

## 11. Conclusion

PedolOne is a robust, privacy-focused system implementing secure data vaulting, policy-based sharing, audit readiness, and strong compliance with GDPR and Indian regulations. Continuous improvements and risk assessments will ensure future regulatory adaptability.

---

## Summary of Implemented Compliance Features

| Category             | Status                  |
|----------------------|--------------------------|
| **Data Protection**  | Tokenization + Encryption |
| **Consent**          |  OTP + Per-type Consent   |
| **Audit Logging**    |  Full Action Logging      |
| **Monitoring**       |  Real-time Alerts         |
| **Policy Mgmt**      |  Auto Expiry + Signature  |
| **Inter-org Sharing**|  Contract-based           |
| **Geolocation**      |  IP-based Location Checks |
| **Incident Response**|  Automated Detection      |

---

## Tech Stack
- **Backend**: FastAPI, MongoDB  
- **Frontend**: ReactJS, WebSocket  
- **Security**: JWT, OTP, HMAC, AES  
- **Monitoring**: ip-api.com, custom alerts  

---

## Contact

For further information, reach out to:  
**Team NFSU** – Bhaskar Bhar, Aryan Sakaria, Deeksha Singh  
