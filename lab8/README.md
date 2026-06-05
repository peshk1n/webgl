# Lab 8 — Terrain Tessellation with Adaptive LOD & Normals Visualization

**OpenGL 4.0+ | C++17 | GLFW | GLAD | GLM**

Single OpenGL application combining:
1. **Terrain tessellation** via tessellation shaders (TCS + TES)
2. **Adaptive LOD** — tessellation level varies with camera distance
3. **Normals visualization** — geometry shader overlays normal lines (toggle `N`)

---

## Controls

| Key | Action |
|-----|--------|
| `W` `A` `S` `D` | Move camera forward / left / back / right |
| `Q` / `E` | Move down / up |
| Mouse (hold left) | Look around |
| `N` | Toggle normals visualization |
| `R` | Toggle wireframe mode |
| `ESC` | Exit |

---

## Build

### Prerequisites

Choose **one** of the following:

#### Option A: MSYS2 MinGW-w64 (recommended for students)

1. Install [MSYS2](https://www.msys2.org/)
2. Open **MSYS2 UCRT64** terminal and run:
   ```bash
   pacman -Syu
   pacman -S mingw-w64-ucrt-x86_64-cmake
   pacman -S mingw-w64-ucrt-x86_64-gcc
   ```

#### Option B: Visual Studio + vcpkg

```powershell
git clone https://github.com/Microsoft/vcpkg.git
.\vcpkg\bootstrap-vcpkg.bat
.\vcpkg\vcpkg install glfw3
```

### Build Steps

```bash
cd lab8

# Configure (CMake downloads GLFW and GLM automatically via FetchContent)
cmake -B build

# Build
cmake --build build

# Run
./build/Lab8_TerrainTessellation.exe
```

If using vcpkg, add the toolchain file:
```bash
cmake -B build -DCMAKE_TOOLCHAIN_FILE=<vcpkg-root>/scripts/buildsystems/vcpkg.cmake
```

---

## Project Structure

```
lab8/
├── CMakeLists.txt              # Build system (auto-downloads GLFW, GLM)
├── main.cpp                    # GLFW window, main loop, input
├── src/
│   ├── camera.h / camera.cpp   # FPS camera (WASD + mouse look)
│   ├── shader.h / shader.cpp   # Shader loader (from files)
│   ├── terrain.h / terrain.cpp # 10×10 patch grid, procedural heightmap
│   └── renderer.h / renderer.cpp # Draw loop, shader pipelines, debug
├── vendor/glad/                # Bundled GLAD OpenGL 4.0 Core loader
│   ├── glad.h
│   ├── glad.c
│   └── khrplatform.h
└── resources/shaders/
    ├── terrain.vert             # Vertex shader (passthrough)
    ├── terrain.tesc             # Tessellation Control (adaptive LOD)
    ├── terrain.tese             # Tessellation Evaluation (displacement)
    ├── terrain.frag             # Fragment (Blinn-Phong + height coloring)
    ├── normals.vert             # Normals vertex shader
    ├── normals.tesc             # Normals TCS
    ├── normals.tese             # Normals TES
    ├── normals.geom             # Geometry shader (per-triangle normals)
    └── normals.frag             # Normals fragment (solid color)
```

---

## Architecture

```
┌──────────┐    ┌──────────┐    ┌───────────┐
│  Camera  │    │  Shader  │    │  Terrain  │
│ yaw/pitch│    │ vert/tesc│    │ 10×10     │
│ WASD move│    │ /tese/   │    │ patches   │
│ mouse look│   │ geom/frag│    │ heightmap │
└────┬─────┘    └────┬─────┘    └─────┬─────┘
     │               │               │
     └───────┬───────┴───────┬───────┘
             │               │
        ┌────┴──────┐  ┌─────┴──────┐
        │  main.cpp │  │ renderer   │
        │  GLFW     │  │ .h/.cpp    │
        │  loop     │  │ pipelines  │
        └───────────┘  └────────────┘
```

### Shader Pipeline

```
Terrain pass:
  [VS: passthrough] → [TCS: LOD calculation] → [TES: heightmap displacement]
  → [FS: Blinn-Phong lighting + height colors]

Normals pass (N key):
  [VS: passthrough] → [TCS: same LOD] → [TES: same displacement]
  → [GS: emit normal lines] → [FS: yellow/red]
```

### Adaptive LOD Formula

```
tessLevel = clamp(uMaxTessLevel / (1.0 + distance * uLODFactor), 1.0, uMaxTessLevel)
```

- Close to camera → high tessellation (dense triangles)
- Far from camera → low tessellation (coarse triangles)
- Smooth transition via `1.0 + distance * factor` denominator
- Uniform across all outer edges → no cracks between patches

### Heightmap

- 256×256 procedural noise (6-octave simplex)
- Generated at startup, uploaded as `GL_R32F` texture
- Sampled in TES for Y displacement
- Normals computed via finite differences on heightmap

---

## Verification Checklist

- [ ] `cmake -B build` configures without errors
- [ ] `cmake --build build` compiles successfully
- [ ] App launches — terrain visible with height displacement
- [ ] WASD moves camera, mouse looks around
- [ ] Moving close to terrain → tessellation increases
- [ ] Moving far away → tessellation decreases smoothly
- [ ] Press `N` → yellow/red normal lines appear at triangle centers
- [ ] Press `N` again → normals disappear
- [ ] Press `R` → wireframe mode
- [ ] No GL errors visible in console
