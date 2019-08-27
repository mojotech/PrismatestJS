import * as React from 'react';
import {
  TestViewConstructor,
  MultipleSelectedElementsError
} from '@mojotech/prismatest';
import 'jest-expect-message';

interface Props<V> {
  children: (onChange: (newValue?: V) => void, value?: V) => React.ReactNode;
  defaultValue?: V;
}

interface State<V> {
  value?: V;
}

class Controller<V> extends React.Component<Props<V>, State<V>> {
  constructor(props: Props<V>) {
    super(props);

    this.state = {
      value: props.defaultValue
    };
  }

  render() {
    return this.props.children(this.onChange, this.state.value);
  }

  onChange = (newValue?: V) => {
    this.setState({ value: newValue });
  };
}

class CheckboxController extends Controller<boolean> {}
class RadioController extends Controller<string> {}
class TextController extends Controller<string> {}
class SingleSelectController extends Controller<string> {}
class MultipleSelectController extends Controller<string[]> {}

export const generateTests = <S, E>(
  adapter: TestViewConstructor<S, E>,
  render: (e: React.ReactElement) => E
) => {
  describe('controlled component tests', () => {
    describe('checkbox', () => {
      const checkboxValue = 'cb-value';
      const unchecked = (
        <CheckboxController defaultValue={false}>
          {(onChange, value) => (
            <input
              type="checkbox"
              value={checkboxValue}
              checked={value}
              onChange={e => onChange(e.target.checked)}
            />
          )}
        </CheckboxController>
      );
      const checked = (
        <CheckboxController defaultValue={true}>
          {(onChange, value) => (
            <input
              type="checkbox"
              value={checkboxValue}
              checked={value}
              onChange={e => onChange(e.target.checked)}
            />
          )}
        </CheckboxController>
      );

      test('checking an unchecked checkbox checks it', () => {
        const materialized = adapter.defaultViews.checkbox.materialize<any>(
          render(unchecked)
        );

        expect(
          materialized.isChecked.one(),
          'Checkbox should be unchecked'
        ).toEqual(false);
        materialized.toggle();
        expect(
          materialized.isChecked.one(),
          'Checkbox should be checked'
        ).toEqual(true);
      });

      test('checking a checked checkbox unchecks it', () => {
        const materialized = adapter.defaultViews.checkbox.materialize<any>(
          render(checked)
        );

        expect(
          materialized.isChecked.one(),
          'Checkbox should be checked'
        ).toEqual(true);
        materialized.toggle();
        expect(
          materialized.isChecked.one(),
          'Checkbox should be unchecked'
        ).toEqual(false);
      });

      test('can get value from checked or unchecked checkboxes', () => {
        const checkedM = adapter.defaultViews.checkbox.materialize<any>(
          render(checked)
        );
        const uncheckedM = adapter.defaultViews.checkbox.materialize<any>(
          render(unchecked)
        );

        expect(
          checkedM.getValue.one(),
          'Checked checkbox should have value'
        ).toEqual(checkboxValue);
        expect(
          uncheckedM.getValue.one(),
          'Unchecked checkbox should have value'
        ).toEqual(checkboxValue);
      });
    });

    describe('radio', () => {
      const value1 = 'rb-one';
      const value2 = 'rb-two';
      const radios = (
        <RadioController>
          {(onChange, value) => (
            <form>
              <input
                type="radio"
                name="radio"
                value={value1}
                checked={value === value1}
                onChange={e => onChange(e.target.value)}
              />
              <input
                type="radio"
                name="radio"
                value={value2}
                checked={value === value2}
                onChange={e => onChange(e.target.value)}
              />
            </form>
          )}
        </RadioController>
      );

      // TODO: Fix the API for radio buttons. It doesn't really make sense that
      // `getSelectedValue` can be called at each radio button and it gives the
      // same result. Radio buttons are inherently connected and it makes the API
      // kind of weird.
      test('selecting a value selects it', () => {
        const materialized = adapter.defaultViews.radio.materialize<any>(
          render(radios)
        );

        expect(
          materialized.getSelectedValue.at(1),
          'Radio button should have no selected value'
        ).toBeNull();
        materialized.select.at(1);
        expect(
          materialized.getSelectedValue.at(1),
          'Radio button should have selected value'
        ).toEqual(value1);
      });

      test('selecting a different value deselects the first one', () => {
        const materialized = adapter.defaultViews.radio.materialize<any>(
          render(radios)
        );

        materialized.select.at(1);
        expect(
          materialized.getSelectedValue.at(1),
          'Radio button should have selected value'
        ).toEqual(value1);
        materialized.select.at(2);
        expect(
          materialized.getSelectedValue.at(1),
          'Radio button should have selected value'
        ).toEqual(value2);
      });
    });

    describe('textInput', () => {
      const inputs = render(
        <div>
          <TextController>
            {(onChange, value) => (
              <input
                type="text"
                value={value || ''}
                onChange={e => onChange(e.target.value)}
              />
            )}
          </TextController>
          <TextController>
            {(onChange, value) => (
              <textarea
                value={value || ''}
                onChange={e => onChange(e.target.value)}
              />
            )}
          </TextController>
        </div>
      );

      test('setting a value and getting it returns the value', () => {
        const testText = 'test-text';
        const materialized = adapter.defaultViews.textInput.materialize<any>(
          inputs
        );

        expect(
          materialized.getText(),
          'Text input and textarea should have no text'
        ).toEqual(['', '']);
        materialized.enterText(testText);
        expect(
          materialized.getText(),
          'Text input and textarea should have values'
        ).toEqual([testText, testText]);
      });
    });

    describe('selects', () => {
      const testValue1 = 'one';
      const testValue2 = 'two';
      const testValue3 = 'three';
      const selectSingle = (
        <SingleSelectController>
          {(onChange, value) => (
            <select value={value} onChange={e => onChange(e.target.value)}>
              <option value="">Placeholder</option>
              <option value={testValue1}>One</option>
              <option value={testValue2}>Two</option>
            </select>
          )}
        </SingleSelectController>
      );
      const selectMultiple = (
        <MultipleSelectController defaultValue={[]}>
          {(onChange, value) => (
            <select
              multiple
              value={value}
              onChange={e => {
                const options = e.target.options;
                const value = [];
                for (let i = 0, l = options.length; i < l; i++) {
                  if (options[i].selected) {
                    value.push(options[i].value);
                  }
                }
                onChange(value);
              }}
            >
              <option value={testValue1}>One</option>
              <option value={testValue2}>Two</option>
              <option value={testValue3}>Three</option>
            </select>
          )}
        </MultipleSelectController>
      );
      const selects = (
        <div>
          {selectSingle}
          {selectMultiple}
        </div>
      );

      describe('singleSelect', () => {
        test('selecting a value and getting the selection returns the value', () => {
          const materialized = adapter.defaultViews.singleSelect.materialize<
            any
          >(render(selectSingle));

          expect(
            materialized.getSelection.one(),
            'Single select should have no selection'
          ).toEqual('');
          materialized.select(testValue1);
          expect(
            materialized.getSelection.one(),
            'Single select should have selection'
          ).toEqual(testValue1);
        });

        test('selecting a value replaces the old value', () => {
          const materialized = adapter.defaultViews.singleSelect.materialize<
            any
          >(render(selectSingle));

          materialized.select(testValue1);
          expect(
            materialized.getSelection.one(),
            'Single select should have selection'
          ).toEqual(testValue1);
          materialized.select(testValue2);
          expect(
            materialized.getSelection.one(),
            'Single select should have selection'
          ).toEqual(testValue2);
        });

        test('does not select the multi-select', () => {
          const materialized = adapter.defaultViews.singleSelect.materialize<
            any
          >(render(selects));

          expect(
            () => materialized.get.one(),
            'Selector selected multiple elements'
          ).not.toThrow(MultipleSelectedElementsError);
        });
      });

      describe('multipleSelect', () => {
        test('selecting some values and getting the selection returns the values', () => {
          const materialized = adapter.defaultViews.multiSelect.materialize<
            any
          >(render(selectMultiple));

          expect(
            materialized.getSelection.one(),
            'Multiple select should have no selections'
          ).toEqual([]);
          materialized.select([testValue1, testValue3]);
          expect(
            materialized.getSelection.one(),
            'Multiple select should have selections'
          ).toEqual([testValue1, testValue3]);
        });

        test('selecting some values replaces the old values', () => {
          const materialized = adapter.defaultViews.multiSelect.materialize<
            any
          >(render(selectMultiple));

          materialized.select([testValue1, testValue2]);
          expect(
            materialized.getSelection.one(),
            'Multiple select should have selections'
          ).toEqual([testValue1, testValue2]);
          materialized.select([testValue2, testValue3]);
          expect(
            materialized.getSelection.one(),
            'Multiple select should have selections'
          ).toEqual([testValue2, testValue3]);
        });

        test('selecting no values returns no values', () => {
          const materialized = adapter.defaultViews.multiSelect.materialize<
            any
          >(render(selectMultiple));

          materialized.select([testValue1, testValue2]);
          expect(
            materialized.getSelection.one(),
            'Multiple select should have selections'
          ).toEqual([testValue1, testValue2]);
          materialized.select([]);
          expect(
            materialized.getSelection.one(),
            'Multiple select should have no selections'
          ).toEqual([]);
        });

        test('does not select the single-select', () => {
          const materialized = adapter.defaultViews.multiSelect.materialize<
            any
          >(render(selects));

          expect(
            () => materialized.get.one(),
            'Selector selected multiple elements'
          ).not.toThrow(MultipleSelectedElementsError);
        });
      });
    });
  });
};
