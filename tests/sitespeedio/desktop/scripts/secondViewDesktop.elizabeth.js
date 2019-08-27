module.exports = async function ( context, commands ) {
	commands.meta.setTitle( 'Test visiting multiple pages' );
	commands.meta.setDescription( 'First hit Edward_VI_of_England with an empty browser cache and then visit Elizabeth_I_of_England' );
	await commands.navigate( 'https://en.wikipedia.org/wiki/Edward_VI_of_England' );
	await commands.wait.byTime( 21000 );
	await commands.js.run( 'document.body.innerHTML = ""; document.body.style.backgroundColor = "white";' );
	return commands.measure.start( 'https://en.wikipedia.org/wiki/Elizabeth_I_of_England' );
};
