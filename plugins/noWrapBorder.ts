export default defineNuxtPlugin({
    parallel: true,
    name: 'no-wrap-border',
    setup(nuxtApp) {
        nuxtApp.vueApp.directive('no-wrap-border', { // meant to be used together with css class border-between defined in utilities.scss
            mounted(el : HTMLElement, _binding, _vnode) {
                let firstItemInCurrentRow = el.children[0] as HTMLElement
                let previousItem = firstItemInCurrentRow
                if (!firstItemInCurrentRow) { return }
                for (const item of Array.from(el.children) as HTMLElement[]) {
                    // Check if the current item is at the same
                    // height as the first item in the current row.
                    if (item.offsetTop !== firstItemInCurrentRow.offsetTop) {
                        if (item !== firstItemInCurrentRow) {
                        // Add the divider.
                            previousItem.style.borderRight = 'none'
                            // This item was lower, it must be
                            // the first in a new row.
                            firstItemInCurrentRow = item
                        }
                    }
                    previousItem = item
                }
            },
        })
    },
})
