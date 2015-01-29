﻿/**
 * @license Copyright (c) 2003-2014, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.html or http://ckeditor.com/license
 */

CKEDITOR.editorConfig = function( config ) {
	
	// %REMOVE_START%
	// The configuration options below are needed when running CKEditor from source files.
//	config.plugins = 'dialogui,dialog,about,a11yhelp,basicstyles,blockquote,clipboard,panel,floatpanel,menu,contextmenu,resize,button,toolbar,elementspath,enterkey,entities,popup,filebrowser,floatingspace,listblock,richcombo,format,horizontalrule,htmlwriter,wysiwygarea,image,indent,indentlist,fakeobjects,link,list,magicline,maximize,pastetext,pastefromword,removeformat,sourcearea,specialchar,menubutton,scayt,stylescombo,tab,table,tabletools,undo,wsc,pbckcode,codemirror,texzilla,lineutils,widget,mathjax,language';
	config.plugins = 'dialogui,dialog,about,a11yhelp,basicstyles,blockquote,clipboard,panel,floatpanel,menu,' +
        'contextmenu,resize,button,toolbar,elementspath,enterkey,entities,popup,filebrowser,floatingspace,' +
        'listblock,richcombo,format,horizontalrule,htmlwriter,wysiwygarea,indent,indentlist,fakeobjects,link,' +
        'list,magicline,maximize,pastetext,pastefromword,removeformat,sourcearea,specialchar,menubutton,scayt,' +
        'stylescombo,tab,table,tabletools,undo,wsc,pbckcode,codemirror,lineutils,widget,mathjax,language';

	config.skin = 'moono';
	// %REMOVE_END%

	// Define changes to default configuration here.
	// For the complete reference:
	// http://docs.ckeditor.com/#!/api/CKEDITOR.config

	// The toolbar groups arrangement, optimized for two toolbar rows.
	config.toolbarGroups = [
		{ name: 'clipboard',   groups: [ 'clipboard', 'undo' ] },
		{ name: 'editing',     groups: [ 'find', 'selection' ] },
//		{ name: 'links' },
		{ name: 'insert' },
		{ name: 'forms' },
		{ name: 'tools' },
		{ name: 'document',	   groups: [ 'mode', 'document', 'doctools' ] },
		{ name: 'others' },
		'/',
		{ name: 'basicstyles', groups: [ 'basicstyles', 'cleanup' ] },
//		{ name: 'paragraph',   groups: [ 'list', 'indent', 'blocks', 'align', 'bidi' ] },
		{ name: 'styles' },
		{ name: 'colors' },
//		{ name: 'about' }
	];
	
	config.extraPlugins='confighelper'; 
	config.extraPlugins = 'wordcount';

	config.wordcount = {

	    // Whether or not you want to show the Word Count
	    showWordCount: true,

	    // Whether or not you want to show the Char Count
	    showCharCount: true,

	    // Whether or not to include Html chars in the Char Count
	    countHTML: false
	};

	// Remove some buttons, provided by the standard plugins, which we don't
	// need to have in the Standard(s) toolbar.
	config.removeButtons = 'Underline,Subscript,Superscript';

	// Se the most common block elements.
	config.format_tags = 'p;h1;h2;h3;pre';

	// Make dialogs simpler.
	config.removeDialogTabs = 'image:advanced;link:advanced';

    // SIT-361
    // Disable scandic characters converting
    config.htmlEncodeOutput = false;
    config.entities = false;
};
