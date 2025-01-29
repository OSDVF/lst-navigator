export function stripHtml(html?: string) {
    if (!html) {
        return ''
    }
    return html.replace(/<[^>]*>?/gm, '')
}

// Bad elements are script, image, iframe, object, embed, style, link, meta, base, frame, frameset, ilayer, layer, bgsound, title, basefont, meta, noscript, noframes, plaintext, param, applet, audio, video, source, track, marquee, blink, style, link, meta, base, frame, frameset, ilayer, layer, bgsound, title, basefont, meta, noscript, noframes, plaintext, param, applet, audio, video, source, track, marquee, blink
export function stripBadElements(html?: string | null) {
    if (!html) {
        return ''
    }
    return html.replace(/<(script|image|iframe|object|embed|style|link|meta|base|frame|frameset|ilayer|layer|bgsound|title|basefont|meta|noscript|noframes|plaintext|param|applet|audio|video|source|track|marquee|blink)[^>]*>?/gm, '')
}