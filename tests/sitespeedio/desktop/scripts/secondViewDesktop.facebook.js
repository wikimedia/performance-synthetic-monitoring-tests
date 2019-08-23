module.exports = async function ( context, commands ) {
	await commands.navigate( 'https://en.wikipedia.org/wiki/Main_Page' );
	await commands.wait.byTime( 21000 );
	await commands.js.run( 'document.body.innerHTML = ""; document.body.style.backgroundColor = "white";' );
	return commands.measure.start( 'https://en.wikipedia.org/wiki/Facebook' );
};
