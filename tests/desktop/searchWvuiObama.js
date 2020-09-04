const
	factory = require( './shared/searchScriptFactory' ),
	URL = 'https://en.wikipedia.beta.wmflabs.org/wiki/Barack_Obama?useskinversion=2';

module.exports = factory( 'mwVectorWvuiSearch', URL, 'wvui-typeahead-suggestion__match' );
