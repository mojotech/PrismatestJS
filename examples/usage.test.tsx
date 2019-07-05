import * as React from "react";
import * as ReactDOM from "react-dom";
import testView from "@mojotech/prismatest-css";
import App from "./usage";

const nameInput = testView("label#name")(testView.defaultViews.textInput);
const greeting = testView("h1#greeting");

test("Changing the name updates the text", () => {
  const name = "World";
  const root = document.createElement('div');
  ReactDOM.render(<App />, root);

  nameInput.materialize(root).actions.enterText(name);

  const greetingNode = greeting.materialize(root).actions.get.one();
  expect(greetingNode.textContent).toEqual("Hello World");
});
