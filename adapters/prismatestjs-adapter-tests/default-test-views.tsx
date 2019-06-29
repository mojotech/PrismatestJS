import * as React from 'react';
import {
  TestViewConstructor,
  MultipleSelectedElementsError
} from '@mojotech/prismatest';

export const generateTests = <S, E>(
  adapter: TestViewConstructor<S, E>,
  render: (e: React.ReactElement) => E
) => {
  describe('checkbox', () => {
    const checkboxValue = 'cb-value';
    const unchecked = <input type="checkbox" value={checkboxValue} />;
    const checked = (
      <input type="checkbox" defaultChecked value={checkboxValue} />
    );

    test('checking an unchecked checkbox checks it', () => {
      const materialized = adapter.defaultViews.checkbox.materialize(
        render(unchecked)
      );

      expect(materialized.actions.isChecked.one()).toEqual(false);
      materialized.actions.toggle();
      expect(materialized.actions.isChecked.one()).toEqual(true);
    });

    test('checking a checked checkbox unchecks it', () => {
      const materialized = adapter.defaultViews.checkbox.materialize(
        render(checked)
      );

      expect(materialized.actions.isChecked.one()).toEqual(true);
      materialized.actions.toggle();
      expect(materialized.actions.isChecked.one()).toEqual(false);
    });

    test('can get value from checked or unchecked checkboxes', () => {
      const checkedM = adapter.defaultViews.checkbox.materialize(
        render(checked)
      );
      const uncheckedM = adapter.defaultViews.checkbox.materialize(
        render(unchecked)
      );

      expect(checkedM.actions.getValue.one()).toEqual(checkboxValue);
      expect(uncheckedM.actions.getValue.one()).toEqual(checkboxValue);
    });
  });

  describe('radio', () => {
    const value1 = 'rb-one';
    const value2 = 'rb-two';
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
    test('selecting a value selects it', () => {
      const materialized = adapter.defaultViews.radio.materialize(
        render(radios)
      );

      expect(materialized.actions.getSelectedValue.at(1)).toBeNull();
      materialized.actions.select.at(1);
      expect(materialized.actions.getSelectedValue.at(1)).toEqual(value1);
    });

    test('selecting a different value deselects the first one', () => {
      const materialized = adapter.defaultViews.radio.materialize(
        render(radios)
      );

      materialized.actions.select.at(1);
      expect(materialized.actions.getSelectedValue.at(1)).toEqual(value1);
      materialized.actions.select.at(2);
      expect(materialized.actions.getSelectedValue.at(1)).toEqual(value2);
    });
  });

  describe('textInput', () => {
    const inputs = render(
      <div>
        <input type="text" />;
        <textarea />;
      </div>
    );

    test('setting a value and getting it returns the value', () => {
      const testText = 'test-text';
      const materialized = adapter.defaultViews.textInput.materialize(inputs);

      expect(materialized.actions.getText()).toEqual(['', '']);
      materialized.actions.enterText(testText);
      expect(materialized.actions.getText()).toEqual([testText, testText]);
    });
  });

  describe('selects', () => {
    const testValue1 = 'one';
    const testValue2 = 'two';
    const testValue3 = 'three';
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

    describe('singleSelect', () => {
      test('selecting a value and getting the selection returns the value', () => {
        const materialized = adapter.defaultViews.singleSelect.materialize(
          render(selectSingle)
        );

        expect(materialized.actions.getSelection.one()).toEqual('');
        materialized.actions.select(testValue1);
        expect(materialized.actions.getSelection.one()).toEqual(testValue1);
      });

      test('selecting a value replaces the old value', () => {
        const materialized = adapter.defaultViews.singleSelect.materialize(
          render(selectSingle)
        );

        materialized.actions.select(testValue1);
        expect(materialized.actions.getSelection.one()).toEqual(testValue1);
        materialized.actions.select(testValue2);
        expect(materialized.actions.getSelection.one()).toEqual(testValue2);
      });

      test('does not select the multi-select', () => {
        const materialized = adapter.defaultViews.singleSelect.materialize(
          render(selects)
        );

        expect(() => materialized.actions.get.one()).not.toThrow(
          MultipleSelectedElementsError
        );
      });
    });

    describe('multipleSelect', () => {
      test('selecting some values and getting the selection returns the values', () => {
        const materialized = adapter.defaultViews.multiSelect.materialize(
          render(selectMultiple)
        );

        expect(materialized.actions.getSelection.one()).toEqual([]);
        materialized.actions.select([testValue1, testValue3]);
        expect(materialized.actions.getSelection.one()).toEqual([
          testValue1,
          testValue3
        ]);
      });

      test('selecting some values replaces the old values', () => {
        const materialized = adapter.defaultViews.multiSelect.materialize(
          render(selectMultiple)
        );

        materialized.actions.select([testValue1, testValue2]);
        expect(materialized.actions.getSelection.one()).toEqual([
          testValue1,
          testValue2
        ]);
        materialized.actions.select([testValue2, testValue3]);
        expect(materialized.actions.getSelection.one()).toEqual([
          testValue2,
          testValue3
        ]);
      });

      test('selecting no values returns no values', () => {
        const materialized = adapter.defaultViews.multiSelect.materialize(
          render(selectMultiple)
        );

        materialized.actions.select([testValue1, testValue2]);
        expect(materialized.actions.getSelection.one()).toEqual([
          testValue1,
          testValue2
        ]);
        materialized.actions.select([]);
        expect(materialized.actions.getSelection.one()).toEqual([]);
      });

      test('does not select the single-select', () => {
        const materialized = adapter.defaultViews.multiSelect.materialize(
          render(selects)
        );

        expect(() => materialized.actions.get.one()).not.toThrow(
          MultipleSelectedElementsError
        );
      });
    });
  });

  describe('form', () => {
    let flag = false;
    const form = (
      <form
        onSubmit={() => {
          flag = true;
        }}
      />
    );

    test('calls submit handler', () => {
      const materialized = adapter.defaultViews.form.materialize(render(form));

      expect(flag).toEqual(false);
      materialized.actions.submit.one();
      expect(flag).toEqual(true);
    });
  });

  describe('button', () => {
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

    test('calls click handler of button tag', () => {
      const materialized = adapter.defaultViews
        .form(adapter.defaultViews.button)
        .materialize(render(buttons));

      expect(tagFlag).toEqual(false);
      materialized.actions.click.at(1);
      expect(tagFlag).toEqual(true);
    });

    test('calls click handler of button input', () => {
      const materialized = adapter.defaultViews
        .form(adapter.defaultViews.button)
        .materialize(render(buttons));

      expect(inputFlag).toEqual(false);
      materialized.actions.click.at(2);
      expect(inputFlag).toEqual(true);
    });

    test('calls click handler of submit button', () => {
      const materialized = adapter.defaultViews
        .form(adapter.defaultViews.button)
        .materialize(render(buttons));

      expect(submitFlag).toEqual(false);
      materialized.actions.click.at(3);
      expect(submitFlag).toEqual(true);
    });
  });
};
