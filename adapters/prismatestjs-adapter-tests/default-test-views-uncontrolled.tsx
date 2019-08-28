import * as React from "react";
import {
	TestViewConstructor,
	MultipleSelectedElementsError
} from "@mojotech/prismatest";
import "jest-expect-message";

export const generateTests = <S, E>(
	adapter: TestViewConstructor<S, E>,
	render: (e: React.ReactElement) => E
) => {
	describe("uncontrolled component tests", () => {
		describe("checkbox", () => {
			const checkboxValue = "cb-value";
			const unchecked = <input type="checkbox" value={checkboxValue} />;
			const checked = (
				<input type="checkbox" defaultChecked value={checkboxValue} />
			);

			test("checking an unchecked checkbox checks it", () => {
				const materialized = adapter.defaultViews.checkbox.materialize<any>(
					render(unchecked)
				);

				expect(
					materialized.isChecked.one(),
					"Checkbox should be unchecked"
				).toEqual(false);
				materialized.toggle();
				expect(
					materialized.isChecked.one(),
					"Checkbox should be checked"
				).toEqual(true);
			});

			test("checking a checked checkbox unchecks it", () => {
				const materialized = adapter.defaultViews.checkbox.materialize<any>(
					render(checked)
				);

				expect(
					materialized.isChecked.one(),
					"Checkbox should be checked"
				).toEqual(true);
				materialized.toggle();
				expect(
					materialized.isChecked.one(),
					"Checkbox should be unchecked"
				).toEqual(false);
			});

			test("can get value from checked or unchecked checkboxes", () => {
				const checkedM = adapter.defaultViews.checkbox.materialize<any>(
					render(checked)
				);
				const uncheckedM = adapter.defaultViews.checkbox.materialize<any>(
					render(unchecked)
				);

				expect(
					checkedM.getValue.one(),
					"Checked checkbox should have value"
				).toEqual(checkboxValue);
				expect(
					uncheckedM.getValue.one(),
					"Unchecked checkbox should have value"
				).toEqual(checkboxValue);
			});
		});

		describe("radio", () => {
			const value1 = "rb-one";
			const value2 = "rb-two";
			const radios = (
				<form>
					<input type="radio" name="radio" value={value1} />
					<input type="radio" name="radio" value={value2} />
				</form>
			);

			// TODO: Fix the API for radio buttons. It doesn't really make sense that
			// `getSelectedValue` can be called at each radio button and it gives the
			// same result. Radio buttons are inherently connected and it makes the API
			// kind of weird.
			test("selecting a value selects it", () => {
				const materialized = adapter.defaultViews.radio.materialize<any>(
					render(radios)
				);

				expect(
					materialized.getSelectedValue.at(1),
					"Radio button should have no selected value"
				).toBeNull();
				materialized.select.at(1);
				expect(
					materialized.getSelectedValue.at(1),
					"Radio button should have selected value"
				).toEqual(value1);
			});

			test("selecting a different value deselects the first one", () => {
				const materialized = adapter.defaultViews.radio.materialize<any>(
					render(radios)
				);

				materialized.select.at(1);
				expect(
					materialized.getSelectedValue.at(1),
					"Radio button should have selected value"
				).toEqual(value1);
				materialized.select.at(2);
				expect(
					materialized.getSelectedValue.at(1),
					"Radio button should have selected value"
				).toEqual(value2);
			});
		});

		describe("textInput", () => {
			const inputs = render(
				<div>
					<input type="text" />;
					<textarea />;
				</div>
			);

			test("setting a value and getting it returns the value", () => {
				const testText = "test-text";
				const materialized = adapter.defaultViews.textInput.materialize<any>(
					inputs
				);

				expect(
					materialized.getText(),
					"Text input and textarea should have no text"
				).toEqual(["", ""]);
				materialized.enterText(testText);
				expect(
					materialized.getText(),
					"Text input and textarea should have values"
				).toEqual([testText, testText]);
			});
		});

		describe("selects", () => {
			const testValue1 = "one";
			const testValue2 = "two";
			const testValue3 = "three";
			const selectSingle = (
				<select>
					<option value="">Placeholder</option>
					<option value={testValue1}>One</option>
					<option value={testValue2}>Two</option>
				</select>
			);
			const selectMultiple = (
				<select multiple>
					<option value={testValue1}>One</option>
					<option value={testValue2}>Two</option>
					<option value={testValue3}>Three</option>
				</select>
			);
			const selects = (
				<div>
					{selectSingle}
					{selectMultiple}
				</div>
			);

			describe("singleSelect", () => {
				test("selecting a value and getting the selection returns the value", () => {
					const materialized = adapter.defaultViews.singleSelect.materialize<
						any
					>(render(selectSingle));

					expect(
						materialized.getSelection.one(),
						"Single select should have no selection"
					).toEqual("");
					materialized.select(testValue1);
					expect(
						materialized.getSelection.one(),
						"Single select should have selection"
					).toEqual(testValue1);
				});

				test("selecting a value replaces the old value", () => {
					const materialized = adapter.defaultViews.singleSelect.materialize<
						any
					>(render(selectSingle));

					materialized.select(testValue1);
					expect(
						materialized.getSelection.one(),
						"Single select should have selection"
					).toEqual(testValue1);
					materialized.select(testValue2);
					expect(
						materialized.getSelection.one(),
						"Single select should have selection"
					).toEqual(testValue2);
				});

				test("does not select the multi-select", () => {
					const materialized = adapter.defaultViews.singleSelect.materialize<
						any
					>(render(selects));

					expect(
						() => materialized.get.one(),
						"Selector selected multiple elements"
					).not.toThrow(MultipleSelectedElementsError);
				});
			});

			describe("multipleSelect", () => {
				test("selecting some values and getting the selection returns the values", () => {
					const materialized = adapter.defaultViews.multiSelect.materialize<
						any
					>(render(selectMultiple));

					expect(
						materialized.getSelection.one(),
						"Multiple select should have no selections"
					).toEqual([]);
					materialized.select([testValue1, testValue3]);
					expect(
						materialized.getSelection.one(),
						"Multiple select should have selections"
					).toEqual([testValue1, testValue3]);
				});

				test("selecting some values replaces the old values", () => {
					const materialized = adapter.defaultViews.multiSelect.materialize<
						any
					>(render(selectMultiple));

					materialized.select([testValue1, testValue2]);
					expect(
						materialized.getSelection.one(),
						"Multiple select should have selections"
					).toEqual([testValue1, testValue2]);
					materialized.select([testValue2, testValue3]);
					expect(
						materialized.getSelection.one(),
						"Multiple select should have selections"
					).toEqual([testValue2, testValue3]);
				});

				test("selecting no values returns no values", () => {
					const materialized = adapter.defaultViews.multiSelect.materialize<
						any
					>(render(selectMultiple));

					materialized.select([testValue1, testValue2]);
					expect(
						materialized.getSelection.one(),
						"Multiple select should have selections"
					).toEqual([testValue1, testValue2]);
					materialized.select([]);
					expect(
						materialized.getSelection.one(),
						"Multiple select should have no selections"
					).toEqual([]);
				});

				test("does not select the single-select", () => {
					const materialized = adapter.defaultViews.multiSelect.materialize<
						any
					>(render(selects));

					expect(
						() => materialized.get.one(),
						"Selector selected multiple elements"
					).not.toThrow(MultipleSelectedElementsError);
				});
			});
		});

		describe("form", () => {
			let flag = false;
			const form = (
				<form
					onSubmit={() => {
						flag = true;
					}}
				/>
			);

			test("calls submit handler", () => {
				const materialized = adapter.defaultViews.form.materialize<any>(
					render(form)
				);

				expect(flag, "Should not have called submit handler").toEqual(false);
				materialized.submit.one();
				expect(flag, "Should have called submit handler").toEqual(true);
			});
		});

		describe("button", () => {
			let tagFlag: boolean;
			let inputFlag: boolean;
			let submitFlag: boolean;

			beforeEach(() => {
				tagFlag = false;
				inputFlag = false;
				submitFlag = false;
			});

			const buttons = (
				<form>
					<button
						onClick={() => {
							tagFlag = true;
						}}
					/>
					<input
						type="button"
						onClick={() => {
							inputFlag = true;
						}}
					/>
					<input
						type="submit"
						onClick={() => {
							submitFlag = true;
						}}
					/>
				</form>
			);

			test("calls click handler of button tag", () => {
				const materialized = adapter.defaultViews
					.form(adapter.defaultViews.button)
					.materialize<any>(render(buttons));

				expect(tagFlag, "Should not have called click handler").toEqual(false);
				materialized.click.at(1);
				expect(tagFlag, "Should have called click handler").toEqual(true);
			});

			test("calls click handler of button input", () => {
				const materialized = adapter.defaultViews
					.form(adapter.defaultViews.button)
					.materialize<any>(render(buttons));

				expect(inputFlag, "Should not have called click handler").toEqual(
					false
				);
				materialized.click.at(2);
				expect(inputFlag, "Should have called click handler").toEqual(true);
			});

			test("calls click handler of submit button", () => {
				const materialized = adapter.defaultViews
					.form(adapter.defaultViews.button)
					.materialize<any>(render(buttons));

				expect(submitFlag, "Should not have called click handler").toEqual(
					false
				);
				materialized.click.at(3);
				expect(submitFlag, "Should have called click handler").toEqual(true);
			});
		});
	});
};
