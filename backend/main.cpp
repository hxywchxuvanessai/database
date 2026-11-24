
#ifndef APP_STATIC_DIR
#define APP_STATIC_DIR "static/"
#endif

// Crow v1.3.4 使用編譯期設定靜態檔案目錄
#ifndef CROW_STATIC_DIRECTORY
#define CROW_STATIC_DIRECTORY APP_STATIC_DIR
#endif

#include <crow.h>
#include <libpq-fe.h>

#include <memory>
#include <string>
#include <vector>
#include <utility>

int main() {

    crow::SimpleApp app;

    // =====================================
    // 1. 地圖網頁入口
    // =====================================

    // Crow 會自動提供 /static/<path> 靜態檔案路由
    // 靜態檔案目錄由 CROW_STATIC_DIRECTORY 設定

    CROW_ROUTE(app, "/")([] {

        crow::response res(302);

        res.add_header("Location", "/static/index.html");

        return res;
    });


    // =====================================
    // 2. API 健康檢查
    // =====================================

    CROW_ROUTE(app, "/health")([] {

        crow::json::wvalue body;

        body["status"] = "ok";
        body["message"] = "Employer Radar API is running";

        return crow::response(200, body);
    });


    // =====================================
    // 3. 公司裁罰資料搜尋 API
    // =====================================

    CROW_ROUTE(app, "/api/penalties")
    ([](const crow::request& request) {

        // 取得搜尋關鍵字
        const char* keyword = request.url_params.get("q");

        if (keyword == nullptr || *keyword == '\0') {

            crow::json::wvalue body;

            body["error"] = "請提供公司名稱關鍵字 q";

            return crow::response(400, body);
        }

        std::string search_keyword(keyword);

        if (search_keyword.size() > 200) {

            crow::json::wvalue body;

            body["error"] = "搜尋字串過長";

            return crow::response(400, body);
        }


        // =====================================
        // 4. 連接 PostgreSQL
        // =====================================

        // 密碼從環境變數 PGPASSWORD 取得
        // 不將資料庫密碼寫入程式碼

        const char* keys[] = {

            "host",
            "port",
            "dbname",
            "user",
            "connect_timeout",
            nullptr

        };

        const char* values[] = {

            "127.0.0.1",
            "5432",
            "data",
            "postgres",
            "5",
            nullptr

        };

        std::unique_ptr<PGconn, decltype(&PQfinish)> connection(

            PQconnectdbParams(keys, values, 0),

            &PQfinish
        );


        if (!connection ||
            PQstatus(connection.get()) != CONNECTION_OK) {

            CROW_LOG_ERROR
                << "PostgreSQL connection failed: "
                << (connection
                    ? PQerrorMessage(connection.get())
                    : "out of memory");

            crow::json::wvalue body;

            body["error"] =
                "無法連線到 PostgreSQL，請確認資料庫服務、帳號及密碼";

            return crow::response(503, body);
        }


        // =====================================
        // 5. 查詢裁罰資料及營業登記地址
        // =====================================

        const char* sql = R"SQL(

            WITH matches AS (

                SELECT
                    employer_name,
                    decision_on,
                    decision_number,
                    violated_law,
                    fine_amount

                FROM public.penalties_raw

                WHERE strpos(
                    COALESCE(employer_name, ''),
                    $1
                ) > 0

                ORDER BY
                    decision_on DESC NULLS LAST,
                    decision_number

                LIMIT 20
            )

            SELECT

                p.employer_name,

                p.decision_on,

                p.violated_law,

                NULLIF(
                    BTRIM(p.fine_amount),
                    ''
                ) AS fine_amount,

                CASE
                    WHEN b.match_count = 1
                    THEN b.business_name
                END AS business_name,

                CASE
                    WHEN b.match_count = 1
                    THEN b.business_address
                END AS business_address,

                CASE
                    WHEN b.match_count = 1
                    THEN b.tax_id
                END AS tax_id,

                CASE
                    WHEN b.match_count = 1
                    THEN 'candidate'

                    WHEN b.match_count > 1
                    THEN 'ambiguous'

                    ELSE 'unmatched'
                END AS match_status

            FROM matches AS p

            LEFT JOIN LATERAL (

                SELECT

                    COUNT(*) AS match_count,

                    MAX(r.business_name) AS business_name,

                    MAX(
                        NULLIF(
                            BTRIM(r.business_address),
                            ''
                        )
                    ) AS business_address,

                    MAX(r.tax_id) AS tax_id

                FROM public.business_registrations AS r

                WHERE r.business_name = BTRIM(
                    regexp_replace(
                        BTRIM(p.employer_name),
                        '[(（][^()（）]*[)）]$',
                        ''
                    )
                )

            ) AS b ON TRUE

            ORDER BY
                p.decision_on DESC NULLS LAST,
                p.decision_number

        )SQL";


        // =====================================
        // 6. 執行 SQL 查詢
        // =====================================

        const char* params[] = {

            search_keyword.c_str()

        };

        std::unique_ptr<PGresult, decltype(&PQclear)> result(

            PQexecParams(
                connection.get(),
                sql,
                1,
                nullptr,
                params,
                nullptr,
                nullptr,
                0
            ),

            &PQclear
        );


        if (!result ||
            PQresultStatus(result.get()) != PGRES_TUPLES_OK) {

            CROW_LOG_ERROR
                << "Query failed: "
                << PQerrorMessage(connection.get());

            crow::json::wvalue body;

            body["error"] =
                "裁罰或營業登記資料查詢失敗，請檢查資料表及欄位";

            return crow::response(500, body);
        }


        // =====================================
        // 7. PostgreSQL 資料轉換成 JSON
        // =====================================

        const char* fields[] = {

            "employer_name",
            "decision_on",
            "violated_law",
            "fine_amount",
            "business_name",
            "business_address",
            "tax_id",
            "match_status"

        };

        std::vector<crow::json::wvalue> records;

        for (int row = 0;
             row < PQntuples(result.get());
             ++row) {

            crow::json::wvalue record;

            for (int column = 0;
                 column < 8;
                 ++column) {

                if (PQgetisnull(
                    result.get(),
                    row,
                    column
                )) {

                    record[fields[column]] = nullptr;

                } else {

                    record[fields[column]] =
                        std::string(
                            PQgetvalue(
                                result.get(),
                                row,
                                column
                            )
                        );
                }
            }

            records.push_back(std::move(record));
        }


        // =====================================
        // 8. 回傳搜尋結果
        // =====================================

        crow::json::wvalue body;

        body["count"] = static_cast<int>(records.size());

        body["records"] = std::move(records);

        return crow::response(200, body);

    });


    // =====================================
    // 9. 啟動伺服器
    // =====================================

    CROW_LOG_INFO << "Employer Radar API starting...";

    CROW_LOG_INFO << "Web: http://127.0.0.1:8080/";

    CROW_LOG_INFO << "Health: http://127.0.0.1:8080/health";

    app.bindaddr("127.0.0.1")
       .port(8080)
       .run();

}
