let ssuiStatus = {}

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

async function updateView(triggerBy) {
    ssuiStatus.loaded = true
    console.log('[ssui] ' + triggerBy + ' 正在重绘 UI……')
    const combatCloseCanvas = await updateFightView()
    await updateMapView()

    const passages = document.querySelector('#passages')
    if (!passages) return
    passages.classList.remove('ssui-hidden')

    // 延后处理
    setTimeout(() => {
        if (combatCloseCanvas != null) {
            combatCloseCanvas.forEach(elc => {
                if (elc && isCanvasBlankFast(elc)) {
                    elc.parentNode.classList.add('hidden')
                }
            })
        }
    }, 500)
}

// ==============================

function updateMapView() {
    const mapBody = document.getElementsByClassName('mapmove')
    if (!mapBody || mapBody.length == 0) return

    const mapView = mapBody[0].parentNode
    mapView.classList.add('ssui-map')
}

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

// ==============================

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