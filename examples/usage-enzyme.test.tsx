import * as React from "react";
import testView, { selector, Selector } from "@mojotech/prismatest-enzyme";
import { mount, configure } from "enzyme";
import * as Adapter from "enzyme-adapter-react-16";
import App from "./usage";

configure({ adapter: new Adapter() });

const render = (c: React.ReactElement) => {
	return mount(c);
};

test("User can fill out form", () => {
	const app = render(<App />);
	const form = testView.defaultViews.form.materialize(app);
	const formInputs = testView.defaultViews.textInput.materialize(app);

	formInputs.enterText.at(1, "John Doe");
	formInputs.enterText.at(2, "john@example.com");

	form.submit();
});

const Children = testView(new Selector(e => e.children()));
const Label = testView((label: string) =>
	selector(`label[htmlFor="${label}"]`)
);
const LabelledInput = Label(Children)(testView.defaultViews.textInput);
const FormErrors = Label(Children)(
	testView(selector(".error"), { errorText: e => e.text() })
);

test("User must fill out name", () => {
	const app = render(<App />);
	const form = testView.defaultViews.form.materialize(app);
	const nameErrors = FormErrors.materialize(app, "name");
	const nameInput = LabelledInput.materialize(app, "name");

	form.submit();
	expect(nameErrors.errorText.one()).toEqual("Name is required");
	nameInput.enterText.one("John Doe");
	form.submit();
	expect(nameErrors.errorText()).toEqual([]);
});

test.skip("EXAMPLE FAILURE: User can fill in password", () => {
	const app = render(<App />);
	const paswordInput = LabelledInput.materialize(app, "password");

	paswordInput.enterText.one("testpassword");
});

test.skip("EXAMPLE FAILURE: User can fill in address", () => {
	const app = render(<App />);
	const form = testView.defaultViews.form.materialize(app);
	const nameErrors = FormErrors.materialize(app, "name");
	const nameInput = LabelledInput.materialize(app, "name");

	console.log(`Root: ${nameErrors.printRoot()}`);
	console.log(`Selector: ${nameErrors.printSelector()}`);
	console.log(`Selected: ${nameErrors.printSelected()}`);
	expect(nameErrors.errorText.one()).toEqual("Name is required");
	nameInput.enterText.one("John Doe");
	form.submit();
	expect(nameErrors.errorText()).toEqual([]);
});
