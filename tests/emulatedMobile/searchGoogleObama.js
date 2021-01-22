module.exports = async function ( context, commands ) {
	const webdriver = context.selenium.webdriver,
		driver = context.selenium.driver;
	commands.meta.setTitle( 'Test coming from Google search' );
	commands.meta.setDescription( 'Search for Obama Wikipedia and click on the search result for the Obama page and measure that page' );
	await commands.navigate( 'https://www.google.com' );
	await commands.addText.byName( 'Obama Wikipedia', 'q' );
	let queryElement = await driver.findElement( webdriver.By.name( 'q' ) );
	await queryElement.sendKeys( webdriver.Key.RETURN );

	await commands.wait.byTime( 2000 );
	await commands.js.run( 'for (let node of document.body.childNodes) { if (node.style) node.style.display = "none";}' );
	await commands.measure.start( 'googleObama' );
	await commands.click.byXpathAndWait( "//a[@href='https://en.m.wikipedia.org/wiki/Barack_Obama']" );
	return commands.measure.stop();
};
