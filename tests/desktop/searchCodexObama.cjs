const
	factory = require( './shared/searchScriptFactory.cjs' ),
	URL = 'https://fr.wikipedia.org/wiki/Barack_Obama?useskin=vector-2022';

module.exports = factory( 'mwVectorCodexSearch', URL, 'cdx-search-result-title__match' );
