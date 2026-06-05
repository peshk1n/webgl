/* Auto-generated GLAD loader for OpenGL 4.0 Core */

#ifndef __glad_h_
#define __glad_h_

/* Prevent system GL/gl.h (Microsoft 1996) from being included after glad —
   glad provides ALL OpenGL 4.0 types and function pointers. */
#ifndef __gl_h_
#define __gl_h_
#endif

#include "khrplatform.h"

/* ── Platform detection ─────────────────────────────────────────────────── */
#ifndef GLAD_APIENTRYP
#   define GLAD_APIENTRYP *
#endif

#ifndef GLAD_APIENTRY
#   define GLAD_APIENTRY
#endif

#ifndef GLAD_PLATFORM_H
#define GLAD_PLATFORM_H
#endif

/* ── OpenGL types ────────────────────────────────────────────────────────── */
#ifndef GLenum
typedef unsigned int    GLenum;
#endif
#ifndef GLboolean
typedef unsigned char   GLboolean;
#endif
#ifndef GLbitfield
typedef unsigned int    GLbitfield;
#endif
#ifndef GLvoid
typedef void            GLvoid;
#endif
#ifndef GLbyte
typedef signed char     GLbyte;
#endif
#ifndef GLshort
typedef short           GLshort;
#endif
#ifndef GLint
typedef int             GLint;
#endif
#ifndef GLsizei
typedef int             GLsizei;
#endif
#ifndef GLubyte
typedef unsigned char   GLubyte;
#endif
#ifndef GLushort
typedef unsigned short  GLushort;
#endif
#ifndef GLuint
typedef unsigned int    GLuint;
#endif
#ifndef GLfloat
typedef khronos_float_t  GLfloat;
#endif
#ifndef GLclampf
typedef khronos_float_t  GLclampf;
#endif
#ifndef GLdouble
typedef double           GLdouble;
#endif
#ifndef GLclampd
typedef double           GLclampd;
#endif
#ifndef GLchar
typedef char             GLchar;
#endif
#ifndef GLintptr
typedef khronos_intptr_t GLintptr;
#endif
#ifndef GLsizeiptr
typedef khronos_ssize_t  GLsizeiptr;
#endif
#ifndef GLintptrARB
typedef ptrdiff_t        GLintptrARB;
#endif
#ifndef GLsizeiptrARB
typedef ptrdiff_t        GLsizeiptrARB;
#endif
#ifndef GLhalfARB
typedef unsigned short   GLhalfARB;
typedef unsigned short   GLhalf;
#endif
#ifndef GLint64
typedef khronos_int64_t  GLint64;
#endif
#ifndef GLuint64
typedef khronos_uint64_t GLuint64;
#endif
#ifndef GLint64EXT
typedef khronos_int64_t  GLint64EXT;
typedef khronos_uint64_t GLuint64EXT;
#endif
#ifndef GLsync
typedef struct __GLsync *GLsync;
#endif
typedef void (GLAD_APIENTRY *GLDEBUGPROC)(GLenum source, GLenum type, GLuint id, GLenum severity, GLsizei length, const GLchar *message, const void *userParam);
typedef void (GLAD_APIENTRY *GLDEBUGPROCARB)(GLenum source, GLenum type, GLuint id, GLenum severity, GLsizei length, const GLchar *message, const void *userParam);
typedef void (GLAD_APIENTRY *GLDEBUGPROCKHR)(GLenum source, GLenum type, GLuint id, GLenum severity, GLsizei length, const GLchar *message, const void *userParam);

/* ── Constants ───────────────────────────────────────────────────────────── */
#define GL_NO_ERROR                         0
#define GL_FALSE                            0
#define GL_TRUE                             1
#define GL_ZERO                             0
#define GL_ONE                              1

#define GL_POINTS                           0x0000
#define GL_LINES                            0x0001
#define GL_LINE_LOOP                        0x0002
#define GL_LINE_STRIP                       0x0003
#define GL_TRIANGLES                        0x0004
#define GL_TRIANGLE_STRIP                   0x0005
#define GL_TRIANGLE_FAN                     0x0006
#define GL_QUADS                            0x0007

#define GL_DEPTH_BUFFER_BIT                 0x00000100
#define GL_STENCIL_BUFFER_BIT               0x00000400
#define GL_COLOR_BUFFER_BIT                 0x00004000

#define GL_FRONT                            0x0404
#define GL_BACK                             0x0405
#define GL_FRONT_AND_BACK                   0x0408

#define GL_FILL                             0x1B02
#define GL_LINE                             0x1B01

#define GL_PATCHES                          0x000E
#define GL_PATCH_VERTICES                   0x8E72

#define GL_TESS_CONTROL_SHADER              0x8E88
#define GL_TESS_EVALUATION_SHADER           0x8E87
#define GL_GEOMETRY_SHADER                  0x8DD9
#define GL_VERTEX_SHADER                    0x8B31
#define GL_FRAGMENT_SHADER                  0x8B30
#define GL_COMPUTE_SHADER                   0x91B9

#define GL_MAX_TESS_GEN_LEVEL               0x8E7A
#define GL_MAX_PATCH_VERTICES               0x8E7D
#define GL_MAX_TESS_CONTROL_UNIFORM_COMPONENTS 0x8E7F
#define GL_MAX_TESS_EVALUATION_UNIFORM_COMPONENTS 0x8E80

#define GL_COMPILE_STATUS                   0x8B81
#define GL_LINK_STATUS                      0x8B82
#define GL_INFO_LOG_LENGTH                  0x8B84

#define GL_FLOAT                            0x1406
#define GL_FLOAT_VEC2                       0x8B50
#define GL_FLOAT_VEC3                       0x8B51
#define GL_FLOAT_VEC4                       0x8B52
#define GL_FLOAT_MAT4                       0x8B5C

#define GL_UNSIGNED_SHORT                   0x1403
#define GL_UNSIGNED_INT                     0x1405
#define GL_INT                              0x1404

#define GL_ARRAY_BUFFER                     0x8892
#define GL_ELEMENT_ARRAY_BUFFER             0x8893
#define GL_STATIC_DRAW                      0x88E4
#define GL_DYNAMIC_DRAW                     0x88E8

#define GL_TEXTURE_2D                       0x0DE1
#define GL_TEXTURE0                         0x84C0
#define GL_TEXTURE_MIN_FILTER               0x2801
#define GL_TEXTURE_MAG_FILTER               0x2800
#define GL_TEXTURE_WRAP_S                   0x2802
#define GL_TEXTURE_WRAP_T                   0x2803
#define GL_CLAMP_TO_EDGE                    0x812F
#define GL_LINEAR                           0x2601
#define GL_NEAREST                          0x2600
#define GL_LINEAR_MIPMAP_LINEAR             0x2703
#define GL_RED                              0x1903
#define GL_RGBA                             0x1908
#define GL_R32F                             0x822E
#define GL_DEPTH_COMPONENT24                0x81A6
#define GL_DEPTH_ATTACHMENT                 0x8D00
#define GL_COLOR_ATTACHMENT0                0x8CE0
#define GL_FRAMEBUFFER                      0x8D40
#define GL_FRAMEBUFFER_COMPLETE             0x8CD5
#define GL_RENDERBUFFER                     0x8D41

#define GL_BLEND                            0x0BE2
#define GL_SRC_ALPHA                        0x0302
#define GL_ONE_MINUS_SRC_ALPHA              0x0303
#define GL_CULL_FACE                        0x0B44
#define GL_DEPTH_TEST                       0x0B71
#define GL_DEPTH_WRITEMASK                  0x0B72
#define GL_LEQUAL                           0x0203
#define GL_LESS                             0x0201

#define GL_DEBUG_OUTPUT                     0x92E0
#define GL_DEBUG_OUTPUT_SYNCHRONOUS         0x8242
#define GL_DEBUG_SOURCE_API                 0x8246
#define GL_DEBUG_SOURCE_WINDOW_SYSTEM       0x8247
#define GL_DEBUG_SOURCE_SHADER_COMPILER     0x8248
#define GL_DEBUG_SOURCE_THIRD_PARTY         0x8249
#define GL_DEBUG_SOURCE_APPLICATION         0x824A
#define GL_DEBUG_SOURCE_OTHER               0x824B
#define GL_DEBUG_TYPE_ERROR                 0x824C
#define GL_DEBUG_TYPE_DEPRECATED_BEHAVIOR   0x824D
#define GL_DEBUG_TYPE_UNDEFINED_BEHAVIOR    0x824E
#define GL_DEBUG_TYPE_PORTABILITY           0x824F
#define GL_DEBUG_TYPE_PERFORMANCE           0x8250
#define GL_DEBUG_TYPE_OTHER                 0x8251
#define GL_DEBUG_SEVERITY_HIGH              0x9146
#define GL_DEBUG_SEVERITY_MEDIUM            0x9147
#define GL_DEBUG_SEVERITY_LOW               0x9148
#define GL_DEBUG_SEVERITY_NOTIFICATION      0x826B
#define GL_DONT_CARE                        0x1100

#define GL_ACTIVE_UNIFORMS                  0x8B86
#define GL_DELETE_STATUS                    0x8B80
#define GL_VALIDATE_STATUS                  0x8B83
#define GL_ATTACHED_SHADERS                 0x8B85
#define GL_SHADING_LANGUAGE_VERSION         0x8B8C
#define GL_VERSION                          0x1F02
#define GL_RENDERER                         0x1F01
#define GL_VENDOR                           0x1F00

/* ── Function pointer types (OpenGL 4.0 Core, subset for clarity) ───────── */

/* All function declarations follow */
#define GLAD_GL_VERSION_4_0 1

/* ── OpenGL 4.0 Core function declarations ───────────────────────────────── */

/* Basic */
typedef void (GLAD_APIENTRYP PFNGLCULLFACEPROC)(GLenum mode);
typedef void (GLAD_APIENTRYP PFNGLFRONTFACEPROC)(GLenum mode);
typedef void (GLAD_APIENTRYP PFNGLHINTPROC)(GLenum target, GLenum mode);
typedef void (GLAD_APIENTRYP PFNGLLINEWIDTHPROC)(GLfloat width);
typedef void (GLAD_APIENTRYP PFNGLPOINTSIZEPROC)(GLfloat size);
typedef void (GLAD_APIENTRYP PFNGLPOLYGONMODEPROC)(GLenum face, GLenum mode);
typedef void (GLAD_APIENTRYP PFNGLSCISSORPROC)(GLint x, GLint y, GLsizei width, GLsizei height);
typedef void (GLAD_APIENTRYP PFNGLVIEWPORTPROC)(GLint x, GLint y, GLsizei width, GLsizei height);
typedef void (GLAD_APIENTRYP PFNGLCLEARPROC)(GLbitfield mask);
typedef void (GLAD_APIENTRYP PFNGLCLEARCOLORPROC)(GLfloat red, GLfloat green, GLfloat blue, GLfloat alpha);
typedef void (GLAD_APIENTRYP PFNGLCLEARDEPTHPROC)(GLdouble depth);
typedef void (GLAD_APIENTRYP PFNGLDEPTHFUNCPROC)(GLenum func);
typedef void (GLAD_APIENTRYP PFNGLDEPTHMASKPROC)(GLboolean flag);
typedef void (GLAD_APIENTRYP PFNGLENABLEPROC)(GLenum cap);
typedef void (GLAD_APIENTRYP PFNGLDISABLEPROC)(GLenum cap);
typedef void (GLAD_APIENTRYP PFNGLFINISHPROC)(void);
typedef void (GLAD_APIENTRYP PFNGLFLUSHPROC)(void);
typedef void (GLAD_APIENTRYP PFNGLGETBOOLEANVPROC)(GLenum pname, GLboolean *data);
typedef void (GLAD_APIENTRYP PFNGLGETDOUBLEVPROC)(GLenum pname, GLdouble *data);
typedef GLenum (GLAD_APIENTRYP PFNGLGETERRORPROC)(void);
typedef void (GLAD_APIENTRYP PFNGLGETFLOATVPROC)(GLenum pname, GLfloat *data);
typedef void (GLAD_APIENTRYP PFNGLGETINTEGERVPROC)(GLenum pname, GLint *data);
typedef const GLubyte *(GLAD_APIENTRYP PFNGLGETSTRINGPROC)(GLenum name);

/* Shaders */
typedef GLuint (GLAD_APIENTRYP PFNGLCREATESHADERPROC)(GLenum type);
typedef void (GLAD_APIENTRYP PFNGLSHADERSOURCEPROC)(GLuint shader, GLsizei count, const GLchar *const*string, const GLint *length);
typedef void (GLAD_APIENTRYP PFNGLCOMPILESHADERPROC)(GLuint shader);
typedef void (GLAD_APIENTRYP PFNGLGETSHADERIVPROC)(GLuint shader, GLenum pname, GLint *params);
typedef void (GLAD_APIENTRYP PFNGLGETSHADERINFOLOGPROC)(GLuint shader, GLsizei bufSize, GLsizei *length, GLchar *infoLog);
typedef void (GLAD_APIENTRYP PFNGLDELETESHADERPROC)(GLuint shader);
typedef GLuint (GLAD_APIENTRYP PFNGLCREATEPROGRAMPROC)(void);
typedef void (GLAD_APIENTRYP PFNGLATTACHSHADERPROC)(GLuint program, GLuint shader);
typedef void (GLAD_APIENTRYP PFNGLDETACHSHADERPROC)(GLuint program, GLuint shader);
typedef void (GLAD_APIENTRYP PFNGLLINKPROGRAMPROC)(GLuint program);
typedef void (GLAD_APIENTRYP PFNGLUSEPROGRAMPROC)(GLuint program);
typedef void (GLAD_APIENTRYP PFNGLDELETEPROGRAMPROC)(GLuint program);
typedef void (GLAD_APIENTRYP PFNGLGETPROGRAMIVPROC)(GLuint program, GLenum pname, GLint *params);
typedef void (GLAD_APIENTRYP PFNGLGETPROGRAMINFOLOGPROC)(GLuint program, GLsizei bufSize, GLsizei *length, GLchar *infoLog);

/* Uniforms */
typedef GLint (GLAD_APIENTRYP PFNGLGETUNIFORMLOCATIONPROC)(GLuint program, const GLchar *name);
typedef void (GLAD_APIENTRYP PFNGLUNIFORM1FPROC)(GLint location, GLfloat v0);
typedef void (GLAD_APIENTRYP PFNGLUNIFORM2FPROC)(GLint location, GLfloat v0, GLfloat v1);
typedef void (GLAD_APIENTRYP PFNGLUNIFORM3FPROC)(GLint location, GLfloat v0, GLfloat v1, GLfloat v2);
typedef void (GLAD_APIENTRYP PFNGLUNIFORM4FPROC)(GLint location, GLfloat v0, GLfloat v1, GLfloat v2, GLfloat v3);
typedef void (GLAD_APIENTRYP PFNGLUNIFORM1IPROC)(GLint location, GLint v0);
typedef void (GLAD_APIENTRYP PFNGLUNIFORM1FVPROC)(GLint location, GLsizei count, const GLfloat *value);
typedef void (GLAD_APIENTRYP PFNGLUNIFORM2FVPROC)(GLint location, GLsizei count, const GLfloat *value);
typedef void (GLAD_APIENTRYP PFNGLUNIFORM3FVPROC)(GLint location, GLsizei count, const GLfloat *value);
typedef void (GLAD_APIENTRYP PFNGLUNIFORM4FVPROC)(GLint location, GLsizei count, const GLfloat *value);
typedef void (GLAD_APIENTRYP PFNGLUNIFORMMATRIX4FVPROC)(GLint location, GLsizei count, GLboolean transpose, const GLfloat *value);

/* Attributes */
typedef GLint (GLAD_APIENTRYP PFNGLGETATTRIBLOCATIONPROC)(GLuint program, const GLchar *name);
typedef void (GLAD_APIENTRYP PFNGLVERTEXATTRIBPOINTERPROC)(GLuint index, GLint size, GLenum type, GLboolean normalized, GLsizei stride, const void *pointer);
typedef void (GLAD_APIENTRYP PFNGLENABLEVERTEXATTRIBARRAYPROC)(GLuint index);
typedef void (GLAD_APIENTRYP PFNGLDISABLEVERTEXATTRIBARRAYPROC)(GLuint index);

/* Buffers */
typedef void (GLAD_APIENTRYP PFNGLGENVERTEXARRAYSPROC)(GLsizei n, GLuint *arrays);
typedef void (GLAD_APIENTRYP PFNGLDELETEVERTEXARRAYSPROC)(GLsizei n, const GLuint *arrays);
typedef void (GLAD_APIENTRYP PFNGLBINDVERTEXARRAYPROC)(GLuint array);
typedef void (GLAD_APIENTRYP PFNGLGENBUFFERSPROC)(GLsizei n, GLuint *buffers);
typedef void (GLAD_APIENTRYP PFNGLDELETEBUFFERSPROC)(GLsizei n, const GLuint *buffers);
typedef void (GLAD_APIENTRYP PFNGLBINDBUFFERPROC)(GLenum target, GLuint buffer);
typedef void (GLAD_APIENTRYP PFNGLBUFFERDATAPROC)(GLenum target, GLsizeiptr size, const void *data, GLenum usage);

/* Textures */
typedef void (GLAD_APIENTRYP PFNGLGENTEXTURESPROC)(GLsizei n, GLuint *textures);
typedef void (GLAD_APIENTRYP PFNGLDELETETEXTURESPROC)(GLsizei n, const GLuint *textures);
typedef void (GLAD_APIENTRYP PFNGLBINDTEXTUREPROC)(GLenum target, GLuint texture);
typedef void (GLAD_APIENTRYP PFNGLTEXIMAGE2DPROC)(GLenum target, GLint level, GLint internalformat, GLsizei width, GLsizei height, GLint border, GLenum format, GLenum type, const void *pixels);
typedef void (GLAD_APIENTRYP PFNGLTEXPARAMETERIPROC)(GLenum target, GLenum pname, GLint param);
typedef void (GLAD_APIENTRYP PFNGLTEXPARAMETERFPROC)(GLenum target, GLenum pname, GLfloat param);
typedef void (GLAD_APIENTRYP PFNGLGENERATEMIPMAPPROC)(GLenum target);
typedef void (GLAD_APIENTRYP PFNGLACTIVETEXTUREPROC)(GLenum texture);

/* Tessellation */
typedef void (GLAD_APIENTRYP PFNGLPATCHPARAMETERIPROC)(GLenum pname, GLint value);

/* Drawing */
typedef void (GLAD_APIENTRYP PFNGLDRAWARRAYSPROC)(GLenum mode, GLint first, GLsizei count);
typedef void (GLAD_APIENTRYP PFNGLDRAWELEMENTSPROC)(GLenum mode, GLsizei count, GLenum type, const void *indices);

/* Framebuffers */
typedef void (GLAD_APIENTRYP PFNGLGENFRAMEBUFFERSPROC)(GLsizei n, GLuint *framebuffers);
typedef void (GLAD_APIENTRYP PFNGLDELETEFRAMEBUFFERSPROC)(GLsizei n, const GLuint *framebuffers);
typedef void (GLAD_APIENTRYP PFNGLBINDFRAMEBUFFERPROC)(GLenum target, GLuint framebuffer);
typedef void (GLAD_APIENTRYP PFNGLFRAMEBUFFERTEXTURE2DPROC)(GLenum target, GLenum attachment, GLenum textarget, GLuint texture, GLint level);
typedef void (GLAD_APIENTRYP PFNGLFRAMEBUFFERRENDERBUFFERPROC)(GLenum target, GLenum attachment, GLenum renderbuffertarget, GLuint renderbuffer);
typedef GLenum (GLAD_APIENTRYP PFNGLCHECKFRAMEBUFFERSTATUSPROC)(GLenum target);
typedef void (GLAD_APIENTRYP PFNGLGENRENDERBUFFERSPROC)(GLsizei n, GLuint *renderbuffers);
typedef void (GLAD_APIENTRYP PFNGLDELETERENDERBUFFERSPROC)(GLsizei n, const GLuint *renderbuffers);
typedef void (GLAD_APIENTRYP PFNGLBINDRENDERBUFFERPROC)(GLenum target, GLuint renderbuffer);
typedef void (GLAD_APIENTRYP PFNGLRENDERBUFFERSTORAGEPROC)(GLenum target, GLenum internalformat, GLsizei width, GLsizei height);

/* Debug */
typedef void (GLAD_APIENTRYP PFNGLDEBUGMESSAGECALLBACKPROC)(GLDEBUGPROC callback, const void *userParam);
typedef void (GLAD_APIENTRYP PFNGLDEBUGMESSAGECONTROLPROC)(GLenum source, GLenum type, GLenum severity, GLsizei count, const GLuint *ids, GLboolean enabled);

/* ── Extern function pointers ────────────────────────────────────────────── */
#ifdef __cplusplus
extern "C" {
#endif
extern PFNGLCULLFACEPROC glad_glCullFace;
#define glCullFace glad_glCullFace
extern PFNGLFRONTFACEPROC glad_glFrontFace;
#define glFrontFace glad_glFrontFace
extern PFNGLLINEWIDTHPROC glad_glLineWidth;
#define glLineWidth glad_glLineWidth
extern PFNGLPOINTSIZEPROC glad_glPointSize;
#define glPointSize glad_glPointSize
extern PFNGLPOLYGONMODEPROC glad_glPolygonMode;
#define glPolygonMode glad_glPolygonMode
extern PFNGLSCISSORPROC glad_glScissor;
#define glScissor glad_glScissor
extern PFNGLVIEWPORTPROC glad_glViewport;
#define glViewport glad_glViewport
extern PFNGLCLEARPROC glad_glClear;
#define glClear glad_glClear
extern PFNGLCLEARCOLORPROC glad_glClearColor;
#define glClearColor glad_glClearColor
extern PFNGLCLEARDEPTHPROC glad_glClearDepth;
#define glClearDepth glad_glClearDepth
extern PFNGLDEPTHFUNCPROC glad_glDepthFunc;
#define glDepthFunc glad_glDepthFunc
extern PFNGLDEPTHMASKPROC glad_glDepthMask;
#define glDepthMask glad_glDepthMask
extern PFNGLENABLEPROC glad_glEnable;
#define glEnable glad_glEnable
extern PFNGLDISABLEPROC glad_glDisable;
#define glDisable glad_glDisable
extern PFNGLFINISHPROC glad_glFinish;
#define glFinish glad_glFinish
extern PFNGLFLUSHPROC glad_glFlush;
#define glFlush glad_glFlush
extern PFNGLGETBOOLEANVPROC glad_glGetBooleanv;
#define glGetBooleanv glad_glGetBooleanv
extern PFNGLGETDOUBLEVPROC glad_glGetDoublev;
#define glGetDoublev glad_glGetDoublev
extern PFNGLGETERRORPROC glad_glGetError;
#define glGetError glad_glGetError
extern PFNGLGETFLOATVPROC glad_glGetFloatv;
#define glGetFloatv glad_glGetFloatv
extern PFNGLGETINTEGERVPROC glad_glGetIntegerv;
#define glGetIntegerv glad_glGetIntegerv
extern PFNGLGETSTRINGPROC glad_glGetString;
#define glGetString glad_glGetString

extern PFNGLCREATESHADERPROC glad_glCreateShader;
#define glCreateShader glad_glCreateShader
extern PFNGLSHADERSOURCEPROC glad_glShaderSource;
#define glShaderSource glad_glShaderSource
extern PFNGLCOMPILESHADERPROC glad_glCompileShader;
#define glCompileShader glad_glCompileShader
extern PFNGLGETSHADERIVPROC glad_glGetShaderiv;
#define glGetShaderiv glad_glGetShaderiv
extern PFNGLGETSHADERINFOLOGPROC glad_glGetShaderInfoLog;
#define glGetShaderInfoLog glad_glGetShaderInfoLog
extern PFNGLDELETESHADERPROC glad_glDeleteShader;
#define glDeleteShader glad_glDeleteShader
extern PFNGLCREATEPROGRAMPROC glad_glCreateProgram;
#define glCreateProgram glad_glCreateProgram
extern PFNGLATTACHSHADERPROC glad_glAttachShader;
#define glAttachShader glad_glAttachShader
extern PFNGLDETACHSHADERPROC glad_glDetachShader;
#define glDetachShader glad_glDetachShader
extern PFNGLLINKPROGRAMPROC glad_glLinkProgram;
#define glLinkProgram glad_glLinkProgram
extern PFNGLUSEPROGRAMPROC glad_glUseProgram;
#define glUseProgram glad_glUseProgram
extern PFNGLDELETEPROGRAMPROC glad_glDeleteProgram;
#define glDeleteProgram glad_glDeleteProgram
extern PFNGLGETPROGRAMIVPROC glad_glGetProgramiv;
#define glGetProgramiv glad_glGetProgramiv
extern PFNGLGETPROGRAMINFOLOGPROC glad_glGetProgramInfoLog;
#define glGetProgramInfoLog glad_glGetProgramInfoLog

extern PFNGLGETUNIFORMLOCATIONPROC glad_glGetUniformLocation;
#define glGetUniformLocation glad_glGetUniformLocation
extern PFNGLUNIFORM1FPROC glad_glUniform1f;
#define glUniform1f glad_glUniform1f
extern PFNGLUNIFORM2FPROC glad_glUniform2f;
#define glUniform2f glad_glUniform2f
extern PFNGLUNIFORM3FPROC glad_glUniform3f;
#define glUniform3f glad_glUniform3f
extern PFNGLUNIFORM4FPROC glad_glUniform4f;
#define glUniform4f glad_glUniform4f
extern PFNGLUNIFORM1IPROC glad_glUniform1i;
#define glUniform1i glad_glUniform1i
extern PFNGLUNIFORM1FVPROC glad_glUniform1fv;
#define glUniform1fv glad_glUniform1fv
extern PFNGLUNIFORM2FVPROC glad_glUniform2fv;
#define glUniform2fv glad_glUniform2fv
extern PFNGLUNIFORM3FVPROC glad_glUniform3fv;
#define glUniform3fv glad_glUniform3fv
extern PFNGLUNIFORM4FVPROC glad_glUniform4fv;
#define glUniform4fv glad_glUniform4fv
extern PFNGLUNIFORMMATRIX4FVPROC glad_glUniformMatrix4fv;
#define glUniformMatrix4fv glad_glUniformMatrix4fv

extern PFNGLGETATTRIBLOCATIONPROC glad_glGetAttribLocation;
#define glGetAttribLocation glad_glGetAttribLocation
extern PFNGLVERTEXATTRIBPOINTERPROC glad_glVertexAttribPointer;
#define glVertexAttribPointer glad_glVertexAttribPointer
extern PFNGLENABLEVERTEXATTRIBARRAYPROC glad_glEnableVertexAttribArray;
#define glEnableVertexAttribArray glad_glEnableVertexAttribArray
extern PFNGLDISABLEVERTEXATTRIBARRAYPROC glad_glDisableVertexAttribArray;
#define glDisableVertexAttribArray glad_glDisableVertexAttribArray

extern PFNGLGENVERTEXARRAYSPROC glad_glGenVertexArrays;
#define glGenVertexArrays glad_glGenVertexArrays
extern PFNGLDELETEVERTEXARRAYSPROC glad_glDeleteVertexArrays;
#define glDeleteVertexArrays glad_glDeleteVertexArrays
extern PFNGLBINDVERTEXARRAYPROC glad_glBindVertexArray;
#define glBindVertexArray glad_glBindVertexArray
extern PFNGLGENBUFFERSPROC glad_glGenBuffers;
#define glGenBuffers glad_glGenBuffers
extern PFNGLDELETEBUFFERSPROC glad_glDeleteBuffers;
#define glDeleteBuffers glad_glDeleteBuffers
extern PFNGLBINDBUFFERPROC glad_glBindBuffer;
#define glBindBuffer glad_glBindBuffer
extern PFNGLBUFFERDATAPROC glad_glBufferData;
#define glBufferData glad_glBufferData

extern PFNGLGENTEXTURESPROC glad_glGenTextures;
#define glGenTextures glad_glGenTextures
extern PFNGLDELETETEXTURESPROC glad_glDeleteTextures;
#define glDeleteTextures glad_glDeleteTextures
extern PFNGLBINDTEXTUREPROC glad_glBindTexture;
#define glBindTexture glad_glBindTexture
extern PFNGLTEXIMAGE2DPROC glad_glTexImage2D;
#define glTexImage2D glad_glTexImage2D
extern PFNGLTEXPARAMETERIPROC glad_glTexParameteri;
#define glTexParameteri glad_glTexParameteri
extern PFNGLGENERATEMIPMAPPROC glad_glGenerateMipmap;
#define glGenerateMipmap glad_glGenerateMipmap
extern PFNGLACTIVETEXTUREPROC glad_glActiveTexture;
#define glActiveTexture glad_glActiveTexture

extern PFNGLPATCHPARAMETERIPROC glad_glPatchParameteri;
#define glPatchParameteri glad_glPatchParameteri

extern PFNGLDRAWARRAYSPROC glad_glDrawArrays;
#define glDrawArrays glad_glDrawArrays
extern PFNGLDRAWELEMENTSPROC glad_glDrawElements;
#define glDrawElements glad_glDrawElements

extern PFNGLGENFRAMEBUFFERSPROC glad_glGenFramebuffers;
#define glGenFramebuffers glad_glGenFramebuffers
extern PFNGLDELETEFRAMEBUFFERSPROC glad_glDeleteFramebuffers;
#define glDeleteFramebuffers glad_glDeleteFramebuffers
extern PFNGLBINDFRAMEBUFFERPROC glad_glBindFramebuffer;
#define glBindFramebuffer glad_glBindFramebuffer
extern PFNGLFRAMEBUFFERTEXTURE2DPROC glad_glFramebufferTexture2D;
#define glFramebufferTexture2D glad_glFramebufferTexture2D
extern PFNGLFRAMEBUFFERRENDERBUFFERPROC glad_glFramebufferRenderbuffer;
#define glFramebufferRenderbuffer glad_glFramebufferRenderbuffer
extern PFNGLCHECKFRAMEBUFFERSTATUSPROC glad_glCheckFramebufferStatus;
#define glCheckFramebufferStatus glad_glCheckFramebufferStatus
extern PFNGLGENRENDERBUFFERSPROC glad_glGenRenderbuffers;
#define glGenRenderbuffers glad_glGenRenderbuffers
extern PFNGLDELETERENDERBUFFERSPROC glad_glDeleteRenderbuffers;
#define glDeleteRenderbuffers glad_glDeleteRenderbuffers
extern PFNGLBINDRENDERBUFFERPROC glad_glBindRenderbuffer;
#define glBindRenderbuffer glad_glBindRenderbuffer
extern PFNGLRENDERBUFFERSTORAGEPROC glad_glRenderbufferStorage;
#define glRenderbufferStorage glad_glRenderbufferStorage

extern PFNGLDEBUGMESSAGECALLBACKPROC glad_glDebugMessageCallback;
#define glDebugMessageCallback glad_glDebugMessageCallback
extern PFNGLDEBUGMESSAGECONTROLPROC glad_glDebugMessageControl;
#define glDebugMessageControl glad_glDebugMessageControl

#ifdef __cplusplus
}
#endif

/* ── Loader API ──────────────────────────────────────────────────────────── */
#ifdef __cplusplus
extern "C" {
#endif

/* gladLoadGL — no-arg loader (uses glXGetProcAddress / wglGetProcAddress internally) */
int gladLoadGL(void);

/* gladLoadGLLoader — loader given a GLADloadproc function (e.g., glfwGetProcAddress) */
typedef void* (GLAD_APIENTRYP GLADloadproc)(const char *name);
int gladLoadGLLoader(GLADloadproc load);

#ifdef __cplusplus
}
#endif

#endif /* __glad_h_ */
