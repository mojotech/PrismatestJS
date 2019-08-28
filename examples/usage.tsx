import * as React from "react";

const App = () => {
	const [name, setName] = React.useState("");
	const [email, setEmail] = React.useState("");
	const [error, setError] = React.useState<null | string>(null);

	const submit = (newName: string) => {
		if (newName === "") {
			setError("Name is required");
		} else {
			setError(null);
		}
	};

	return (
		<form onSubmit={() => submit(name)}>
			<label htmlFor="name">
				Name
				<input
					name="name"
					type="text"
					required={true}
					value={name}
					onChange={e => setName(e.target.value)}
				/>
				{error && <p className="error">{error}</p>}
			</label>
			<label htmlFor="email">
				Email
				<input
					name="email"
					type="text"
					required={true}
					value={email}
					onChange={e => setEmail(e.target.value)}
				/>
			</label>
			<input type="submit" />
		</form>
	);
};

export default App;
