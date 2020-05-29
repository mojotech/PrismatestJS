# Prismatest Cypress Adapter

This adapter is used to interact with your test views using Cypress.
This brings all the benefits of Cypress including retry-ability.

## Notes

Cypress commands are asynchronous by default. Prismatest wants to be
synchronous. Therefore each of the query actions (isChecked, etc.) on the
default views will block until Cypress has executed its query command.

## Element Type


Elements are native
[HTMLElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement)
instances. They may be more specific depending on the element that is selected.

## Selector Type

Selectors are specified using CSS selector fragments. When selectors are
combined they are joined with a space. If multiple CSS selector fragments are
specified in a single string using commas, then when they are combined the
fragments are split, combined with the next selector, and rejoined using
commas. This is effectively a cartesian product.

## Quick Start

1. Install

    ```bash
    yarn install --dev @mojotech/prismatest-css
    ```

2. Render something

    ```javascript
    import App from "./app";
    import * as ReactDOM from 'react-dom';

    const rendered  = document.createElement('div');
    ReactDOM.render(<App />, domContainer);
    ```

3. Use some test views

    ```javascript
    import testView from "@mojotech/prismatest-css";
    import TodoComponent from './todo-component';

    const TodoView = testView('#todo-component');

    const todoInput = TodoView(testView.defaultViews.textInput).materialize(rendered);
    const todoSubmit = TodoView(testView.defaultViews.button).materialize(rendered);

    todoInput.enterText("Write some tests!");
    todoSubmit.click();
    ```
