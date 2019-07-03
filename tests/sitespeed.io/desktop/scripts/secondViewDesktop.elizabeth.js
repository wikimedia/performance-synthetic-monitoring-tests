module.exports = async function ( context, commands ) {
	await commands.navigate( 'https://en.wikipedia.org/wiki/Edward_VI_of_England' );
	await commands.wait.byTime( 30000 );
	await commands.js.run( 'document.body.innerHTML = ""; document.body.style.backgroundColor = "white";' );
	return commands.measure.start( 'https://en.wikipedia.org/wiki/Elizabeth_I_of_England' );
};
