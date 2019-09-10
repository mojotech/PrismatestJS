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
type DefaultAggregates<E> = {
	printRoot: (e: E[]) => string;
	printSelector: (e: E[]) => string;
};

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
	printSelected: (e: E) => string;
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
	MaterializedAggregateMap<E, B & DefaultAggregates<E>> & {
		actions: MaterializedActionMap<E, A & DefaultActions<E>>;
		aggregates: MaterializedAggregateMap<E, B & DefaultAggregates<E>>;
	};

type ParameterizedSelectorDiscriminator<S> = ((...args: any[]) => S) | S;

type ParameterizedSelectorArgs<S, F> = F extends (...args: infer Args) => S
	? Args
	: [];

type ParameterizedSelector<S, F> = F extends (...args: any[]) => S ? F : S;

// Only the first selector should be able to be parameterized
// testView.run(e, "submit")
// testView("selector", {});
// testView((name: string) => "selector", {})
// testView(testView((name: string) => "selector, {})) - Bad! How does name get supplied? Type error
interface TestView<S, E, A, B, F> {
	materialize: <MA extends ParameterizedSelectorArgs<S, F>>(
		e: E,
		...selectorArgs: MA
	) => MaterializedTestView<E, A, B>;
	selector: ParameterizedSelector<S, F>;
	actions: A;
	aggregates: B;
	<NA extends ActionMap<E>, NB extends AggregateMap<E>>(
		nextView: TestView<S, E, NA, NB, S>
	): TestView<S, E, NA, NB, F>;
}

export interface TestViewConstructor<S, E> {
	<
		A extends ActionMap<E>,
		B extends AggregateMap<E>,
		F extends ParameterizedSelectorDiscriminator<S>
	>(
		selector: ParameterizedSelector<S, F>,
		actions?: A,
		aggregates?: B
	): TestView<S, E, A, B, F>;
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
	printSelector: Printer<S>,
	printElement: Printer<E>,
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
		F extends ParameterizedSelectorDiscriminator<S>
	>(
		selector: ParameterizedSelector<S, F>,
		actionsOpt?: A,
		aggregatesOpt?: B
	): TestView<S, E, A, B, F> => {
		const actions: A = actionsOpt || ({} as A);
		const aggregate: B = aggregatesOpt || ({} as B);
		const view = <NA extends ActionMap<E>, NB extends AggregateMap<E>>(
			nextView: TestView<S, E, NA, NB, S>
		): TestView<S, E, NA, NB, F> => {
			if (selector instanceof Function) {
				return testView<NA, NB, F>(
					((...args: ParameterizedSelectorArgs<S, F>) =>
						composeSelectors(
							selector(...args),
							nextView.selector
						)) as ParameterizedSelector<S, F>,
					nextView.actions,
					nextView.aggregates
				);
			} else {
				return testView<NA, NB, F>(
					composeSelectors(
						selector as S,
						nextView.selector
					) as ParameterizedSelector<S, F>,
					nextView.actions,
					nextView.aggregates
				);
			}
		};

		view.actions = actions;
		view.aggregates = aggregate;
		view.selector = selector;
		view.materialize = <MA extends ParameterizedSelectorArgs<S, F>>(
			root: E,
			...selectorArgs: MA
		) => {
			const renderedSelector =
				selector instanceof Function ? selector(...selectorArgs) : selector;
			const defaultActions: MaterializedActionMap<E, DefaultActions<E>> = {
				get: actionRealizer(renderedSelector, (e: E) => e, root),
				printSelected: actionRealizer(renderedSelector, printElement, root)
			};
			const materializedActions = {
				...defaultActions
			} as MaterializedActionMap<E, A & DefaultActions<E>>;

			for (let action in actions) {
				if (actions.hasOwnProperty(action)) {
					materializedActions[action] = actionRealizer(
						renderedSelector,
						actions[action],
						root
					);
				}
			}

			const defaultAggregates: MaterializedAggregateMap<
				E,
				DefaultAggregates<E>
			> = {
				printSelector: aggregateRealizer(
					renderedSelector,
					() => printSelector(renderedSelector),
					root
				),
				printRoot: aggregateRealizer(
					renderedSelector,
					() => printElement(root),
					root
				)
			};
			const materializedAggregate = {
				...defaultAggregates
			} as MaterializedAggregateMap<E, B & DefaultAggregates<E>>;

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
				...materializedActions,
				...materializedAggregate,
				actions: materializedActions,
				aggregates: materializedAggregate
			};
		};

		return view;
	};

	const materializedDefaultViews: MaterializedDefaultViews<S, E> = {
		checkbox: testView(
			defaultViews.checkbox.selector,
			defaultViews.checkbox.actions
		),
		radio: testView(defaultViews.radio.selector, defaultViews.radio.actions),
		textInput: testView(
			defaultViews.textInput.selector,
			defaultViews.textInput.actions
		),
		singleSelect: testView(
			defaultViews.singleSelect.selector,
			defaultViews.singleSelect.actions
		),
		multiSelect: testView(
			defaultViews.multiSelect.selector,
			defaultViews.multiSelect.actions
		),
		form: testView(defaultViews.form.selector, defaultViews.form.actions),
		button: testView(defaultViews.button.selector, defaultViews.button.actions)
	};

	testView.defaultViews = materializedDefaultViews;

	return testView;
};

const printElements = <E>(elements: E[], printer: Printer<E>): string => {
	if (elements.length === 0) {
		return "[]";
	}
	return ["[", ...elements.map(e => `\t"${printer(e)}",`), "]"].join("\n\t");
};

export class MultipleSelectedElementsError<S, E> extends Error {
	selector: S;
	root: E;
	elements: E[];

	constructor(
		selector: S,
		root: E,
		elements: E[],
		printSelector: Printer<S>,
		printElement: Printer<E>,
		...args: any[]
	) {
		super(...args);
		Object.setPrototypeOf(this, new.target.prototype);
		this.name = "MultipleSelectedElementsError";
		this.selector = selector;
		this.root = root;
		this.elements = elements;
		this.message =
			"Multiple elements returned by selector:\n" +
			`\tSelector: "${printSelector(selector)}"\n` +
			`\tRoot: "${printElement(root)}"\n` +
			`\tSelected: ${printElements(elements, printElement)}`;
	}
}

export class ZeroSelectedElementsError<S, E> extends Error {
	selector: S;
	root: E;
	elements: E[];

	constructor(
		selector: S,
		root: E,
		elements: E[],
		printSelector: Printer<S>,
		printElement: Printer<E>,
		...args: any[]
	) {
		super(...args);
		Object.setPrototypeOf(this, new.target.prototype);
		this.name = "ZeroSelectedElementsError";
		this.selector = selector;
		this.root = root;
		this.elements = elements;
		this.message =
			"Zero elements returned by selector\n" +
			`\tSelector: "${printSelector(selector)}"\n` +
			`\tRoot: "${printElement(root)}"\n` +
			`\tSelected: ${printElements(elements, printElement)}`;
	}
}

export class IndexOutOfBoundsError<S, E> extends Error {
	selector: S;
	root: E;
	index: number;
	elements: E[];

	constructor(
		index: number,
		selector: S,
		root: E,
		elements: E[],
		printSelector: Printer<S>,
		printElement: Printer<E>,
		...args: any[]
	) {
		super(...args);
		Object.setPrototypeOf(this, new.target.prototype);
		this.name = "IndexOutOfBoundsError";
		this.selector = selector;
		this.root = root;
		this.elements = elements;
		this.index = index;
		this.message =
			"Index out of bounds\n" +
			`\tIndex: ${index}\n` +
			`\tSelector: "${printSelector(selector)}"\n` +
			`\tRoot: "${printElement(root)}"\n` +
			`\tSelected: ${printElements(elements, printElement)}`;
	}
}

// Create an action realizer by providing a way to run a selector and iterate
// over selector results.
const makeActionMaterializer = <S, E, EG>(
	runSelector: (selector: S, root: E) => EG,
	forEachElement: <A extends Action<E>>(
		elements: EG,
		fn: (e: E) => ReturnType<A>
	) => ReturnType<A>[],
	printSelector: Printer<S>,
	printElement: Printer<E>
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
			throw new ZeroSelectedElementsError(
				selector,
				root,
				elements,
				printSelector,
				printElement
			);
		}
		if (elements.length > 1) {
			throw new MultipleSelectedElementsError(
				selector,
				root,
				elements,
				printSelector,
				printElement
			);
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
			throw new ZeroSelectedElementsError(
				selector,
				root,
				elements,
				printSelector,
				printElement
			);
		}
		if (elements[offset] === null || elements[offset] === undefined) {
			throw new IndexOutOfBoundsError(
				n,
				selector,
				root,
				elements,
				printSelector,
				printElement
			);
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
export type Printer<T> = (x: T) => string;

export const makeAdapter = <S, E, EG>(
	composeSelectors: ComposeSelectors<S>,
	runSelector: RunSelector<S, E, EG>,
	iterateSelector: IterateSelector<E, EG>,
	printSelector: Printer<S>,
	printElement: Printer<E>,
	defaultViews: DefaultViews<S, E>
) =>
	makeTestViewConstructor<S, E>(
		composeSelectors,
		makeActionMaterializer<S, E, EG>(
			runSelector,
			iterateSelector,
			printSelector,
			printElement
		),
		makeAggregateRealizer<S, E, EG>(runSelector, iterateSelector),
		printSelector,
		printElement,
		defaultViews
	);

export interface DefaultView<
	S,
	E,
	A extends ActionMap<E>,
	B extends AggregateMap<E>
> {
	selector: ParameterizedSelector<S, S>;
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
	? TestView<S, E, A, B, S>
	: never;

type MaterializedDefaultViews<S, E> = {
	[K in keyof DefaultViews<S, E>]: MaterializedDefaultView<
		(DefaultViews<S, E>)[K]
	>
};
