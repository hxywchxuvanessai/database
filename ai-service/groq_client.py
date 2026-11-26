
import os

from dotenv import load_dotenv
from groq import (
    Groq,
    RateLimitError,
    APIConnectionError,
    APITimeoutError,
    APIStatusError
)

# 載入環境變數
load_dotenv()

# Groq 設定
API_KEY = os.getenv("GROQ_API_KEY")
MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

if not API_KEY:
    raise RuntimeError("找不到 GROQ_API_KEY，請檢查 .env")

# 建立 Groq Client
client = Groq(
    api_key=API_KEY,
    timeout=60.0,
    max_retries=1
)


def ask_groq(question: str) -> str:
    """
    呼叫 Groq AI 進行職場法規分析
    """

    if not question or not question.strip():
        raise ValueError("分析內容不可為空")

    try:
        print("正在呼叫 Groq API...")
        print("使用模型：", MODEL)

        response = client.chat.completions.create(
            model=MODEL,

            messages=[
                {
                    "role": "system",
                    "content": (
                        "你是 WorkSafe AI，專業的台灣勞動法規"
                        "與職場權益分析助手。"
                        "請使用繁體中文，客觀、精確地回答。"
                        "不得編造法條、事實或裁罰金額。"
                        "不確定的資訊必須標示尚待查證。"
                    )
                },
                {
                    "role": "user",
                    "content": question
                }
            ],

            temperature=0.2,

            # 控制輸出長度，降低 Token 使用量
            max_completion_tokens=500
        )

        result = response.choices[0].message.content

        if not result:
            raise RuntimeError("Groq 沒有回傳文字內容")

        print("Groq 分析完成")

        return result.strip()

    except RateLimitError as exc:
        print("Groq API 超過使用限制：", str(exc))
        raise RuntimeError(
            "Groq API 使用量超過限制，請稍後再試或降低 Token 用量"
        ) from exc

    except APITimeoutError as exc:
        print("Groq API 連線逾時：", str(exc))
        raise RuntimeError("Groq API 連線逾時") from exc

    except APIConnectionError as exc:
        print("Groq API 連線失敗：", str(exc))
        raise RuntimeError("無法連接 Groq API") from exc

    except APIStatusError as exc:
        print("Groq API 狀態錯誤：", str(exc))
        raise RuntimeError(
            f"Groq API 錯誤，HTTP 狀態碼：{exc.status_code}"
        ) from exc


# 單獨執行本檔案時的測試
if __name__ == "__main__":

    print("===== WorkSafe AI Groq 測試 =====")
    print("模型：", MODEL)

    try:
        answer = ask_groq(
            "請用繁體中文簡要介紹勞動基準法的五項核心保障。"
        )

        print("\n===== Groq 連線成功 =====")
        print(answer)

    except Exception as error:
        print("\n===== Groq 測試失敗 =====")
        print(type(error).__name__)
        print(str(error))
