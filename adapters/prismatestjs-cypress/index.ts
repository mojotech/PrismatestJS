/// <reference types="cypress" />
import {
	makeAdapter,
	ComposeSelectors,
	RunSelector,
	IterateSelector,
	DefaultViews,
	Printer
} from "@mojotech/prismatest";

type Chainable<S> = Cypress.Chainable<S>;
type Loggable = Cypress.Loggable;
type Timeoutable = Cypress.Timeoutable;
type CaseMatchable = Cypress.CaseMatchable;

type ContainsOptions = Partial<Loggable & Timeoutable & CaseMatchable>;
type FindOptions = Partial<Loggable & Timeoutable>;

type CySelector = keyof HTMLElementTagNameMap | string;
type ContainsSelectorType = {
	type: "contains";
	selector?: CySelector;
	text: string | number | RegExp;
	options?: ContainsOptions;
};
type FindSelectorType = {
	type: "find";
	selector: CySelector;
	options?: FindOptions;
};
type BaseSelectorType = ContainsSelectorType | FindSelectorType;
type ComposedSelectorType = { type: "composed"; selectors: BaseSelectorType[] };

export const findSelector = (
	selector: CySelector,
	options?: FindOptions
): FindSelectorType => ({
	type: "find",
	selector,
	options
});

export const containsSelector = (
	text: string | number | RegExp,
	selector?: CySelector,
	options?: ContainsOptions
): ContainsSelectorType => ({
	type: "contains",
	text,
	selector,
	options
});

type SelectorType = BaseSelectorType | ComposedSelectorType;
type ElementType = Chainable<JQuery<HTMLElement>>;
type ElementGroupType = Chainable<JQuery<HTMLElement>>;

const forBaseSelector = <R>(
	contains: (s: ContainsSelectorType) => R,
	find: (s: FindSelectorType) => R
) => (s: BaseSelectorType): R => {
	if (s.type === "contains") {
		return contains(s);
	}
	return find(s);
};

const forSelector = <R>(
	base: (s: BaseSelectorType) => R,
	composed: (s: ComposedSelectorType) => R
) => (s: SelectorType): R => {
	if (s.type === "composed") {
		return composed(s);
	}
	return base(s);
};

const forTwoSelectors = <R>(
	bothComposed: (a: ComposedSelectorType, b: ComposedSelectorType) => R,
	aComposed: (a: ComposedSelectorType, b: BaseSelectorType) => R,
	bComposed: (a: BaseSelectorType, b: ComposedSelectorType) => R,
	noComposed: (a: BaseSelectorType, b: BaseSelectorType) => R
) => (a: SelectorType, b: SelectorType): R =>
	forSelector(
		s =>
			forSelector(
				p => noComposed(s, p),
				p => bComposed(s, p)
			)(b),
		s =>
			forSelector(
				p => aComposed(s, p),
				p => bothComposed(s, p)
			)(b)
	)(a);

const composeSelectors: ComposeSelectors<SelectorType> = forTwoSelectors<
	ComposedSelectorType
>(
	(a, b) => ({
		type: "composed",
		selectors: a.selectors.concat(b.selectors)
	}),
	(a, b) => ({ type: "composed", selectors: a.selectors.concat(b) }),
	(a, b) => ({ type: "composed", selectors: [a].concat(b.selectors) }),
	(a, b) => ({ type: "composed", selectors: [a, b] })
);

const runContainsSelector = (c: ContainsSelectorType, element: ElementType) =>
	c.selector !== undefined
		? element.contains(c.selector, c.text, c.options)
		: element.contains(c.text, c.options);

const runSelector: RunSelector<SelectorType, ElementType, ElementGroupType> = (
	selector,
	element
) => {
	const renderSingle = forBaseSelector(
		c => runContainsSelector(c, element),
		f => element.get(f.selector, f.options)
	);
	let first = true;
	return forSelector(renderSingle, c =>
		c.selectors.reduce((chain, selector) => {
			const v = forBaseSelector(
				c => runContainsSelector(c, chain),
				f =>
					first
						? chain.get(f.selector, f.options)
						: chain.find(f.selector, f.options)
			)(selector);
			first = false;
			return v;
		}, element)
	)(selector);
};

const iterateSelector: IterateSelector<ElementType, ElementGroupType> = (
	chainable,
	fn
) => {
	// TODO
	const result: any[] = [];
	chainable.each(node => {
		const n: ElementType = chainable.end().wrap(node);
		// uses end() so we don't have a dependency on a global 'cy' object
		result.push(fn(n));
	});
	return result;
};

const printBaseSelector: Printer<BaseSelectorType> = forBaseSelector(
	c => JSON.stringify(c, null, 4),
	f => JSON.stringify(f, null, 4)
);

const printSelector: Printer<SelectorType> = forSelector(printBaseSelector, c =>
	c.selectors.map(printBaseSelector).join("\nfollowed by\n")
);

const printElement: Printer<ElementType> = element => {
	const els: string[] = [];
	element.each((node: JQuery<HTMLElement>) => {
		for (let n of node) {
			els.push(n.outerHTML);
		}
	});
	return els.join("\n");
};

// Nasty hack so we can "unwrap" Cypress commands
export const waitForCypress = (f: (resolve: () => void) => void) => {
	Promise.all([new Promise(f)]);
};

const defaultViews: DefaultViews<SelectorType, ElementType> = {
	checkbox: {
		selector: findSelector("input[type='checkbox']"),
		actions: {
			toggle: e => {
				e.click();
			},
			isChecked: e => {
				let x: boolean = null as any;
				waitForCypress(resolve => {
					e.its("checked").then(b => {
						x = b;
						resolve();
					});
				});
				return x;
			},
			getValue: e => {
				let x: string = null as any;
				waitForCypress(resolve => {
					e.its("value").then(v => {
						x = v;
						resolve();
					});
				});
				return x;
			}
		},
		aggregate: {}
	},
	radio: {
		selector: findSelector("input[type='radio']"),
		actions: {
			select: e => {
				e.click();
			},
			getSelectedValue: e => {
				const parent = e.parent();
				const radios = parent.find(
					`input[type='radio'][name='${e.its("name") || e.its("id")}'`
				);
				let selectedValue: string | null = null;
				waitForCypress(resolve => {
					radios
						.each(r => {
							if (r.prop("checked") && selectedValue === null) {
								selectedValue = r.prop("value");
							}
						})
						.then(() => resolve());
				});
				return selectedValue;
			}
		},
		aggregate: {}
	},
	textInput: {
		selector: findSelector("input[type='text'], textarea"),
		actions: {
			enterText: (e, text) => {
				e.type(text);
			},
			getText: e => {
				let x: string = null as any;
				waitForCypress(resolve => {
					e.its("value").then(v => {
						x = v;
						resolve();
					});
				});
				return x;
			}
		},
		aggregate: {}
	},
	singleSelect: {
		selector: findSelector("select:not([multiple])"),
		actions: {
			select: (e, value) => {
				e.select(value);
			},
			getSelection: e => {
				let x: string = null as any;
				waitForCypress(resolve => {
					e.its("value").then(v => {
						x = v;
						resolve();
					});
				});
				return x;
			}
		},
		aggregate: {}
	},
	multiSelect: {
		selector: findSelector("select[multiple]"),
		actions: {
			select: (e, values) => {
				e.select(values);
			},
			getSelection: e => {
				let x: string[] = null as any;
				waitForCypress(resolve => {
					e.its("value").then(v => {
						x = v;
						resolve();
					});
				});
				return x;
			}
		},
		aggregate: {}
	},
	form: {
		selector: findSelector("form"),
		actions: {
			submit: e => {
				e.submit();
			}
		},
		aggregate: {}
	},
	button: {
		selector: findSelector(
			"button, input[type='button'], input[type='submit']"
		),
		actions: {
			click: e => {
				e.click();
			}
		},
		aggregate: {}
	}
};

export default makeAdapter(
	composeSelectors,
	runSelector,
	iterateSelector,
	printSelector,
	printElement,
	defaultViews
);
