module.exports = async function ( context, commands ) {
	commands.meta.setTitle( 'Test coming from Google search' );
	commands.meta.setDescription( 'Search for Obama Wikipedia and click on the search result for the Obama page and measure that page' );
	await commands.navigate( 'https://www.google.com' );
	await commands.addText.byName( 'Obama Wikipedia', 'q' );
	await commands.click.bySelectorAndWait( 'input[name=btnK]' );
	await commands.js.run( 'for (let node of document.body.childNodes) { if (node.style) node.style.display = "none";}' );
	await commands.measure.start( 'googleObama' );
	await commands.click.byXpath( "//a[@href='https://en.wikipedia.org/wiki/Barack_Obama']" );
	return commands.measure.stop();
};
