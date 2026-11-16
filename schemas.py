from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    points: int
    level: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Report / Detection Schemas ---
class ReportBase(BaseModel):
    latitude: float
    longitude: float
    defect_type: str
    confidence_score: float
    detection_count: int
    description: Optional[str] = None

class ReportCreate(ReportBase):
    image_url: Optional[str] = None
    annotated_image_url: Optional[str] = None
    geom: Optional[str] = None
    status: str = "detected"
    detections_json: Optional[str] = None
    user_id: Optional[int] = None

class ReportResponse(ReportBase):
    id: int
    image_url: Optional[str] = None
    annotated_image_url: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    user_id: Optional[int] = None

    class Config:
        from_attributes = True