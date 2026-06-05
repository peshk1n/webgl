#ifndef __khrplatform_h_
#define __khrplatform_h_

/*
** Copyright (c) 2008-2018 The Khronos Group Inc.
**
** Permission is hereby granted, free of charge, to any person obtaining a
** copy of this software and/or associated documentation files (the
** "Materials"), to deal in the Materials without restriction, including
** without limitation the rights to use, copy, modify, merge, publish,
** distribute, sublicense, and/or sell copies of the Materials, and to
** permit persons to whom the Materials are furnished to do so, subject to
** the following conditions:
**
** The above copyright notice and this permission notice shall be included
** in all copies or substantial portions of the Materials.
**
** THE MATERIALS ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
** EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
** MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
** IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
** CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
** TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
** MATERIALS OR THE USE OR OTHER DEALINGS IN THE MATERIALS.
*/

/* Platform-specific types and definitions for OpenGL ES & EGL */

#include <stdint.h>

typedef int32_t                 khronos_int32_t;
typedef uint32_t                khronos_uint32_t;
typedef int64_t                 khronos_int64_t;
typedef uint64_t                khronos_uint64_t;
typedef float                   khronos_float_t;
typedef intptr_t                khronos_intptr_t;
typedef ptrdiff_t               khronos_ssize_t;

#define KHRONOS_SUPPORT_INT64   1
#define KHRONOS_SUPPORT_FLOAT   1

#if defined(_WIN32) && !defined(__SCITECH_SNAP__)
#   if !defined(KHRONOS_APIENTRY)
#       define KHRONOS_APIENTRY __stdcall
#   endif
#endif

#ifndef KHRONOS_APIENTRY
#   define KHRONOS_APIENTRY
#endif

#ifndef KHRONOS_APIENTRYP
#   define KHRONOS_APIENTRYP KHRONOS_APIENTRY *
#endif

#ifndef KHRONOS_APICALL
#   if defined(__GLIBC__)
#       define KHRONOS_APICALL __attribute__((visibility("default")))
#   else
#       define KHRONOS_APICALL
#   endif
#endif

#if (defined(__STDC_VERSION__) && __STDC_VERSION__ >= 199901L) || defined(__GNUC__) || defined(__SCO__) || defined(__USLC__)
#   define KHRONOS_INLINE inline
#elif (defined(_MSC_VER) && !defined(__STRICT_ANSI__) && _MSC_VER >= 1200)
#   define KHRONOS_INLINE __forceinline
#else
#   define KHRONOS_INLINE
#endif

#endif /* __khrplatform_h_ */
