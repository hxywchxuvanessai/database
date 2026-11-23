cmake_minimum_required(VERSION 3.20)
project(employer_radar_api LANGUAGES CXX)

find_package(Crow CONFIG REQUIRED)
find_package(PostgreSQL REQUIRED)

add_executable(employer_radar_api main.cpp)
target_compile_features(employer_radar_api PRIVATE cxx_std_17)
target_link_libraries(employer_radar_api PRIVATE Crow::Crow PostgreSQL::PostgreSQL)