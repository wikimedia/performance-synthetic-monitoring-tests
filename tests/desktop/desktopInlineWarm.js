module.exports = async function ( context, commands ) {
	commands.meta.setTitle( 'Warm cache test with inline CSS ' );
	commands.meta.setDescription( 'First hit main page, Barack Obama page and then the page with inline styles' );
	await commands.navigate( 'https://en.wikipedia.org/wiki/Main_Page' );
	await commands.wait.byTime( 21000 );
	await commands.navigate( 'https://en.wikipedia.org/wiki/Barack_Obama' );
	await commands.wait.byTime( 21000 );
	await commands.js.run( 'document.body.innerHTML = ""; document.body.style.backgroundColor = "white";' );
	return commands.measure.start( 'https://en.wikipedia.org/speed-tests/Oceanic.enwiki.1046871765/inline_styles.html', 'warmViewInline' );
};
