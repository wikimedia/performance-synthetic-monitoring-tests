const factory = require( './shared/clientPreferencesFactory.cjs' );

module.exports = factory(
	'Test After single local storage key having client preferences within JSON string value',
	'Use a single local storage key to store multiple client preferences within a JSON string value',
	'/speed-tests/Brazil.enwiki.1164571109/after-local-storage-json-parse/index.html',
	async ( commands ) => {
		await commands.js.run( `
		    // Setup local storage.
			localStorage.setItem( 'mw-client-preferences', '{ "vector-feature-limited-width": 1 }' );
		` );
	}
);
