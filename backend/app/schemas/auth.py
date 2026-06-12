from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.workspace import ProviderStatusItem


class UserCreate(BaseModel):
    phone: str = Field(min_length=6, max_length=32)
    password: str = Field(min_length=8, max_length=128)
    nickname: str | None = Field(default=None, max_length=80)
    role: str = Field(default="promoter", max_length=32)


class LoginRequest(BaseModel):
    phone: str = Field(min_length=6, max_length=32)
    password: str = Field(min_length=8, max_length=128)


class MobileLoginRequest(BaseModel):
    account: str = Field(min_length=1, max_length=32)
    password: str = Field(min_length=1, max_length=128)


class UserRead(BaseModel):
    id: int
    phone: str
    nickname: str | None
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class MobileLoginResponse(BaseModel):
    account: str
    key_profile: str
    provider_statuses: list[ProviderStatusItem]
