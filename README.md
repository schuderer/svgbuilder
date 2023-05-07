# Svg Builder

Create inceractive SVG models for lasercutting.

Similar to OpenSCAD's customizer, but more flexible on the UI side (In my unbiased opinion :) ).

# How to use

Currently, it's probably easiest to look at the catapult example and adapt it. See index.html, js/catapult.js and js/catapult.css.

Different aspects of your interactive SVG model are handled using different ES6 modules:
 - svgbuilder.js   -- (re)creating your parametrized SVG design
 - ui.js           -- Handle parameter I/O and model download
 - qrhandler.js    -- QR Code creation and scanning
 - (jsloader.js    -- Just a helper for loading libraries that are not ES6 modules)

# Contributing

All help and supportis welcome. :)

For example:
 - Show how you are using it
 - Create an Issue if you found a bug or have an improvement idea
 - Take on one of the existing issues
 - Generally improve usability
 - Improve documentation

# License and acknowledgements

License of catapult design: [Creative Commons - Attribution - Non-Commercial](https://creativecommons.org/licenses/by-nc/4.0/). License of source code: [MIT License (2023 by Andreas Schuderer)](https://raw.githubusercontent.com/schuderer/svgbuilder/main/LICENSE).

Catapult design based on this educational [Tension Catapult by Thingiverse user mfalk](https://www.thingiverse.com/thing:1403796) ([CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)) and its [no-glue derivative by SimpleAsWar](https://www.thingiverse.com/thing:4050155) ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)).

Uses the libraries [Paper.js](http://paperjs.org/about/) for boolean operations,  [QRCode.js](https://github.com/davidshimjs/qrcodejs) for generating and [QR Scanner](https://github.com/nimiq/qr-scanner) for scanning them. 
