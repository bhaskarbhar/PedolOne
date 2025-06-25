from fastapi import FastAPI
from routers import pii_tokenizer

app = FastAPI(title="Secure PII Tokenization API", version="1.0.0")

app.include_router(pii_tokenizer.router)
