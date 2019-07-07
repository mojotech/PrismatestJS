# Prismatest Enzyme Adapter

This adapter is used to interact with your test views using Enzyme.

## Element Type

Elements are interacted with using Enzyme's
[ReactWrapper](https://airbnb.io/enzyme/docs/api/mount.html#reactwrapper-api)
class.

## Selector Type

Selectors are specified using functions. These functions take the current
element that has been selected and may call methods on it to narrow down the
selection further.

### Selector Helper

A helper function is provided that takes the same arguments as the
[find](https://airbnb.io/enzyme/docs/api/ReactWrapper/find.html) method on
ReactWrapper instances. It is essentially just a wrapper around that method.

```typescript
selector: (enzymeSelector) => SelectorType
```

## Quick Start

1. Install

    ```bash
    yarn install --dev @mojotech/prismatest-enzyme
    ```

2. Render something

    ```javascript
    import App from "./app";
    import { mount } from "enzyme";

    const rendered = mount(<App />);
    ```

3. Use some test views

    ```javascript
    import testView from "@mojotech/prismatest-enzyme";
    import TodoComponent from './todo-component';

    const TodoView = testView(TodoComponent, { addTodo: (e, text) => e.props().addTodo(text) });

    const todo = TodoView.materialize(rendered);

    todo.actions.addTodo("Write some tests!");
    ```
