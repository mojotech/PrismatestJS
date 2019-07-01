import {
  makeAdapter,
  ComposeSelectors,
  RunSelector,
  IterateSelector,
  DefaultViews
} from '@mojotech/prismatest';
import { Simulate } from 'react-dom/test-utils';

// This adapter works with CSS selectors and raw HTMLElements
type SelectorType = string;
type ElementType = HTMLElement;
type ElementGroupType = NodeListOf<HTMLElement>;

// Selectors can include multiple options separated by commas. Composing two
// selectors should effectively take the cartesian product of all selectors
// separated by commas.
const composeSelectors: ComposeSelectors<SelectorType> = (a, b) => {
  const aSplits = a.split(',');
  const bSplits = b.split(',');
  const product: string[] = aSplits
    .map(u => bSplits.map(v => u.trim() + ' ' + v.trim()))
    .reduce((a, b) => a.concat(b), []);
  return product.join(',');
};

const runSelector: RunSelector<SelectorType, ElementType, ElementGroupType> = (
  selector,
  element
) => element.querySelectorAll(selector);

const iterateSelector: IterateSelector<ElementType, ElementGroupType> = (
  nodes,
  fn
) => {
  const result = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes.item(i);

    result.push(fn(node));
  }
  return result;
};

const findSelectOption = (
  options: HTMLOptionsCollection,
  value: string
): HTMLOptionElement | null => {
  for (let i = 0; i < options.length; i++) {
    const o = options[i];
    if (o.value === value) {
      return o;
    }
  }
  return null;
};

const defaultViews: DefaultViews<SelectorType, ElementType> = {
  checkbox: {
    selector: "input[type='checkbox']",
    actions: {
      toggle: e => {
        (e as HTMLInputElement).checked = !(e as HTMLInputElement).checked;
      },
      isChecked: e => (e as HTMLInputElement).checked,
      getValue: e => (e as HTMLInputElement).value
    }
  },
  radio: {
    selector: "input[type='radio']",
    actions: {
      select: e => {
        (e as HTMLInputElement).checked = true;
      },
      // There's lots of casting in this function. That's a bit unfortunate but
      // I don't see a great way around it. The failure mode if the casts fail
      // here are that properties/methods are not available on the selected
      // element. This isn't the best, but there's no way to statically assure
      // the selected element is of the proper interface.
      getSelectedValue: e => {
        const parent = e.parentNode;
        // I think there's some inconsistencies with jsdom's implementation that
        // makes RadioNodeList (and the associated methods of fetching it from a
        // form) not work reliably. So I do it this way.
        const radios =
          parent &&
          parent.querySelectorAll(
            `input[type='radio'][name='${(e as HTMLInputElement).name || e.id}'`
          );
        if (radios) {
          for (let i = 0; i < radios.length; i++) {
            const r = radios[i];
            if (r && (r as HTMLInputElement).checked) {
              return (r as HTMLInputElement).value;
            }
          }
        }
        return null;
      }
    }
  },
  textInput: {
    selector: "input[type='text'], textarea",
    actions: {
      enterText: (e, text) => {
        (e as HTMLInputElement).value = text;
      },
      getText: e => (e as HTMLInputElement).value
    }
  },
  singleSelect: {
    selector: 'select:not([multiple])',
    actions: {
      select: (e, value) => {
        const option = findSelectOption(
          (e as HTMLSelectElement).options,
          value
        );
        if (option) {
          (e as HTMLSelectElement).selectedIndex = option.index;
        }
      },
      getSelection: e => (e as HTMLSelectElement).value
    }
  },
  multiSelect: {
    selector: 'select[multiple]',
    actions: {
      select: (e, values) => {
        const options = (e as HTMLSelectElement).options;
        for (let i = 0; i < options.length; i++) {
          const option = options.item(i);
          if (option) {
            if (values.includes(option.value)) {
              option.selected = true;
            } else {
              option.selected = false;
            }
          }
        }
      },
      getSelection: e => {
        const selected = (e as HTMLSelectElement).options;
        const ret: string[] = [];
        for (let i = 0; i < selected.length; i++) {
          const option = selected.item(i);
          if (option && option.selected) {
            ret.push(option.value);
          }
        }
        return ret;
      }
    }
  },
  form: {
    selector: 'form',
    actions: {
      submit: e => {
        Simulate.submit(e);
      }
    }
  },
  button: {
    selector: "button, input[type='button'], input[type='submit']",
    actions: {
      click: e => {
        Simulate.click(e);
      }
    }
  }
};

export default makeAdapter(
  composeSelectors,
  runSelector,
  iterateSelector,
  defaultViews
);
