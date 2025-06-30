from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import pii_tokenizer, auth, policy, stockbroker, websocket

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
