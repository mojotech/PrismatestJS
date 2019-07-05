import {
  makeAdapter,
  ComposeSelectors,
  RunSelector,
  IterateSelector,
  DefaultViews
} from '@mojotech/prismatest';
import { ReactWrapper } from 'enzyme';

// This adapter works with enzyme ReactWrappers
type SelectorType = (e: ReactWrapper) => ReactWrapper;
type ElementType = ReactWrapper;
type ElementGroupType = ReactWrapper;

const composeSelectors: ComposeSelectors<SelectorType> = (a, b) => s => b(a(s));

const runSelector: RunSelector<SelectorType, ElementType, ElementGroupType> = (
  selector,
  element
) => selector(element);

const iterateSelector: IterateSelector<ElementType, ElementGroupType> = (
  nodes,
  fn
) => nodes.map(fn);

export const selector = (
  ...args: Parameters<ReactWrapper['find']>
): SelectorType => e => e.find(...args);

// Apparently, Enzyme isn't really intended to manipulate the raw DOM nodes,
// only React components. As such this is basically the same code as from the
// CSS adapter, just with some Enzyme specific setup.
const defaultViews: DefaultViews<SelectorType, ElementType> = {
  checkbox: {
    selector: selector("input[type='checkbox']"),
    actions: {
      toggle: e => {
        const node: HTMLInputElement = e.instance() as any;
        node.checked = !node.checked;
        e.simulate('change', { currentTarget: node, target: node });
      },
      isChecked: e => (e.instance() as any).checked,
      getValue: e => e.prop('value')
    }
  },
  radio: {
    selector: selector("input[type='radio']"),
    actions: {
      select: e => {
        const node: HTMLInputElement = e.instance() as any;
        node.checked = true;
        e.simulate('change', { currentTarget: node, target: node });
      },
      getSelectedValue: e => {
        const node: HTMLInputElement = e.instance() as any;
        // I was trying to do this with enzyme's parent() method. But
        // `e.parent().children()` won't give me the children.
        const parent = node.parentNode;
        // I think there's some inconsistencies with jsdom's implementation that
        // makes RadioNodeList (and the associated methods of fetching it from a
        // form) not work reliably. So I do it this way.
        const radios =
          parent &&
          parent.querySelectorAll(
            `:scope > input[type='radio'][name='${node.name || node.id}'`
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
    selector: n =>
      n
        .children()
        .filterWhere(
          e =>
            (e.type() === 'input' && e.prop('type') === 'text') ||
            e.type() === 'textarea'
        ),
    actions: {
      enterText: (e, text) => {
        const input: HTMLInputElement = e.instance() as any;
        input.value = text;
        e.simulate('change', { target: input });
      },
      getText: e => (e.instance() as any).value
    }
  },
  singleSelect: {
    selector: selector('select:not([multiple])'),
    actions: {
      select: (e, value) => {
        const select: HTMLSelectElement = e.instance() as any;
        const option = e
          .children()
          .filterWhere(e => (e.instance() as any).value === value);
        if (option.length > 0) {
          select.selectedIndex = (option.instance() as any).index;
          e.simulate('change', { target: select });
        }
      },
      getSelection: e => (e.instance() as any).value
    }
  },
  multiSelect: {
    selector: selector('select[multiple]'),
    actions: {
      select: (e, values) => {
        const node: HTMLSelectElement = e.instance() as any;
        const options = node.options;
        let shouldChange = false;
        for (let i = 0; i < options.length; i++) {
          const option = options.item(i);
          if (option) {
            shouldChange = true;
            if (values.includes(option.value)) {
              option.selected = true;
            } else {
              option.selected = false;
            }
          }
        }
        if (shouldChange) {
          e.simulate('change', { currentTarget: node, target: node });
        }
      },
      getSelection: e =>
        e
          .children()
          .filterWhere(e => (e.instance() as any).selected)
          .map(e => (e.instance() as any).value)
    }
  },
  form: {
    selector: selector('form'),
    actions: {
      submit: e => {
        e.simulate('submit');
      }
    }
  },
  button: {
    selector: e =>
      e.findWhere(
        n =>
          n.type() === 'button' ||
          (n.type() === 'input' && n.prop('type') === 'button') ||
          (n.type() === 'input' && n.prop('type') === 'submit')
      ),
    actions: {
      click: e => {
        e.simulate('click');
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
