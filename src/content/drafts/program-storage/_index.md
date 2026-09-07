<!-- ---
title: ""
publishDate: 2026-M-D
description: ""
tags: [ c-to-asm ]
--- -->

There are 4 things associated with a variable.

1. **Storage Location:** Where in the memory the variable would be stored?
   1. **Stack**: per-function (call frame) storage.
   2. **Static**: program-lifetime storage.
   3. **Heap**: dynamically allocated storage.

2. **Scope:** Where the variable can be accessed from?
   1. The block it is declared in?
   2. The translation unit (TU) it is present in?
   3. All the translation units that constitute the program?

3. **Lifetime:** How long the variable should exist (or be accessible)?
   1. Until the program execution is in the block the variable is declared in?
   2. Until the program executes? [IMPROVEMENT]

4. **Initial State:** What does the variable contains if it is not initialized?

These things are explained by storage classes. Every variable has a storage class. Sometimes it is visible, other times it is not.

The table below shows [WHATEVER].

| Storage Class | Scope (Accessibility) | Storage Location | Storage Duration | Linkage | Default Value (when uninitialized) |
| :------------ | :-------------------- | :--------------- | :--------------- | :------ | :--------------------------------- |
| auto     | Block scope | The storage is automatically chosen by the compiler. Usually stack, but it could be a register or completely optimized away by the compiler. | As long as the execution is in the block the variable is defined in. | None | [?] |
| register | | A register | | None | |
| static   | *Block scope* when declared within a block, *File scope* when declared globally in the file. | Typically `.data` (if initialized); `.bss` (if uninitialized, or zero-initialized) in ELF implementation. | For the entire execution of the program. | Internal | 0 |
| extern   | Program-wide accessibility | Typically `.data` (if initialized); `.bss` (if uninitialized, or zero-initialized) in ELF implementation. | For the entire execution of the program. | External | 0 |

---

Note that register is only a hint to the compiler. The compiler may still put the value in memory.

Below is a detailed description of .... [WHATEVER]

## Block Scope

All variables inside a pair of curly-braces are block scoped. Example: functions, if-else, loops, and unnamed blocks.

The default storage class for block scoped declarations is `auto`, which means automatic storage. Usually it is stack, but it could be kept in a register or completely optimized away by the compiler. As a result, the actual storage location depends on multiple things. In my observation, program complexity and optimization level are two factors that influence it.
  - Program complexity directly affects register pressure. A complicated program with multiple live values might force the compiler to use stack, as keeping values live in registers increase "register pressure".
  - If the program is simple enough, the compiler might use registers instead of stack at higher optimization levels (-O1 and beyond).

`auto` is implicit, which is why no one specifies it.

---

If `static` is used with a block scoped variable, its storage duration is increased to the program's lifetime, but its accessibility remains limited to the block it is defined in.

Therefore, variables declared in a block are accessible within that block only. Their lifetime, however, depends on the storage class. Once execution leaves the block, the lifetime of an ordinary automatic variable ends. Its identifier, however, was only ever accessible within the block because of its scope. While this is true, it is not the complete picture. We will explore that in a moment.

There is an interesting question. What happens to the physical bytes after the C object has ceased to exist? It is reasonable to expect that those values are discarded or thrown away in some way. To answer that question, we have to look at the generated assembly, which we will do in a moment.

## File Scope and Program Scope

A variable which is globally accessible within one translation unit is a file scoped declaration.

A variable which is globally available to all the translation units that constitute the program (the whole program, basically) is a program scoped (or, program-wide) declaration. Any translation unit that want to reference this variable has to use the `extern` keyword with the variable to tell the compiler that this variable is declared in a different TU.

Similar to `auto` in block scoped declarations, a variable declared outside of all the functions has the `extern` storage class which implies that the variable has program-wide accessibility. However, if we use `static`, the variable becomes file scoped.

In the example below, `pie1` has program-wide accessibility while `pie2` is limited to its translation unit.
```c
/* hello.c */
#include <stdio.h>

float pie1 = 3.14;
static float pie2 = 3.14;

int main(void);
```

*Please note that there is no "program scope" defined in the ISO/IEC standard. Why I use it will be made clear in the next section.*

## Assembly Context

There is no block scoped declaration in assembly. Either a symbol is available to the whole program, or the translation unit it is defined in. There is no block-level accessibility.

Block scoped declarations are a part of C only. The compiler enforces block scope accessibility. If we stop gcc/clang after compilation and check if stack is used to store a block scope variable and manipulate the assembly to access it outside its block while ensuring that the storage corresponding the variable still exist and has not been reused, the program is likely to succeed.

From the perspective of C, leaving the block ends the lifetime of an automatic object. From the perspective of the generated assembly, however, the stack storage containing its old value may still physically exist. In ordinary functions without dynamic stack allocation, the compiler often reserves the function's stack frame as a whole. This includes the storage needed by nested blocks as well. Also, the compiler normally doesn't emit a separate stack adjustment when a nested block ends.

---

After scope, we have linkage. **If I use one identifier across multiple translation units, do they refer to the same object, or different ones?** This is what linkage answers.

There are three types of linkage: external, internal, and none.
  - With external linkage, an identifier refers to the same object throughout the program (across all the TUs). A variable with `extern` storage class has external linkage (STB_GLOBAL).
  - Within one translation unit, each declaration of an identifier with internal linkage refers to the same object and it is visible within that TU only. A variable with `static` storage class has internal linkage (STB_LOCAL), doesn't matter where it is declared in the file.
  - The variables that go on stack have no linkage. [Why??]

The C standard doesn't define the term "program scope" or anything similar. It has file scope, block scope and function scope. The closest we can get is "external linkage".

Scope defines accessibility of a variable, while linkage defines the availability of a symbol. I am not sure if they are different.

# References

https://www.open-std.org/jtc1/sc22/wg14/www/docs/n3220.pdf
