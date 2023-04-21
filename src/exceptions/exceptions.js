class InvalidInputException extends Error{
	constructor(symbology, input) {
		super();
		this.name = "InvalidInputException";

		this.symbology = symbology;
		this.input = input;

		this.message = '"' + this.input + '" is not a valid input for ' + this.symbology;
	}
}

class InvalidElementException extends Error{
	constructor() {
		super();
		this.name = "InvalidElementException";
		this.message = "Not supported type to render on";
	}
}

class NoElementException extends Error{
	constructor() {
		super();
		this.name = "NoElementException";
		this.message = "No element to render on.";
	}
}

class InvalidSymbologyException extends Error{
	constructor(symbology) {
		super();
		this.name = "InvalidSymbologyException";

		this.symbology = symbology;

    this.message = '"' + this.sybology + '" is not a supported';
	}
}

export { InvalidInputException, InvalidElementException, NoElementException, InvalidSymbologyException };

