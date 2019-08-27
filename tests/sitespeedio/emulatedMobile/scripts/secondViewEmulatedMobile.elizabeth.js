module.exports = async function ( context, commands ) {
	commands.meta.setTitle( 'Test visiting multiple pages on emulated mobile' );
	commands.meta.setDescription( 'First hit Edward_VI_of_England with an empty browser cache and then visit Elizabeth_I_of_England' );
	await commands.navigate( 'https://en.m.wikipedia.org/wiki/Edward_VI_of_England' );
	await commands.wait.byTime( 30000 );
	await commands.js.run( 'document.body.innerHTML = ""; document.body.style.backgroundColor = "white";' );
	return commands.measure.start( 'https://en.m.wikipedia.org/wiki/Elizabeth_I_of_England' );
};
