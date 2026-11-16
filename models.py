from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String)
    points = Column(Integer, default=0)
    level = Column(String)
    created_at = Column(DateTime(timezone=True))

    # Relationship to reports
    reports = relationship("Report", back_populates="user")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    image_url = Column(String)
    annotated_image_url = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    geom = Column(String)  # PostGIS geometry field representation
    status = Column(String)
    confidence_score = Column(Float)
    defect_type = Column(String)
    detection_count = Column(Integer)
    detections_json = Column(Text)
    description = Column(Text)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))

    # Relationship back to user
    user = relationship("User", back_populates="reports")