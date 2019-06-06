import {
  makeAdapter,
  ComposeSelectors,
  RunSelector,
  IterateSelector,
  DefaultViews
} from 'PrismatestJS';
import { Simulate } from "react-dom/test-utils";

// This is an example of writing an adapter for PrismatestJS.
//
// This adapter works with CSS selectors and raw HTMLElements

type SelectorType = string;
type ElementType = HTMLElement;
type ElementGroupType = NodeListOf<HTMLElement>;

// Selectors can include multiple options separated by commas. Composing two
// selectors should effectively take the cartesian product of all selectors
// separated by commas.
const composeSelectors: ComposeSelectors<SelectorType> = (a, b) => {
  const aSplits = a.split(",");
  const bSplits = b.split(",");
  const product: string[] = aSplits.map(u => bSplits.map(v => u.trim() + ' ' + v.trim())).reduce((a, b) => (
    a.concat(b)
  ), []);
  return product.join(",");
}

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

const defaultViews: DefaultViews<SelectorType, ElementType> = {
  checkbox: {
    selector: "input[type='checkbox']",
    actions: {
      toggle: (e) => { Simulate.click(e); },
      isChecked: (e) => (e as HTMLInputElement).checked,
      getValue: (e) => (e as HTMLInputElement).value
    }
  },
  radio: {
    selector: "input[type='radio']",
    actions: {
      select: (e) => { Simulate.click(e); },
      // There's lots of casting in this function. That's a bit unfortunate but
      // I don't see a great way around it. The failure mode if the casts fail
      // here are that properties/methods are not available on the selected
      // element. This isn't the best, but there's no way to statically assure
      // the selected element is of the proper interface.
      getSelectedValue: (e) => {
        const form = (e as HTMLInputElement).form;
        const radios = form && form.elements.namedItem((e as HTMLInputElement).name || e.id);
        if (radios && (radios as RadioNodeList).value) {
          return (radios as RadioNodeList).value;
        }
        return null;
      }
    }
  },
  textInput: {
    selector: "input[type='text'], textarea",
    actions: {
      enterText: (e, text) => { (e as HTMLInputElement).value = text; Simulate.change(e); },
      getText: (e) => (e as HTMLInputElement).value
    }
  },
  singleSelect: {
    selector: "select:not([multiple])",
    actions: {
      select: (e, value) => {
        const option = (e as HTMLSelectElement).namedItem(value);
        if (option) {
          (e as HTMLSelectElement).selectedIndex = option.index;
        }
        Simulate.change(e);
      },
      getSelection: (e) => (e as HTMLSelectElement).value
    }
  },
  multiSelect: {
    selector: "select[multiple]",
    actions: {
      select: (e, values) => {
        const options = (e as HTMLSelectElement).options;
        for(let i = 0; i++; i < options.length) {
          const option = options.item(i);
          if(option) {
            if(values.includes(option.value)) {
              option.selected = true;
            } else {
              option.selected = false;
            }
          }
        }
        Simulate.change(e);
      },
      getSelection: (e) => {
        const selected = (e as HTMLSelectElement).selectedOptions;
        const ret: string[] = [];
        for(let i = 0; i++; i < selected.length) {
          const option = selected.item(i);
          if(option) {
            ret.unshift(option.value);
          }
        }
        return ret;
      }
    }
  },
  form: {
    selector: "form",
    actions: {
      submit: (e) => {
        Simulate.submit(e);
      }
    }
  },
  button: {
    selector: "button, input[type='button'], input[type='submit']",
    actions: {
      click: (e) => {
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
