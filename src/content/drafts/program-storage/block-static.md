# Block Static

Scopes are a part of the C's language grammar. They are enforced during compilation. If you get your hands on assembly, you can access the variable which you couldn't previously.

Take this example:
```c
#include <stdio.h>

int sq(int n, int flag){
  static int ncalls = 0;

  if (flag != 1){
    printf("The square of %d is %d\n", n, n*n);
    ncalls++ ;
  }
  if (flag == 1){
    return ncalls;
  }
  return -1;
}

int main(){
  sq(4, 0);
  sq(5, 0);
  sq(6, 0);
  sq(7, 0);
  printf("Number of calls made to sq() are %d\n", sq(1, 1));

  return 0;
}
```

The sq() declares `ncalls`, a block scope static variable, which keeps the count of calls made to the sq().

`ncalls` is a private global whose state is not depended on the stack, so it is retained across function calls, that's why the last `printf` prints 4.

The lifetime of `ncalls` is increased but the accessibility remained the same.

This is the assembly.
```nasm
	.text
	.section	.rodata
.LC0:
	.string	"The square of %d is %d\n"

	.text
	.globl	sq
	.type	sq, @function
sq:
	push rbp
	mov	 rbp, rsp
	sub	 rsp, 16

	mov	DWORD PTR -4[rbp], edi     # arg1 (n)
	mov	DWORD PTR -8[rbp], esi     # arg2 (flag)
	cmp	DWORD PTR -8[rbp], 1       # (flag != 1)

	je   .L2                       # jump if (flag == 1) else block
	mov	 eax, DWORD PTR -4[rbp]    # Load n
	imul eax, eax                  # compute n*n

	# Prepare for printf
	mov  edx, eax                  # Load n*n
	mov  eax, DWORD PTR -4[rbp]    # Load n
	mov  esi, eax
	lea  rax, .LC0[rip]            # Load the string
	mov  rdi, rax
	mov  eax, 0
	call printf@PLT

	mov	eax, DWORD PTR ncalls.0[rip]      # Load ncalls rip relative
	add	eax, 1                            # Increment ncalls by 1
	mov	DWORD PTR ncalls.0[rip], eax      # Update ncalls

# if (flag == 1)
.L2:
	cmp	DWORD PTR -8[rbp], 1
	jne	.L3                               # if not, jump to the exit routine
	mov	eax, DWORD PTR ncalls.0[rip]      # Load ncalls for return
	jmp	.L4                               # jump to return

.L3:
	mov	eax, -1
.L4:
	leave
	ret

	.section	.rodata
	.align 8
.LC1:
	.string	"Number of calls made to sq() are %d\n"

	.text
	.globl	main
	.type	main, @function
main:
	push rbp
	mov	 rbp, rsp

	mov	 esi, 0
	mov	 edi, 4
	call sq

	mov  esi, 0
	mov  edi, 5
	call sq

	mov  esi, 0
	mov  edi, 6
	call sq

	mov  esi, 0
	mov  edi, 7
	call sq

	mov  esi, 1
	mov  edi, 1
	call sq

	mov  esi, eax
	lea  rax, .LC1[rip]
	mov  rdi, rax
	mov  eax, 0
	call printf@PLT

	mov  eax, 0
	pop  rbp
	ret

	.local	ncalls.0
	.comm	ncalls.0,4,4
```

Focus on this block in the main symbol:
```nasm
mov  esi, eax
lea  rax, .LC1[rip]
mov  rdi, rax
mov  eax, 0
call printf@PLT
```

We know that `eax` contains the return value from the previous function call, which returned `ncalls`.

Modify the first line in this block to:
```nasm
mov  esi, DWORD PTR ncalls.0[rip]
```

If scopes are enforced here, we should get an error.
```bash
gcc main.s -o out
./out

The square of 4 is 16
The square of 5 is 25
The square of 6 is 36
The square of 7 is 49
Number of calls made to sq() are 4
```

This proves that **block static** is just a compile-time artifact.
