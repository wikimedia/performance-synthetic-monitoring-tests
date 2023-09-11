module.exports = async function ( context, commands ) {
	commands.meta.setTitle( 'Test coming from Google search' );
	commands.meta.setDescription( 'Search for Obama Wikipedia and click on the search result for the Obama page and measure that page' );
	await commands.navigate( 'https://www.google.com' );
	await commands.addText.byName( 'Obama Wikipedia', 'q' );
	await commands.click.bySelectorAndWait( 'input[name=btnK]' );
	await commands.js.run( 'for (let node of document.body.childNodes) { if (node.style) node.style.display = "none";}' );
	await commands.measure.start( 'googleObama' );
	await commands.click.byXpathAndWait( "//a[@href='https://en.wikipedia.org/wiki/Barack_Obama']" );
	// The extra wait is needed to get the search work in Firefox
	// https://phabricator.wikimedia.org/T235407
	await commands.wait.byTime( 2000 );
	return commands.measure.stop();
};
