import * as React from 'react';
import testView, { selector, Selector } from '@mojotech/prismatest-enzyme';
import { mount, configure } from 'enzyme';
import * as Adapter from 'enzyme-adapter-react-16';
import App from './usage';

configure({ adapter: new Adapter() });

const render = (c: React.ReactElement) => {
  return mount(c);
};

test('User can fill out form', () => {
  const app = render(<App />);
  const form = testView.defaultViews.form.materialize(app);
  const formInputs = testView.defaultViews.textInput.materialize(app);

  formInputs.actions.enterText.at(1, 'John Doe');
  formInputs.actions.enterText.at(2, 'john@example.com');

  form.actions.submit();
});

const Children = testView(new Selector(e => e.children()));
const Name = testView(selector('label[htmlFor="name"]'));
const NameInput = Name(Children)(
  testView.defaultViews.textInput
);
const FormErrors = Name(Children)(
  testView(selector('.error'), { errorText: e => e.text() })
);

test('User must fill out name', () => {
  const app = render(<App />);
  const form = testView.defaultViews.form.materialize(app);
  const formErrors = FormErrors.materialize(app);
  const nameInput = NameInput.materialize(app);

  form.actions.submit();
  expect(formErrors.actions.errorText.one()).toEqual('Name is required');
  nameInput.actions.enterText.one('John Doe');
  form.actions.submit();
  expect(formErrors.actions.errorText()).toEqual([]);
});

