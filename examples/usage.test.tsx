import * as React from 'react';
import * as ReactDOM from 'react-dom';
import testView from '@mojotech/prismatest-css';
import App from './usage';

const render = (c: React.ReactElement) => {
  const root = document.createElement('div');
  ReactDOM.render(c, root);
  return root;
};

test('User can fill out form', () => {
  const app = render(<App />);
  const form = testView.defaultViews.form.materialize(app);
  const formInputs = testView.defaultViews.textInput.materialize(app);

  formInputs.actions.enterText.at(1, 'John Doe');
  formInputs.actions.enterText.at(2, 'john@example.com');

  form.actions.submit();
});

const NameInput = testView("label[for='name']")(
  testView.defaultViews.textInput
);
const FormErrors = NameInput(
  testView('+ .error', { errorText: e => e.textContent })
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
