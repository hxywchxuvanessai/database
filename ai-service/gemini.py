
import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")

if not API_KEY:
    raise RuntimeError("找不到 GEMINI_API_KEY")

client = genai.Client(api_key=API_KEY)


def ask_gemini(question: str) -> str:
    response = client.models.generate_content(
        model=MODEL,
        contents=question
    )
    return response.text or "AI 沒有回傳文字"


if __name__ == "__main__":
    print("===== Gemini API 測試 =====")
    print("模型：", MODEL)
    print("開始呼叫 API...")

    try:
        answer = ask_gemini("請用繁體中文回答：你好，請介紹你自己。")
        print("\n===== 測試成功 =====")
        print(answer)

    except Exception as error:
        print("\n===== 測試失敗 =====")
        print("錯誤類型：", type(error).__name__)
        print("錯誤內容：", error)
