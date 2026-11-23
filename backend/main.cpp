#include <crow.h>
#include <libpq-fe.h>

#include <memory>
#include <string>
#include <vector>

int main() {
    crow::SimpleApp app;

    CROW_ROUTE(app, "/health")([] {
        crow::json::wvalue body;
        body["status"] = "ok";
        return body;
    });

    CROW_ROUTE(app, "/api/penalties")([](const crow::request& request) {
        const char* query = request.url_params.get("q");
        if (query == nullptr || *query == '\0') {
            crow::json::wvalue body;
            body["error"] = "請提供公司名稱關鍵字 q";
            return crow::response(400, body);
        }

        std::unique_ptr<PGconn, decltype(&PQfinish)> connection(
            PQconnectdb("dbname=employer_radar connect_timeout=5"), &PQfinish);

        if (!connection || PQstatus(connection.get()) != CONNECTION_OK) {
            crow::json::wvalue body;
            body["error"] = "無法連線到 PostgreSQL";
            return crow::response(503, body);
        }

        const char* sql = R"SQL(
            SELECT employer_name, decision_on, violated_law, fine_amount
            FROM public.penalties_raw
            WHERE strpos(employer_name, $1) > 0
            ORDER BY decision_on DESC NULLS LAST, decision_number
            LIMIT 20
        )SQL";

        const char* params[] = {query};
        std::unique_ptr<PGresult, decltype(&PQclear)> result(
            PQexecParams(connection.get(), sql, 1, nullptr, params,
                         nullptr, nullptr, 0),
            &PQclear);

        if (!result || PQresultStatus(result.get()) != PGRES_TUPLES_OK) {
            crow::json::wvalue body;
            body["error"] = "裁罰紀錄查詢失敗";
            return crow::response(500, body);
        }

        const char* fields[] = {
            "employer_name", "decision_on", "violated_law", "fine_amount"
        };
        std::vector<crow::json::wvalue> records;
        for (int row = 0; row < PQntuples(result.get()); ++row) {
            crow::json::wvalue record;
            for (int column = 0; column < 4; ++column) {
                if (PQgetisnull(result.get(), row, column)) {
                    record[fields[column]] = nullptr;
                } else {
                    record[fields[column]] =
                        std::string(PQgetvalue(result.get(), row, column));
                }
            }
            records.push_back(std::move(record));
        }

        crow::json::wvalue body;
        body["records"] = std::move(records);
        return crow::response(200, body);
    });

    app.bindaddr("127.0.0.1").port(8080).run();
}