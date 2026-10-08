from datetime import datetime
from pydantic import BaseModel,field_validator

class EndpointCreate(BaseModel):
    name:str
    secret:str


    @field_validator("name")
    @classmethod
    def name_not_blank(cls,v:str)->str:
        if not v.strip():
            raise ValueError("Name cannot be blank.")
        if len(v.strip())>100:
            raise ValueError("Endpoint name must be 100 characters or fewer")
        return v.strip()
    
    @field_validator("secret")
    @classmethod
    def secret_min_length(cls, v:str)->str:
        if len(v.strip()) < 8:
            raise ValueError("Secret must be at least 8 characters.")
        return v.strip()


class EndpointResponse(BaseModel):
    id:str
    name: str
    secret: str
    created_at: datetime
    model_config = {"from_attributes": True}