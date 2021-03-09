module.exports = async function ( context, commands ) {
	commands.meta.setTitle( 'Search from the search page' );
	commands.meta.setDescription( ' Go to the Special:Search page and search for Barack Obama' );
	await commands.measure.start( 'https://en.wikipedia.org/wiki/Special:Search', 'searchPageObamaStartPage' );
	await commands.addText.byId( 'Barack Obama', 'ooui-php-1' );
	await commands.js.run( 'for (let node of document.body.childNodes) { if (node.style) node.style.display = "none";}' );
	await commands.measure.start( 'searchPageObama' );
	await commands.click.byClassNameAndWait( 'oo-ui-inputWidget-input oo-ui-buttonElement-button' );
	return commands.measure.stop();
};
