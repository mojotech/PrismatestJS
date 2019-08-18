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

const defaultTestViews: any = {
  checkbox: {
    selector: "",
    actions: {}
  },
  radio: {
    selector: "",
    actions: {}
  },
  textInput: {
    selector: "",
    actions: {}
  },
  singleSelect: {
    selector: "",
    actions: {}
  },
  multiSelect: {
    selector: "",
    actions: {}
  },
  form: {
    selector: "",
    actions: {}
  },
  button: {
    selector: "",
    actions: {}
  },
};

const testView: TestViewConstructor<SelectorType, ElementType> = makeAdapter(
  composeSelectors,
  runSelector,
  iterateSelector,
  (defaultTestViews as DefaultViews<SelectorType, ElementType>) // these aren't used or tested here
);

const testSelector: SelectorType = "def";
const testParameterizedSelector = (x: string) => testSelector + x;
const testAction = (e: ElementType) => e;
const testAggregate = (es: ElementType[]) => es;
const testParameterizedAction = (e: ElementType, x: number) => `${e}${x}`;
const testParameterizedAggregate = (es: ElementType[], x: boolean) => `${es}${x}`;

const testRoot = "abcdefghijklmnopqrstuvwxyz";

test("test views can be constructed", () => {
  testView(testSelector);
  testView(testSelector, {});
  testView(testSelector, { action: testAction });
  testView(testSelector, { action: testAction }, {});
  testView(testSelector, { action: testAction }, { aggregate: testAggregate });
  testView(testSelector, {}, { aggregate: testAggregate });
});

test("actions and aggregates can have other arguments", () => {
  testView(testSelector, { action: testParameterizedAction }, { aggregate: testParameterizedAggregate });
});

test("test view selectors can be parameterized", () => {
  testView(testParameterizedSelector);
});

test("test views without parameterized selectors can always be composed", () => {
  const a = testView(testSelector);
  const b = testView(testSelector);

  a(b);
});

test("a test view with a parameterized selector can be composed with a test view without a parameterized selector", () => {
  const a = testView(testParameterizedSelector);
  const b = testView(testSelector);

  a(b);
});

test("Composed test views keep the actions and aggregates of the last composed view", () => {
  const a = testView(testParameterizedSelector, { unkeptAction: testAction }, { unkeptAggregate: testAggregate });
  const b = testView(testSelector, { action: testAction }, { aggregate: testAggregate });

  const comp = a(b);

  const action: typeof testAction = comp.actions.action;
  const aggregate: typeof testAggregate = comp.aggregates.aggregate;
  expect(action).toEqual(testAction);
  expect(aggregate).toEqual(testAggregate);
});

describe("materialized test views", () => {
  test("a test view with a parameterized selector requires it's selector arguments at materialization time", () => {
    const a = testView(testParameterizedSelector);

    a.materialize(testRoot, "foo");
  });

  test("actions and aggregate without arguments can be called after materialization", () => {
    const a = testView(testSelector, { action: testAction }, { aggregate: testAggregate });

    const mat = a.materialize(testRoot);

    mat.action();
    mat.aggregate();

    // Deprecated
    mat.actions.action();
    mat.aggregates.aggregate();
  });

  test("actions and aggregate with arguments require those arguments when called after materialization", () => {
    const a = testView(testSelector, { pAction: testParameterizedAction }, { pAggregate: testParameterizedAggregate });

    const mat = a.materialize(testRoot);

    mat.pAction(1);
    mat.pAggregate(true);

    // Deprecated
    mat.actions.pAction(1);
    mat.aggregates.pAggregate(true);
  });

  test("materialized actions can be called while expecting a single matched element", () => {
    const a = testView(testSelector, { action: testAction, pAction: testParameterizedAction });

    const mat = a.materialize(testRoot);

    mat.action.one();
    mat.pAction.one(1);

    // Deprecated
    mat.actions.action.one();
    mat.actions.pAction.one(1);
  });

  test("materialized actions can be called targeting a specific element by index", () => {
    const a = testView("a", { action: testAction, pAction: testParameterizedAction });

    const mat = a.materialize("aaaa");

    mat.action.at(1);
    mat.pAction.at(1, 1);

    // Deprecated
    mat.actions.action.at(3);
    mat.actions.pAction.at(3, 1);
  });
});
