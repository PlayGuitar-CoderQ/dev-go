import {
  passTransClass,
  passTransNode,
  setNotranslateNode,
} from '~script/set-no-translate-node'

interface TranslateElements {
  elements: NodeListOf<HTMLElement>
  tag: keyof HTMLElementTagNameMap
}
chrome.runtime.onMessage.addListener((message, sender, res) => {
  const { type } = message
  if (type === 'inline') {
    // 翻译所有的标签
    loopTransNode(document.body)
  } else {
    paragraphTrans()
  }
})

// 要过滤的标签
const passTransList = [
  'html',
  'head',
  'meta',
  'title',
  'body',
  'script',
  'style',
  'link',
  'code',
].concat(passTransNode)

// 过滤标签
const filterTagsFn = (tag) => {
  if (tag?.nodeType === 3) return tag
  // 过滤掉在过滤标签中的标签
  if (
    tag?.nodeType === 1 &&
    !passTransList.includes(tag?.tagName?.toLowerCase()) &&
    [...tag?.classList].every((item) => !passTransClass.includes(item))
  ) {
    return tag
  }
}

// 递归处理所有的标签
function loopTransNode(element) {
  // 当子元素为空时，中断
  if (element.childNodes.length === 0) return
  // 获取所有的子节点
  const childrenList = Array.from(element?.childNodes, filterTagsFn)
  // 遍历所有的子节点,  需要翻译的元素
  childrenList.forEach((tag) => {
    // 如果是文本节点，且不为空时，发送翻译请求
    if (tag?.nodeType === 3 && tag.textContent.trim() !== '') {
      // 如果文本中全是中文或空，不翻译
      if (!tag.textContent || /^[\u4e00-\u9fa5]+$/.test(tag.textContent)) return
      // 发送翻译请求
      chrome.runtime.sendMessage({ text: tag.textContent }, (res) => {
        insertTransResult(tag, res.text)
      })
    } else {
      tag && loopTransNode(tag)
    }
  })
}

// 段落对比翻译
function paragraphTrans() {
  // 需要翻译的元素
  const translateElements: TranslateElements[] = [
    {
      elements: document.querySelectorAll('h1,h2,h3,h4,h5,h6'),
      tag: 'p',
    },
    {
      elements: document.querySelectorAll('p'),
      tag: 'p',
    },
    {
      elements: document.querySelectorAll('li'),
      tag: 'li',
    },
  ]
  // 遍历需要翻译的元素
  translateElements.forEach(({ elements, tag }) => {
    elements.forEach((item) => {
      // // 如果文本中全是中文或空，不翻译
      // if (!item.innerText || /^[\u4e00-\u9fa5]+$/.test(item.innerText)) return
      // 发送翻译请求
      chrome.runtime.sendMessage({ text: item.innerText }, (res) => {
        // 插入翻译后的文本到元素中
        insertTransResult(item, res.text, tag)
      })
    })
  })
}

// 插入翻译结果
export function insertTransResult(
  node: HTMLElement,
  transResult: string,
  resultTag?: string,
) {
  // 如何返回值中不包含中文或者为空时候，不插入到页面中
  if (!transResult || !/[\u4e00-\u9fa5]/.test(transResult)) return
  // 如果本文开头包含中文标点符号，去除
  transResult = transResult.replace(/^[，。？！：；、]/, '')
  // 插入翻译后的文本到元素中
  const transNode = document.createElement(resultTag || 'font')
  transNode.className = 'translate-node'
  transNode.style.cssText = `
    color:red;
    padding: 0 4px;
    font-size: 14px;
  `
  transNode.innerText = transResult
  node.parentNode?.insertBefore(transNode, node.nextSibling)
}

// 页面上所有的DOM,样式表,脚本,图片都已经加载完成时
window.onload = () => {
  // 优化浏览器自带的页面翻译，设置不自动翻译的元素
  setNotranslateNode()
}
// 仅当DOM加载完成时
// TODO 目前 plasmo 貌似不支持注入的 run_at: document_start
// window.addEventListener("DOMContentLoaded", () => {
//   githubEditOnline()
//   console.log("DOM fully loaded and parsed")
// })
