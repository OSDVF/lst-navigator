// https://stackoverflow.com/questions/1573053/javascript-function-to-convert-color-names-to-hex-codes
export function colorToRGBA(color: string) {
    // Returns the color as an array of [r, g, b, a] -- all range from 0 - 255
    // color must be a valid canvas fillStyle. This will cover most anything
    // you'd want to use.
    // Examples:
    // colorToRGBA('red')  # [255, 0, 0, 255]
    // colorToRGBA('#f00') # [255, 0, 0, 255]
    if (import.meta.client) {
        const cvs = document.createElement('canvas')
        cvs.height = 1
        cvs.width = 1
        const ctx = cvs.getContext('2d')
        ctx!.fillStyle = color
        ctx!.fillRect(0, 0, 1, 1)
        return ctx!.getImageData(0, 0, 1, 1).data
    }
    return [0, 0, 0, 0]
}

export function byteToHex(num: number) {
    // Turns a number (0-255) into a 2-character hex number (00-ff)
    return ('0' + num.toString(16)).slice(-2)
}

export function colorToHex(color: string) {
    // Convert any CSS color to a hex representation
    // Examples:
    // colorToHex('red')            # '#ff0000'
    // colorToHex('rgb(255, 0, 0)') # '#ff0000'
    const rgba = colorToRGBA(color)
    const hex = [0, 1, 2].map(
        function (idx) { return byteToHex(rgba[idx]) },
    ).join('')
    return '#' + hex
}

export function darkenColor(color: string, amount: number) {
    return color.replace(/([0-9a-f]{2})/gi, (_match, hex) => {
        const number = parseInt(hex, 16)
        const newNumber = Math.round(Math.min(Math.max(0, number - (number * amount)), 255))
        return newNumber.toString(16).padStart(2, '0')
    })
}

export function setColorTransparency(color: string, alpha: number) {
    const rgba = colorToRGBA(color)
    return `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${alpha})`
}

export function windowIsDark() {
    return import.meta.browser && window.matchMedia('(prefers-color-scheme: dark)').matches
}