from pydantic import BaseModel

class PIIInput(BaseModel):
    pii_value: str
