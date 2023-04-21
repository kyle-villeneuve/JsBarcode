'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // Import all the barcodes


// Help functions


// Exceptions


// Default values


var _barcodes = require('./barcodes/');

var _barcodes2 = _interopRequireDefault(_barcodes);

var _fixOptions = require('./help/fixOptions.js');

var _fixOptions2 = _interopRequireDefault(_fixOptions);

var _getRenderProperties = require('./help/getRenderProperties.js');

var _getRenderProperties2 = _interopRequireDefault(_getRenderProperties);

var _linearizeEncodings = require('./help/linearizeEncodings.js');

var _linearizeEncodings2 = _interopRequireDefault(_linearizeEncodings);

var _merge = require('./help/merge.js');

var _merge2 = _interopRequireDefault(_merge);

var _optionsFromStrings = require('./help/optionsFromStrings.js');

var _optionsFromStrings2 = _interopRequireDefault(_optionsFromStrings);

var _ErrorHandler = require('./exceptions/ErrorHandler.js');

var _ErrorHandler2 = _interopRequireDefault(_ErrorHandler);

var _exceptions = require('./exceptions/exceptions.js');

var _defaults = require('./options/defaults.js');

var _defaults2 = _interopRequireDefault(_defaults);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var API = function () {
  function API(element, text, options) {
    _classCallCheck(this, API);

    this.barcodes = [];
    this._headless = element == null;
    this._renderProperties = this._headless ? [] : (0, _getRenderProperties2.default)(element);
    this._encodings = [];
    this._errorHandler = new _ErrorHandler2.default(this);

    this._defaults = _defaults2.default;
    this._options = _defaults2.default;
    this.options(options);
    this._options.format = autoSelectBarcode(this._options.format);

    // Register all barcodes
    for (var name in _barcodes2.default) {
      if (_barcodes2.default.hasOwnProperty(name)) {
        // Security check if the propery is a prototype property
        this.registerBarcode(name, _barcodes2.default[name]);
      }
    }

    // If text is set, use the simple syntax (render the barcode directly)
    if (!this._headless && typeof text !== "undefined") {
      if (!(this._options.format in this)) throw new Error('Format "' + this._options.format + '" is not supported');
      this[this._options.format](text, this._options).render();
    }
  }

  // Sets global encoder options
  // Added to the api by the JsBarcode function


  _createClass(API, [{
    key: 'options',
    value: function options(_options) {
      this._options = (0, _merge2.default)(this._options, _options);
      return this;
    }
  }, {
    key: 'blank',


    // Will create a blank space (usually in between barcodes)
    value: function blank(size) {
      var zeroes = new Array(size + 1).join("0");
      this._encodings.push({ data: zeroes });
      return this;
    }
  }, {
    key: 'init',


    // Initialize JsBarcode on all HTML elements defined.
    value: function init() {
      // Should do nothing if no elements where found
      if (!this._renderProperties) {
        return;
      }

      // Make sure renderProperies is an array
      if (!Array.isArray(this._renderProperties)) {
        this._renderProperties = [this._renderProperties];
      }

      var renderProperty;
      for (var i in this._renderProperties) {
        renderProperty = this._renderProperties[i];
        var options = (0, _merge2.default)(this._options, renderProperty.options);

        if (options.format == "auto") {
          options.format = autoSelectBarcode();
        }

        this._errorHandler.wrapBarcodeCall(function () {
          var text = options.value;
          var Encoder = _barcodes2.default[options.format.toUpperCase()];
          var encoded = encode(text, Encoder, options);

          _render(renderProperty, encoded, options);
        });
      }
    }
  }, {
    key: 'encode',
    value: function encode(format, value) {
      var Barcode = _barcodes2.default[format];
      if (!Barcode) throw new _exceptions.InvalidSymbologyException();
      var instance = new Barcode(value, {});
      return instance.data;
    }

    // The render API call. Calls the real render function.

  }, {
    key: 'render',
    value: function render() {
      if (!this._renderProperties) {
        throw new _exceptions.NoElementException();
      }

      if (Array.isArray(this._renderProperties)) {
        for (var i = 0; i < this._renderProperties.length; i++) {
          _render(this._renderProperties[i], this._encodings, this._options);
        }
      } else {
        _render(this._renderProperties, this._encodings, this._options);
      }

      return this;
    }
  }, {
    key: 'registerBarcode',
    value: function registerBarcode(name, barcode) {
      var _this = this;

      var callback = function callback(text, options) {
        return _this._errorHandler.wrapBarcodeCall(function () {
          // Ensure text is options.text
          options.text = typeof options.text === 'undefined' ? undefined : '' + options.text;

          var newOptions = (0, _merge2.default)(_this._options, options);
          newOptions = (0, _optionsFromStrings2.default)(newOptions);
          var encoded = encode(text, barcode, newOptions);
          _this._encodings.push(encoded);

          return _this;
        });
      };

      var bound = callback.bind(this);

      this[name] = bound;
      this[name.toUpperCase()] = bound;
    }
  }]);

  return API;
}();

// The first call of the library API
// Will return an object with all barcodes calls and the data that is used
// by the renderers


var JsBarcode = function JsBarcode(element, text, options) {
  return new API(element, text, options);
};

// To make tests work TODO: remove
JsBarcode.getModule = function (name) {
  return _barcodes2.default[name];
};

// encode() handles the Encoder call and builds the binary string to be rendered
function encode(text, Encoder, options) {
  // Ensure that text is a string
  text = "" + text;

  var encoder = new Encoder(text, options);

  // If the input is not valid for the encoder, throw error.
  // If the valid callback option is set, call it instead of throwing error
  if (!encoder.valid()) {
    throw new _exceptions.InvalidInputException(encoder.constructor.name, text);
  }

  // Make a request for the binary data (and other infromation) that should be rendered
  var encoded = encoder.encode();

  // Encodings can be nestled like [[1-1, 1-2], 2, [3-1, 3-2]
  // Convert to [1-1, 1-2, 2, 3-1, 3-2]
  encoded = (0, _linearizeEncodings2.default)(encoded);

  // Merge
  for (var i = 0; i < encoded.length; i++) {
    encoded[i].options = (0, _merge2.default)(options, encoded[i].options);
  }

  return encoded;
}

function autoSelectBarcode(value) {
  if (value && value !== 'auto') return value;

  // If CODE128 exists. Use it
  if (_barcodes2.default["CODE128"]) {
    return "CODE128";
  }

  // Else, take the first (probably only) barcode
  return Object.keys(_barcodes2.default)[0];
}

// Prepares the encodings and calls the renderer
function _render(renderProperties, encodings, options) {
  encodings = (0, _linearizeEncodings2.default)(encodings);

  for (var i = 0; i < encodings.length; i++) {
    encodings[i].options = (0, _merge2.default)(options, encodings[i].options);
    (0, _fixOptions2.default)(encodings[i].options);
  }

  (0, _fixOptions2.default)(options);

  var Renderer = renderProperties.renderer;
  var renderer = new Renderer(renderProperties.element, encodings, options);
  renderer.render();

  if (renderProperties.afterRender) {
    renderProperties.afterRender();
  }
}

// Export to commonJS
module.exports = JsBarcode;