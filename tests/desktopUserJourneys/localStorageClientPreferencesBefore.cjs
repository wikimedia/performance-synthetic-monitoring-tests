const factory = require( './shared/clientPreferencesFactory.cjs' );

module.exports = factory(
	'Test before multiple local storage client preferences',
	'Baseline test for local storage client preferences',
	'/speed-tests/Brazil.enwiki.1164571109/before/index.html',
	async ( commands ) => {
		await commands.js.run( `
		    // Setup and cookie.
			document.cookie = 'enwikimwclientprefs=vector-feature-limited-width; path=/; domain=.wikipedia.org; secure; samesite=lax';
		` );
	}
);
