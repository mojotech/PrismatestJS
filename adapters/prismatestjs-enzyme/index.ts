import {
  makeAdapter,
  ComposeSelectors,
  RunSelector,
  IterateSelector,
  DefaultViews
} from '@mojotech/prismatest';
import {
  ReactWrapper,
  StatelessComponent,
  ComponentType,
  EnzymePropSelector
} from 'enzyme';

// This adapter works with enzyme ReactWrappers
class SelectorType {
  public run: (e: ReactWrapper) => ReactWrapper;

  constructor(run: (e: ReactWrapper) => ReactWrapper) {
    this.run = run;
  }
}

type ElementType = ReactWrapper;
type ElementGroupType = ReactWrapper;

const composeSelectors: ComposeSelectors<SelectorType> = (a, b) =>
  new SelectorType(s => b.run(a.run(s)));

const runSelector: RunSelector<SelectorType, ElementType, ElementGroupType> = (
  selector,
  element
) => selector.run(element);

const iterateSelector: IterateSelector<ElementType, ElementGroupType> = (
  nodes,
  fn
) => nodes.map(fn);

export function selector(arg: string): SelectorType;
export function selector<P2>(arg: StatelessComponent<P2>): SelectorType;
export function selector<P2>(arg: ComponentType<P2>): SelectorType;
export function selector(arg: EnzymePropSelector): SelectorType;
export function selector(arg: any): any {
  return new SelectorType(e => e.find(arg));
}

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
    },
    aggregate: {}
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
    },
    aggregate: {}
  },
  textInput: {
    selector: new SelectorType(n =>
      n.findWhere(
        e =>
          (e.type() === 'input' && e.prop('type') === 'text') ||
          e.type() === 'textarea'
      )
    ),
    actions: {
      enterText: (e, text) => {
        const input: HTMLInputElement = e.instance() as any;
        input.value = text;
        e.simulate('change', { target: input });
      },
      getText: e => (e.instance() as any).value
    },
    aggregate: {}
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
    },
    aggregate: {}
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
    },
    aggregate: {}
  },
  form: {
    selector: selector('form'),
    actions: {
      submit: e => {
        e.simulate('submit');
      }
    },
    aggregate: {}
  },
  button: {
    selector: new SelectorType(e =>
      e.findWhere(
        n =>
          n.type() === 'button' ||
          (n.type() === 'input' && n.prop('type') === 'button') ||
          (n.type() === 'input' && n.prop('type') === 'submit')
      )
    ),
    actions: {
      click: e => {
        e.simulate('click');
      }
    },
    aggregate: {}
  }
};

export default makeAdapter(
  composeSelectors,
  runSelector,
  iterateSelector,
  defaultViews
);
