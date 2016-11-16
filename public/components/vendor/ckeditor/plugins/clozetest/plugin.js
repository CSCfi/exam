CKEDITOR.plugins.add( 'clozetest', {
    requires: 'dialog,numericinput',
    icons: 'cloze',

    // The plugin initialization logic goes inside this method.
    init: function( editor ) {

        editor.addCommand( 'insertCloze', new CKEDITOR.dialogCommand( 'clozeDialog' ));

        // Create the toolbar button that executes the above command.
        editor.ui.addButton( 'Cloze', {
            label: 'Embedded Answer',
            command: 'insertCloze',
            toolbar: 'insert,0'
        });

        if ( editor.contextMenu ) {
            editor.addMenuGroup( 'clozeGroup' );
            editor.addMenuItem( 'clozeItem', {
                label: 'Edit embedded answer',
                icon: this.path + 'icons/cloze.png',
                command: 'insertCloze',
                group: 'clozeGroup'
            });
            editor.contextMenu.addListener( function( element ) {
                if ( element.getAscendant( 'span', true ) ) {
                    return { clozeItem: CKEDITOR.TRISTATE_OFF };
                }
            });
        }

        CKEDITOR.dialog.add('clozeDialog', this.path + 'dialogs/cloze.js' );
    }
});
