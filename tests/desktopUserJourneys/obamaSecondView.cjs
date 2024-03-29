module.exports = async function ( context, commands ) {
	commands.meta.setTitle( 'Test visiting multiple pages' );
	commands.meta.setDescription( 'First hit the Main_Page with an empty browser cache and then visit Obama' );
	await commands.navigate( 'https://en.wikipedia.org/wiki/Main_Page' );
	await commands.wait.byTime( 26000 );
	await commands.js.run( 'document.body.innerHTML = ""; document.body.style.backgroundColor = "white";' );
	return commands.measure.start( 'https://en.wikipedia.org/wiki/Barack_Obama' );
};
