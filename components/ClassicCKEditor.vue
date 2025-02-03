<!-- eslint-disable vue/no-v-html -->
<template>
    <LazyClientOnly>
        <div
            ref="area" v-no-overflow contenteditable class="rich-editor" @focus="emit('focus')"
            @mousedown="emit('focus')"
            @blur="e => { emit('update:modelValue', stripBadElements((e.target as HTMLDivElement).innerHTML)); emit('blur') }"
            v-html="stripBadElements(modelValue)" />
    </LazyClientOnly>
</template>
<script setup lang="ts">

const props = defineProps<{
    modelValue?: string | null,
    plain?: boolean  | null,
}>()
const emit = defineEmits<{
    'update:modelValue': [value: string],
    focus: [],
    blur: [],
}>()

const area = useTemplateRef('area')
const allowedAttributes = [
    'href', 'name', 'target', 'src', 'srcset', 'alt', 'title', 'width', 'height', 'loading', 'type', 'data-type',
]
let editor: any | null = null
declare const CKEDITOR: any

onBeforeUnmount(() => {
    editor?.destroy?.()
    emit('blur')
})

onMounted(async () => {
    if (props.plain) {
        return
    }
    if (typeof CKEDITOR === 'undefined') {
        await new Promise((resolve) => {
            const script = document.getElementById('ckeditor5-script')
            if (script) {
                script.addEventListener('load', resolve)
            }
        })
    }
    if (!area.value) {
        await new Promise<void>((resolve) => {
            const stop = watch(() => area.value, (value) => {
                if (value) {
                    resolve()
                    stop()
                }
            })
        })
    }
    editor = await CKEDITOR.ClassicEditor.create(area.value, {
        licenseKey: 'GPL',
        toolbar: {
            items: [
                'undo',
                'redo',
                '|',
                'heading',
                '|',
                'fontColor',
                'fontBackgroundColor',
                '|',
                'bold',
                'italic',
                'underline',
                '|',
                'horizontalLine',
                'link',
                'insertImage',
                'mediaEmbed',
                'insertTable',
                'blockQuote',
                '|',
                'bulletedList',
                'numberedList',
                'todoList',
                'outdent',
                'indent',
                '|',
                'sourceEditing',
                'showBlocks',
                'findAndReplace',
            ],
            shouldNotGroupWhenFull: false,
        },
        plugins: [
            CKEDITOR.AccessibilityHelp,
            CKEDITOR.Autoformat,
            CKEDITOR.AutoImage,
            CKEDITOR.Autosave,
            CKEDITOR.Base64UploadAdapter,
            CKEDITOR.BlockQuote,
            CKEDITOR.Bold,
            CKEDITOR.Essentials,
            CKEDITOR.FindAndReplace,
            CKEDITOR.FontBackgroundColor,
            CKEDITOR.FontColor,
            CKEDITOR.FontFamily,
            CKEDITOR.FontSize,
            CKEDITOR.GeneralHtmlSupport,
            CKEDITOR.Heading,
            CKEDITOR.HorizontalLine,
            CKEDITOR.ImageBlock,
            CKEDITOR.ImageCaption,
            CKEDITOR.ImageInline,
            CKEDITOR.ImageInsert,
            CKEDITOR.ImageInsertViaUrl,
            CKEDITOR.ImageResize,
            CKEDITOR.ImageStyle,
            CKEDITOR.ImageTextAlternative,
            CKEDITOR.ImageToolbar,
            CKEDITOR.ImageUpload,
            CKEDITOR.Indent,
            CKEDITOR.IndentBlock,
            CKEDITOR.Italic,
            CKEDITOR.Link,
            CKEDITOR.LinkImage,
            CKEDITOR.List,
            CKEDITOR.ListProperties,
            CKEDITOR.MediaEmbed,
            CKEDITOR.Paragraph,
            CKEDITOR.PasteFromMarkdownExperimental,
            CKEDITOR.PasteFromOffice,
            CKEDITOR.SelectAll,
            CKEDITOR.ShowBlocks,
            CKEDITOR.SourceEditing,
            CKEDITOR.Table,
            CKEDITOR.TableCaption,
            CKEDITOR.TableCellProperties,
            CKEDITOR.TableColumnResize,
            CKEDITOR.TableProperties,
            CKEDITOR.TableToolbar,
            CKEDITOR.TextTransformation,
            CKEDITOR.TodoList,
            CKEDITOR.Underline,
            CKEDITOR.Undo,
        ],
        fontFamily: {
            supportAllValues: true,
        },
        fontSize: {
            options: [10, 12, 14, 'default', 18, 20, 22],
            supportAllValues: true,
        },
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
        htmlSupport: {
            allow: [
                {
                    name: /^.*$/,
                    styles: true,
                    attributes: allowedAttributes,
                    classes: true,
                },
            ],
        },
        image: {
            toolbar: [
                'toggleImageCaption',
                'imageTextAlternative',
                '|',
                'imageStyle:inline',
                'imageStyle:wrapText',
                'imageStyle:breakText',
                '|',
                'resizeImage',
            ],
        },
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
        },
        list: {
            properties: {
                styles: true,
                startIndex: true,
                reversed: true,
            },
        },
        table: {
            contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells', 'tableProperties', 'tableCellProperties'],
        },
    })

    // set initial data
    editor.setData(props.modelValue || '')

    editor.model.document.on('change:data', () => {
        emit('update:modelValue', editor.getData())
    })

    editor.ui.focusTracker.on('change:isFocused', (_evt: any, _name: string, isFocused: boolean) => {
        if (isFocused) {
            emit('focus')
        } else {
            emit('blur')
        }
    })

})

</script>

<style>
.ck-editor__top {
    max-width: 97vw;
}

.ck-editor__editable {
    min-width: 300px;
    max-width: 97vw;
}

.ck-editor {
    max-width: 97vw;
    width: 100%;
}

.rich-editor {
    width: 100%;
    background-color: white;
    border: 1px inset black;
    border-radius: 2px;
    padding: 4px;
    margin-block: 1px;
    font-size: 1rem;
    overflow-x: auto;
    resize: both
}
</style>