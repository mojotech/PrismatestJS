import * as React from "react";

const App = () => {
  const [text, setText] = React.useState('');

  return (
    <div>
      <label id="name">
        Name
        <input type='text' value={text} onChange={e => setText(e.target.value) }/>
      </label>
      <h1 id="greeting">Hello {text}</h1>
    </div>
  );
};

export default App;
