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

      formInputs.enterText.at(1, 'John Doe');
      formInputs.enterText.at(2, 'john@example.com');

      form.submit();
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

      form.submit();
      expect(formErrors.errorText.one()).toEqual('Name is required');
      nameInput.enterText.one('John Doe');
      form.submit();
      expect(formErrors.errorText()).toEqual([]);
    });
    ```

## API

See the [API docs](API.md) for an overview of the available functionality in
all adapters.

## Debugging Failing Tests

If a selector fails to select the required number of elements an error will be raised in the test. The error object includes more context about the error. The error messages should include a string representation of the selector, the root of the test view, and the selected elements.

There is a default action useful for debugging tests with test views. A `printSelected` action is provided to return a string representation of the selected elements in a test view.

## Contributing

Build the individual projects using `yarn build` or `npm run build`.

### Bugs, Improvements, Feature Requests

If you see a bug or have an idea for an improvement or feature, open an issue
and let's talk about it! Please provide steps to reproduce the bug.

### Default Test Views

If you would like to see a new view or action added to the default test views
please submit an issue. I want to keep the default functionality as small and
general as possible. This ensures it is useful to as many people as possible
while requiring as minimal overhead from adapter implementations as possible.

### Adapters

If you would like to contribute an adapter, see the Core module for more
direction on how adapters are written. It's recommended as well to familiarize
yourself with the API document to get a good overview of what all the default
functionality requires. Adapters contributed to the main project should all be
written in Typescript and should all pass the tests specified in the Adapter
Tests module to ensure a baseline level of compatibility and functionality.

If you open a pull request I would be more than happy to assist you in
conforming to the required standards.
