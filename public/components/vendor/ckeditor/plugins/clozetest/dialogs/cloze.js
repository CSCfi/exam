// Our dialog definition.
CKEDITOR.dialog.add('clozeDialog', function (editor) {
    return {
        onLoad: function () {
            // Get rid of this style reset. I don't know what this is for anyway but it makes e.g. <pre> look like ordinary text
            this.getElement().removeClass('cke_reset_all');
        },

        // Basic properties of the dialog window: title, minimum size.
        title: 'Embedded Answer Properties',
        minWidth: 400,
        minHeight: 200,

        // Dialog window content definition.
        contents: [
            {
                // Definition of the Basic Settings dialog tab (page).
                id: 'tab-basic',
                label: 'Settings',

                // The tab content.
                elements: [
                    {
                        // Text input field for the correct answer text.
                        type: 'text',
                        id: 'answer',
                        label: 'Correct Answer',
                        setup: function (element) {
                            this.setValue(element.getText());
                        },
                        commit: function (element) {
                            element.setText(this.getValue());
                            element.setAttribute('cloze', 'true');
                            element.setAttribute('class', 'marker');
                            element.setAttribute('style', 'border: 1px solid;');
                        },
                        // Validation checking whether the field is not empty.
                        validate: CKEDITOR.dialog.validate.notEmpty("Answer field cannot be empty.")
                    },
                    {
                        type: 'radio',
                        id: 'case-sensitive',
                        items: [['Yes', 'true'], ['No', 'false']],
                        setup: function (element) {
                            this.setValue(element.getAttribute('case-sensitive'))
                        },
                        commit: function (element) {
                            element.setAttribute('case-sensitive', this.getValue());
                        },
                        label: 'Case sensitive',
                        'default': 'true'
                    },
                    {
                        type: 'html',
                        html: '<h4 style="margin-top: 0">Usage</h4>Use vertical bar ( | ) to separate ' +
                        'correct answer options from each other. ' +
                        'Use asterisk ( * ) as a wildcard to match any series of characters. ' +
                        'For example <pre>*ship|boat|ferry</pre>' +
                        'would match answers "ship", "flagship", "boat" and "ferry". ' +
                        'If you really do want to match an asterisk or a vertical pipe then use a backslash like this: <pre>10\\*10=100</pre>'
                    }

                ]
            }
        ],
        onShow: function () {
            var selection = editor.getSelection();
            var element = selection.getStartElement();
            if (element) {
                element = element.getAscendant('span', true);
            }
            var createUid = function () {
                return ("0000" + (Math.random() * Math.pow(36, 4) << 0).toString(36)).slice(-4)
            };
            if (!element || element.getName() != 'span') {
                element = editor.document.createElement('span');
                element.setAttribute('id', createUid());
                this.insertMode = true;
            }
            else {
                this.insertMode = false;
            }
            this.element = element;
            if (!this.insertMode) {
                this.setupContent(element);
            }
        },
        // This method is invoked once a user clicks the OK button, confirming the dialog.
        onOk: function () {

            // The context of this function is the dialog object itself.
            // http://docs.ckeditor.com/#!/api/CKEDITOR.dialog
            var cloze = this.element;
            this.commitContent(cloze);
            if (this.insertMode) {
                editor.insertElement(cloze);
            }
        }
    };
});
