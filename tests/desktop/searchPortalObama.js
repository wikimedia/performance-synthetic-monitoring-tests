module.exports = async function ( context, commands ) {
	commands.meta.setTitle( 'Search from the portal page' );
	commands.meta.setDescription(
		' Go to the portal page and search for Barack Obama'
	);
	await commands.measure( 'https://www.wikipedia.org', 'portalSearchObamaStartPage' );
	await commands.addText.byId( 'Barack Obama', 'searchInput' );

	await commands.wait.byTime( 5000 );
	await commands.measure.start( 'portalSearchObama' );
	await commands.click.byXpathAndWait(
		"//a[@href='https://en.wikipedia.org/wiki/Barack_Obama']"
	);
	return commands.measure.stop();
};
