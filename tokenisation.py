from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import hashlib, hmac, os, base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import pyffx  # Format-preserving encryption

app = FastAPI()

# Load your master secret securely (this is just for demo)
MASTER_KEY = b'supersecretmasterkey123'  # Must be 16/24/32 bytes
HMAC_SECRET = b'anothersecretkeyforhmac'

# === Input Model ===
class TokenizeRequest(BaseModel):
    pii_value: str
    org_id: str

# === Aadhaar: FPE-AES with org tweak ===
@app.post("/tokenize/aadhaar")
def tokenize_aadhaar(req: TokenizeRequest):
    if not req.pii_value.isdigit() or len(req.pii_value) != 12:
        raise HTTPException(status_code=400, detail="Invalid Aadhaar number")
    
    tweak = hashlib.sha256(req.org_id.encode()).digest()[:7]  # 56-bit tweak
    fpe = pyffx.Integer(MASTER_KEY, length=12, radix=10, tweak=tweak)
    token = str(fpe.encrypt(int(req.pii_value))).zfill(12)
    
    return {"field": "aadhaar", "token": token}

# === PAN: Masked Token ===
@app.post("/tokenize/pan")
def tokenize_pan(req: TokenizeRequest):
    pan = req.pii_value.upper()
    if len(pan) != 10 or not pan[:5].isalpha() or not pan[5:9].isdigit() or not pan[9].isalpha():
        raise HTTPException(status_code=400, detail="Invalid PAN format")
    
    hashed = hashlib.sha256((req.pii_value + req.org_id).encode()).digest()
    masked_token = f"{pan[:5]}{str(int.from_bytes(hashed[:2], 'big'))[:4]}{pan[9]}"
    return {"field": "pan", "token": masked_token}

# === Account Number: HMAC-based Deterministic Token ===
@app.post("/tokenize/account")
def tokenize_account(req: TokenizeRequest):
    if not req.pii_value.isdigit():
        raise HTTPException(status_code=400, detail="Invalid account number")
    
    h = hmac.new(HMAC_SECRET + req.org_id.encode(), req.pii_value.encode(), hashlib.sha256)
    token = base64.urlsafe_b64encode(h.digest())[:16].decode()
    return {"field": "account", "token": token}

# === Credit Card Number: BIN-preserving AES-GCM ===
@app.post("/tokenize/creditcard")
def tokenize_credit_card(req: TokenizeRequest):
    cc = req.pii_value.replace(" ", "")
    if not cc.isdigit() or len(cc) not in [15, 16]:
        raise HTTPException(status_code=400, detail="Invalid credit card number")
    
    bin_prefix = cc[:6]
    aesgcm = AESGCM(MASTER_KEY)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, cc[6:].encode(), req.org_id.encode())
    token = bin_prefix + base64.urlsafe_b64encode(ciphertext)[:10].decode()
    
    return {"field": "credit_card", "token": token}
