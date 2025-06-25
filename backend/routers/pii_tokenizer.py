from fastapi import APIRouter, HTTPException
from models import PIIInput
from helpers import token_sha3, token_blake2, token_uuid5, token_permuted
import re

router = APIRouter(prefix="/tokenize", tags=["Tokenization"])

@router.post("/aadhaar")
def tokenize_aadhaar(data: PIIInput):
    val = data.pii_value.strip()
    if not re.fullmatch(r'\d{12}', val):
        raise HTTPException(status_code=422, detail="Invalid Aadhaar Number")
    return {"token": token_blake2("aadhaar-" + val)}

@router.post("/pan")
def tokenize_pan(data: PIIInput):
    val = data.pii_value.strip().upper()
    if not re.fullmatch(r'[A-Z]{5}[0-9]{4}[A-Z]', val):
        raise HTTPException(status_code=422, detail="Invalid PAN Number")
    return {"token": token_sha3("pan|" + val)}

@router.post("/account")
def tokenize_account(data: PIIInput):
    val = data.pii_value.strip()
    if not re.fullmatch(r'\d{9,18}', val):
        raise HTTPException(status_code=422, detail="Invalid Bank Account Number")
    return {"token": token_permuted("account#" + val)}

@router.post("/ifsc")
def tokenize_ifsc(data: PIIInput):
    val = data.pii_value.strip().upper()
    if not re.fullmatch(r'^[A-Z]{4}0[A-Z0-9]{6}$', val):
        raise HTTPException(status_code=422, detail="Invalid IFSC Code")
    return {"token": token_uuid5("ifsc_" + val)}

@router.post("/creditcard")
def tokenize_creditcard(data: PIIInput):
    val = data.pii_value.strip().replace(" ", "")
    if not re.fullmatch(r'\d{16}', val):
        raise HTTPException(status_code=422, detail="Invalid Credit Card Number")
    return {"token": token_sha3("credit-" + val[::-1])}

@router.post("/debitcard")
def tokenize_debitcard(data: PIIInput):
    val = data.pii_value.strip().replace(" ", "")
    if not re.fullmatch(r'\d{16}', val):
        raise HTTPException(status_code=422, detail="Invalid Debit Card Number")
    return {"token": token_blake2("debit" + val)}

@router.post("/gst")
def tokenize_gst(data: PIIInput):
    val = data.pii_value.strip().upper()
    if not re.fullmatch(r'\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}', val):
        raise HTTPException(status_code=422, detail="Invalid GST Number")
    return {"token": token_sha3("gst*" + val)}

@router.post("/itform16")
def tokenize_itform16(data: PIIInput):
    val = data.pii_value.strip()
    return {"token": token_uuid5("it16:" + val)}

@router.post("/upi")
def tokenize_upi(data: PIIInput):
    val = data.pii_value.strip().lower()
    if '@' not in val or len(val.split("@")) != 2:
        raise HTTPException(status_code=422, detail="Invalid UPI ID")
    return {"token": token_blake2("upi|" + val)}

@router.post("/passport")
def tokenize_passport(data: PIIInput):
    val = data.pii_value.strip().upper()
    if not re.fullmatch(r'[A-Z][0-9]{7}', val):
        raise HTTPException(status_code=422, detail="Invalid Passport Number")
    return {"token": token_sha3("passport" + val[::-1])}

@router.post("/drivinglicense")
def tokenize_dl(data: PIIInput):
    val = data.pii_value.strip().upper()
    if not re.fullmatch(r'^[A-Z]{2}\d{13}$', val):
        raise HTTPException(status_code=422, detail="Invalid Driving License")
    return {"token": token_permuted(val + "#dl")}
