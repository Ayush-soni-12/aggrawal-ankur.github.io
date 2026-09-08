<!-- ---
title: ""
publishDate: 2026-M-D
description: ""
tags: [ c-to-asm ]
--- -->

There are 4 things associated with a C variable.

1. **Scope:** Where the identifier is available to be accessed?
   1. The block it is declared in?
   2. The translation unit (TU) it is present in?
   3. All the translation units that constitute the program?

2. **Storage Location:** Where in the memory the identifier will be given the storage?
   1. **Stack**: per-function storage, which is allocated/freed upon the creation/completion of a function.
   2. **Static**: static storage, where the duration is equal to the program's execution.
   3. **Heap**: storage allocated dynamically by a virtual memory allocator, like malloc in glibc.

3. **Storage Duration:** How long the identifier should exist?
   1. Until the program execution is in the block the identifier is declared in?
   2. Until the program executes?

4. **Initial State:** What is the initial value of the object if no explicit initializer is provided?

These things are explained by storage classes. Every identifier has a storage class, but not all identifiers have a storage class specifier in their declaration.

In my observation, I have noticed that storage class specifiers do more than defining the four aforementioned properties of an identifier. It is possible that I am missing something, in which case, I am open to better explanations to correct my mental model.

---

Below is a description of these storage class specifiers.

| Storage Class Specifier | Scope (Availability) | Storage Location | Storage Duration | Linkage | Value if no initializer is provided |
| :---------------------- | :------------------- | :--------------- | :--------------- | :------ | :---------------------------------- |
| `auto` | Block scope | Automatic storage. More on this later. | As long as the execution is in the block the variable is defined in. | None | Indeterminate |
| `register`  | [?] | A register | [?] | None | Indeterminate |
| `static` | *Block scope* when used with an identifier present in a block; *File scope* when used with an identifier present globally in the file. | Typically `.data` (if initialized), or `.bss` (if uninitialized, or zero-initialized) in ELF. | For the entire execution of the program. | *None* for block-static and *Internal* for file-static identifiers. | 0 |
| `extern` | Program-wide | Typically `.data` (if initialized), or `.bss` (if uninitialized, or zero-initialized) in ELF. | For the entire execution of the program. | External | 0 |

## Notes

1. `auto` is implicit, which is why no one specifies it. Therefore, `{auto int x = 45;}` and `{int x = 45;}` are the same things.
2. `register` is only a hint to the compiler. The compiler may still put the value in memory.
3. When the compiler does use a register when hinted with `register`, the address of that identifier can not be taken, meaning (&) can not be used with it.
4. The description of `extern` is not accurate because the situation of `extern` is quite complicated, so it is better discussed separately later.

---

The table is loaded with information, and to understand it, we need a starting point.

A bare minimum declaration contains an identifier and its type. We can deduce where it is declared in by seeing the surrounding code. A declaration doesn't advertize any of the properties by itself. Therefore, the location of the declaration is the right starting point.

## Block-level declaration

An identifier declared inside a pair of curly-braces has block scope. Example: functions, if-else, loops, and unnamed blocks.

The default storage class for block scoped declarations is `auto`, which means "automatic storage". Usually it is stack, but it could be a register or completely optimized away by the compiler. As a result, the actual storage location depends on multiple things. In my observation, I have found two factors influencing it. They are program complexity and optimization level.
  - Program complexity directly affects the register pressure. A complicated program with multiple live values might force the compiler to use stack, as keeping values live in registers increases "register pressure".
  - If the code is simple enough, the compiler might use registers instead of stack at higher optimization levels (-O1 and beyond).

The default behavior can be overridden with `static`. It increases the storage duration of the identifier, but its availability remains limited to the block it is defined in.

---

Therefore, identifiers declared in a block are available within that block only. Their lifetime, however, depends on their storage class. Once execution leaves the block, the lifetime of an ordinary automatic variable ends. This is true from the perspective of C. But to complete our understanding, we have to explore this from the perspective of assembly as well, which we will do in a moment.

It is reasonable to think that the storage associated with an automatic block scope identifier is discarded once execution leaves the block it is defined. This is not entirely true. To understand why, we have to understand the perspective of assembly, which we will do in a moment.

## File Scope and Program Scope

An identifier which is globally available within one translation unit is a file scoped declaration.

An identifier which is globally available to all the translation units that constitute the program (the whole program, basically) is a program scoped (or, program-wide) declaration.

By default, an identifier declared outside of all the functions is program scoped. To restrict it to the translation unit it is defined in, we can use the `static` specifier.

In the example below, `pie1` has program-wide availability, while `pie2` is limited to its translation unit.
```c
/* hello.c */
#include <stdio.h>

float pie1 = 3.14;
static float pie2 = 3.14;

int main(void);
```

**Please note that the ISO/IEC 9889 standard doesn't define "program scope". I am using it as an intuitive term to convey the underlying idea.**

---

We have not discussed `extern` here. We will do that soon.

## Assembly Context

Assembly doesn't have scopes the way C has. It has symbols and those symbols have a few properties including visibility and cross-file name resolution when the linker operates on object files generated from these assembly files. These are the properties that interest us.

Symbol visibility and cross-file name resolution belong to a concept called **linkage**.

**If I use one identifier across multiple translation units, do they refer to the same object, or different ones?** This is what linkage answers.

There are three types of linkage: external, internal, and none.
  - With external linkage, an identifier refers to the same object throughout the program (across all the TUs). An identifier with `extern` specifier has external linkage (STB_GLOBAL).
  - Within one translation unit, each declaration of an identifier with internal linkage refers to the same object and it is visible within that TU only. An identifier with `static` storage class has internal linkage (STB_LOCAL), doesn't matter where it is declared in the file.
  - Automatic variables have no linkage. **The why is unclear to me.** It maybe due to the fact that they cease to exist after the stack frame associated with them is released, so there is no point of assigning a linkage to them as they are transient given to the program's lifespan.

We can notice that either a symbol is available to the whole program, or the assembly file it is defined in. So, program-wide availability can be associated with external linkage and file-scope availability with internal linkage. But there is no such thing as "block scope symbol" in assembly.

If there is no block scope in assembly, how the compiler translates automatic storage and block-level availability of C objects? The simple answer is, when we use a toolchain like GCC or Clang, they control all the steps in the build process. They generate an assembly which conforms to the C language rules. Because the process is controlled end-to-end, there is no way an instruction is emitted that accesses a block scoped declaration outside of the intended code, unless the toolchain has a bug.

Does that mean I can stop gcc/clang after compilation, check if stack is used to store a block scoped variable and manipulate the assembly to access it outside its block while ensuring that the storage corresponding to the variable still exists and has not been reused?
  - Absolutely. If the conditions were right, the program is likely to execute the intended way.

*Therefore, block scope availability of C identifiers in assembly is enforced by the toolchain, or the programmer writing assembly manually, as we would not like our variables getting accessed/modified outside of their intended place in the program.*

---

From the perspective of C, it is reasonable to assume that leaving a block ends the lifetime of all the automatic objects in it. From the perspective of the generated assembly, however, the stack storage containing its old value may still physically exist, whether it remains unchanged or it is reused is a separate discussion.

In ordinary functions without dynamic stack allocation (VLA), the compiler often reserves the space required by every declaration in the function at once. This includes the storage needed by nested blocks as well.

The compiler normally doesn't emit a separate stack adjustment when a nested block ends. The compiler adjusts the stack once-for-all (release) when the function returns. **Please note that this is an observed behavior.**

Just like a programmer writing assembly manually ensures that symbols are used within the intended blocks of code, even when there is no such rule, the programmer can adjust the stack pointer to conceptually represent creation/termination of c-style blocks.

It is reasonable to ask why the compiler doesn't do what a programmer can do manually. **I don't have an answer here.** Maybe the engineers who build these compilers, or the researchers in this field can answer it better. However, we can notice that performance can be a decent contributor in this choice.
  - Adjusting the stack pointer may not be an expensive operation, but when done repeatedly may induce unintended effects on the performance.
  - To adjust rsp after each block, the compiler has to keep track of the total allocation size in every block.
  - Dynamic stack allocation, or VLAs, further complicates this.

## extern

**Note: I am not confident about this section. I expect corrections from people with more experience.**

I am not able to understand how should I perceive `extern`.

This is what the c-std says in point 5, on page 36, under section 6.2.2 Linkages of identifiers.
```
If the declaration of an identifier for an object has file scope and
does not contain the storage-class specifier static or constexpr, its 
linkage is external.
```

`{auto int x = 4;}` and `{int x = 4;}` are exactly the same things. However, x1 and x2 in the example below aren't.
```c
#include <stdio.h>

int x1;
extern int x2;

int main(void);
```
  - `x1` is an identifier that is globally available (external linkage) in all the TUs that constitute the final program.
  - `x2` is an identifier that is declared in a different TU. To use it in this TU, we have to sort of redeclare it with `extern` in this TU. The `extern` tells the compiler it is a symbol with external linkage defined somewhere, so don't create a new symbol.

The usage of `extern` doesn't match with `auto` or `static`. It is not implicitly available, unlike `auto`.

## Things I have not covered.

While reading the ISO/IEC 9889:2024 standard draft, I found that `constexpr` and `typedef` are storage class specifiers too. I am honestly surprised and a little confused.

There is another storage class, called `thread_local`. Since I don't understand threads and concurrency yet, I can not verify anything, and I don't have any plans to explore this subsystem.

I may update these in future.

## Open Questions

There are some questions I don't have a definitive answer for. For some questions, I have observations and hypothesis. For others, I have no starting point.

They might be unusual or strange, but I'd like to explore them in future.

1. Why the **ISO/IEC 9889** standard doesn't define a proper term like "program scope" to denote program-wide availability of a C object?
2. Why assembly doesn't have a true block scope? What were the challenges that made the engineers not build something similar?
3. Why the identifiers that are stored on stack have no linkage. This one sounds very obvious, but I am very confused about it.

# References

1. [ISO/IEC 9889:2024 Draft](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n3220.pdf)

2. [Storage-class specifiers on cppreference.com](https://en.cppreference.com/c/language/storage_duration)
