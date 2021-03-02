const
	factory = require( './shared/searchScriptFactory' ),
	URL = 'https://fr.wikipedia.org/wiki/Barack_Obama?useskinversion=1';

module.exports = factory( 'mwVectorLegacySearch', URL, 'highlight' );
