from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import get_settings
from app.database import engine, Base
from app.models import region, school, user, subject, grade, exam_paper, analysis_report
from app.routers import auth, schools, grades, analysis, papers

settings = get_settings()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="学习成绩分析系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(schools.router, prefix="/api/schools", tags=["学校管理"])
app.include_router(grades.router, prefix="/api/grades", tags=["成绩管理"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["成绩分析"])
app.include_router(papers.router, prefix="/api/papers", tags=["试卷管理"])


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
