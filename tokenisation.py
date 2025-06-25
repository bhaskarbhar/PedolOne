from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import hashlib
import uuid
import re

app = FastAPI(title="Secure PII Tokenization API", version="1.0.0")

class PIIInput(BaseModel):
    pii_value: str

# 🔐 Tokenization Helpers

def token_sha3(data: str) -> str:
    return hashlib.sha3_256(data.encode()).hexdigest()

def token_blake2(data: str) -> str:
    return hashlib.blake2b(data.encode(), digest_size=20).hexdigest()

def token_uuid5(data: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, data))

def token_permuted(data: str, seed: int = 7) -> str:
    return token_sha3("".join(reversed(data)) + str(seed))

# 🧠 Tokenizers (all unique)

@app.post("/tokenize/aadhaar")
def tokenize_aadhaar(data: PIIInput):
    val = data.pii_value.strip()
    if not re.fullmatch(r'\d{12}', val):
        raise HTTPException(status_code=422, detail="Invalid Aadhaar Number")
    return {"token": token_blake2("aadhaar-" + val)}

@app.post("/tokenize/pan")
def tokenize_pan(data: PIIInput):
    val = data.pii_value.strip().upper()
    if not re.fullmatch(r'[A-Z]{5}[0-9]{4}[A-Z]', val):
        raise HTTPException(status_code=422, detail="Invalid PAN Number")
    return {"token": token_sha3("pan|" + val)}

@app.post("/tokenize/account")
def tokenize_account(data: PIIInput):
    val = data.pii_value.strip()
    if not re.fullmatch(r'\d{9,18}', val):
        raise HTTPException(status_code=422, detail="Invalid Bank Account Number")
    return {"token": token_permuted("account#" + val)}

@app.post("/tokenize/ifsc")
def tokenize_ifsc(data: PIIInput):
    val = data.pii_value.strip().upper()
    if not re.fullmatch(r'^[A-Z]{4}0[A-Z0-9]{6}$', val):
        raise HTTPException(status_code=422, detail="Invalid IFSC Code")
    return {"token": token_uuid5("ifsc_" + val)}

@app.post("/tokenize/creditcard")
def tokenize_creditcard(data: PIIInput):
    val = data.pii_value.strip().replace(" ", "")
    if not re.fullmatch(r'\d{16}', val):
        raise HTTPException(status_code=422, detail="Invalid Credit Card Number")
    return {"token": token_sha3("credit-" + val[::-1])}

@app.post("/tokenize/debitcard")
def tokenize_debitcard(data: PIIInput):
    val = data.pii_value.strip().replace(" ", "")
    if not re.fullmatch(r'\d{16}', val):
        raise HTTPException(status_code=422, detail="Invalid Debit Card Number")
    return {"token": token_blake2("debit" + val)}

@app.post("/tokenize/gst")
def tokenize_gst(data: PIIInput):
    val = data.pii_value.strip().upper()
    if not re.fullmatch(r'\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}', val):
        raise HTTPException(status_code=422, detail="Invalid GST Number")
    return {"token": token_sha3("gst*" + val)}

@app.post("/tokenize/itform16")
def tokenize_itform16(data: PIIInput):
    val = data.pii_value.strip()
    return {"token": token_uuid5("it16:" + val)}

@app.post("/tokenize/upi")
def tokenize_upi(data: PIIInput):
    val = data.pii_value.strip().lower()
    if '@' not in val or len(val.split("@")) != 2:
        raise HTTPException(status_code=422, detail="Invalid UPI ID")
    return {"token": token_blake2("upi|" + val)}

@app.post("/tokenize/passport")
def tokenize_passport(data: PIIInput):
    val = data.pii_value.strip().upper()
    if not re.fullmatch(r'[A-Z][0-9]{7}', val):
        raise HTTPException(status_code=422, detail="Invalid Indian Passport Number")
    return {"token": token_sha3("passport" + val[::-1])}

@app.post("/tokenize/drivinglicense")
def tokenize_dl(data: PIIInput):
    val = data.pii_value.strip().upper()
    if not re.fullmatch(r'^[A-Z]{2}\d{13}$', val):
        raise HTTPException(status_code=422, detail="Invalid Indian Driving License")
    return {"token": token_permuted(val + "#dl")}

# 🧪 Test with Swagger UI: http://127.0.0.1:8000/docs
