let ssuiStatus = {}

// 触发器
if (typeof jQuery !== "undefined" || typeof $ !== "undefined") {
    const jq = typeof jQuery !== "undefined" ? jQuery : $
    jq(document).on(":passagestart", function () {
        const passages = document.querySelector('#passages')
        if (!passages) return
        passages.classList.add('ssui-hidden')
        setTimeout(() => {
            updateView('TimeOut')
        }, 200)
    })
}

/**
 * UI 更新器主入口
 * @param {*} triggerBy 触发来源（日志用）
 */
async function updateView(triggerBy) {
    ssuiStatus.loaded = true
    console.log('[ssui] ' + triggerBy + ' 正在重绘 UI……')
    const combatCloseCanvas = await updateFightView()
    await updateMapView()
    updateContent()

    const passages = document.querySelector('#passages')
    if (!passages) return
    passages.classList.remove('ssui-hidden')

    // 延后处理
    // setTimeout(() => {
    //     if (combatCloseCanvas != null) {
    //         combatCloseCanvas.forEach(elc => {
    //             if (elc && isCanvasBlankFast(elc)) {
    //                 elc.parentNode.classList.add('hidden')
    //             }
    //         })
    //     }
    // }, 210)
}

// 功能模块 ==============================

function updateContent() {
    const excludedSelectors = [
        '#clothingShop-div',
        '#furnitureContainer',
        '#paperContainer',
        '#listContainer',
        '#supermarketDisplay',
        '#kitchenDisplay',
        '#wardrobewear',
        '#settingsDiv',
        '.streamscreen',
        '.div_stalk',
    ]
    if (hasAnyElement(excludedSelectors)) return
    
    const passageContent = document.querySelector('#passage-content')
    if (!passageContent || passageContent.dataset.ssuiWrapped === 'true') return

    const childNodes = Array.from(passageContent.childNodes)
    let blockNodes = []

    for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i]
        const separatorEnd = getDoubleBrSeparatorEnd(childNodes, i)

        if (separatorEnd !== -1) {
            wrapLinkBlock(passageContent, blockNodes, node)
            blockNodes = []
            i = separatorEnd
            continue
        }

        blockNodes.push(node)
    }

    wrapLinkBlock(passageContent, blockNodes)
    formatLinkBlocks(passageContent)
    removeBreaksBetweenLinkBlocks(passageContent)
    wrapAdjacentLinkBlocks(passageContent)
    layoutLinkPanels()
    setTimeout(() => {
        layoutLinkPanels()
    }, 250)
    setupLinkPanelResize()
    passageContent.dataset.ssuiWrapped = 'true'
}

/**
 * 悬浮小地图
 */
function updateMapView() {
    const mapBody = document.getElementsByClassName('mapmove')
    if (!mapBody || mapBody.length == 0) return

    const mapView = mapBody[0].parentNode
    mapView.classList.add('ssui-map')
}

/**
 * 更好的战斗视图
 * @returns combatCloseCanvas 战斗预览图延迟更新列表
 */
function updateFightView() {
    const fightList = document.querySelector('#listContainer')
    const passages = document.querySelector('#passages')
    if (!passages) return
    const fightPreview = passages.querySelectorAll('.d-flex').length > 0

    if (fightPreview || fightList) {
        const div = document.createElement('div')
        div.className = 'ssui-fight'
        div.innerHTML = `
            <div class="top">
                <div class="content"></div>
                <div class="view"></div>
            </div>
            <div class="controller"></div>
        `

        const content = div.querySelector('.content')

        const contentNodes = []
        const children = Array.from(passages.children)

        children.forEach(child => {
            if (!child.classList || !child.classList.contains('ssui-fight')) {
                contentNodes.push(child)
            }
        })

        contentNodes.forEach(node => {
            content.appendChild(node)
        })

        passages.innerHTML = ''

        // 更新战斗预览图
        const combatCloseCanvas = updateFightPreview(div, content)
        // 更新控制器组件
        if (fightList) {
            updateFightViewController(div, content)
        } else {
            div.querySelector('.controller').remove()
        }
        passages.appendChild(div)

        return combatCloseCanvas
    }

    return null
}

// 辅助方法 ==============================

/**
 * 更新战斗预览图
 * @param {*} div ssui-fight 元素
 * @param {*} content ssui-fight content 元素
 * @returns 
 */
function updateFightPreview(div, content) {
    let combatCloseCanvas = []
    // 将姿态图部分移动到 view 中
    const view = div.querySelector('.view')
    const dFlexElements = content.querySelectorAll('.d-flex')
    dFlexElements.forEach(el => {
        // 隐藏没有绘制的衣物状态
        if (el.classList.contains('combat-close')) {
            combatCloseCanvas = el.querySelectorAll('canvas')
        }
        view.appendChild(el)
    })
    return combatCloseCanvas
}

/**
 * 更新战斗控制器
 * @param {*} div ssui-fight 元素
 * @param {*} content ssui-fight content 元素
 */
function updateFightViewController(div, content) {
    // 将原有的控制器部分移动到 controller 中
    const next = content.querySelector('#next')
    if (next) {
        const baseController = next.previousElementSibling
        if (baseController) {
            const controller = div.querySelector('.controller')
            controller.appendChild(baseController)
            cleanUpDirtyElements(controller)
            cleanUpDirtyElements(content)
            
            const replaceAction = div.querySelector('#replaceAction')
            if(replaceAction) {
                replaceAction.childNodes.forEach((el) => {
                    const originalOnclick = el.onclick
                    el.onclick = function(e) {
                        cleanUpDirtyElements(controller)
                    }
                })
            }
        }
    }
}

// 工具方法 ==============================

function hasAnyElement(selectors) {
    return selectors.some(selector => document.querySelector(selector))
}

function getDoubleBrSeparatorEnd(nodes, startIndex) {
    if (!isBrNode(nodes[startIndex])) return -1

    for (let i = startIndex + 1; i < nodes.length; i++) {
        const node = nodes[i]

        if (isBrNode(node)) return i
        if (node.nodeType !== Node.TEXT_NODE || node.textContent.trim() !== '') return -1
    }

    return -1
}

function isBrNode(node) {
    return node && node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR'
}

function wrapLinkBlock(parent, blockNodes, beforeNode = null) {
    if (!blockNodes.some(node => hasLinkElement(node))) return

    const wrapper = document.createElement('div')
    wrapper.className = 'ssui-link-block'
    parent.insertBefore(wrapper, beforeNode)

    blockNodes.forEach(node => {
        wrapper.appendChild(node)
    })
}

function hasLinkElement(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return false
    return node.matches('a') || node.querySelector('a')
}

function formatLinkBlocks(parent) {
    Array.from(parent.children)
        .filter(child => isLinkBlockNode(child))
        .forEach(linkBlock => {
            wrapFirstTextNode(linkBlock)
            wrapLinkItems(linkBlock)
            wrapLinkTextNodes(linkBlock)
            cleanFirstLinkItemSpan(linkBlock)
            wrapLinkStatuses(linkBlock)
            wrapStatusLists(linkBlock)
            removeBreaksBetweenLinkItems(linkBlock)
            bindLinkItemClicks(linkBlock)
        })
}

function wrapFirstTextNode(linkBlock) {
    const textNode = Array.from(linkBlock.childNodes)
        .find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '')

    if (!textNode) return

    const span = document.createElement('span')
    linkBlock.insertBefore(span, textNode)
    span.appendChild(textNode)
}

function wrapLinkItems(linkBlock) {
    const links = Array.from(linkBlock.querySelectorAll('a'))
        .filter(link => link.parentNode === linkBlock)
    const linkStartNodes = links.map(link => getLinkItemStartNode(link))

    links.forEach((link, index) => {
        const item = document.createElement('div')
        item.className = 'ssui-link-item'
        const nodesToWrap = getNodesBetween(linkStartNodes[index], linkStartNodes[index + 1])

        linkBlock.insertBefore(item, nodesToWrap[0])
        nodesToWrap.forEach(node => {
            item.appendChild(node)
        })
    })
}

function getLinkItemStartNode(link) {
    let startNode = link
    let previousNode = link.previousSibling

    while (previousNode && previousNode.nodeType === Node.TEXT_NODE && previousNode.textContent.trim() === '') {
        previousNode = previousNode.previousSibling
    }

    if (isLinkIconNode(previousNode)) {
        startNode = previousNode
    }

    return startNode
}

function getNodesBetween(startNode, endNode = null) {
    const nodes = []
    let node = startNode

    while (node && node !== endNode) {
        nodes.push(node)
        node = node.nextSibling
    }

    return nodes
}

function isLinkIconNode(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return false
    if (node.tagName === 'IMG') return true
    if (node.classList.contains('icon-container')) return true
    return Boolean(node.querySelector('img.icon'))
}

function wrapLinkTextNodes(linkBlock) {
    const links = linkBlock.querySelectorAll('.ssui-link-item a')

    links.forEach(link => {
        Array.from(link.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '')
            .forEach(textNode => {
                const span = document.createElement('span')
                link.insertBefore(span, textNode)
                span.appendChild(textNode)
            })
    })
}

function cleanFirstLinkItemSpan(linkBlock) {
    const linkItems = linkBlock.querySelectorAll('.ssui-link-item')

    linkItems.forEach(linkItem => {
        const link = linkItem.querySelector('a')
        if (!link) return

        const span = link.querySelector('span')
        if (!span) return

        span.textContent = span.textContent
            .replaceAll('(', '')
            .replaceAll(')', '')
            .replaceAll('（', '')
            .replaceAll('）', '')
    })
}

function wrapLinkStatuses(linkBlock) {
    const linkItems = linkBlock.querySelectorAll('.ssui-link-item')

    linkItems.forEach(linkItem => {
        splitPipeTextNodes(linkItem)

        const childNodes = Array.from(linkItem.childNodes)
        let statusNodes = []
        let collectingStatus = false

        childNodes.forEach(node => {
            if (isPipeNode(node)) {
                if (collectingStatus) {
                    wrapStatusNodes(linkItem, statusNodes)
                    statusNodes = []
                }

                collectingStatus = true
                node.remove()
                return
            }

            if (collectingStatus) {
                statusNodes.push(node)
            }
        })

        if (collectingStatus) {
            wrapStatusNodes(linkItem, statusNodes)
        }
    })
}

function splitPipeTextNodes(parent) {
    Array.from(parent.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.includes('|'))
        .forEach(node => {
            const parts = node.textContent.split('|')

            parts.forEach((part, index) => {
                if (part !== '') {
                    parent.insertBefore(document.createTextNode(part), node)
                }

                if (index < parts.length - 1) {
                    parent.insertBefore(document.createTextNode('|'), node)
                }
            })

            node.remove()
        })
}

function wrapStatusNodes(linkItem, statusNodes) {
    trimStatusNodes(statusNodes)
    if (!statusNodes.some(node => hasStatusContent(node))) return

    const status = document.createElement('div')
    status.className = 'ssui-link-status'
    linkItem.insertBefore(status, statusNodes[0])

    statusNodes.forEach(node => {
        status.appendChild(node)
    })
}

function trimStatusNodes(statusNodes) {
    while (statusNodes.length > 0 && isEmptyStatusEdgeNode(statusNodes[0])) {
        statusNodes.shift().remove()
    }

    while (statusNodes.length > 0 && isEmptyStatusEdgeNode(statusNodes[statusNodes.length - 1])) {
        statusNodes.pop().remove()
    }
}

function isEmptyStatusEdgeNode(node) {
    if (isBrNode(node)) return true
    return node.nodeType === Node.TEXT_NODE && node.textContent.trim() === ''
}

function hasStatusContent(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim() !== ''
    if (isBrNode(node)) return false
    return node.nodeType === Node.ELEMENT_NODE
}

function isPipeNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim() === '|'
    if (node.nodeType !== Node.ELEMENT_NODE) return false
    return node.textContent.trim() === '|'
}

function wrapStatusLists(linkBlock) {
    const linkItems = linkBlock.querySelectorAll('.ssui-link-item')

    linkItems.forEach(linkItem => {
        const statuses = Array.from(linkItem.children)
            .filter(child => child.classList.contains('ssui-link-status'))

        if (statuses.length === 0) return

        const statusList = document.createElement('div')
        statusList.className = 'ssui-link-status-list'
        linkItem.insertBefore(statusList, statuses[0])

        statuses.forEach(status => {
            statusList.appendChild(status)
        })
    })
}

function removeBreaksBetweenLinkItems(linkBlock) {
    const childNodes = Array.from(linkBlock.childNodes)

    for (let i = 0; i < childNodes.length; i++) {
        if (!isLinkItemNode(childNodes[i])) continue

        const nodesBetween = []
        let hasBreak = false

        for (let j = i + 1; j < childNodes.length; j++) {
            const node = childNodes[j]

            if (isLinkItemNode(node)) {
                if (hasBreak) {
                    nodesBetween.forEach(separatorNode => separatorNode.remove())
                }
                i = j - 1
                break
            }

            if (isBrNode(node)) {
                hasBreak = true
                nodesBetween.push(node)
                continue
            }

            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '') {
                nodesBetween.push(node)
                continue
            }

            break
        }
    }
}

function isLinkItemNode(node) {
    return node && node.nodeType === Node.ELEMENT_NODE && node.classList.contains('ssui-link-item')
}

function bindLinkItemClicks(linkBlock) {
    const linkItems = linkBlock.querySelectorAll('.ssui-link-item')

    linkItems.forEach(linkItem => {
        const link = linkItem.querySelector('a')
        if (!link) return

        linkItem.addEventListener('click', event => {
            if (event.target.closest && event.target.closest('a')) return
            link.click()
        })
    })
}

function removeBreaksBetweenLinkBlocks(parent) {
    const childNodes = Array.from(parent.childNodes)

    for (let i = 0; i < childNodes.length; i++) {
        if (!isLinkBlockNode(childNodes[i])) continue

        const nodesBetween = []
        let hasBreak = false

        for (let j = i + 1; j < childNodes.length; j++) {
            const node = childNodes[j]

            if (isLinkBlockNode(node)) {
                if (hasBreak) {
                    nodesBetween.forEach(separatorNode => separatorNode.remove())
                }
                i = j - 1
                break
            }

            if (isBrNode(node)) {
                hasBreak = true
                nodesBetween.push(node)
                continue
            }

            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '') {
                nodesBetween.push(node)
                continue
            }

            break
        }
    }
}

function wrapAdjacentLinkBlocks(parent) {
    const childNodes = Array.from(parent.childNodes)
    let linkBlocks = []

    const wrapCurrentBlocks = () => {
        if (linkBlocks.length > 0) {
            const panel = document.createElement('div')
            panel.className = 'ssui-link-panel'
            parent.insertBefore(panel, linkBlocks[0])

            linkBlocks.forEach(node => {
                panel.appendChild(node)
            })
        }

        linkBlocks = []
    }

    childNodes.forEach(node => {
        if (isLinkBlockNode(node)) {
            linkBlocks.push(node)
            return
        }

        wrapCurrentBlocks()
    })

    wrapCurrentBlocks()
}

function layoutLinkPanels() {
    const panels = document.querySelectorAll('.ssui-link-panel')

    panels.forEach(panel => {
        requestAnimationFrame(() => {
            layoutLinkPanel(panel)
        })
    })
}

function layoutLinkPanel(panel) {
    const blocks = getLinkPanelBlocks(panel)
    if (blocks.length === 0) return

    const columnCount = getLinkPanelColumnCount(panel)
    const blockHeights = blocks.map(block => block.offsetHeight)
    const targetColumnHeight = blockHeights.reduce((total, height) => total + height, 0) / columnCount
    const columns = []

    panel.innerHTML = ''

    for (let i = 0; i < columnCount; i++) {
        const column = document.createElement('div')
        column.className = 'ssui-link-column'
        columns.push(column)
        panel.appendChild(column)
    }

    let columnIndex = 0
    let columnHeight = 0

    blocks.forEach((block, index) => {
        const blockHeight = blockHeights[index]
        const remainingBlocks = blocks.length - index
        const remainingColumns = columnCount - columnIndex
        const shouldReserveNextColumns = remainingBlocks <= remainingColumns && columnHeight > 0
        const shouldBalanceNextColumn = columnHeight > 0
            && columnIndex < columnCount - 1
            && Math.abs(columnHeight + blockHeight - targetColumnHeight) > Math.abs(columnHeight - targetColumnHeight)

        if (columnIndex < columnCount - 1 && (shouldReserveNextColumns || shouldBalanceNextColumn)) {
            columnIndex++
            columnHeight = 0
        }

        columns[columnIndex].appendChild(block)
        columnHeight += blockHeight
    })
}

function getLinkPanelBlocks(panel) {
    const blocks = []

    Array.from(panel.children).forEach(child => {
        if (isLinkBlockNode(child)) {
            blocks.push(child)
            return
        }

        if (isLinkColumnNode(child)) {
            Array.from(child.children)
                .filter(node => isLinkBlockNode(node))
                .forEach(node => blocks.push(node))
        }
    })

    return blocks
}

function getLinkPanelColumnCount(panel) {
    const panelWidth = panel.clientWidth || window.innerWidth

    if (panelWidth <= 500) return 1
    if (panelWidth <= 650) return 2
    return 3
}

function setupLinkPanelResize() {
    if (ssuiStatus.linkPanelResizeSetup) return

    ssuiStatus.linkPanelResizeSetup = true
    window.addEventListener('resize', () => {
        clearTimeout(ssuiStatus.linkPanelResizeTimer)
        ssuiStatus.linkPanelResizeTimer = setTimeout(() => {
            layoutLinkPanels()
        }, 100)
    })
}

function isLinkColumnNode(node) {
    return node && node.nodeType === Node.ELEMENT_NODE && node.classList.contains('ssui-link-column')
}

function isLinkBlockNode(node) {
    return node && node.nodeType === Node.ELEMENT_NODE && node.classList.contains('ssui-link-block')
}

/**
 * 清理 DOM 中 #text 的竖线和空格
 * @param {*} element 元素
 */
function cleanUpDirtyElements(element) {
    // 遍历所有子节点
    for (let i = 0; i < element.childNodes.length; i++) {
        const node = element.childNodes[i]

        if (node.nodeType === Node.TEXT_NODE) {
            // 如果是文本节点，清除竖杠
            if (node.textContent.includes('|')) {
                node.textContent = node.textContent
                    .replaceAll('|', '')
                    .replaceAll(' ', '')
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // 如果是元素节点，递归处理
            cleanUpDirtyElements(node)

            if (node.tagName === 'BR') {
                node.remove()
            }
        }
    }
}

/**
 * 判断 canvas 中有没有绘制内容
 * @param {*} canvas canvas 元素
 * @param {*} step 采样粗细
 * @returns 是否绘制内容
 */
function isCanvasBlankFast(canvas, step = 10) {
    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    for (let i = 3; i < data.length; i += step * 4) {
        if (data[i] !== 0) {
            return false
        }
    }
    return true
}
