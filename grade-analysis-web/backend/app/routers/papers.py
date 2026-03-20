import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.config import get_settings
from app.models.user import User
from app.models.exam_paper import ExamPaper
from app.services.gemini_service import generate_paper_analysis
from app.models.analysis_report import AnalysisReport
from app.utils.auth import get_current_user
from app.utils.credits import check_and_consume

settings = get_settings()
router = APIRouter()

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024


@router.post("/upload")
def upload_paper(
    file: UploadFile = File(...),
    subject: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"不支持的文件类型，允许：{', '.join(ALLOWED_EXTENSIONS)}")

    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="文件大小不能超过 10MB")

    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as f:
        f.write(content)

    paper = ExamPaper(
        uploaded_by=current_user.id,
        file_path=file_path,
        file_name=file.filename,
        subject=subject,
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)
    return {"id": paper.id, "file_name": paper.file_name, "subject": paper.subject}


@router.get("")
def list_papers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    papers = db.query(ExamPaper).filter(
        ExamPaper.uploaded_by == current_user.id
    ).order_by(ExamPaper.upload_date.desc()).all()
    return [
        {
            "id": p.id,
            "file_name": p.file_name,
            "subject": p.subject,
            "upload_date": p.upload_date.isoformat() if p.upload_date else None,
        }
        for p in papers
    ]


@router.get("/{paper_id}/download")
def download_paper(paper_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    paper = db.query(ExamPaper).filter(ExamPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="试卷不存在")
    if paper.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权下载此试卷")
    if not os.path.exists(paper.file_path):
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(paper.file_path, filename=paper.file_name)


@router.post("/{paper_id}/analyze")
def analyze_paper(paper_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    paper = db.query(ExamPaper).filter(ExamPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="试卷不存在")
    if paper.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权分析此试卷")

    check_and_consume(db, current_user, "paper")

    try:
        with open(paper.file_path, "rb") as f:
            content = f.read()
        analysis = generate_paper_analysis(content, paper.subject or "综合")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"试卷分析失败: {str(e)}")

    report = AnalysisReport(
        user_id=current_user.id,
        report_type="paper_analysis",
        content=analysis,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return {"id": report.id, "content": report.content}
