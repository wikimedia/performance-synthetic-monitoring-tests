module.exports = async function ( context, commands ) {
	commands.meta.setTitle( 'Legacy search (anon)' );
	commands.meta.setDescription( 'Go to the Obama page and use legacy search to find "Banana"' );

	await commands.measure.start( 'legacySearchObama' );
	await commands.navigate( 'https://en.wikipedia.org/wiki/Barack_Obama' );

	const webdriver = context.selenium.webdriver,
		driver = context.selenium.driver,
		searchBox = await driver.findElement( webdriver.By.id( 'searchInput' ) );

	// Focus search field.
	await searchBox.sendKeys( '' );
	commands.js.run( "performance.mark('mark-before-baseline')" );
	await commands.wait.bySelector( '.suggestions', 10000 );
	commands.js.run( "performance.mark('mark-after-baseline')" );

	// Start typing characters into search.
	await searchBox.sendKeys( 'b' );
	commands.js.run( "performance.mark('mark-before-search-b')" );
	await commands.wait.bySelector( 'a[title="B"]', 10000 );
	commands.js.run( "performance.mark('mark-after-search-b')" );

	await searchBox.sendKeys( 'a' );
	await searchBox.sendKeys( 'n' );
	await searchBox.sendKeys( 'a' );
	await searchBox.sendKeys( 'n' );
	await searchBox.sendKeys( 'a' );
	await searchBox.sendKeys( 'b' );
	commands.js.run( "performance.mark('mark-before-search-bananab')" );
	await commands.wait.bySelector( 'a[title="Bananabird"]', 10000 );
	commands.js.run( "performance.mark('mark-after-search-bananab')" );

	await searchBox.sendKeys( webdriver.Key.BACK_SPACE );
	commands.js.run( "performance.mark('mark-before-search-banana')" );
	await commands.wait.bySelector( 'a[title="Banana"]', 10000 );
	commands.js.run( "performance.mark('mark-after-search-banana')" );

	commands.js.run( "performance.measure('measure-baseline', 'mark-before-baseline', 'mark-after-baseline')" );
	commands.js.run( "performance.measure('measure-b', 'mark-before-search-b', 'mark-after-search-b')" );
	commands.js.run( "performance.measure('measure-bananab', 'mark-before-search-bananab', 'mark-after-search-bananab')" );
	commands.js.run( "performance.measure('measure-banana', 'mark-before-search-banana', 'mark-after-search-banana')" );

	// Stop measuring and collect metrics.
	await commands.measure.stop();

	await commands.measure.start( 'legacySearchBanana' );

	await commands.click.bySelectorAndWait( 'a[title="Banana"]', 10000 );

	await commands.measure.stop();
};
