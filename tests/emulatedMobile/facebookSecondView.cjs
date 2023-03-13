module.exports = async function ( context, commands ) {
	commands.meta.setTitle( 'Test visiting multiple pages on emulated mobile' );
	commands.meta.setDescription( 'First hit the Main_Page with an empty browser cache and then visit Facebook' );
	await commands.navigate( 'https://en.m.wikipedia.org/wiki/Main_Page' );
	await commands.wait.byTime( 30000 );
	await commands.js.run( 'document.body.innerHTML = ""; document.body.style.backgroundColor = "white";' );
	return commands.measure.start( 'https://en.m.wikipedia.org/wiki/Facebook' );
};
