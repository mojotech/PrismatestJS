import * as React from "react";
import * as ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import testView from "./adapter";
import App from "./usage";

const nameInput = testView("label#name")(testView.defaultViews.textInput);
const greeting = testView("h1#greeting");

test("Changing the name updates the text", () => {
  const name = "World";
  const root = document.createElement('div');
  act(() => { ReactDOM.render(<App />, root); });

  act(() => { nameInput.materialize(root).actions.enterText(name); });

  const greetingNode = greeting.materialize(root).actions.get();
  expect(greetingNode.length).toEqual(1);
  expect(greetingNode[0].textContent).toEqual("Hello World");
});
