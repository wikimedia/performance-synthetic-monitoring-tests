module.exports = async function ( context, commands ) {

	commands.meta.setTitle( 'Test visiting the latest Tech blog post on emulated mobile' );
	commands.meta.setDescription(
		'First hit the Tech blog start page with an empty browser cache and then visit the latest blog post.'
	);

	await commands.navigate( 'https://techblog.wikimedia.org/' );

	const elements = await commands.js.run( 'return document.getElementsByClassName("more-link");' ),
		url = await elements[ 0 ].getAttribute( 'href' );
	await commands.js.run(
		'for (let node of document.body.childNodes) { if (node.style) node.style.display = "none";}'
	);

	return commands.measure.start( url, 'LatestTechBlogPost' );
};
