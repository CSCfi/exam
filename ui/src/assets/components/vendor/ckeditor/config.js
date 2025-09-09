/**
 * @license Copyright (c) 2003-2022, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see https://ckeditor.com/legal/ckeditor-oss-license
 */

CKEDITOR.editorConfig = function( config ) {
	// Define changes to default configuration here.
	// For complete reference see:
	// https://ckeditor.com/docs/ckeditor4/latest/api/CKEDITOR_config.html

	// The toolbar groups arrangement, optimized for two toolbar rows.
	config.toolbarGroups = [
		{ name: 'clipboard',   groups: [ 'clipboard', 'undo' ] },
		{ name: 'editing',     groups: [ 'find', 'selection', 'spellchecker' ] },
		{ name: 'links' },
		{ name: 'insert' },
		{ name: 'forms' },
		{ name: 'tools' },
		{ name: 'document',	   groups: [ 'mode', 'document', 'doctools' ] },
		{ name: 'others' },
		'/',
		{ name: 'basicstyles', groups: [ 'basicstyles', 'cleanup' ] },
		{ name: 'paragraph',   groups: [ 'list', 'indent', 'blocks', 'align', 'bidi' ] },
		{ name: 'styles' },
		{ name: 'colors' },
		{ name: 'about' }
	];

	// Remove some buttons provided by the standard plugins, which are
	// not needed in the Standard(s) toolbar.
	config.removeButtons = 'Underline';
	config.removePlugins = 'image';

	// Set the most common block elements.
	config.format_tags = 'p;h1;h2;h3;pre';
  	// Allow embedded questions and math expressions to exist
	config.extraAllowedContent = 'span[cloze, id, case-sensitive, numeric, precision]{text-decoration, border}(marker); span(math-expression)';

	// Configure MathJax for math plugin
	config.mathJaxLib = "/assets/components/vendor/mathjax/MathJax.js?config=TeX-AMS_HTML";

	// Simplify the dialog windows.
	config.removeDialogTabs = 'image:advanced;link:advanced';

	// Uncomment this in order to enable resizing in both directions, default is vertical only
	//config.resize_dir = 'both';

	config.wordcount = {
		showParagraphs: false,
		showCharCount: true,
        countSpacesAsChars: false
	};

	config.extraPlugins = 'clozetest';

};
