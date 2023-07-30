const factory = require( './shared/clientPreferencesFactory.cjs' ),
	PREF_COUNT = 20;

module.exports = factory(
	'Test after multiple client preferences stored in a cookie',
	'Disable 20 client preferences via mwclientprefs cookie, then visit static United_States page',
	'/speed-tests/United_States.enwiki.1146952659/after-multiple-cookie-values/',
	async ( commands ) => {
		// Add values to mwclientprefs cookie.
		await commands.js.run( `
			let prefs = [];
			for (var i = 0; i < ${PREF_COUNT}; i++) {
					prefs.push(\`feature-\${i}\`);
			}
			mw.cookie.set('mwclientprefs', prefs.join('|'));
		` );
	}
);
