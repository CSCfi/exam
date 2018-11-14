CKEDITOR.plugins.add('clozetest', {
    requires: 'dialog,numericinput',
    icons: 'cloze',
    lang: ['en', 'fi', 'sv'],

    // The plugin initialization logic goes inside this method.
    init: function (editor) {

        editor.addCommand('insertCloze', new CKEDITOR.dialogCommand('clozeDialog'));

        // Create the toolbar button that executes the above command.
        editor.ui.addButton('Cloze', {
            label: editor.lang.clozetest.toolbar.label,
            command: 'insertCloze',
            toolbar: 'insert,0'
        });

        if (editor.contextMenu) {
            editor.addMenuGroup('clozeGroup');
            editor.addMenuItem('clozeItem', {
                label: editor.lang.clozetest.contextMenu.label,
                icon: this.path + 'icons/cloze.png',
                command: 'insertCloze',
                group: 'clozeGroup'
            });
            var selector = function (el) {
                return el.getName && el.getName() === 'span' && el.getAttribute('cloze') === 'true';
            };
            editor.contextMenu.addListener(function (element) {
                if (element.getAscendant(selector, true)) {
                    return {clozeItem: CKEDITOR.TRISTATE_OFF};
                }
            });
        }

        CKEDITOR.dialog.add('clozeDialog', this.path + 'dialogs/cloze.js');
    }
});
