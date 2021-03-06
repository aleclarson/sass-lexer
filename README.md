# sass-lexer

Adapted from [scss-parser](https://npmjs.org/package/scss-parser).

```js
const tokenize = require('sass-lexer');

// takes a string
const tokens = tokenize(input);

// get the next token
tokens.next();          // => array

// look ahead
tokens.peek(offset);    // => array

// check for end of file
tokens.eof();           // => boolean

// throw an error with line & column
tokens.err('oh crap');
```

The `next` and `peek` methods return `null` if no more tokens exist.

Tokens are arrays of the following shape:
- `0: string` type
- `1: string` value
- `2: number` length
- `3: number` start line
- `4: number` start column

You can track the character offset yourself:

```js
let offset = 0;
while (!tokens.eof()) {
  const tok = tokens.next();
  //
  // do your thing here...
  //
  // now, update the character offset.
  offset += tok[2];
}
```

The values of `tok[1].length` and `tok[2]` are *not* always equal, so be sure
to use `tok[2]` when calculating the character offset.

## Token types

- `atrule` (does not include `@` in the value)
- `color_hex` (does not include `#` in the value)
- `comment` (does not include `//` or `/*` or `*/` in the value)
- `identifier`
- `number` (does not include units like `px` in the value)
- `operator`
- `punctuation`
- `space` (mix of ` ` and `\t` and `\n` in the value)
- `string` (does not include `"` or `'` in the value)
- `variable` (does not include `$` in the value)

## Parser utils

```js
const utils = require('sass-lexer/utils');

// Return true if `tok` is truthy and `tok[0]` equals the given string.
utils.isType(tok, 'space');

// Return true if `tok` is truthy and `tok[1]` equals the given string.
utils.isValue(tok, ':');

// Return true if `tok` is truthy and `tok[0]` is not the given string.
utils.notType(tok, 'space');

// Return true if `tok` is truthy and `tok[1]` is not the given string.
utils.notValue(tok, ':');

// Throw an error if `tok` is falsy or `tok[0]` is not the given string.
utils.assertType(tok, 'space');

// Throw an error if `tok` is falsy or `tok[1]` is not the given string.
utils.assertValue(tok, ':');
```
