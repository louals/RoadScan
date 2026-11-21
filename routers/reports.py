from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Report
from routers.auth import get_current_user
from models import User
from schemas import PublicReportResponse, ReportResponse

router = APIRouter(prefix="/api/v1", tags=["Reports"])

@router.get("/reports", response_model=List[PublicReportResponse])
def get_all_reports(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    safe_skip = max(0, skip)
    safe_limit = min(max(1, limit), 100)
    reports = (
        db.query(Report)
        .order_by(desc(Report.created_at), desc(Report.id))
        .offset(safe_skip)
        .limit(safe_limit)
        .all()
    )
    return reports

@router.get("/reports/{report_id}", response_model=PublicReportResponse)
def get_report_by_id(report_id: int, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/admin/reports", response_model=List[ReportResponse])
def get_admin_reports(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Administrator access required.")
    safe_skip = max(0, skip)
    safe_limit = min(max(1, limit), 250)
    return db.query(Report).order_by(desc(Report.created_at), desc(Report.id)).offset(safe_skip).limit(safe_limit).all()
