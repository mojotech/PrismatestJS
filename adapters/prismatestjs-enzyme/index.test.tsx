import * as React from "react";
import { generateTests } from "@mojotech/prismatest-adapter-tests";
import enzymeTestView, { selector, Selector } from "./index";
import { mount, configure } from "enzyme";
import * as Adapter from "enzyme-adapter-react-16";

configure({ adapter: new Adapter() });

generateTests(enzymeTestView, mount);

class DummyComponent extends React.Component {
	static displayName = "DummyComponent";
}

describe("printSelector", () => {
	test("printSelector outputs the quick selector", () => {
		let el = mount(<div />);
		let sel = selector(".target");
		let view = enzymeTestView(sel).materialize(el);
		expect(view.printSelector()).toEqual('QuickSelector: ".target"');

		sel = selector(DummyComponent);
		view = enzymeTestView(sel).materialize(el);
		expect(view.printSelector()).toEqual('QuickSelector: "DummyComponent"');

		sel = selector({ testProp: 4 });
		view = enzymeTestView(sel).materialize(el);
		expect(view.printSelector()).toEqual(
			'QuickSelector: "{\n\t"testProp": 4\n}"'
		);
	});

	test("printSelector outputs the function selectors", () => {
		const el = mount(<div />);
		const sel = new Selector(e => e.find(".target"));
		const view = enzymeTestView(sel).materialize(el);
		expect(view.printSelector()).toEqual(
			'Selector: function (e) { return e.find(".target"); }'
		);
	});

	test("printSelector outputs the composed selectors", () => {
		const el = mount(<div />);
		const sel1 = new Selector(e => e.find(".target"));
		const sel2 = selector(".bullseye");
		const view = enzymeTestView(sel1)(enzymeTestView(sel2)).materialize(el);
		expect(view.printSelector()).toEqual(
			'Selector: function (e) { return e.find(".target"); }\nQuickSelector: ".bullseye"'
		);
	});
});

test("printRoot outputs the outer html", () => {
	const sel = selector(".target");
	const el = mount(<div />);
	const view = enzymeTestView(sel).materialize(el);

	expect(view.printRoot()).toEqual("<div />");
});
