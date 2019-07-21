// Explanation of generic type parameters used
// S = Selector type
// E = Element type
// EG = Element group type
// NA = Next actions
// A = Actions

// Minor utility to get parameters of actions and aggregates
type AParameters<AType extends (...args: any[]) => any> = Tail<
  Parameters<AType>
>;

// Note the difference between aggregates and actions is in their first argument
// Aggregate types
type Aggregate<E> = (e: E[], ...args: any[]) => any;
type AggregateParameters<E, A extends Aggregate<E>> = AParameters<A>;
type AggregateMap<E> = { [k: string]: Aggregate<E> };
type DefaultAggregates = {};

// Materialized aggregate types
type MaterializedAggregate<E, A extends Aggregate<E>> = (
  ...args: AParameters<A>
) => ReturnType<A>;
type MaterializedAggregateMap<
  E,
  AggregateMap extends { [k: string]: Aggregate<E> }
> = { [K in keyof AggregateMap]: MaterializedAggregate<E, AggregateMap[K]> };

// Relationship between aggregate and materialized aggregate
type AggregateMaterializer<S, E> = <A extends Aggregate<E>>(
  selector: S,
  action: A,
  root: E
) => MaterializedAggregate<E, A>;

// Action types
type Action<E> = (e: E, ...args: any[]) => any;
type ActionParameters<E, A extends Action<E>> = AParameters<A>;
type ActionMap<E> = { [k: string]: Action<E> };
type DefaultActions<E> = {
  get: (e: E) => E;
};

// Materialized action types
type MaterializedAction<E, A extends Action<E>> = {
  (...args: ActionParameters<E, A>): ReturnType<A>[];
  one(...args: ActionParameters<E, A>): ReturnType<A>;
  at(n: number, ...args: ActionParameters<E, A>): ReturnType<A>;
};
type MaterializedActionMap<E, ActionMap extends { [k: string]: Action<E> }> = {
  [K in keyof ActionMap]: MaterializedAction<E, ActionMap[K]>
};

// Relationship between actions and materialized actions
type ActionMaterializer<S, E> = <A extends Action<E>>(
  selector: S,
  action: A,
  root: E
) => MaterializedAction<E, A>;

type MaterializedTestView<E, A, B> = MaterializedActionMap<
  E,
  A & DefaultActions<E>
> &
  MaterializedAggregateMap<E, B & DefaultAggregates> &
  { actions: MaterializedActionMap<E, A & DefaultActions<E>>,
    aggregates: MaterializedAggregateMap<E, B & DefaultAggregates> };

type ParameterizedSelector<SA extends any[], S> = (...selectorArgs: SA) => S;

// testView.run(e, "submit")
// testView("selector", {});
// testView((name: string) => "selector", {})
// testView(testView((name: string) => "selector, {})) - Bad! How does name get supplied? Type error
interface TestView<S, E, A, B, SA extends any[]> {
  materialize(e: E, ...selectorArgs: SA): MaterializedTestView<E, A, B>;
  selector: ParameterizedSelector<SA, S>;
  actions: A;
  aggregates: B;
  <NA extends ActionMap<E>, NB extends AggregateMap<E>>(
    nextView: TestView<S, E, NA, NB, []>
  ): TestView<S, E, NA, NB, SA>;
}

export interface TestViewConstructor<S, E> {
  <A extends ActionMap<E>, B extends AggregateMap<E>, SA extends any[]>(
    selector: ParameterizedSelector<SA, S>,
    actions?: A,
    aggregates?: B
  ): TestView<S, E, A, B, SA>;
  defaultViews: MaterializedDefaultViews<S, E>;
}

// Helper to get the tail of a tuple
type Tail<T extends any[]> = ((...t: T) => any) extends ((
  _: any,
  ...tail: infer TT
) => any)
  ? TT
  : never;

// Important considerations for types
// - can't mix and match test views with different adapters
// - actions are type-checked at call-time based on their types at definition time

// This library is structured so that "adapters" can be plugged in to allow
// different methods of selecting and acting on elements. For example, an XPath
// adapter would allow selecting elements by concatenating XPath selectors, a
// light and efficient method. While an Enzyme adapter would allow selecting
// elements by chaining Enzyme methods which is more flexible than XPath but
// less efficient.
const makeTestViewConstructor = <S, E>(
  composeSelectors: ComposeSelectors<S>,
  actionRealizer: ActionMaterializer<S, E>,
  aggregateRealizer: AggregateMaterializer<S, E>,
  defaultViews: DefaultViews<S, E>
): TestViewConstructor<S, E> => {
  // Once an adapter is plugged in, test views are created by supplying a
  // selector and a dictionary of actions. Views are functions, and are chained
  // together with normal function calls. When a view is finished being
  // constructed it is materialized by collecting a root node and bringing it
  // in scope of all the actions. Actions can then be run and will query the
  // root node using the composed selector. A default `get` action is
  // always present to return the node(s) selected.
  const testView = <
    A extends ActionMap<E>,
    B extends AggregateMap<E>,
    SA extends any[]
  >(
    selector: ParameterizedSelector<SA, S>,
    actionsOpt?: A,
    aggregatesOpt?: B
  ): TestView<S, E, A, B, SA> => {
    const actions: A = actionsOpt || ({} as A);
    const aggregate: B = aggregatesOpt || ({} as B);
    const view = <NA extends ActionMap<E>, NB extends AggregateMap<E>>(
      nextView: TestView<S, E, NA, NB, []>
    ): TestView<S, E, NA, NB, SA> =>
      testView<NA, NB, SA>(
        (...args: SA) => composeSelectors(selector(...args), nextView.selector()),
        nextView.actions,
        nextView.aggregates
      );

    view.actions = actions;
    view.aggregates = aggregate;
    view.selector = selector;
    view.materialize = (root: E, ...selectorArgs: SA) => {
      const renderedSelector = selector(...selectorArgs);
      const defaultActions: MaterializedActionMap<E, DefaultActions<E>> = {
        get: actionRealizer(renderedSelector, (e: E) => e, root)
      };
      const materializedActions = {} as MaterializedActionMap<E, A>;

      for (let action in actions) {
        if (actions.hasOwnProperty(action)) {
          materializedActions[action] = actionRealizer(
            renderedSelector,
            actions[action],
            root
          );
        }
      }

      const materializedAggregate = {} as MaterializedAggregateMap<E, B>;

      for (let agg in aggregate) {
        if (aggregate.hasOwnProperty(agg)) {
          materializedAggregate[agg] = aggregateRealizer(
            renderedSelector,
            aggregate[agg],
            root
          );
        }
      }

      return {
        ...defaultActions,
        ...materializedActions,
        ...materializedAggregate,
        actions: { ...defaultActions, ...materializedActions },
        aggregates: materializedAggregate
      };
    };

    return view;
  };

  const materializedDefaultViews: MaterializedDefaultViews<S, E> = {
    checkbox: testView(
      () => defaultViews.checkbox.selector,
      defaultViews.checkbox.actions
    ),
    radio: testView(() => defaultViews.radio.selector, defaultViews.radio.actions),
    textInput: testView(
      () => defaultViews.textInput.selector,
      defaultViews.textInput.actions
    ),
    singleSelect: testView(
      () => defaultViews.singleSelect.selector,
      defaultViews.singleSelect.actions
    ),
    multiSelect: testView(
      () => defaultViews.multiSelect.selector,
      defaultViews.multiSelect.actions
    ),
    form: testView(() => defaultViews.form.selector, defaultViews.form.actions),
    button: testView(() => defaultViews.button.selector, defaultViews.button.actions)
  };

  testView.defaultViews = materializedDefaultViews;

  return testView;
};

export class MultipleSelectedElementsError<S, E> extends Error {
  selector: S;
  root: E;

  constructor(selector: S, root: E, ...args: any[]) {
    super(...args);
    this.name = 'MultipleSelectedElementsError';
    this.selector = selector;
    this.root = root;
    this.message = `Selector: ${selector} returned multiple elements at root: ${root}`;
  }
}

export class ZeroSelectedElementsError<S, E> extends Error {
  selector: S;
  root: E;

  constructor(selector: S, root: E, ...args: any[]) {
    super(...args);
    this.name = 'ZeroSelectedElementsError';
    this.selector = selector;
    this.root = root;
    this.message = `Selector: ${selector} returned zero elements at root: ${root}`;
  }
}

export class IndexOutOfBoundsError<S, E> extends Error {
  selector: S;
  root: E;
  index: number;

  constructor(index: number, selector: S, root: E, ...args: any[]) {
    super(...args);
    this.name = 'IndexOutOfBoundsError';
    this.selector = selector;
    this.root = root;
    this.index = index;
    this.message = `Index: ${index} of Selector: ${selector} returned no element at root: ${root}`;
  }
}

// Create an action realizer by providing a way to run a selector and iterate
// over selector results.
const makeActionMaterializer = <S, E, EG>(
  runSelector: (selector: S, root: E) => EG,
  forEachElement: <A extends Action<E>>(
    elements: EG,
    fn: (e: E) => ReturnType<A>
  ) => ReturnType<A>[]
) => <A extends Action<E>>(
  selector: S,
  action: A,
  root: E
): MaterializedAction<E, A> => {
  const base = (...args: ActionParameters<E, A>): ReturnType<A>[] =>
    forEachElement(runSelector(selector, root), e => action(e, ...args));
  base.one = (...args: ActionParameters<E, A>): ReturnType<A> => {
    // This strategy does mean the elements are iterated twice. Until that
    // becomes a problem I'll leave it.
    const elements = forEachElement<(e: E) => E>(
      runSelector(selector, root),
      e => e
    );

    if (elements.length === 0) {
      throw new ZeroSelectedElementsError(selector, root);
    }
    if (elements.length > 1) {
      throw new MultipleSelectedElementsError(selector, root);
    }

    return elements.map<ReturnType<A>>(e => action(e, ...args))[0];
  };
  base.at = (n: number, ...args: ActionParameters<E, A>): ReturnType<A> => {
    const elements = forEachElement<(e: E) => E>(
      runSelector(selector, root),
      e => e
    );
    const offset = n - 1;

    if (elements.length === 0) {
      throw new ZeroSelectedElementsError(selector, root);
    }
    if (elements[offset] === null || elements[offset] === undefined) {
      throw new IndexOutOfBoundsError(n, selector, root);
    }

    return action(elements[offset], ...args);
  };
  return base;
};

const makeAggregateRealizer = <S, E, EG>(
  runSelector: (selector: S, root: E) => EG,
  forEachElement: (elements: EG, fn: (e: E) => E) => E[]
) => <A extends Aggregate<E>>(
  selector: S,
  aggregate: A,
  root: E
): MaterializedAggregate<E, A> => (
  ...args: AggregateParameters<E, A>
): ReturnType<A> =>
  aggregate(forEachElement(runSelector(selector, root), e => e), ...args);

// ComposeSelectors must be associative
export type ComposeSelectors<S> = (first: S, second: S) => S;
export type RunSelector<S, E, EG> = (selector: S, root: E) => EG;
export type IterateSelector<E, EG> = <A extends Action<E>>(
  elements: EG,
  fn: (e: E) => ReturnType<A>
) => ReturnType<A>[];

export const makeAdapter = <S, E, EG>(
  composeSelectors: ComposeSelectors<S>,
  runSelector: RunSelector<S, E, EG>,
  iterateSelector: IterateSelector<E, EG>,
  defaultViews: DefaultViews<S, E>
) =>
  makeTestViewConstructor<S, E>(
    composeSelectors,
    makeActionMaterializer<S, E, EG>(runSelector, iterateSelector),
    makeAggregateRealizer<S, E, EG>(runSelector, iterateSelector),
    defaultViews
  );

export interface DefaultView<
  S,
  E,
  A extends ActionMap<E>,
  B extends AggregateMap<E>
> {
  selector: S;
  actions: A;
  aggregate: B;
}

export interface DefaultViews<S, E> {
  checkbox: DefaultView<
    S,
    E,
    {
      toggle: (e: E) => void;
      isChecked: (e: E) => boolean;
      getValue: (e: E) => string;
    },
    {}
  >;
  radio: DefaultView<
    S,
    E,
    {
      // Select this radio button
      select: (e: E) => void;
      // Get the selected value from this radio button's group of radio buttons
      getSelectedValue: (e: E) => string | null;
    },
    {}
  >;
  textInput: DefaultView<
    S,
    E,
    {
      enterText: (e: E, text: string) => void;
      getText: (e: E) => string;
    },
    {}
  >;
  singleSelect: DefaultView<
    S,
    E,
    {
      select: (e: E, value: string) => void;
      getSelection: (e: E) => string;
    },
    {}
  >;
  multiSelect: DefaultView<
    S,
    E,
    {
      select: (e: E, value: string[]) => void;
      getSelection: (e: E) => string[];
    },
    {}
  >;
  form: DefaultView<
    S,
    E,
    {
      submit: (e: E) => void;
    },
    {}
  >;
  button: DefaultView<
    S,
    E,
    {
      click: (e: E) => void;
    },
    {}
  >;
}

type MaterializedDefaultView<D> = D extends DefaultView<
  infer S,
  infer E,
  infer A,
  infer B
>
  ? TestView<S, E, A, B, []>
  : never;

type MaterializedDefaultViews<S, E> = {
  [K in keyof DefaultViews<S, E>]: MaterializedDefaultView<
    (DefaultViews<S, E>)[K]
  >
};
