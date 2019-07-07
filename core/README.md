# Prismatest Core

This module provides the core functionality used for constructing and combining
test views. It is not intended to be used directly in a test, but rather it is
intended to be used for implementing adapters which are then imported and used
in your tests.

## Implementing Adapters

Implementing adapters requires specifying two types and three functions.
Adapters specify the type of elements they interact with and the type of
selectors they run. They also specify how selectors are composed, how selectors
are executed, and how selector results are iterated.

### Composing Selectors

This function as implemented by the adapter must be associative. In its first
argument it takes the first selector to run. In its second argument it takes the
second selector to run. Calling this function should return a new selector that
effectively runs the first selector, followed by the second selector.

```typescript
composeSelectors: (first: SelectorType, second: SelectorType) => SelectorType
```

### Executing Selector

This function takes in its first argument the selector to run. It takes in its
second argument the element against which the selector should be run. The
function should run the selector and return the results. The result type is an
implementation detail of the adapter and is not exposed to the end user.

```typescript
executeSelector: (selector: SelectorType, element: ElementType) => ElementResultsType
```

### Iterate Selector Results

This function takes in its first argument the results from running a selector.
It takes in its second argument a function that takes a single element from the
results and returns a value. This function should run its input function on
every result from the selector and collect the return values in an array. The
function should return this array.

```typescript
iterateSelectorResults: (results: ElementResultsType, fn: (element: ElementType) => Value) => Value[]
```

### Default Views

The adapter should specify test views consistent with the default views
required of all adapters. See the main project API document for more
information about these.

### Construction Function

The core module exports a single construction function named `makeAdapter` that
should be used to construct the adapter. The types for the arguments to
`makeAdapter` are also exported as `ComposeSelectors`, `RunSelector`,
`IterateSelector`, and `DefaultViews`.

### CSS Adapter

The test view examples used a CSS adapter. The CSS adapter might have been
implemented like this (excluding the default views for brevity):

```js
const composeSelectors = (first, second) => first + " " + second;

const runSelector = (selector, element) => element.querySelectorAll(selector);

const iterateSelector = (nodes, fn) => {
  const result = [];
  for(let i=0 ; i < nodes.length; i++) {
    const node = nodes.item(i);

    result.push(fn(node));
  }
  return result;
};

export default makeAdapter(
  composeSelectors,
  runSelector,
  iterateSelector
);
```

Those wishing to see an implementation of the default views can look at
existing adapters.

## Testing Adapters

The Prismatest Adapter Tests module provides a test suite that should be used
for testing adapters. All adapters should pas the test suite to be considered
fully-functional.

## Typescript

Prismatest is written in Typescript. Adapters should also be written in
Typescript to ensure the best possible compatibility with all functionality.
