# API

Each adapter should adhere to some core functionality to promote ease of use of
different adapters for different situations. Some adapters also provide
additional functionality best suited for their intended use case.

## Adapters

Adapters provide the details of how test views are combined, how elements are
selected and how actions interact with elements. It is useful to consider
adapters as adhering to the same interface but parameterizing it on two types.

### Element Type

Adapters specify the type of the elements they interact with. For the most part
this is going to be related to the underlying DOM types, but some adapters
might wrap it in a more convenient structure.

### Selector Type

Adapters specify the type of the selectors they use to make queries. These can
be varied and rich.

## Core

The core functionality provided is a way to create test views that have
a selector and some actions. Default test views are also provided.

### Create a Test View

Adapters have a default export that is a function to create test views.

```typescript
testView(selector: SelectorType, actions: ?ActionMap): TestView
```

#### Parameters

- selector

    Describes how to find the element this test view will operate on. It's
    specific structure will vary depending on the adapter. For example, the CSS
    adapter uses plain strings while the Enzyme adapter uses functions.

- actions (optional)

    Describes the actions that are available on this test view once it is
    materialized. It takes the form of a map from action names to functions.
    Each function must take as its first argument the element being operated
    on. This is not supplied when the action is invoked. The functions may take
    other arguments that will be supplied when the action is invoked.

#### Return Type

A test view.

### Default Test Views

The function used to create a test view has default test views attached to it. Access these from the `defaultViews` property. For example:

```typescript
testView.defaultViews.button
```

#### Checkbox

Selects inputs with the checkbox type.

##### Toggle

Toggles the state of the checkbox, from checked to unchecked or unchecked to checked.

```typescript
toggle: () => void
```

##### Is Checked

Returns a boolean whose value depends on the checked state of the checkbox.

```typescript
isChecked: () => boolean
```

##### Get Value

Returns the value of the checkbox.

```typescript
getValue: () => string
```

#### Radio

Selects inputs with the radio type.

##### Select

Selects the targeted radio button.

```typescript
select: () => void
```

##### Get Selected Value

Gets the selected value for the radio button group. The radio button group is
defined as all the radio buttons that share the same name that are at the same
level in the DOM.

```typescript
getSelectedValue: () => string | null
```

#### Text Input

Selects inputs with a type of text or text areas.

##### Enter Text

Enters the given text into the text view.

```typescript
enterText: (text: string) => void
```

##### Get Text

Returns the text in the text view.

```typescript
getText: () => string
```

#### Single Select

Selects select inputs that cannot have multiple values selected.

##### Select

Select the given value.

```typescript
select: (value: string) => void
```

##### Get Selection

Return the selected value.

```typescript
getSelection: () => string
```

TODO: This should be `string | null`

#### Multiple Select

Selects select inputs that can have multiple values selected.

##### Select

Ensures the given values are selected. This will deselect any values that are
not provided.

```typescript
select: (values: string[]) => void
```

##### Get Selection

Returns the selected values.

```typescript
getSelection: () => string[]
```

#### Form

Selects forms.

##### Submit

Submits the form

```typescript
submit: () => void
```

#### Button

Selects buttons. This includes button elements and inputs with type button or
with type submit.

##### Click

Clicks the button.

```typescript
click: () => void
```

### Test Views

#### Callable

Test views are callable as functions and this combines two test views. This is
used as a way to build up more complicated test views from smaller pieces. An
example is selecting all the text inputs in a form:
`defaultViews.form(defaultViews.textInput)`. Only the actions from the last
test view are available when the test view is materialized. The exact mechanism
of combining selectors is left up to the individual adapters, however it should
be associative.

```typescript
(): (testView: TestView) => TestView
```

#### Materialize

Test views are used by materializing them. When materializing a test view an
element (the exact structure of which is determined by the adapter) must be
supplied. All selectors will be run against this element as the root.

```typescript
materialize: (element: ElementType): MaterializedTestView;
```

### Actions

Actions are used to query or manipulate the state of the elements under test.

#### Specifying

Actions are specified when creating a test view. When specifying actions they
should be specified such that their first argument is an element that will be
provided by the adapter. Other arguments may also be specified, for example to
set the state of an input.

#### Invoking

Actions should be invoked after the test view has been materialized. Only then
will the first argument be provided automatically. Actions are invoked like
functions, and any other arguments that were specified should be provided at
invocation time.

All actions provide a few different invocation strategies that are useful in
different situations.

##### All

By default an action will be called against every element that was selected by
the test view. The results of each call are aggregated and returned in an
array.

```typescript
action: (...) => ReturnType[]
```

##### One

An action may be run against a single matched element. If there are zero or
multiple elements an error will be thrown.

```typescript
action.one: (...) => ReturnType
```

##### At

An action may be run against a specific matched element. To do so you provide
an index and the action will be called against the element at that index.
Because HTML tends to index elements starting at 1, this invocation method also
indexes starting at 1. The index is provided as the first argument to the
invoked action. If there is no element at the specified index an error will be
thrown.

```typescript
action.at: (index: number, ...) => ReturnType
```

### Default Actions

Every test view has some default actions that are automatically provided.

#### Get

Returns the element that was selected.

```typescript
get: () => ElementType
```

### Errors

Errors are thrown when a prerequisite for an action invocation strategy is not
met. They will have a few extra properties to aid in debugging.

#### Multiple Selected Elements Error

This error is thrown when invoking an action on a single element and multiple
elements are selected.

```typescript
class MultipleSelectedElementsError extends Error {
    selector: SelectorType;
    root: ElementType;
}
```

#### Zero Selected Elements Error

This error is thrown when invoking an action on a single element and no
elements are selected.

```typescript
class ZeroSelectedElementsError extends Error {
    selector: SelectorType;
    root: ElementType;
}
```

#### Index Out of Bounds Error

This error is thrown when invoking an action on an indexed element and the
element does not exist.

```typescript
class IndexOutOfBoundsError extends Error {
    selector: SelectorType;
    root: ElementType;
    index: number;
}
```
