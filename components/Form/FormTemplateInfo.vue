<template>
    <aside>
        <h4 class="mt-1 mb-0"><span class="button" title="Zavřít okno">
            <Icon name="mdi:code-block-braces" @click="$emit('close')" />
        </span> Šablony</h4>
        <article>
            <div>
                <NuxtLink
                    to="https://developers.google.com/apps-script/guides/html/templates#printing_scriptlets"
                    target="_blank">
                    Dokumentace HTML šablon
                    <sup>
                        <Icon name="mdi:open-in-new" />
                    </sup>
                </NuxtLink>
            </div>
            V šablonách můžete použít proměnné z typu <code>TemplateVars</code>
            <br>pomocí syntaxe <code>&lt;?= variable ?&gt;</code>
        </article>
        <details v-for="(def, name) in niceDefinitions" :key="name">
            <summary>{{ name }}</summary>
            <pre
                style="white-space: pre-line" class="mono pl-2" v-html="Prism.highlight(inspect(def, {
                    compact: false,
                }).replaceAll('\'', '').replaceAll('{', ' ').replaceAll('}', ' '), Prism.languages.js, 'js')" />
        </details>
    </aside>
</template>
<script setup lang="ts">
import type { JSONSchema7 } from 'json-schema'
import Prism from 'prismjs'
import formTemplateSchema from '#build/forms/schema.json'
import { inspect } from 'util'

type SimplifiedDefiniiton = Record<string, { type: string, items?: { '$ref': string } }>
const templateVars = (formTemplateSchema.definitions!.EmailTemplateVars as JSONSchema7).properties as SimplifiedDefiniiton
const niceDefinitions: Record<string, Record<string, string>> = {}
const definitionsSpecifier = '#/definitions/'
expandDefinition('TemplateVars', templateVars)

function expandDefinition(typeName: string, defintion: SimplifiedDefiniiton) {
    for (const [key, value] of Object.entries(defintion).toSorted((a, b) => a[0].localeCompare(b[0]))) {
        if (typeof niceDefinitions[typeName] == 'undefined') {
            niceDefinitions[typeName] = {}
        }
        let nestedType: string | undefined
        if (typeof value.items != 'undefined') {
            if (value.items.$ref.startsWith(definitionsSpecifier)) {
                nestedType = value.items.$ref.substring(definitionsSpecifier.length)
                expandDefinition(nestedType, (formTemplateSchema.definitions![nestedType] as JSONSchema7).properties as SimplifiedDefiniiton)
            }
        }
        niceDefinitions[typeName][key] = Array.isArray(value.type) ? value.type.join(' | ') : (value.type == 'array' && nestedType) ? `${nestedType}[]` : value.type
    }
}

defineEmits<{
    close: [],
}>()
</script>