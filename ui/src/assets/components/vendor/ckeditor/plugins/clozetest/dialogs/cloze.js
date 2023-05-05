// Our dialog definition.
CKEDITOR.dialog.add('clozeDialog', function (editor) {
    return {
        onLoad: function () {
            // Get rid of this style reset. I don't know what this is for anyway but it makes e.g. <pre> look like ordinary text
            this.getElement().removeClass('cke_reset_all');
            // reapply on the tab handles, they look messy otherwise
            //$('.cke_dialog_tab').addClass('cke_reset_all');
        },

        // Basic properties of the dialog window: title, minimum size.
        title: editor.lang.clozetest.dialog.title,
        minWidth: 400,
        minHeight: 200,

        // Dialog window content definition.
        contents: [
            {
                // Definition of the Basic Settings dialog tab (page).
                id: 'tab-basic',
                label: 'Textual',

                // The tab content.
                elements: [
                    {
                        // Text input field for the correct answer text.
                        type: 'text',
                        id: 'answer',
                        label: editor.lang.clozetest.dialog.answer,
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
                        validate: CKEDITOR.dialog.validate.notEmpty(editor.lang.clozetest.dialog.errors.nonEmpty)
                    },
                    {
                        type: 'radio',
                        id: 'case-sensitive',
                        items: [[editor.lang.clozetest.dialog.options.yes, 'true'], [editor.lang.clozetest.dialog.options.no, 'false']],
                        setup: function (element) {
                            this.setValue(element.getAttribute('case-sensitive'))
                        },
                        commit: function (element) {
                            element.setAttribute('case-sensitive', this.getValue());
                        },
                        label: editor.lang.clozetest.dialog.caseSensitive,
                        'default': 'true'
                    },
                    {
                        type: 'radio',
                        id: 'numeric',
                        items: [[editor.lang.clozetest.dialog.options.yes, 'true'], [editor.lang.clozetest.dialog.options.no, 'false']],
                        setup: function (element) {
                            this.setValue(element.getAttribute('numeric'))
                        },
                        commit: function (element) {
                            element.setAttribute('numeric', this.getValue());
                        },
                        label: editor.lang.clozetest.dialog.numeric,
                        'default': 'false',
                        validate: CKEDITOR.dialog.validate.functions(
                            function(val) {
                                if (val === 'true') {
                                    var answer = CKEDITOR.dialog.getCurrent().getContentElement('tab-basic','answer').getValue();
                                    // Returns false for any non-numeric values/whitespace
                                    return !isNaN(answer) && !/(\.$)|(^\.)|(\s)/.test(answer);
                                }
                                return true;
                            },
                            editor.lang.clozetest.dialog.errors.numeric
                        )
                    },
                    {
                        // Number input field for answer accuracy value
                        type: 'number',
                        id: 'precision',
                        min: 0,
                        label: editor.lang.clozetest.dialog.precision,
                        setup: function (element) {
                            this.setValue(element.getAttribute('precision') || 0);
                        },
                        commit: function (element) {
                            element.setAttribute('precision', this.getValue() || 0);
                        },
                        validate: CKEDITOR.dialog.validate.functions(function(val) {
                            return !val || parseFloat(val) >= 0;
                        }, editor.lang.clozetest.dialog.errors.nonNegative)
                    },
                    {
                        type: 'html',
                        id: 'usage',
                        html: '<h4 style="margin-top: 0">' + editor.lang.clozetest.dialog.usage.title +
                        '</h4>' + editor.lang.clozetest.dialog.usage.part1 + '<pre>' +
                        editor.lang.clozetest.dialog.usage.example1 + '</pre>' +
                        editor.lang.clozetest.dialog.usage.part2 +
                        '<pre>10\\*10=100</pre>'
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
                return "$" + ("0000" + (Math.random() * Math.pow(36, 4) << 0).toString(36)).slice(-4)
            };
            if (!element || element.getName() !== 'span') {
                element = editor.document.createElement('span');
                element.setAttribute('id', createUid());
                element.setAttribute('numeric', 'false');
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
                // Append a space so that we force focusing out of the element.
                // Otherwise user might not be able to write anything beyond cloze element unless activating source mode
                // and editing text there, maybe it's a bug with the editor?
                editor.insertText(' ');
            }
        }
    };
});
