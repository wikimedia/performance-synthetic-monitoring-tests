/**
 * T251544: A factory method that assists in comparing Wvui search with legacy search.
 *
 * @param {string} searchName Name of search. Used as a label for the test.
 * @param {string} url Page to navigate to for the test
 * @param {string} highlightClass Name of class applied to the element that
 * highlights the search results. Used to determine when the search results have
 * loaded and test can proceed to next command.
 *
 * @return {Function}
 */
module.exports = function ( searchName, url, highlightClass ) {
	return async function ( context, commands ) {
		const webdriver = context.selenium.webdriver,
			driver = context.selenium.driver,
			inputSelector = '#p-search input[type="search"]';
		var searchBox;

		/**
		 * Waits for an element with the class `highlightClass` that contains
		 * `text`.
		 *
		 * @param {string} text
		 * @return {Promise}
		 */
		function waitForResults( text ) {
			return commands.wait.byXpath( `//*[contains(@class, '${highlightClass}') and text() = '${text}']`, 10000 );
		}

		commands.meta.setTitle( `${searchName} search (anon)` );
		commands.meta.setDescription( `Go to the Obama page and use ${searchName} search to find "Ab"` );

		await commands.measure.start( `${searchName}Obama` );
		await commands.navigate( url );

		searchBox = await driver.findElement( webdriver.By.css( inputSelector ) );

		// Start typing characters into search.
		await searchBox.sendKeys( 'A' );
		await waitForResults( 'A' );

		// Redefine searchBox in case the original input has been removed from the
		// DOM after lazy loading (which is the case with Wvui search because it is
		// rendered client-side).
		searchBox = await driver.findElement( webdriver.By.css( inputSelector ) );

		await searchBox.sendKeys( 'bc' );
		await waitForResults( 'Abc' );

		await searchBox.sendKeys( webdriver.Key.BACK_SPACE );
		await waitForResults( 'Ab' );

		// Stop measuring and collect metrics.
		await commands.measure.stop();
	};
};
