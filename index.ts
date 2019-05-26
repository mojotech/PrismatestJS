// S = SelectorType
// E = ElementType
// NA = NextActions
// A = Actions

// ComposeSelectors must be associative
type ComposeSelectors<S> =
    (first: S, second: S) => S;

interface MaterializedTestView<E, A> {
    actions: MaterializedActions<E, A & DefaultActions<E>>;
}

interface TestView<S, E, A> {
    materialize(e: E): MaterializedTestView<E, A>;
    selector: S;
    actions: A;
    <NA extends { [k: string]: Action<E> }>(nextView: TestView<S, E, NA>): TestView<S, E, NA>;
}

interface TestViewConstructor<S, E> {
    <A extends { [k: string]: Action<E> }>(selector: S, actions: A): TestView<S, E, A>;
    defaultViews: DefaultViews<S, E>;
}

type DefaultActions<E> = {
    get: (e: E) => E
}

// Helper to get the tail of a tuple
type Tail<T extends any[]> =
    ((...t: T) => any) extends ((_: any, ...tail: infer TT) => any)
    ? TT
    : never;

// Actions take an element to operate on as their first argument, and any
// number of required parameters that the action needs
type Action<E> = (e: E, ...args: any[]) => any;

// Gets all of the non-element parameters
type ActionParameters<E, F extends Action<E>> = Tail<Parameters<F>>;

// Materializing an action involves filling in the element parameter with one
// or many elements resulting from running a selector. When the action is run
// it will have one or many copies of the return value.
type MaterializedAction<E, A extends Action<E>> =
    (...args: ActionParameters<E, A>) => ReturnType<A>[];

// The action materializer runs the selector on the root and materializes the
// actions given
type ActionMaterializer<S, E> =
    <A extends Action<E>>(selector: S, action: A, root: E) => MaterializedAction<E, A>;

type MaterializedActions<E, A extends { [k: string]: Action<E> }> = {
    [K in keyof A]: MaterializedAction<E, A[K]>;
}

// Important considerations for types
// - can't mix and match test views with different adapters
// - actions are type-checked at call-time based on their types at definition time

// This library is structured so that "adapters" can be plugged in to allow
// different methods of selecting and acting on elements. For example, an XPath
// adapter would allow selecting elements by concatenating XPath selectors, a
// light and efficient method. While an Enzyme adapter would allow selecting
// elements by chaining Enzyme methods which is more flexible than XPath but
// less efficient.
export const makeTestViewConstructor = <S, E>(
    composeSelectors: ComposeSelectors<S>,
    actionRealizer: ActionMaterializer<S, E>,
    defaultViews: DefaultViews<S, E>
): TestViewConstructor<S, E> => {
    // Once an adapter is plugged in, test views are created by supplying a
    // selector and a dictionary of actions. Views are functions, and are chained
    // together with normal function calls. When a view is finished being
    // constructed it is materialized by collecting a root node and bringing it
    // in scope of all the actions. Actions can then be run and will query the
    // root node using the composed selector. A default `get` action is
    // always present to return the node(s) selected.
    const testView = <A extends { [k: string]: Action<E> }>(
        selector: S,
        actions: A
    ): TestView<S, E, A> => {
        const view = <NA extends { [k: string]: Action<E> }>(nextView: TestView<S, E, NA>): TestView<S, E, NA> => testView<NA>(
            composeSelectors(selector, nextView.selector),
            nextView.actions
        );

        view.actions = actions;
        view.selector = selector;
        view.materialize = (root: E) => {
            const defaultActions: MaterializedActions<E, DefaultActions<E>> = {
                get: actionRealizer(selector, (e: E) => e, root)
            };
            const materializedActions = {} as MaterializedActions<E, A>;

            for (let action in actions) {
                if (actions.hasOwnProperty(action)) {
                    materializedActions[action] = actionRealizer(selector,
                        actions[action], root);
                }
            }

            return {
                actions: { ...defaultActions, ...materializedActions }
            };
        }

        return view;
    };
    testView.defaultViews = defaultViews;
    return testView;
};

// Create an action realizer by providing a way to run a selector and iterate
// over selector results.
export const makeActionMaterializer = <S, E, EG>(
    runSelector: (selector: S, root: E) => EG,
    forEachElement: <A extends Action<E>>(elements: EG, fn: (e: E) => ReturnType<A>) => ReturnType<A>[]
): ActionMaterializer<S, E> =>
    (selector, action, root) =>
        (...args) =>
            forEachElement(
                runSelector(selector, root),
                (e) => action(e, ...args)
            );

interface DefaultViews<S, E> {
  checkbox: TestView<S, E, {
    toggle: (e: E) => void;
    isChecked: (e: E) => boolean;
    getValue: (e: E) => string;
  }>;
  radio: TestView<S, E, {
    select: (e: E, value: string) => void;
    getSelection: (e: E) => void;
  }>;
  textInput: TestView<S, E, {
    enterText: (e: E, text: string) => void;
    getText: (e: E) => string;
  }>;
  singleSelect: TestView<S, E, {
    select: (e: E, value: string) => void;
    getSelection: (e: E) => string;
  }>;
  multiSelect: TestView<S, E, {
    select: (e: E, value: string[]) => void;
    getSelection: (e: E) => string[];
  }>;
  form: TestView<S, E, {
    submit: (e: E) => void;
  }>;
  button: TestView<S, E, {
    click: (e: E) => void;
  }>;
}
