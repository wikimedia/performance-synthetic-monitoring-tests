module.exports = async function ( context, commands ) {
	commands.meta.setTitle( 'Search from the search field' );
	commands.meta.setDescription( ' Go to the main page page and search for Barack Obama and measure the time to load the Barack Obama page.' );
	await commands.navigate( 'https://en.m.wikipedia.org/wiki/Main_Page' );
	await commands.click.byId( 'searchIcon' );
	await commands.wait.byTime( 2000 );
	await commands.addText.byXpath( 'Barack Obama', '/html/body/div[3]/div/div[1]/div/div[1]/form/input' );
	await commands.wait.byTime( 2000 );
	await commands.js.run( 'for (let node of document.body.childNodes) { if (node.style) node.style.display = "none";}' );
	await commands.measure.start( 'searchPageObama' );
	await commands.click.byXpathAndWait( "//a[@href='/wiki/Barack_Obama']" );
	return commands.measure.stop();
};
