
import traceback

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from groq_client import ask_groq, MODEL
from prompts import build_workplace_analysis_prompt


app = FastAPI(
    title="WorkSafe AI Service",
    description="WorkSafe AI 職場風險分析服務",
    version="2.0.0"
)


# 接收手機 App 傳入的資料
class AnalysisRequest(BaseModel):
    company_name: str
    violation_info: str


# API 健康檢查
@app.get("/")
def home():
    return {
        "status": "success",
        "message": "WorkSafe AI Service is running",
        "ai_provider": "Groq",
        "model": MODEL
    }


# AI 職場風險分析
@app.post("/ai/analyze")
def analyze_workplace(request: AnalysisRequest):

    try:
        print("\n===== 開始 WorkSafe AI 分析 =====")
        print("AI Provider：Groq")
        print("使用模型：", MODEL)
        print("分析公司：", request.company_name)

        # 檢查輸入資料
        if not request.company_name.strip():
            raise HTTPException(
                status_code=400,
                detail="公司名稱不可為空"
            )

        if not request.violation_info.strip():
            raise HTTPException(
                status_code=400,
                detail="違規資訊不可為空"
            )

        # 建立 AI 分析指令
        prompt = build_workplace_analysis_prompt(
            request.company_name,
            request.violation_info
        )

        # 呼叫 Groq API
        result = ask_groq(prompt)

        print("Groq 分析完成")

        return {
            "status": "success",
            "company_name": request.company_name,
            "ai_provider": "Groq",
            "model": MODEL,
            "analysis": result
        }

    except HTTPException:
        raise

    except Exception as exc:

        print("\n===== Groq API 錯誤詳細資訊 =====")
        print("錯誤類型：", type(exc).__name__)
        print("錯誤內容：", str(exc))

        traceback.print_exc()

        print("===== 錯誤結束 =====")

        raise HTTPException(
            status_code=502,
            detail={
                "message": "Groq API 呼叫失敗",
                "error_type": type(exc).__name__
            }
        )
