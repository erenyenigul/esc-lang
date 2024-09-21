# Native Functions <!-- {docsify-all} -->

Melon provides several native functions to facilitate basic operations in your programs. These functions are built into the language and offer essential capabilities such as outputting data, receiving user input, and terminating the program. Here’s an overview of the native functions available:

### `print`

The `print` function is used to output data to the standard output (using `Show Result` action in Siri Shortcuts). It can handle various data types, including strings, numbers, and lists, and can accept multiple arguments, which will be printed sequentially with a space separating them.

**Syntax:**
```melon
print(value1: any, value2?: any, ..., valueN?: any): void
```

**Example:**
```melon
let message = "Hello, Melon!";
let number = 42;
let my_list = [1, 2, 3];

print(message); // Outputs: Hello, Melon!
print(number);  // Outputs: 42
print(my_list); // Outputs: [1, 2, 3]
print("The number is", number, "and the list is", my_list);
// Outputs: The number is 42 and the list is [1, 2, 3]
```

### `input`

The `input` function is used to receive input from the user. It waits for the user to enter data and then returns that data as a string. This function is useful for interactive programs that require user interaction.

**Syntax:**
```melon
input(prompt?: string): string
```

**Example:**
```melon
let name = input("Enter your name: ");
print("Hello, " + name + "!");
// If the user enters "Alice", the output will be: Hello, Alice!
```

**Example with input as a number:**

If you need to get a number as input, you can use the native `number()` function.

```melon
let age = number(input("Enter your age: "));

if(age >= 18) {
    print("Here, have a beer!");
}
else {
    print("Here, have a soda!");
}
```

### `number`

The `number` function accepts a string, and parses it as a number.

**Syntax:**
```melon
number(text: string): number
```

### `str`

The `str` function accepts a value, and converts it into a string.

**Syntax:**
```melon
str(value: any): string
```

### `len`

It returns the length of a given string, list or tuple.

**Syntax:**
```melon
len(value: string|list|tuple): number
```

### `random`

The `random` function generates and returns a random number between 0 and 1.

**Syntax:**
```melon
random(): number
```

### `exit`

The `exit` function terminates the program immediately. Unlike some languages, Melon's `exit` function does not support status codes; it simply ends the program. 

You can also return back a value to Shortcut using `exit`. 

**Syntax:**
```melon
exit(value?: any): void
```

**Example:**
```melon
print("This message will be shown.");
exit("I love you"); // Terminates the program. 'I love you' is returned to the shortcut.
print("This message will not be shown."); // This line will not be executed
```

### `tts`

The `tts` function is used to read out text (using `Speak Text` action in Siri Shortcuts). It can handle various data types, including strings, numbers, and lists, and can accept multiple arguments, which will be read out sequentially.

**Syntax:**
```melon
tts(value1: any, value2?: any, ..., valueN?: any): void
```

### `stt`

The `stt` function transcribes what is spoken to text (using `Dictate Text` action in Siri Shortcuts). It has two options determining when it stops: ontap and short. If ontap is true, you will need to push the stop button for it to stop (`On Tap` option in Siri Shortcuts). If ontap is false, it will wait for a pause (`After Pause` option in Siri Shortcuts) which can be short if short is true (`After Short Pause` option in Siri Shortcuts). Defaults to waiting on a normal pause.

**Syntax:**
```melon
stt(ontap?: boolean, short?: boolean): string
```

### `alert`

The `alert` function is used to output data with more control (using `Show Alert` action in Siri Shortcuts). It can take any data type as an input as well as two other parameters. The first one is the title wich can be any data type and the second one is showCancel wich determines whether or not to show the cancel button. It must be a boolean.

**Syntax:**
```melon
alert(text: any, title?: any, showCancel?: boolean): void
```

### `choose`
The `choose` function is used to choose between different items of a list (using `Choose from List` action in Siri Shortcuts). It takes a list or tuple as input and outputs a str or list (to do). It has two extra parameters. The first one is the prompt which be any data type and the second one is canMultiple wich determines wether or not to let the user select multiple items returning a list (to do). It must be a boolean.

**Syntax:**
```melo,
choose(list: list|tuple, prompt?: any, canMultiple?: boolean): string|list
```
