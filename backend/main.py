from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import pii_tokenizer, auth, policy, stockbroker, websocket, organization, bank, insurance, data_requests, inter_org_contracts, audit, geolocation, file_sharing
from helpers import seed_organizations

app = FastAPI(title="Secure PII Tokenization API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pii_tokenizer.router)
app.include_router(auth.router)
app.include_router(policy.router)
app.include_router(stockbroker.router)
app.include_router(websocket.router)
app.include_router(organization.router)
app.include_router(bank.router)
app.include_router(insurance.router)
app.include_router(data_requests.router)
app.include_router(inter_org_contracts.router)
app.include_router(audit.router)
app.include_router(geolocation.router)
app.include_router(file_sharing.router)

@app.on_event("startup")
async def startup_event():
    """Seed organizations on startup"""
    seed_organizations()
    print("Organizations seeded successfully")
