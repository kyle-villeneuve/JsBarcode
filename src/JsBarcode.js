// Import all the barcodes
import barcodes from './barcodes/';

// Help functions
import fixOptions from './help/fixOptions.js';
import getRenderProperties from './help/getRenderProperties.js';
import linearizeEncodings from './help/linearizeEncodings.js';
import merge from './help/merge.js';
import optionsFromStrings from './help/optionsFromStrings.js';

// Exceptions
import ErrorHandler from './exceptions/ErrorHandler.js';
import { InvalidInputException, InvalidSymbologyException, NoElementException } from './exceptions/exceptions.js';

// Default values
import defaults from './options/defaults.js';

class API {
  constructor(element, text, options) {
    this.barcodes = [];
    this._headless = element == null;
    this._renderProperties = this._headless ? [] : getRenderProperties(element);
    this._encodings = [];
    this._errorHandler = new ErrorHandler(this);

    this._defaults = defaults;
    this._options = defaults;
    this.options(options)
    this._options.format = autoSelectBarcode(this._options.format);

    // Register all barcodes
    for(var name in barcodes){
      if(barcodes.hasOwnProperty(name)){ // Security check if the propery is a prototype property
        this.registerBarcode(name, barcodes[name]);
      }
    }

      // If text is set, use the simple syntax (render the barcode directly)
    if (!this._headless && typeof text !== "undefined") {
      if (!(this._options.format in this)) throw new Error(`Format "${this._options.format}" is not supported`);
      this[this._options.format](text, this._options).render();
    }
  }

  // Sets global encoder options
  // Added to the api by the JsBarcode function
  options(options) {
    this._options = merge(this._options, options);
    return this;
  };

  // Will create a blank space (usually in between barcodes)
  blank(size){
    const zeroes = new Array(size + 1).join("0");
    this._encodings.push({data: zeroes});
    return this;
  };

  // Initialize JsBarcode on all HTML elements defined.
  init(){
    // Should do nothing if no elements where found
    if(!this._renderProperties){
      return;
    }

    // Make sure renderProperies is an array
    if(!Array.isArray(this._renderProperties)){
      this._renderProperties = [this._renderProperties];
    }

    var renderProperty;
    for(let i in this._renderProperties){
      renderProperty = this._renderProperties[i];
      var options = merge(this._options, renderProperty.options);

      if(options.format == "auto"){
        options.format = autoSelectBarcode();
      }

      this._errorHandler.wrapBarcodeCall(function(){
        var text = options.value;
        var Encoder = barcodes[options.format.toUpperCase()];
        var encoded = encode(text, Encoder, options);

        render(renderProperty, encoded, options);
      });
    }
  };

  encode(format, value) {
    const Barcode = barcodes[format];
    if (!Barcode) throw new InvalidSymbologyException();
    const instance = new Barcode(value, {});
    return instance.data;
  }

  // The render API call. Calls the real render function.
  render() {
    if(!this._renderProperties){
      throw new NoElementException();
    }

    if(Array.isArray(this._renderProperties)){
      for(var i = 0; i < this._renderProperties.length; i++){
        render(this._renderProperties[i], this._encodings, this._options);
      }
    }
    else{
      render(this._renderProperties, this._encodings, this._options);
    }

    return this;
  };


  registerBarcode(name, barcode) {
    const callback = (text, options) => {
			return this._errorHandler.wrapBarcodeCall(() => {
				// Ensure text is options.text
				options.text = typeof options.text === 'undefined' ? undefined : '' + options.text;

				var newOptions = merge(this._options, options);
				newOptions = optionsFromStrings(newOptions);
				var encoded = encode(text, barcode, newOptions);
        this._encodings.push(encoded);

				return this;
			});
    };

    const bound = callback.bind(this);

    this[name] = bound;
    this[name.toUpperCase()] = bound;
  }
}

// The first call of the library API
// Will return an object with all barcodes calls and the data that is used
// by the renderers
const JsBarcode = function (element, text, options) {
	return new API(element, text, options);
};

// To make tests work TODO: remove
JsBarcode.getModule = function(name){
	return barcodes[name];
};

// encode() handles the Encoder call and builds the binary string to be rendered
function encode(text, Encoder, options){
	// Ensure that text is a string
	text = "" + text;

	var encoder = new Encoder(text, options);

	// If the input is not valid for the encoder, throw error.
	// If the valid callback option is set, call it instead of throwing error
	if(!encoder.valid()){
		throw new InvalidInputException(encoder.constructor.name, text);
	}

	// Make a request for the binary data (and other infromation) that should be rendered
	var encoded = encoder.encode();

	// Encodings can be nestled like [[1-1, 1-2], 2, [3-1, 3-2]
	// Convert to [1-1, 1-2, 2, 3-1, 3-2]
	encoded = linearizeEncodings(encoded);

	// Merge
	for(let i = 0; i < encoded.length; i++){
		encoded[i].options = merge(options, encoded[i].options);
	}

	return encoded;
}

function autoSelectBarcode(value) {
  if (value && value !== 'auto') return value;
  
	// If CODE128 exists. Use it
	if(barcodes["CODE128"]){
		return "CODE128";
	}

	// Else, take the first (probably only) barcode
	return Object.keys(barcodes)[0];
}

// Prepares the encodings and calls the renderer
function render(renderProperties, encodings, options){
	encodings = linearizeEncodings(encodings);

	for(let i = 0; i < encodings.length; i++){
		encodings[i].options = merge(options, encodings[i].options);
		fixOptions(encodings[i].options);
	}

	fixOptions(options);

	var Renderer = renderProperties.renderer;
	var renderer = new Renderer(renderProperties.element, encodings, options);
	renderer.render();

	if(renderProperties.afterRender){
		renderProperties.afterRender();
	}
}

// Export to commonJS
module.exports = JsBarcode;
