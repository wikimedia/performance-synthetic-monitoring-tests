module.exports = async function ( context, commands ) {
	const cdpClient = commands.cdp.getRawClient();
	await cdpClient.Fetch.enable( {
		handleAuthRequests: false,
		patterns: [
			{
				urlPattern: '*',
				resourceType: 'Document',
				requestStage: 'Response'
			}
		]
	} );

	cdpClient.Fetch.requestPaused( async reqEvent => {
		const { requestId } = reqEvent,

			myBody = await cdpClient.Fetch.getResponseBody( {
				requestId
			} );

		let text = Buffer.from( myBody.body, 'base64' ).toString( 'utf8' );

		text = text.replaceAll( '</head>', '<style>html { filter: invert( 1 ) hue-rotate( 180deg ); } </style> </head>' );
		return cdpClient.Fetch.fulfillRequest( {
			requestId,
			responseCode: 200,
			body: Buffer.from( text, 'utf8' ).toString( 'base64' )
		} );
	} );

	await commands.measure.start( 'TyrannosaurusDarkMode' );
	await commands.navigate( 'https://en.wikipedia.org/wiki/Tyrannosaurus' );
	await commands.scroll.toBottom( 250 );
	return commands.measure.stop();
};
