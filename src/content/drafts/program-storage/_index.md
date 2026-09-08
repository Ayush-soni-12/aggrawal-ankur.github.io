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

| Storage Class | Scope (Availability) | Storage Location | Storage Duration | Linkage | Value if no initializer is provided | Notes |
| :------------ | :------------------- | :--------------- | :--------------- | :------ | :---------------------------------- | :---- |
| auto     | Block scope | The storage is automatically chosen by the compiler. Usually stack, but it could be a register or completely optimized away by the compiler. | As long as the execution is in the block the variable is defined in. | None | [?] | Implicit, no need to mention. |
| register | | A register | | None | | It is only a hint to the compiler. The compiler may still put the value in memory; The address of such an identifier can not be taken (&). |
| static   | *Block scope* when used with an identifier present in a block; *File scope* when used with an identifier present globally in the file. | Typically `.data` (if initialized); `.bss` (if uninitialized, or zero-initialized) in ELF implementation. | For the entire execution of the program. | *None* for block-static and *Internal* for file static identifiers. | 0 |
| extern   | Program-wide | Typically `.data` (if initialized); `.bss` (if uninitialized, or zero-initialized) in ELF implementation. | For the entire execution of the program. | External | 0 | It is implicit when `static` is not used. However, it is used to indicate a declaration in TU1 is actually referencing a declaration in TU2. |

---

Below is a detailed description of .... [WHATEVER]

## Block Scope

All variables inside a pair of curly-braces are block scoped. Example: functions, if-else, loops, and unnamed blocks.

The default storage class for block scoped declarations is `auto`, which means automatic storage. Usually it is stack, but it could be kept in a register or completely optimized away by the compiler. As a result, the actual storage location depends on multiple things. In my observation, program complexity and optimization level are two factors that influence it.
  - Program complexity directly affects register pressure. A complicated program with multiple live values might force the compiler to use stack, as keeping values live in registers increase "register pressure".
  - If the program is simple enough, the compiler might use registers instead of stack at higher optimization levels (-O1 and beyond).

`auto` is implicit, which is why no one specifies it.

---

If `static` is used with a block scoped variable, its storage duration is increased to the program's lifetime, but its availability remains limited to the block it is defined in.

Therefore, variables declared in a block are available within that block only. Their lifetime, however, depends on the storage class. Once execution leaves the block, the lifetime of an ordinary automatic variable ends. This is true from the perspective of C. To complete out understanding, we have to explore this from the context of assembly as well, which we will do in a moment.

An automatic identifier becomes inaccessible outside of its block. What about its availability? What happens to the physical bytes? It is an interesting question. It is reasonable to expect that those values are discarded or thrown away in some way. To find the answer, we have to look at the generated assembly, which we will do in a moment.

## File Scope and Program Scope

A variable which is globally available within one translation unit is a file scoped declaration.

A variable which is globally available to all the translation units that constitute the program (the whole program, basically) is a program scoped (or, program-wide) declaration. Any translation unit that want to reference this variable has to use the `extern` keyword with the variable to tell the compiler that this variable is declared in a different TU. Otherwise, that variable will be limited by the clauses that defines it.

Similar to `auto` in block scoped declarations, a variable declared outside of all the functions has the `extern` storage class which implies that the variable has program-wide availability. However, if we use `static`, the variable becomes file scoped.

In the example below, `pie1` has program-wide availability, while `pie2` is limited to its translation unit.
```c
/* hello.c */
#include <stdio.h>

float pie1 = 3.14;
static float pie2 = 3.14;

int main(void);
```

*"Availability" is used here as an intuitive term for whether an identifier can be referred to from a particular part of the program. Similarly, "program scope" is not defined in the ISO/IEC standard. I am using these terms to explain the underlying idea.*

## Assembly Context

Assembly doesn't have scopes the way C has. It has symbols and it only talks about their visibility and cross-file name resolution when the linker operates on object files generated from these assembly files.

Symbol visibility and cross-file name resolution are resolved by a concept, called linkage. **If I use one identifier across multiple translation units, do they refer to the same object, or different ones?** This is what linkage answers.

There are three types of linkage: external, internal, and none.
  - With external linkage, an identifier refers to the same object throughout the program (across all the TUs). A variable with `extern` storage class has external linkage (STB_GLOBAL).
  - Within one translation unit, each declaration of an identifier with internal linkage refers to the same object and it is visible within that TU only. A variable with `static` storage class has internal linkage (STB_LOCAL), doesn't matter where it is declared in the file.
  - Automatic variables have no linkage. **The why is unclear to me.** It maybe due to the fact that they cease to exist after the frame associated to them is released, so there is no point of assigning a linkage to them as they are transient given to the program's life.

Therefore, there is no true block scoped declaration in assembly. Either a symbol is available to the whole program, or the assembly file it is defined in. So, program-wide availability can be associated with external linkage and file-scope availability with internal linkage.

Then how the compiler translates C's block scope availability to assembly?
  - When we use a toolchain like GCC or Clang, they control all the steps in the build process. They generate an assembly which conforms to the C language grammar.
  - Because the process is controlled end-to-end, there is no way a block scoped variable is accessed outside of the block, unless the toolchain has a bug.

Does that mean I can stop gcc/clang after compilation and check if stack is used to store a block scope variable and manipulate the assembly to access it outside its block while ensuring that the storage corresponding to the variable still exists and has not been reused? Absolutely. If the conditions were right, the program is likely to execute the intended way.

Therefore, block scope availability is enforced by the C language grammar, or the programmer writing assembly manually, as we would not like variables getting accessed/modified outside of their intended place in the program.

---

From the perspective of C, it is reasonable to assume that leaving a block ends the lifetime of all the automatic objects in it. From the perspective of the generated assembly, however, the stack storage containing its old value may still physically exist.

In ordinary functions without dynamic stack allocation (VLA), the compiler often reserves the space required by every declaration in the function at once. This includes the storage needed by nested blocks as well.

The compiler normally doesn't emit a separate stack adjustment when a nested block ends. The compiler adjusts the stack once-for-all (release) when the function returns.

*Please note that this is an observed behavior. Just like a programmer maintains block-level accessibility of symbols in assembly even when there is no such rule, the programmer can adjust the stack to represent the C perspective as well.*

It is reasonable to ask why the compiler doesn't do it. I don't claim to have an answer here. Maybe the engineers who make compilers, or the researchers in this field can answer it better. But performance can be a decent contributor in this choice.
  - Adjusting the stack pointer may not be an expensive operation, but when done repeatedly may induce unintended effects the performance.
  - To adjust rsp after each block, the compiler has to keep track of the total allocation size in every block.
  - Dynamic stack allocation, or VLAs, further complicates this.

---

There is another storage class, called `_Thread_local`. I have not covered it yet as I don't understand threads and concurrency yet, so I am not even attempting to learn it at this moment. I will update it in future.

## Open Questions

There are some questions I don't have a definitive answer for. For some questions, I have observations and hypothesis. For others, I have no starting point.

They might be unusual or strange, but I'd like to explore them in future.

1. Why the **ISO/IEC 9889** standard doesn't define a proper term like "program scope" to denote program-wide availability of a C object?
2. Why assembly doesn't have true block scope? What were the challenges that let the language engineers not build something similar?
3. The variables that go on stack have no linkage.

# References

https://www.open-std.org/jtc1/sc22/wg14/www/docs/n3220.pdf
https://en.cppreference.com/c/language/storage_duration