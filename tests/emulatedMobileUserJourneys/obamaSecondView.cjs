module.exports = async function ( context, commands ) {
	commands.meta.setTitle( 'Test visiting multiple pages on emulated mobile' );
	commands.meta.setDescription( 'First hit the Main_Page with an empty browser cache and then visit Barack_Obama' );
	await commands.navigate( 'https://en.wikipedia.org/wiki/Main_Page' );
	await commands.wait.byTime( 30000 );
	await commands.js.run( 'document.body.innerHTML = ""; document.body.style.backgroundColor = "white";' );
	return commands.measure.start( 'https://en.wikipedia.org/wiki/Barack_Obama' );
};
