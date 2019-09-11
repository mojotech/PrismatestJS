import * as React from "react";
import * as ReactDOM from "react-dom";
import testView from "@mojotech/prismatest-css";
import App from "./usage";

const render = (c: React.ReactElement) => {
	const root = document.createElement("div");
	ReactDOM.render(c, root);
	return root;
};

test("User can fill out form", () => {
	const app = render(<App />);
	const form = testView.defaultViews.form.materialize(app);
	const formInputs = testView.defaultViews.textInput.materialize(app);

	formInputs.enterText.at(1, "John Doe");
	formInputs.enterText.at(2, "john@example.com");

	form.submit();
});

const Input = testView((label: string) => `label[for='${label}']`)(
	testView.defaultViews.textInput
);
const FormErrors = Input(
	testView("+ .error", { errorText: e => e.textContent })
);

test("User must fill out name", () => {
	const app = render(<App />);
	const form = testView.defaultViews.form.materialize(app);
	const nameErrors = FormErrors.materialize(app, "name");
	const nameInput = Input.materialize(app, "name");

	form.submit();
	expect(nameErrors.errorText.one()).toEqual("Name is required");
	nameInput.enterText.one("John Doe");
	form.submit();
	expect(nameErrors.errorText()).toEqual([]);
});

test.skip("EXAMPLE FAILURE: User can fill in password", () => {
	const app = render(<App />);
	const paswordInput = Input.materialize(app, "password");

	paswordInput.enterText.one("testpassword");
});

test.skip("EXAMPLE FAILURE: User can fill in address", () => {
	const app = render(<App />);
	const form = testView.defaultViews.form.materialize(app);
	const nameErrors = FormErrors.materialize(app, "name");
	const nameInput = Input.materialize(app, "name");

	console.log(`Root: ${nameErrors.printRoot()}`);
	console.log(`Selector: ${nameErrors.printSelector()}`);
	console.log(`Selected: ${nameErrors.printSelected()}`);
	expect(nameErrors.errorText.one()).toEqual("Name is required");
	nameInput.enterText.one("John Doe");
	form.submit();
	expect(nameErrors.errorText()).toEqual([]);
});
