from pydantic import BaseModel

class UserPayload(BaseModel):
    email: str
