import { generateTests } from "@mojotech/prismatest-adapter-tests";
import cssTestView from "./index";
import * as ReactDOM from "react-dom";

generateTests(cssTestView, e => {
	const domContainer = document.createElement("div");
	ReactDOM.render(e, domContainer);
	return domContainer;
});

test("printSelector outputs the selector", () => {
	const selector = ".target";
	const el = document.createElement("div");
	const view = cssTestView(selector).materialize(el);

	expect(view.printSelector()).toEqual(selector);
});

test("printRoot outputs the outer html", () => {
	const selector = ".target";
	const el = document.createElement("div");
	const view = cssTestView(selector).materialize(el);

	expect(view.printRoot()).toEqual("<div></div>");
});
