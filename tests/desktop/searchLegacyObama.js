const
	factory = require( './shared/searchScriptFactory' ),
	URL = 'https://en.wikipedia.org/wiki/Barack_Obama?useskinversion=1';

module.exports = factory( 'mwVectorLegacySearch', URL, 'highlight' );