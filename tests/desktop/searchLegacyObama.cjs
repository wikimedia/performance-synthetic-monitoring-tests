const
	factory = require( './shared/searchScriptFactory' ),
	URL = 'https://fr.wikipedia.org/wiki/Barack_Obama?useskin=vector';

module.exports = factory( 'mwVectorLegacySearch', URL, 'highlight' );
