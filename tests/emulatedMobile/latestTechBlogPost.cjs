module.exports = async function ( context, commands ) {
	commands.meta.setTitle( 'Test visiting the latest Tech blog post on emulated mobile' );
	commands.meta.setDescription( 'Visit the latest blog post without a browser cache.' );
	// Go to the start page of the tech blog
	// Get all links to the blog post
	await commands.navigate( 'https://techblog.wikimedia.org/' );

	const elements = await commands.js.run(
			'return document.getElementsByClassName("more-link");'
		),

		url = await elements[ 0 ].getAttribute( 'href' );

	// Clear the browser cache, so we can simulate a first view
	await commands.cache.clear();
	await commands.js.run(
		'for (let node of document.body.childNodes) { if (node.style) node.style.display = "none";}'
	);
	await commands.measure.start( url, 'LatestTechBlogPost' );
};
