cmake_minimum_required(VERSION 3.16)
project(Lab8_TerrainTessellation LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ═══════════════════════════════════════════════════════════════════════════════
# All dependencies via FetchContent — auto-download, no vcpkg/system deps needed.
# Only requirements: git + CMake + C++17 compiler (MSVC/MinGW/Clang).
#
# Build:
#   cmake -B build -A x64
#   cmake --build build --config Debug
# ═══════════════════════════════════════════════════════════════════════════════

include(FetchContent)

# ── GLFW 3.3 ─────────────────────────────────────────────────────────────────
FetchContent_Declare(
    glfw
    GIT_REPOSITORY https://github.com/glfw/glfw.git
    GIT_TAG        3.3.10
    GIT_SHALLOW    TRUE
)
set(GLFW_BUILD_DOCS OFF CACHE BOOL "" FORCE)
set(GLFW_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(GLFW_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(GLFW_INSTALL OFF CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(glfw)

# ── GLM (header-only math library) ────────────────────────────────────────────
FetchContent_Declare(
    glm
    GIT_REPOSITORY https://github.com/g-truc/glm.git
    GIT_TAG        1.0.1
    GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(glm)

# ── GLAD (OpenGL 4.0 Core loader) — bundled in vendor/glad/ ───────────────────
set(GLAD_DIR ${CMAKE_SOURCE_DIR}/vendor/glad)
if(NOT EXISTS ${GLAD_DIR}/glad.c)
    message(FATAL_ERROR "GLAD loader not found at ${GLAD_DIR}.")
endif()
add_library(glad_loader STATIC ${GLAD_DIR}/glad.c)
target_include_directories(glad_loader PUBLIC ${GLAD_DIR})

# ── OpenGL ────────────────────────────────────────────────────────────────────
find_package(OpenGL REQUIRED)

# Prevent GLM/FetchContent from pulling in ancient system GL headers
target_compile_definitions(glad_loader PUBLIC __gl_h_)
add_compile_definitions(GLM_FORCE_PURE)

# ═══════════════════════════════════════════════════════════════════════════════
# Executable
# ═══════════════════════════════════════════════════════════════════════════════

set(SOURCES
    main.cpp
    src/shader.cpp
    src/camera.cpp
    src/terrain.cpp
    src/renderer.cpp
)

add_executable(${PROJECT_NAME} ${SOURCES})

target_include_directories(${PROJECT_NAME} PRIVATE ${CMAKE_SOURCE_DIR}/src)

target_link_libraries(${PROJECT_NAME} PRIVATE
    OpenGL::GL
    glfw
    glm::glm
    glad_loader
)

# Copy shaders to the same directory as the executable
add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory
    ${CMAKE_SOURCE_DIR}/resources $<TARGET_FILE_DIR:${PROJECT_NAME}>/resources
    COMMENT "Copying shader resources to exe directory..."
)

if(WIN32)
    set_target_properties(${PROJECT_NAME} PROPERTIES WIN32_EXECUTABLE FALSE)
endif()
