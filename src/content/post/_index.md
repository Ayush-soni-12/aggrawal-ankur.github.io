---
title: "Title"
publishDate: 2026-09-09
description: "Description"
tags: [ c-to-asm ]
---

## Note for the readers

***This writing uses intuitive definitions to understand this topic. Some terminology may not be formally specified by the official C standard, in which case, it is clearly mentioned.***

***This writing is based on the ISO/IEC 9889:2024 (C23) draft.***

***This is a complex topic with edge cases. If you think that a fact is inaccurately represented, or the writing doesn't uphold the standards it is claiming, the author warmly welcomes all the suggestions and corrections. The communication can be done via Email, LinkedIn, or GitHub Discussions.***

---

There are 4 things associated with a C variable.

1. **Scope:** *Where is the identifier available to be accessed?*
   1. The block it is declared in?
   2. The translation unit (TU) it is present in?
   3. All the translation units that constitute the program?

2. **Storage Location:** *Where in the memory the identifier will be given the storage?*
   1. **Stack**: It is a per-function storage, allocated/freed upon the creation/completion of a function.
   2. **Static Storage**: It's a storage with a duration equal to the program's execution.

3. **Storage Duration:** *How long the storage associated with an identifier should exist in memory?*
   1. Until the program execution is in the block the identifier is declared in?
   2. Until the program executes?
   3. Should it correspond one-to-one with the scope, or be an independent property?

4. **Initial State:** *What is the initial value of the object if no initializer is provided?*

These things are explained by storage classes. Every identifier has a storage class, but not all identifiers have a storage class specifier in their declaration.

In my observation, I have noticed that storage class specifiers do more than defining the four aforementioned properties of an identifier. It is possible that I am missing something, in which case, I am open to better explanations to correct my mental model.

---

Below is a description of these storage class specifiers.

| Storage Class Specifier | Scope (Availability) | Storage Location | Storage Duration | Linkage | Value if no initializer is provided |
| :---------------------- | :------------------- | :--------------- | :--------------- | :------ | :---------------------------------- |
| `auto` | Block scope | Automatic storage. More on this later. | As long as the execution is in the block the variable is defined in. | None | Indeterminate |
| `register`  | Block Scope | A register | Automatic | None | Indeterminate |
| `static` | *Block scope* when used with an identifier present in a block; *File scope* when used with an identifier present globally in the file. | Static storage, typically `.data` (if initialized), or `.bss` (if uninitialized, or zero-initialized) in ELF. | For the entire execution of the program. | *None* for block-static and *Internal* for file-static identifiers. | 0 |
| `extern` | N/A | Static storage, typically `.data` (if initialized), or `.bss` (if uninitialized, or zero-initialized) in ELF. | For the entire execution of the program. | External | N/A |

## Notes

> 1. `register` is only a hint to the compiler. The compiler may still put the value in memory. Also, we can not use the "address of" operator (&) on such a declaration, as the object may or may not exist at a memory location.
> 
> 2. `extern` is slightly different from the rest of the specifiers. It is explored later.


The table is loaded with information. To understand it, we need a starting point.

A bare minimum declaration contains an identifier and its type. We can deduce where it is declared in by noticing the surrounding code. It doesn't advertise the aforementioned properties. Therefore, the location of the declaration is the right starting point.

## Block-level declaration

An identifier declared inside a pair of curly-braces (functions, if-else, loops, and unnamed blocks, among others) has block scope.

The default storage class for block-scoped declarations is `auto`, which stands for "automatic storage". Usually it is stack, but it could be a register or completely optimized away by the compiler. The actual storage location depends on multiple things. In my observation, I have found two factors influencing it. They are **program complexity** and **optimization level**.
  - Program complexity directly affects the register pressure. A complicated program with multiple live values might force the compiler to use stack, as keeping values live in registers increases "register pressure".
  - If the code is simple enough, the compiler might use registers instead of stack at higher optimization levels (-O1 and beyond).

`auto` is implicit, which is why no one specifies it. So, `{auto int x = 45;}` and `{int x = 45;}` are identical.

The default behavior can be overridden with `static`. It increases the storage duration of the object, but the availability of its identifier remains limited to the block it is defined in.

---

Therefore, identifiers declared in a block are available only within it. Their storage duration, however, depends on their storage class.

It is reasonable to think that the storage associated with an automatic block-scoped object is discarded once execution leaves the block. It is not wrong, but it is incomplete. We will explore it from assembly's point of view to complete it.

## File Scope

An identifier declared outside of all the functions is a file-scoped declaration. For example, both `pi_1` and `pi_2` are file-scoped declarations here.
```c
/* math1.c */
#include <stdio.h>

float pi_1 = 3.14;
static float pi_2 = 3.14;

int main(void);
```

As named, a file-scoped declaration is available within its translation unit only. However, it can be made globally available as well.

---

In the example above, `pi_1` is globally available and `pi_2` is local to its translation unit. Before going into the details, take this scenario.
  - We have a file named `math2.c`. It wants to use `pi_1` declared in `math1.c`.
  - How should `math2.c` communicate to the toolchain (gcc/clang) that it wants to use a variable defined in a different TU? The answer is `extern`.

This is how `math2.c` will convey the toolchain.
```c
/* math2.c */
#include <stdio.h>

extern float pi_1;

int main(void){
  printf("%f\n", pi_1);
}
```
  - The `extern` specifier tells the toolchain that this object is defined in a different translation unit.

If you notice, a block-scoped object is available and accessible within its block; a file-static object is available and accessible within the TU. *While an object with external linkage is available across all the TUs, it is not accessible by default.*

Apart from this, extern has another use case. Take this example:
```c
#include <stdio.h>

int num = 10;

int main(void){
  int num = 20;
  printf("%d\n", num);
}
```
  - The answer is 20.

What if I want to access the file-scoped one? Just remove the local one. But we can do one more thing.
```c
#include <stdio.h>

int num = 10;

int main(void){
  extern int num;
  printf("%d\n", num);
}
```

That's why the `extern` storage class specifier feels slightly awkward. It is not similar to other storage classes.

---

It's time to explore the perspective of assembly. It is necessary as C is converted to assembly and both languages have different models to express the same intent. Exploring assembly will complete our mental model.

## Assembly Context

Assembly doesn't have scopes the way C has. It has symbols and those symbols have a few properties including **visibility** and **cross-file name resolution** when the linker operates on the object files generated from these assembly units. These are the properties that interest us.

To understand these properties, we have to understand **linkage**.

**If I use one identifier across multiple translation units, do they refer to the same object, or different ones?** This is what linkage answers.

There are three types of linkage: external, internal, and none.
  - With external linkage (STB_GLOBAL), an identifier refers to the same object throughout the program (across all the TUs).
  - Within one translation unit, each declaration of an identifier with internal linkage refers to the same object and it is visible within that TU only. An identifier with `static` storage class has internal linkage (STB_LOCAL), doesn't matter where it is declared in the file.
  - Automatic variables have no linkage. **The why is unclear to me at this moment.** It maybe due to the fact that they cease to exist after the stack frame associated with them is released, so there is no point of assigning a linkage to them as they are transient given to the program's lifespan.

Therefore, from the perspective of assembly, either a symbol is available to the whole program, or the assembly file it is defined in. But as we have discussed, `availability != accessibility`.
  - A symbol has to be available to be accessible.
  - If a symbol is available, it could still be inaccessible for some reason.

---

We can also notice that there is no true block scope in assembly. Then how the compiler translates automatic storage and block-level availability of C objects?
  - We use a toolchain like GCC or Clang to build a C source code.
  - A toolchain controls all the steps in the build process. They generate an assembly which conforms to the C language rules.
  - Since the process is controlled end-to-end, there is no way an instruction is emitted that accesses a block-scoped declaration outside of the equivalent assembly code, unless the toolchain has a bug.

Does that mean
  - I can stop gcc/clang after compilation (or invoke the preprocessor and compiler manually and stop there),
  - check if stack is used to store a block-scoped variable,
  - if yes, then manipulate the assembly to access it outside its block while ensuring that the storage corresponding to the variable still exists and has not been reused, and
  - expect it to run the intended way?

Absolutely. If the conditions were right, the program is likely to execute the intended way.

Isn't this problematic? It is. But as said, the toolchain controls all the steps. As long as it is not buggy, it should not be a problem. Moreover, if we write assembly manually, we are likely to exhibit similar behavior, as accessing a variable outside of its intended scope could be problematic.

---

From the perspective of C, it is reasonable to assume that leaving a block ends the lifetime of all the automatic objects in it. From the perspective of the generated assembly, however, the stack storage containing its old value may still physically exist, whether it remains unchanged or it is reused is a separate discussion.

In ordinary functions without dynamic stack allocation (VLA), the compiler often reserves the space required by every declaration in the function at once. This includes the storage needed by nested blocks as well.

The compiler normally doesn't emit a separate stack adjustment when a nested block ends. The compiler adjusts the stack once-for-all (release) when the function returns. **Please note that this is an observed behavior.**

Just like a programmer writing assembly manually ensures that symbols are used within the intended blocks of code, even when there is no such rule, the programmer can adjust the stack pointer to conceptually represent creation/termination of c-style blocks.

It is reasonable to ask why the compiler doesn't do what a programmer can do manually. **I don't have an answer here.** Maybe the engineers who build these compilers, or the researchers in this field can answer it better. However, we can notice that performance can be a decent contributor in this choice.
  - Adjusting the stack pointer may not be an expensive operation, but when done repeatedly may induce unintended effects on the performance.
  - To adjust rsp after each block, the compiler has to keep track of the total allocation size in every block.
  - Dynamic stack allocation, or VLAs, further complicates this.

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
