# sass-lexer

Adapted from [scss-parser](https://npmjs.org/package/scss-parser).

```js
const tokenize = require('sass-lexer');

// takes a string
const tokens = tokenize(input);

// get the next token
tokens.next();

// look ahead
tokens.peek(offset);

// check for end of file
tokens.eof();

// throw an error with line & column
tokens.err('oh crap');
```

Tokens are arrays of the following shape:
- `0: string` the token type
- `1: string` the token value
- `2: number` the line number
- `3: number` the column number

Need the character offset? Track it yourself:

```js
let offset = 0;
while (!tokens.eof()) {
  const tok = tokens.next();
  //
  // do your thing here...
  //
  // now, update the character offset.
  offset += tok[1].length;
}
```
