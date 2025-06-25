import hashlib
import uuid

def token_sha3(data: str) -> str:
    return hashlib.sha3_256(data.encode()).hexdigest()

def token_blake2(data: str) -> str:
    return hashlib.blake2b(data.encode(), digest_size=20).hexdigest()

def token_uuid5(data: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, data))

def token_permuted(data: str, seed: int = 7) -> str:
    return token_sha3("".join(reversed(data)) + str(seed))
