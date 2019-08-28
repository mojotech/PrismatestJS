import { generateTests } from "@mojotech/prismatest-adapter-tests";
import cssTestView from "./index";
import * as ReactDOM from "react-dom";

generateTests(cssTestView, e => {
	const domContainer = document.createElement("div");
	ReactDOM.render(e, domContainer);
	return domContainer;
});
