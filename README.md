# PrismatestJS

Decouple your front-end application tests from the view implementation and make
them easier to read and write.

Prismatest introduces the concept of test views to your front-end tests. These
are page object models with a focus on composability and ease of use. Test views
are intended to encapsulate the details of how to locate and interact with
elements of your front-end application. This decouples the tests from those
details, allowing you to change the details of those interactions without
worrying about carrying those changes through all your tests. Additionally this
encapsulation aids in writing readable tests that closely match the wording of
your specifications.

## Available Adapters

* CSS adapter `@mojotech/prismatest-css`

    Uses CSS selectors to find elements to interact with and native DOM APIs to
    manipulate them. This adapter is useful when you don't want your tests to
    know they're working with React.

* Enzyme adapter `@mojotech/prismatest-enzyme`

    Uses Enzyme to select find and manipulate elements. Sometimes Enzyme
    doesn't expose the functionality required to manipulate raw DOM elements,
    so native DOM APIs are also used here for those cases. This adapter is
    useful when finding elements by React component type or props is the most
    efficient way to test.

## Quickstart

1. Install an adapter (e.g. `@mojotech/prismatest-css`):

    ```bash
    yarn install --dev @mojotech/prismatest-css
    ```

2. Use some of the default test views to interact with your app:

    ```javascript
    // See examples for full source
    import testView from '@mojotech/prismatest-css';

    test('User can fill out form', () => {
      const app = render(<App />);
      const form = testView.defaultViews.form.materialize(app);
      const formInputs = testView.defaultViews.textInput.materialize(app);

      formInputs.actions.enterText.at(1, 'John Doe');
      formInputs.actions.enterText.at(2, 'john@example.com');

      form.actions.submit();
    });
    ```

3. Write your own test views!

    ```javascript
    // See examples for full source
    import testView from "@mojotech/prismatest-css";

    const NameInput = testView("label[for='name']")(
      testView.defaultViews.textInput
    );
    const FormErrors = NameInput(
      testView('+ .error', { errorText: e => e.textContent })
    );

    test('User must fill out name', () => {
      const app = render(<App />);
      const form = testView.defaultViews.form.materialize(app);
      const formErrors = FormErrors.materialize(app);
      const nameInput = NameInput.materialize(app);

      form.actions.submit();
      expect(formErrors.actions.errorText.one()).toEqual('Name is required');
      nameInput.actions.enterText.one('John Doe');
      form.actions.submit();
      expect(formErrors.actions.errorText()).toEqual([]);
    });
    ```

## Test Views

Constructing a test view requires two parameters: a selector, and a dictionary
of actions. For example:

```js
const submitButton = testView(
  "button[type='submit']",
  {
    click: (e) => e.click()
  }
);
```

Actions take the element to interact with as the first argument. They can
optionally take any number of extra arguments that are needed for the
interaction. Here's a test view that fills in a text input.

```js
const textInput = testView(
  "input[type='text']",
  {
    enterText: (e, text) => { e.value = text }
  }
);
```

If you're using Typescript, the above example would require types to be
specified on the extra arguments. Like so:

```typescript
const textInput = testView(
  "input[type='text']",
  {
    enterText: (e, text: string) => { e.value = text }
  }
);
```

Once a view is created it can be combined with other views by simply calling it
as a function. For example, this snippet creates a test view selecting the
submit button of a payment form.

```js
const paymentForm = testView(
  "form[action='/pay']",
  {}
);

const paymentSubmit = paymentForm(submitButton);
```

To interact with the view it must first be materialized. This requires a root
element. The combined selector will be run against the root element and the
actions will be modified to fill in their first argument. If the selector
returns multiple elements then the action will be materialized such that calling
it runs it against each element returned. To materialize a view, use the
`materialize` method. Materialized views only contain the actions from the last
composed view.

```js
const materialized = paymentSubmit.materialize(document);
```

Materialized actions are accessed on the `actions` property. To submit the
payment form in the above example:

```js
materialized.actions.click();
```

All test views provide a default action called `get` which simply returns the
underlying object selected by the view.

All materialized actions have a `one` property which only runs the action and
returns the result for the first selected element. If zero or multiple elements
would be selected an error is thrown.

All materialized actions have an `at` property which runs the action on the
specified element of the element collection. For example, to select the second
checkbox you might do:

```js
materialized.actions.checkbox.select.at(2);
```

Note that these are 1-indexed for better compatibility with HTML/CSS semantics.

## Adapters

Prismatest only provides the glue layer for constructing and combining test
views. Adapters are required to implement the logic for combining two selectors,
running a selector, and iterating over the results of the selector. Multiple
adapters can be used in a project, but test views created with different
adapters cannot be combined.

### Compose Selectors

This function as implemented by the adapter must be associative. In its first
argument it takes the first selector to run. In its second argument it takes the
second selector to run. Calling this function should return a new selector that
effectively runs the first selector, followed by the second selector.

### Run Selector

This function takes in its first argument the selector to run. It takes in its
second argument the element against which the selector should be run. The
function should run the selector and return the results.

### Iterate Selector

This function takes in its first argument the results from running a selector.
It takes in its second argument a function that takes a single element from the
results and returns a value. This function should run its input function on
every result from the selector and collect the return values in an array. The
function should return this array.

### Construction Function

Prismatest exports a single construction function named `makeAdapter` that
should be used to construct the adapter. The types for the arguments to
`makeAdapter` are also exported as `ComposeSelectors`, `RunSelector`,
`IterateSelector`, and `DefaultViews`.

### CSS Adapter

The test view examples used a CSS adapter. The CSS adapter might have been
implemented like this:

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

### Default Views

Some default views are specified for common HTML interaction points. This helps
ensure each adapter provides a similar set of functionality to end users. These
views should be provided to the `makeTestViewConstructor` function and will be
available under the returned function's `defaultViews` property.

#### Checkbox

This view selects a checkbox input. It provides an action to get the current
state of the checkbox, get the value of the checkbox, and to toggle the state of
the checkbox.

#### Radio

This view selects a set of radio button inputs. It provides an action to select
a specific value from the set of radio buttons, and an action to get the
currently selected value.

#### Text Input

This view selects any input that could take text as a value. This includes
inputs of type text, email, password, search, and url. It provides an action to
enter text and an action to get the current value.

#### Single Select

This view selects a single select control. It provides an action to select a
value, an action to get the currently selected value, and an action to get the
possible selections.

#### Multiple Select

This view selects a multiple select control. It provides an action to select a
set of values, an action to get the currently selected values, and an action to
get the possible selections.

#### Form

This view selects a form. It provides an action to submit the form.

#### Button

This view selects button controls. This includes elements of type button, as
well as inputs with type button and inputs with type submit. It provides an
action to click the button.

## Contributing

Build the project using `yarn build` or `npm run build`.
