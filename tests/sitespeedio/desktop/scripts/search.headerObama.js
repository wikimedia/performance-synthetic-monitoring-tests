module.exports = async function ( context, commands ) {
	commands.meta.setTitle( 'Search from the header' );
	commands.meta.setDescription( ' Go to the main page and search for Barack Obama in the header' );
	await commands.navigate( 'https://en.wikipedia.org/wiki/Main_Page' );
	await commands.addText.byId( 'Barack Obama', 'searchInput' );
	await commands.js.run( 'for (let node of document.body.childNodes) { if (node.style) node.style.display = "none";}' );
	await commands.measure.start( 'headerSearchObama' );
	await commands.click.byIdAndWait( 'searchButton' );
	return commands.measure.stop();
};
