// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import {
    AfterViewChecked,
    AfterViewInit,
    booleanAttribute,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    inject,
    input,
    OnDestroy,
    output,
    signal,
    viewChild,
    ViewEncapsulation,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    BlurEvent,
    ChangeEvent,
    CKEditorModule,
    CKEditorComponent as CKEditorNgComponent,
} from '@ckeditor/ckeditor5-angular';
import { TranslateService } from '@ngx-translate/core';
import type { GeneralHtmlSupportConfig, MatcherObjectPattern } from 'ckeditor5';
import {
    AccessibilityHelp,
    Alignment,
    Autoformat,
    AutoLink,
    Autosave,
    BalloonToolbar,
    BlockQuote,
    Bold,
    ClassicEditor,
    Code,
    CodeBlock,
    Editor,
    EditorConfig,
    Essentials,
    FindAndReplace,
    GeneralHtmlSupport,
    Heading,
    Highlight,
    HorizontalLine,
    Indent,
    IndentBlock,
    Italic,
    Link,
    List,
    ListProperties,
    Paragraph,
    PasteFromOffice,
    RemoveFormat,
    SelectAll,
    SourceEditing,
    SpecialCharacters,
    SpecialCharactersArrows,
    SpecialCharactersCurrency,
    SpecialCharactersEssentials,
    SpecialCharactersLatin,
    SpecialCharactersMathematical,
    SpecialCharactersText,
    Strikethrough,
    Subscript,
    Superscript,
    Table,
    TableCaption,
    TableCellProperties,
    TableColumnResize,
    TableProperties,
    TableToolbar,
    TextTransformation,
    TodoList,
    Underline,
    Undo,
    WidgetTypeAround,
    WordCount,
} from 'ckeditor5';
import i18nEn from 'ckeditor5/translations/en.js';
import i18nFi from 'ckeditor5/translations/fi.js';
import i18nSv from 'ckeditor5/translations/sv.js';
import { Subscription } from 'rxjs';
import { CKEditorInitializationService } from './ckeditor-initialization.service';
import { Cloze } from './plugins/clozetest/plugin';
import { Math } from './plugins/math/plugin';

/**
 * The subset of the (private) EditorWatchdog held by @ckeditor/ckeditor5-angular that
 * {@link CKEditorComponent.reapOrphanedEditor} needs. `editor` stays null until the
 * asynchronous `ClassicEditor.create()` call resolves.
 */
type PendingWatchdog = { editor: Editor | null; destroy(): Promise<unknown> };

/**
 * Drops the link button from a toolbar definition and collapses the separator pair that
 * removing it leaves behind.
 */
const withoutLinks = (items: string[]) =>
    items.filter((item) => item !== 'link').filter((item, i, all) => item !== '|' || all[i - 1] !== '|');

/**
 * Rules that apply to every editor.
 *
 * `htmlSupport.allow` below is a wildcard, which hands GeneralHtmlSupport every element it knows
 * about — `script` and `style` included — so anything pasted or typed into the source editing view
 * survives the round trip through the model and is rendered back into the editing view. The
 * backend safelist (`validation.core.HtmlSafelist`) strips all three of these on save, so keeping
 * them here would only produce content that silently vanishes when the answer is stored, and it
 * would leave whether a `<script>` runs in the author's own page down to how CKEditor happens to
 * populate a raw element.
 */
const ALWAYS_DISALLOWED: MatcherObjectPattern[] = [
    { name: 'script' },
    { name: 'style' },
    // The array form matters: `attributes: { key: /^on.../ }` (as the CKEditor config docs show it)
    // is read as "an attribute literally named `key`" and matches nothing.
    { name: /[\s\S]+/, attributes: [{ key: /^on[a-z]+$/, value: true }] },
];

/**
 * Elements that fetch and render remote content, dropped from editors that must not be a way out
 * to the open web. An `<iframe>` in the editing view is the sharpest of these: GeneralHtmlSupport
 * renders it live, and while CKEditor forces `sandbox=""` on it there, the page is still fetched
 * and displayed. None of this ever has to be saved to be useful to whoever is typing, so the
 * backend safelist cannot help — it has to be stopped in the editor.
 */
const REMOTE_CONTENT_ELEMENTS: MatcherObjectPattern[] = [
    { name: 'a' },
    { name: 'audio' },
    { name: 'embed' },
    { name: 'iframe' },
    { name: 'img' },
    { name: 'object' },
    { name: 'oembed' },
    { name: 'video' },
];

/**
 * The General HTML Support rules for an editor, which decide what survives a paste or a trip
 * through the source editing view. Exported so the spec can exercise the rules that actually ship.
 */
export const buildHtmlSupportConfig = (allowExternalContent: boolean): GeneralHtmlSupportConfig => ({
    allow: [
        {
            name: /^.*$/,
            styles: true,
            attributes: true,
            classes: true,
        },
    ],
    // Dropping the Link plugin only removes the tooling; GeneralHtmlSupport would still keep an <a>
    // arriving by paste or through the source editing view, and a GHS anchor renders as a real
    // anchor — Ctrl/Cmd+click and the browser context menu work on it just the same.
    disallow: allowExternalContent ? ALWAYS_DISALLOWED : [...ALWAYS_DISALLOWED, ...REMOTE_CONTENT_ELEMENTS],
});

@Component({
    selector: 'xm-ckeditor',
    template: `<div id="editor">
        @if (isLayoutReady()) {
            <ckeditor
                #cke
                [required]="required()"
                [editor]="editor"
                [config]="editorConfig"
                tagName="textarea"
                [ngModel]="data() ?? ''"
                (ngModelChange)="onDataChange($event)"
                (ready)="onReady($event)"
                (change)="onChange($event)"
                (blur)="onBlur($event)"
            ></ckeditor>
        }
        <div [id]="id()"></div>
    </div> `,
    imports: [FormsModule, CKEditorModule],
    styleUrls: ['./ckeditor.styles.scss', './ckeditor.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CKEditorComponent implements AfterViewInit, AfterViewChecked, OnDestroy {
    readonly data = input<string | null | undefined>('');
    readonly required = input(false, { transform: booleanAttribute });
    readonly enableClozeTest = input(false);
    /**
     * Whether this editor may reach the open web — hyperlinks and embedded remote resources.
     *
     * Turn it off for the student answer editors. Everything typed there is rendered live in the
     * student's own browser, so in an exam room with no network restrictions the editor is itself
     * a way out: an `<a href>` can be followed with Ctrl/Cmd+click or Alt+Enter (CKEditor's
     * LinkEditing opens it in a new tab) and with the browser's own "Open link in new tab" context
     * menu entry, and an `<iframe>` renders a whole page inline. None of it has to be saved to be
     * useful, so the backend safelist never sees it. Off means the tooling that creates links is
     * not loaded and {@link REMOTE_CONTENT_ELEMENTS} are filtered out of the content, whether they
     * arrive by paste or through the source editing view.
     */
    readonly allowExternalContent = input(true, { transform: booleanAttribute });
    readonly id = input('word-count-id');
    readonly dataChange = output<string>();

    editor = ClassicEditor;
    editorConfig!: EditorConfig;

    readonly isLayoutReady = signal(false);
    private editorInstance: Editor | null = null;
    private languageSubscription?: Subscription;
    private readonly currentLanguage = signal<string>('');
    private pendingContent: string | null = null;
    private languageReloadTimer?: number;

    private readonly ckeditor = viewChild(CKEditorNgComponent);
    private innerEditor: CKEditorNgComponent | null = null;

    private readonly changeDetector = inject(ChangeDetectorRef);
    private readonly Translate = inject(TranslateService);
    private initializationService = new CKEditorInitializationService(this.changeDetector);

    constructor() {
        // Subscribe to language changes
        this.languageSubscription = this.Translate.onLangChange.subscribe(() => {
            this.updateEditorLanguage();
        });
    }

    ngAfterViewInit() {
        this.currentLanguage.set(this.Translate.getCurrentLang() ?? 'en');
        this.createEditorConfig();
        this.isLayoutReady.set(true);
        this.changeDetector.markForCheck();
    }

    ngAfterViewChecked() {
        // Track the inner <ckeditor> across the isLayoutReady() toggle so that an editor
        // still being created when the child disappears (language change) is not orphaned.
        const inner = this.ckeditor() ?? null;
        if (inner === this.innerEditor) {
            return;
        }
        if (this.innerEditor && !inner) {
            this.reapOrphanedEditor(this.innerEditor);
        }
        this.innerEditor = inner;
    }

    ngOnDestroy() {
        if (this.languageSubscription) {
            this.languageSubscription.unsubscribe();
        }
        if (this.languageReloadTimer !== undefined) {
            window.clearTimeout(this.languageReloadTimer);
            this.languageReloadTimer = undefined;
        }
        this.initializationService.dispose();
        if (this.innerEditor) {
            this.reapOrphanedEditor(this.innerEditor);
            this.innerEditor = null;
        }
    }

    onDataChange(value: string) {
        this.dataChange.emit(value);
    }

    onChange({ editor }: ChangeEvent) {
        if (!editor) {
            console.warn('CKEditor onChange called but editor is undefined');
            return;
        }

        const data = editor.getData();
        this.dataChange.emit(data);
        this.changeDetector.markForCheck();
        // Note: Math processing is handled by the debounced change:data listener in onReady
    }

    onBlur({ editor }: BlurEvent) {
        if (!editor) {
            console.warn('CKEditor onBlur called but editor is undefined');
            return;
        }

        const data = editor.getData();
        this.dataChange.emit(data);
        this.changeDetector.markForCheck();
        // Note: Math processing is handled by the debounced change:data listener in onReady
    }

    onReady(e: Editor) {
        this.editorInstance = e;
        this.initializationService.initializeEditor(e, this.id());

        const trailingBlockNames = new Set(['codeBlock', 'table', 'blockQuote', 'horizontalLine']);
        e.model.document.registerPostFixer((writer) => {
            const root = e.model.document.getRoot();
            if (!root || !root.childCount) return false;
            const last = root.getChild(root.childCount - 1);
            if (last && last.is('element') && trailingBlockNames.has(last.name)) {
                console.log('[CKEditor] post-fixer: inserting trailing paragraph after', last.name);
                writer.append(writer.createElement('paragraph'), root);
                return true;
            }
            return false;
        });

        // Restore content if we're recovering from a language change
        if (this.pendingContent !== null) {
            e.setData(this.pendingContent);
            this.pendingContent = null;
            this.changeDetector.markForCheck();
        }
    }

    /**
     * Destroys an editor whose creation outlived the component that owns it.
     *
     * @ckeditor/ckeditor5-angular skips its own teardown while the editor is still being
     * created: `destroyEditor()` bails out unless `editorWatchdog.editor` is set, and the
     * watchdog only assigns it once the asynchronous `ClassicEditor.create()` resolves.
     * An editor torn down inside that window is therefore never destroyed, and the
     * watchdog's window-level 'error' / 'unhandledrejection' listeners keep it — together
     * with its detached DOM, toolbar, menu bar and balloon panels — reachable for the rest
     * of the session. An exam section holding ~20 essay editors leaks all of them on every
     * section switch that interrupts their creation.
     *
     * `EditorWatchdog.destroy()` chains onto the pending `create()` promise, so calling it
     * here tears the editor down as soon as it exists.
     */
    private reapOrphanedEditor(inner: CKEditorNgComponent) {
        const watchdog = (inner as unknown as { editorWatchdog?: PendingWatchdog }).editorWatchdog;
        if (!watchdog || watchdog.editor) {
            return; // never created, or created in time — the upstream teardown handles it
        }
        watchdog.destroy().catch(() => undefined);
    }

    private createEditorConfig() {
        const externalContentAllowed = this.allowExternalContent();
        const toolbarItems = [
            'undo',
            'redo',
            'findAndReplace',
            '|',
            'link', // cloze plugin comes here if enabled
            '|',
            'heading',
            '|',
            'bold',
            'italic',
            'underline',
            'strikethrough',
            'subscript',
            'superscript',
            'code',
            'removeFormat',
            '|',
            'math',
            'specialCharacters',
            'horizontalLine',
            'insertTable',
            'highlight',
            'blockQuote',
            'codeBlock',
            '|',
            'alignment',
            '|',
            'bulletedList',
            'numberedList',
            'todoList',
            'outdent',
            'indent',
            '|',
            'sourceEditing',
        ];
        if (this.enableClozeTest()) {
            toolbarItems.splice(5, 0, 'cloze');
        }
        const balloonToolbarItems = ['bold', 'italic', '|', 'link', '|', 'bulletedList', 'numberedList'];
        this.editorConfig = {
            toolbar: {
                items: externalContentAllowed ? toolbarItems : withoutLinks(toolbarItems),
                shouldNotGroupWhenFull: true,
            },
            plugins: [
                AccessibilityHelp,
                Alignment,
                Autoformat,
                ...(externalContentAllowed ? [AutoLink] : []),
                Autosave,
                BalloonToolbar,
                BlockQuote,
                Bold,
                Code,
                CodeBlock,
                Essentials,
                FindAndReplace,
                GeneralHtmlSupport,
                Heading,
                Highlight,
                HorizontalLine,
                Indent,
                IndentBlock,
                Italic,
                ...(externalContentAllowed ? [Link] : []),
                List,
                ListProperties,
                Paragraph,
                PasteFromOffice,
                RemoveFormat,
                SelectAll,
                SourceEditing,
                SpecialCharacters,
                SpecialCharactersArrows,
                SpecialCharactersCurrency,
                SpecialCharactersEssentials,
                SpecialCharactersLatin,
                SpecialCharactersMathematical,
                SpecialCharactersText,
                Strikethrough,
                Subscript,
                Superscript,
                Table,
                TableCaption,
                TableCellProperties,
                TableColumnResize,
                TableProperties,
                TableToolbar,
                TextTransformation,
                TodoList,
                Underline,
                Undo,
                WidgetTypeAround,
                WordCount,
                Cloze,
                Math,
            ],
            balloonToolbar: externalContentAllowed ? balloonToolbarItems : withoutLinks(balloonToolbarItems),
            heading: {
                options: [
                    {
                        model: 'paragraph',
                        title: 'Paragraph',
                        class: 'ck-heading_paragraph',
                    },
                    {
                        model: 'heading1',
                        view: 'h1',
                        title: 'Heading 1',
                        class: 'ck-heading_heading1',
                    },
                    {
                        model: 'heading2',
                        view: 'h2',
                        title: 'Heading 2',
                        class: 'ck-heading_heading2',
                    },
                    {
                        model: 'heading3',
                        view: 'h3',
                        title: 'Heading 3',
                        class: 'ck-heading_heading3',
                    },
                    {
                        model: 'heading4',
                        view: 'h4',
                        title: 'Heading 4',
                        class: 'ck-heading_heading4',
                    },
                    {
                        model: 'heading5',
                        view: 'h5',
                        title: 'Heading 5',
                        class: 'ck-heading_heading5',
                    },
                    {
                        model: 'heading6',
                        view: 'h6',
                        title: 'Heading 6',
                        class: 'ck-heading_heading6',
                    },
                ],
            },
            htmlSupport: buildHtmlSupportConfig(externalContentAllowed),
            licenseKey: 'GPL',
            // Inert when `allowExternalContent` is false: the Link plugin that reads it is not loaded.
            link: {
                addTargetToExternalLinks: true,
                defaultProtocol: 'https://',
                decorators: {
                    toggleDownloadable: {
                        mode: 'manual',
                        label: 'Downloadable',
                        attributes: {
                            download: 'file',
                        },
                    },
                },
                toolbar: ['editLink', 'unlink'],
            },
            menuBar: {
                isVisible: true,
            },
            language: { ui: this.Translate.currentLang },
            placeholder: this.Translate.instant('i18n_content_goes_here'),
            table: {
                contentToolbar: [
                    'tableColumn',
                    'tableRow',
                    'mergeTableCells',
                    'tableProperties',
                    'tableCellProperties',
                ],
            },
            translations: [i18nFi, i18nSv, i18nEn],
        };
    }

    private updateEditorLanguage() {
        const newLang = this.Translate.currentLang;
        const currentLang = this.currentLanguage();

        // Only update if language actually changed
        if (newLang === currentLang || !this.isLayoutReady()) {
            return;
        }

        // Store current editor content to restore after recreation
        const currentContent = this.editorInstance?.getData() || this.data() || '';
        this.pendingContent = currentContent;

        // Update language tracking
        this.currentLanguage.set(newLang);

        // Recreate editor config with new language
        this.createEditorConfig();

        // Recreate the editor by toggling isLayoutReady
        // This will destroy the old editor and create a new one with the new language
        this.isLayoutReady.set(false);
        this.editorInstance = null;

        // Use setTimeout to ensure the old editor is fully destroyed before creating a new one
        this.languageReloadTimer = window.setTimeout(() => {
            this.languageReloadTimer = undefined;
            this.isLayoutReady.set(true);
            this.changeDetector.markForCheck();
        }, 50);
    }
}
