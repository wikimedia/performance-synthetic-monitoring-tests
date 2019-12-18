module.exports = async function ( context, commands ) {

	commands.meta.setTitle( 'Test edit a page' );
	commands.meta.setDescription(
		'At the moment we only focus on the backend metrics collected internally.'
	);
	await commands.navigate(
		'https://en.wikipedia.org/w/index.php?title=Special:UserLogin&returnto=User:Wptuser&returntoquery=gettingStartedReturn%3Dtrue'
	);

	try {
		const userName = context.options.wikipedia.user,
			password = context.options.wikipedia.password,
			waitTime = 5000;

		// Login the user
		await commands.addText.byId( userName, 'wpName1' );
		await commands.addText.byId( password, 'wpPassword1' );
		await commands.click.byIdAndWait( 'wpLoginAttempt' );
		// Go to the users home page
		await commands.navigate( 'https://en.wikipedia.org/wiki/User:Wptuser' );

		// Edit the page
		await commands.click.byPartialLinkText( 'Edit' );
		await commands.wait.byTime( waitTime );
		await commands.js.run( "document.getElementsByClassName('ve-ce-branchNode ve-ce-documentNode ve-ce-attachedRootNode ve-ce-rootNode mw-content-ltr mw-parser-output')[0].innerText='Edited:' +  (new Date()).toString();" );
		await commands.wait.byTime( waitTime );

		// Click the save button
		let saveButton = await commands.js.run(
			"return document.getElementsByClassName('oo-ui-tool-link ve-ui-toolbar-saveButton')[0];"
		);
		await saveButton.click();
		await commands.wait.byTime( waitTime * 2 );

		// Add the save comment
		await commands.js.run(
			"document.getElementsByTagName('textarea')[0].innerHTML='Generated by wptuser';"
		);
		await commands.wait.byTime( 1000 );

		// Push the save button
		// eslint-disable-next-line one-var
		let possibleSubmits = await commands.js.run(
			"return document.getElementsByClassName('oo-ui-labelElement-label');"
		);
		for ( let a of possibleSubmits ) {
			if ( ( await a.getText() ) === 'Publish changes' ) {
				await commands.measure.start( 'save' );
				await a.click();
			}
		}
		await commands.wait.byTime( waitTime );
		return commands.measure.stop();
	} catch ( e ) {
		context.log.error( 'Could not edit', e );
		// await commands.screenshot.take( 'error' );
	}
};
