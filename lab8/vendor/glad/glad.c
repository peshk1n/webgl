/* Auto-generated GLAD loader implementation for OpenGL 4.0 Core */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "glad.h"

/* ── Helper: get a function pointer by name ─────────────────────────────── */
static void glad_gl_get_proc(void *userptr, const char *name, GLADloadproc loadproc)
{
    (void)userptr;
    GLADloadproc proc = loadproc(name);
    if (proc) {
        memcpy(userptr, &proc, sizeof(proc));
    }
}

/* ── Helper: loads all GL function pointers ──────────────────────────────── */
static int glad_gl_load_functions(GLADloadproc load)
{
    if (!load) return 0;

    /* Basic */
    glad_glCullFace      = (PFNGLCULLFACEPROC)load("glCullFace");
    glad_glFrontFace     = (PFNGLFRONTFACEPROC)load("glFrontFace");
    glad_glLineWidth     = (PFNGLLINEWIDTHPROC)load("glLineWidth");
    glad_glPointSize     = (PFNGLPOINTSIZEPROC)load("glPointSize");
    glad_glPolygonMode   = (PFNGLPOLYGONMODEPROC)load("glPolygonMode");
    glad_glScissor       = (PFNGLSCISSORPROC)load("glScissor");
    glad_glViewport      = (PFNGLVIEWPORTPROC)load("glViewport");
    glad_glClear         = (PFNGLCLEARPROC)load("glClear");
    glad_glClearColor    = (PFNGLCLEARCOLORPROC)load("glClearColor");
    glad_glClearDepth    = (PFNGLCLEARDEPTHPROC)load("glClearDepth");
    glad_glDepthFunc     = (PFNGLDEPTHFUNCPROC)load("glDepthFunc");
    glad_glDepthMask     = (PFNGLDEPTHMASKPROC)load("glDepthMask");
    glad_glEnable        = (PFNGLENABLEPROC)load("glEnable");
    glad_glDisable       = (PFNGLDISABLEPROC)load("glDisable");
    glad_glFinish        = (PFNGLFINISHPROC)load("glFinish");
    glad_glFlush         = (PFNGLFLUSHPROC)load("glFlush");
    glad_glGetBooleanv   = (PFNGLGETBOOLEANVPROC)load("glGetBooleanv");
    glad_glGetDoublev    = (PFNGLGETDOUBLEVPROC)load("glGetDoublev");
    glad_glGetError      = (PFNGLGETERRORPROC)load("glGetError");
    glad_glGetFloatv     = (PFNGLGETFLOATVPROC)load("glGetFloatv");
    glad_glGetIntegerv   = (PFNGLGETINTEGERVPROC)load("glGetIntegerv");
    glad_glGetString     = (PFNGLGETSTRINGPROC)load("glGetString");

    /* Shaders */
    glad_glCreateShader           = (PFNGLCREATESHADERPROC)load("glCreateShader");
    glad_glShaderSource           = (PFNGLSHADERSOURCEPROC)load("glShaderSource");
    glad_glCompileShader          = (PFNGLCOMPILESHADERPROC)load("glCompileShader");
    glad_glGetShaderiv            = (PFNGLGETSHADERIVPROC)load("glGetShaderiv");
    glad_glGetShaderInfoLog       = (PFNGLGETSHADERINFOLOGPROC)load("glGetShaderInfoLog");
    glad_glDeleteShader           = (PFNGLDELETESHADERPROC)load("glDeleteShader");
    glad_glCreateProgram          = (PFNGLCREATEPROGRAMPROC)load("glCreateProgram");
    glad_glAttachShader           = (PFNGLATTACHSHADERPROC)load("glAttachShader");
    glad_glDetachShader           = (PFNGLDETACHSHADERPROC)load("glDetachShader");
    glad_glLinkProgram            = (PFNGLLINKPROGRAMPROC)load("glLinkProgram");
    glad_glUseProgram             = (PFNGLUSEPROGRAMPROC)load("glUseProgram");
    glad_glDeleteProgram          = (PFNGLDELETEPROGRAMPROC)load("glDeleteProgram");
    glad_glGetProgramiv           = (PFNGLGETPROGRAMIVPROC)load("glGetProgramiv");
    glad_glGetProgramInfoLog      = (PFNGLGETPROGRAMINFOLOGPROC)load("glGetProgramInfoLog");

    /* Uniforms */
    glad_glGetUniformLocation     = (PFNGLGETUNIFORMLOCATIONPROC)load("glGetUniformLocation");
    glad_glUniform1f              = (PFNGLUNIFORM1FPROC)load("glUniform1f");
    glad_glUniform2f              = (PFNGLUNIFORM2FPROC)load("glUniform2f");
    glad_glUniform3f              = (PFNGLUNIFORM3FPROC)load("glUniform3f");
    glad_glUniform4f              = (PFNGLUNIFORM4FPROC)load("glUniform4f");
    glad_glUniform1i              = (PFNGLUNIFORM1IPROC)load("glUniform1i");
    glad_glUniform1fv             = (PFNGLUNIFORM1FVPROC)load("glUniform1fv");
    glad_glUniform2fv             = (PFNGLUNIFORM2FVPROC)load("glUniform2fv");
    glad_glUniform3fv             = (PFNGLUNIFORM3FVPROC)load("glUniform3fv");
    glad_glUniform4fv             = (PFNGLUNIFORM4FVPROC)load("glUniform4fv");
    glad_glUniformMatrix4fv       = (PFNGLUNIFORMMATRIX4FVPROC)load("glUniformMatrix4fv");

    /* Attributes */
    glad_glGetAttribLocation      = (PFNGLGETATTRIBLOCATIONPROC)load("glGetAttribLocation");
    glad_glVertexAttribPointer    = (PFNGLVERTEXATTRIBPOINTERPROC)load("glVertexAttribPointer");
    glad_glEnableVertexAttribArray  = (PFNGLENABLEVERTEXATTRIBARRAYPROC)load("glEnableVertexAttribArray");
    glad_glDisableVertexAttribArray = (PFNGLDISABLEVERTEXATTRIBARRAYPROC)load("glDisableVertexAttribArray");

    /* VAOs + Buffers */
    glad_glGenVertexArrays        = (PFNGLGENVERTEXARRAYSPROC)load("glGenVertexArrays");
    glad_glDeleteVertexArrays     = (PFNGLDELETEVERTEXARRAYSPROC)load("glDeleteVertexArrays");
    glad_glBindVertexArray        = (PFNGLBINDVERTEXARRAYPROC)load("glBindVertexArray");
    glad_glGenBuffers             = (PFNGLGENBUFFERSPROC)load("glGenBuffers");
    glad_glDeleteBuffers          = (PFNGLDELETEBUFFERSPROC)load("glDeleteBuffers");
    glad_glBindBuffer             = (PFNGLBINDBUFFERPROC)load("glBindBuffer");
    glad_glBufferData             = (PFNGLBUFFERDATAPROC)load("glBufferData");

    /* Textures */
    glad_glGenTextures            = (PFNGLGENTEXTURESPROC)load("glGenTextures");
    glad_glDeleteTextures         = (PFNGLDELETETEXTURESPROC)load("glDeleteTextures");
    glad_glBindTexture            = (PFNGLBINDTEXTUREPROC)load("glBindTexture");
    glad_glTexImage2D             = (PFNGLTEXIMAGE2DPROC)load("glTexImage2D");
    glad_glTexParameteri          = (PFNGLTEXPARAMETERIPROC)load("glTexParameteri");
    glad_glGenerateMipmap         = (PFNGLGENERATEMIPMAPPROC)load("glGenerateMipmap");
    glad_glActiveTexture          = (PFNGLACTIVETEXTUREPROC)load("glActiveTexture");

    /* Tessellation */
    glad_glPatchParameteri        = (PFNGLPATCHPARAMETERIPROC)load("glPatchParameteri");

    /* Drawing */
    glad_glDrawArrays             = (PFNGLDRAWARRAYSPROC)load("glDrawArrays");
    glad_glDrawElements           = (PFNGLDRAWELEMENTSPROC)load("glDrawElements");

    /* Framebuffers */
    glad_glGenFramebuffers         = (PFNGLGENFRAMEBUFFERSPROC)load("glGenFramebuffers");
    glad_glDeleteFramebuffers      = (PFNGLDELETEFRAMEBUFFERSPROC)load("glDeleteFramebuffers");
    glad_glBindFramebuffer         = (PFNGLBINDFRAMEBUFFERPROC)load("glBindFramebuffer");
    glad_glFramebufferTexture2D    = (PFNGLFRAMEBUFFERTEXTURE2DPROC)load("glFramebufferTexture2D");
    glad_glFramebufferRenderbuffer = (PFNGLFRAMEBUFFERRENDERBUFFERPROC)load("glFramebufferRenderbuffer");
    glad_glCheckFramebufferStatus  = (PFNGLCHECKFRAMEBUFFERSTATUSPROC)load("glCheckFramebufferStatus");
    glad_glGenRenderbuffers        = (PFNGLGENRENDERBUFFERSPROC)load("glGenRenderbuffers");
    glad_glDeleteRenderbuffers     = (PFNGLDELETERENDERBUFFERSPROC)load("glDeleteRenderbuffers");
    glad_glBindRenderbuffer        = (PFNGLBINDRENDERBUFFERPROC)load("glBindRenderbuffer");
    glad_glRenderbufferStorage     = (PFNGLRENDERBUFFERSTORAGEPROC)load("glRenderbufferStorage");

    /* Debug (optional, 4.3+) */
    glad_glDebugMessageCallback    = (PFNGLDEBUGMESSAGECALLBACKPROC)load("glDebugMessageCallback");
    glad_glDebugMessageControl     = (PFNGLDEBUGMESSAGECONTROLPROC)load("glDebugMessageControl");

    return 1;
}

/* ── Extern function pointer definitions ────────────────────────────────── */

PFNGLCULLFACEPROC glad_glCullFace = NULL;
PFNGLFRONTFACEPROC glad_glFrontFace = NULL;
PFNGLLINEWIDTHPROC glad_glLineWidth = NULL;
PFNGLPOINTSIZEPROC glad_glPointSize = NULL;
PFNGLPOLYGONMODEPROC glad_glPolygonMode = NULL;
PFNGLSCISSORPROC glad_glScissor = NULL;
PFNGLVIEWPORTPROC glad_glViewport = NULL;
PFNGLCLEARPROC glad_glClear = NULL;
PFNGLCLEARCOLORPROC glad_glClearColor = NULL;
PFNGLCLEARDEPTHPROC glad_glClearDepth = NULL;
PFNGLDEPTHFUNCPROC glad_glDepthFunc = NULL;
PFNGLDEPTHMASKPROC glad_glDepthMask = NULL;
PFNGLENABLEPROC glad_glEnable = NULL;
PFNGLDISABLEPROC glad_glDisable = NULL;
PFNGLFINISHPROC glad_glFinish = NULL;
PFNGLFLUSHPROC glad_glFlush = NULL;
PFNGLGETBOOLEANVPROC glad_glGetBooleanv = NULL;
PFNGLGETDOUBLEVPROC glad_glGetDoublev = NULL;
PFNGLGETERRORPROC glad_glGetError = NULL;
PFNGLGETFLOATVPROC glad_glGetFloatv = NULL;
PFNGLGETINTEGERVPROC glad_glGetIntegerv = NULL;
PFNGLGETSTRINGPROC glad_glGetString = NULL;

PFNGLCREATESHADERPROC glad_glCreateShader = NULL;
PFNGLSHADERSOURCEPROC glad_glShaderSource = NULL;
PFNGLCOMPILESHADERPROC glad_glCompileShader = NULL;
PFNGLGETSHADERIVPROC glad_glGetShaderiv = NULL;
PFNGLGETSHADERINFOLOGPROC glad_glGetShaderInfoLog = NULL;
PFNGLDELETESHADERPROC glad_glDeleteShader = NULL;
PFNGLCREATEPROGRAMPROC glad_glCreateProgram = NULL;
PFNGLATTACHSHADERPROC glad_glAttachShader = NULL;
PFNGLDETACHSHADERPROC glad_glDetachShader = NULL;
PFNGLLINKPROGRAMPROC glad_glLinkProgram = NULL;
PFNGLUSEPROGRAMPROC glad_glUseProgram = NULL;
PFNGLDELETEPROGRAMPROC glad_glDeleteProgram = NULL;
PFNGLGETPROGRAMIVPROC glad_glGetProgramiv = NULL;
PFNGLGETPROGRAMINFOLOGPROC glad_glGetProgramInfoLog = NULL;

PFNGLGETUNIFORMLOCATIONPROC glad_glGetUniformLocation = NULL;
PFNGLUNIFORM1FPROC glad_glUniform1f = NULL;
PFNGLUNIFORM2FPROC glad_glUniform2f = NULL;
PFNGLUNIFORM3FPROC glad_glUniform3f = NULL;
PFNGLUNIFORM4FPROC glad_glUniform4f = NULL;
PFNGLUNIFORM1IPROC glad_glUniform1i = NULL;
PFNGLUNIFORM1FVPROC glad_glUniform1fv = NULL;
PFNGLUNIFORM2FVPROC glad_glUniform2fv = NULL;
PFNGLUNIFORM3FVPROC glad_glUniform3fv = NULL;
PFNGLUNIFORM4FVPROC glad_glUniform4fv = NULL;
PFNGLUNIFORMMATRIX4FVPROC glad_glUniformMatrix4fv = NULL;

PFNGLGETATTRIBLOCATIONPROC glad_glGetAttribLocation = NULL;
PFNGLVERTEXATTRIBPOINTERPROC glad_glVertexAttribPointer = NULL;
PFNGLENABLEVERTEXATTRIBARRAYPROC glad_glEnableVertexAttribArray = NULL;
PFNGLDISABLEVERTEXATTRIBARRAYPROC glad_glDisableVertexAttribArray = NULL;

PFNGLGENVERTEXARRAYSPROC glad_glGenVertexArrays = NULL;
PFNGLDELETEVERTEXARRAYSPROC glad_glDeleteVertexArrays = NULL;
PFNGLBINDVERTEXARRAYPROC glad_glBindVertexArray = NULL;
PFNGLGENBUFFERSPROC glad_glGenBuffers = NULL;
PFNGLDELETEBUFFERSPROC glad_glDeleteBuffers = NULL;
PFNGLBINDBUFFERPROC glad_glBindBuffer = NULL;
PFNGLBUFFERDATAPROC glad_glBufferData = NULL;

PFNGLGENTEXTURESPROC glad_glGenTextures = NULL;
PFNGLDELETETEXTURESPROC glad_glDeleteTextures = NULL;
PFNGLBINDTEXTUREPROC glad_glBindTexture = NULL;
PFNGLTEXIMAGE2DPROC glad_glTexImage2D = NULL;
PFNGLTEXPARAMETERIPROC glad_glTexParameteri = NULL;
PFNGLGENERATEMIPMAPPROC glad_glGenerateMipmap = NULL;
PFNGLACTIVETEXTUREPROC glad_glActiveTexture = NULL;

PFNGLPATCHPARAMETERIPROC glad_glPatchParameteri = NULL;

PFNGLDRAWARRAYSPROC glad_glDrawArrays = NULL;
PFNGLDRAWELEMENTSPROC glad_glDrawElements = NULL;

PFNGLGENFRAMEBUFFERSPROC glad_glGenFramebuffers = NULL;
PFNGLDELETEFRAMEBUFFERSPROC glad_glDeleteFramebuffers = NULL;
PFNGLBINDFRAMEBUFFERPROC glad_glBindFramebuffer = NULL;
PFNGLFRAMEBUFFERTEXTURE2DPROC glad_glFramebufferTexture2D = NULL;
PFNGLFRAMEBUFFERRENDERBUFFERPROC glad_glFramebufferRenderbuffer = NULL;
PFNGLCHECKFRAMEBUFFERSTATUSPROC glad_glCheckFramebufferStatus = NULL;
PFNGLGENRENDERBUFFERSPROC glad_glGenRenderbuffers = NULL;
PFNGLDELETERENDERBUFFERSPROC glad_glDeleteRenderbuffers = NULL;
PFNGLBINDRENDERBUFFERPROC glad_glBindRenderbuffer = NULL;
PFNGLRENDERBUFFERSTORAGEPROC glad_glRenderbufferStorage = NULL;

PFNGLDEBUGMESSAGECALLBACKPROC glad_glDebugMessageCallback = NULL;
PFNGLDEBUGMESSAGECONTROLPROC glad_glDebugMessageControl = NULL;

/* ── Public loader API ───────────────────────────────────────────────────── */

int gladLoadGL(void)
{
    return 0;  /* No built-in loader — use gladLoadGLLoader */
}

int gladLoadGLLoader(GLADloadproc load)
{
    if (!load) return 0;
    return glad_gl_load_functions(load);
}
