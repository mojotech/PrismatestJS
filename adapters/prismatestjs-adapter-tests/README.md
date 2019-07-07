# Prismatest Adapter Tests

This module exports a set of tests that should be used when implementing
adapters. They ensure that the adapters all adhere to a common baseline of
functionality.

## Applying

Using these tests is simple. Simply import the `generateTests` helper and call
it. Provide your adapter and a way to render a JSX element with your adapter.

For example:

```javascript
import { generateTests } from '@mojotech/prismatest-adapter-tests';
import myAdapter from './index';
import * as ReactDOM from 'react-dom';

generateTests(myAdapter, e => {
  const domContainer = document.createElement('div');
  ReactDOM.render(e, domContainer);
  return domContainer;
});
```

## Default View Tests

These tests ensure that the default views all behave similarly for each
adapter.
