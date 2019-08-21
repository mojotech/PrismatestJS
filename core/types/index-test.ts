// TypeScript Version 3.5
import { makeAdapter, TestViewConstructor, ComposeSelectors, RunSelector, IterateSelector, DefaultViews } from "./index";

type SelectorType = string;
type ElementType = string;
type ElementGroupType = string[];

const composeSelectors: ComposeSelectors<SelectorType> = (first, second) => first + second;

const runSelector: RunSelector<SelectorType, ElementType, ElementGroupType> = (selector, element) => {
  const matches = element.match(new RegExp(selector, 'g'));
  if (matches === null) {
    return [];
  }
  return matches;
}

const iterateSelector: IterateSelector<ElementType, ElementGroupType> = (nodes, fn) => {
  const result = [];
  for(let e of nodes) {
    result.push(fn(e));
  }
  return result;
};

const testView: TestViewConstructor<SelectorType, ElementType> = makeAdapter(
  composeSelectors,
  runSelector,
  iterateSelector,
  (({} as any) as DefaultViews<SelectorType, ElementType>)
);

const testSelector: SelectorType = "selector";
const testParameterizedSelector = (x: string) => testSelector + x;
const testAction = (e: ElementType) => e;
const testAggregate = (es: ElementType[]) => es;
const testParameterizedAction = (e: ElementType, x: number) => `${e}${x}`;
const testParameterizedAggregate = (es: ElementType[], x: boolean) => `${es}${x}`;

const testRoot = "abcdefghijklmnopqrstuvwxyz";

"test views with parameterized selectors can never be composed"; () => {
  const a = testView(testParameterizedSelector);
  const b = testView(testParameterizedSelector);

  // $ExpectError
  a(b);
}

"a test view without a parameterized selector cannot be composed with a test view with a parameterized selector"; () => {
  const a = testView(testSelector);
  const b = testView(testParameterizedSelector);

  // $ExpectError
  a(b);
};

"Composed test views keep the actions and aggregates of the last composed view"; () => {
  const a = testView(testParameterizedSelector, { unkeptAction: testAction }, { unkeptAggregate: testAggregate });
  const b = testView(testSelector, { action: testAction }, { aggregate: testAggregate });

  const comp = a(b);

  // $ExpectError
  const unkeptAction: undefined = comp.actions.unkeptAction;
  // $ExpectError
  const unkeptAggregate: undefined = comp.actions.unkeptAggregate;
};

"materialized test views"; () => {
  "a test view with a parameterized selector requires it's selector arguments at materialization time"; () => {
    const a = testView(testParameterizedSelector);

    // $ExpectError
    a.materialize(testRoot);
    // $ExpectError
    a.materialize(testRoot, 1)
    // $ExpectError
    a.materialize(testRoot, "foo", 1);
  };

  "actions and aggregate without arguments can be called after materialization"; () => {
    const a = testView(testSelector, { action: testAction }, { aggregate: testAggregate });

    const mat = a.materialize(testRoot);

    // $ExpectError
    mat.action(1);
    // $ExpectError
    mat.aggregate(1);

    // $ExpectError
    mat.actions.action(1);
    // $ExpectError
    mat.aggregates.aggregate(1);
  };

  "actions and aggregate with arguments require those arguments when called after materialization"; () => {
    const a = testView(testSelector, { pAction: testParameterizedAction }, { pAggregate: testParameterizedAggregate });

    const mat = a.materialize(testRoot);

    // $ExpectError
    mat.pAction("foo");
    // $ExpectError
    mat.pAction();
    // $ExpectError
    mat.pAggregate(1);
    // $ExpectError
    mat.pAggregate();

    // $ExpectError
    mat.actions.pAction();
    // $ExpectError
    mat.actions.pAction("foo");
    // $ExpectError
    mat.aggregates.pAggregate(1);
    // $ExpectError
    mat.aggregates.pAggregate();
  };

  "materialized actions can be called while expecting a single matched element"; () => {
    const a = testView(testSelector, { action: testAction, pAction: testParameterizedAction });

    const mat = a.materialize(testRoot);

    // $ExpectError
    mat.pAction.one("foo");
    // $ExpectError
    mat.pAction.one();

    // $ExpectError
    mat.actions.pAction.one("foo");
    // $ExpectError
    mat.actions.pAction.one();
  };

  "materialized actions can be called targeting a specific element by index"; () => {
    const a = testView(testSelector, { action: testAction, pAction: testParameterizedAction });

    const mat = a.materialize(testRoot);

    // $ExpectError
    mat.pAction.at(3, "foo");
    // $ExpectError
    mat.pAction.at(3);

    // $ExpectError
    mat.actions.pAction.at(3, "foo");
    // $ExpectError
    mat.actions.pAction.at(3);
  };
};

"Default test views"; () => {
  "They can be used"; () => {
    testView.defaultViews.checkbox.materialize(testRoot).toggle();
    testView.defaultViews.checkbox.materialize(testRoot).isChecked();
    testView.defaultViews.checkbox.materialize(testRoot).getValue();

    testView.defaultViews.radio.materialize(testRoot).select();
    testView.defaultViews.radio.materialize(testRoot).getSelectedValue();

    testView.defaultViews.textInput.materialize(testRoot).enterText("text");
    testView.defaultViews.textInput.materialize(testRoot).getText();

    testView.defaultViews.singleSelect.materialize(testRoot).select("foo");
    testView.defaultViews.singleSelect.materialize(testRoot).getSelection();

    testView.defaultViews.multiSelect.materialize(testRoot).select(["foo"]);
    testView.defaultViews.multiSelect.materialize(testRoot).getSelection();

    testView.defaultViews.form.materialize(testRoot).submit();

    testView.defaultViews.button.materialize(testRoot).click();
  };

  "They can be composed with custom views"; () => {
    const a = testView(testSelector);

    a(testView.defaultViews.checkbox).materialize(testRoot);
    a(testView.defaultViews.radio).materialize(testRoot);
    a(testView.defaultViews.textInput).materialize(testRoot);
    a(testView.defaultViews.singleSelect).materialize(testRoot);
    a(testView.defaultViews.multiSelect).materialize(testRoot);
    a(testView.defaultViews.form).materialize(testRoot);
    a(testView.defaultViews.button).materialize(testRoot);
    testView.defaultViews.checkbox(a).materialize(testRoot);
    testView.defaultViews.radio(a).materialize(testRoot);
    testView.defaultViews.textInput(a).materialize(testRoot);
    testView.defaultViews.singleSelect(a).materialize(testRoot);
    testView.defaultViews.multiSelect(a).materialize(testRoot);
    testView.defaultViews.form(a).materialize(testRoot);
    testView.defaultViews.button(a).materialize(testRoot);

    const b = testView(testParameterizedSelector);

    b(testView.defaultViews.checkbox).materialize(testRoot, "foo");
    b(testView.defaultViews.radio).materialize(testRoot, "foo");
    b(testView.defaultViews.textInput).materialize(testRoot, "foo");
    b(testView.defaultViews.singleSelect).materialize(testRoot, "foo");
    b(testView.defaultViews.multiSelect).materialize(testRoot, "foo");
    b(testView.defaultViews.form).materialize(testRoot, "foo");
    b(testView.defaultViews.button).materialize(testRoot, "foo");
  };

  // The adapter tests were failing on this case, which only happens when the selector and element types are fully generic
  "Default views can be composed with default views"; <S, E>(adapter: TestViewConstructor<S, E>, e: E) => {
    const a = adapter.defaultViews.form(adapter.defaultViews.button);
    // TODO: Fix
    // $ExpectError
    a.materialize(e);

    a.materialize<any>(e);
  }
}
