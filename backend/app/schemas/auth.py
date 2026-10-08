from pydantic import BaseModel,field_validator

class LoginRequest(BaseModel):
    username:str
    password:str

    @field_validator("username","password")
    @classmethod
    def not_blank(cls,v:str)->str:
        if not v or not v.strip():
            raise ValueError("Field cannot be blank.")
        return v.strip()

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    
    