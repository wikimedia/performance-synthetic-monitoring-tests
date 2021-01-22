/**
 * T251544: A factory method that assists in comparing Vue search with legacy search.
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
		commands.meta.setTitle( `${searchName} search (anon)` );
		commands.meta.setDescription( `Go to the Obama page and use ${searchName} search to find "Banana"` );

		await commands.measure.start( `${searchName}Obama` );
		await commands.navigate( url );

		const webdriver = context.selenium.webdriver,
			driver = context.selenium.driver,
			searchBox = await driver.findElement( webdriver.By.id( 'searchInput' ) );

		// Start typing characters into search.
		await searchBox.sendKeys( 'B' );
		await commands.wait.byXpath( `//*[contains(@class, ${highlightClass}) and text() = 'B']`, 10000 );

		await searchBox.sendKeys( 'ananab' );
		await commands.wait.byXpath( `//*[contains(@class, ${highlightClass}) and text() = 'Bananab']`, 10000 );

		await searchBox.sendKeys( webdriver.Key.BACK_SPACE );
		await commands.wait.byXpath( `//*[contains(@class, ${highlightClass}) and text() = 'Banana']`, 10000 );

		// Stop measuring and collect metrics.
		await commands.measure.stop();
	};
};
