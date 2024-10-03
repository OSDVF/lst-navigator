<template>
    <ckeditor
        v-if="ClassicEditor" style="max-width: 99vw;" v-bind="$attrs" :model-value="props.modelValue || ''"
        :config="config" :editor="ClassicEditor" @update:model-value="v => emit('update:modelValue', v)" />
</template>
<script setup lang="ts">
import type { EditorConfig } from 'ckeditor5'
const props = defineProps<{
    modelValue: string | null | undefined,
}>()
const emit = defineEmits<{
    'update:modelValue': [value: string]
}>()

const ClassicEditor = ref()
const config = ref<EditorConfig>()
const allowedAttributes = [
    'href', 'name', 'target', 'src', 'srcset', 'alt', 'title', 'width', 'height', 'loading', 'type', 'data-type',
]
onMounted(() => {
    import('ckeditor5').then(async (c) => {
        ClassicEditor.value = c.ClassicEditor
        config.value = {
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
                c.AccessibilityHelp,
                c.Autoformat,
                c.AutoImage,
                c.Autosave,
                c.Base64UploadAdapter,
                c.BlockQuote,
                c.Bold,
                c.Essentials,
                c.FindAndReplace,
                c.FontBackgroundColor,
                c.FontColor,
                c.FontFamily,
                c.FontSize,
                c.GeneralHtmlSupport,
                c.Heading,
                c.HorizontalLine,
                c.ImageBlock,
                c.ImageCaption,
                c.ImageInline,
                c.ImageInsert,
                c.ImageInsertViaUrl,
                c.ImageResize,
                c.ImageStyle,
                c.ImageTextAlternative,
                c.ImageToolbar,
                c.ImageUpload,
                c.Indent,
                c.IndentBlock,
                c.Italic,
                c.Link,
                c.LinkImage,
                c.List,
                c.ListProperties,
                c.MediaEmbed,
                c.Paragraph,
                c.PasteFromMarkdownExperimental,
                c.PasteFromOffice,
                c.SelectAll,
                c.ShowBlocks,
                c.SourceEditing,
                c.Table,
                c.TableCaption,
                c.TableCellProperties,
                c.TableColumnResize,
                c.TableProperties,
                c.TableToolbar,
                c.TextTransformation,
                c.TodoList,
                c.Underline,
                c.Undo,
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
</style>