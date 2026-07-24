// CSS、JS 热更新方法
(function() {
    'use strict';

    if (window.ssui) {
        console.log('正在覆盖...');
    }

    const SSUI = {
        loaded: {
            css: false,
            js: false
        },
        paths: {
            css: '/dol/mods/DoL-SSUI/css/ss-ui.css',
            js: '/dol/mods/DoL-SSUI/js/ss-ui.js'
        },
        _initialized: false,

        // 初始化
        init() {
            if (this._initialized) return this;
            this._initialized = true;
            this._bindHotkeys();
            console.log('已初始化');
            return this;
        },

        // 清理
        clean(type) {
            if (type === 'css' || !type) {
                // 清理 CSS
                document.querySelectorAll('style[data-ssui], link[data-ssui], link[href*="combat-ui.css"]')
                    .forEach(el => {
                        el.remove();
                        console.log('移除 CSS 元素:', el.tagName);
                    });
                this.loaded.css = false;
                console.log('CSS 已清理');
            }
            
            if (type === 'js' || !type) {
                // 清理 JS script 标签
                document.querySelectorAll('script[data-ssui], script[src*="combat-ui-rework.js"]')
                    .forEach(el => {
                        el.remove();
                        console.log('移除 JS 元素:', el.tagName);
                    });
                
                // 清理全局变量
                const globalVars = ['fightList', 'combatUI', 'CombatUI', 'fightUI', 'combat', 'Combat'];
                globalVars.forEach(varName => {
                    try {
                        if (window[varName] !== undefined) {
                            delete window[varName];
                            console.log('清理全局变量:', varName);
                        }
                    } catch(e) {
                        window[varName] = undefined;
                    }
                });
                
                this.loaded.js = false;
                console.log('JS 已清理');
            }
        },

        // 加载 CSS
        async loadCSS() {
            try {
                const url = this.paths.css + '?v=' + Date.now();
                console.log('加载 CSS:', url);
                
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const content = await response.text();
                
                const style = document.createElement('style');
                style.textContent = content;
                style.setAttribute('data-ssui', 'css');
                style.setAttribute('data-version', Date.now());
                document.head.appendChild(style);
                
                this.loaded.css = true;
                console.log('CSS 已加载 (大小: ' + content.length + ' bytes)');
                return true;
            } catch (error) {
                console.error('CSS 加载失败:', error);
                return false;
            }
        },

        // 加载 JS
        async loadJS() {
            try {
                const url = this.paths.js + '?v=' + Date.now();
                console.log('加载 JS:', url);
                
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const content = await response.text();
                
                // 用 Function 执行
                const func = new Function('window', 'document', content + '\n//# sourceURL=' + this.paths.js);
                func(window, document);
                
                this.loaded.js = true;
                console.log('JS 已加载 (大小: ' + content.length + ' bytes)');
                return true;
            } catch (error) {
                console.error('JS 加载失败:', error);
                return false;
            }
        },

        // 重载主方法
        async reload(options = {}) {
            const {
                css = true,
                js = true,
                force = true  // 默认强制重新加载
            } = options;
            
            console.log('🔄 SSUI 开始重载...', 
                'CSS:' + (css ? '✔' : '✖'),
                'JS:' + (js ? '✔' : '✖'),
                '强制:' + (force ? '✔' : '✖')
            );
            
            const results = {};
            
            // 清理
            if (css || js) {
                this.clean(
                    css && js ? undefined : 
                    css ? 'css' : 
                    js ? 'js' : undefined
                );
            }
            
            // 加载
            if (css) {
                results.css = await this.loadCSS();
            } else {
                results.css = true;
            }
            
            if (js) {
                results.js = await this.loadJS();
            } else {
                results.js = true;
            }
            
            if (results.css && results.js) {
                console.log('重载完成');
            } else {
                console.warn('部分加载失败');
            }
            
            return results;
        },

        // 只重载 CSS
        async reloadCSS() {
            console.log('只重载 CSS');
            return this.reload({ css: true, js: false });
        },

        // 只重载 JS
        async reloadJS() {
            console.log('只重载 JS');
            return this.reload({ css: false, js: true });
        },

        // 绑定热键
        _bindHotkeys() {
            // 移除旧的监听器（如果有）
            if (this._hotkeyHandler) {
                document.removeEventListener('keydown', this._hotkeyHandler);
            }
            
            this._hotkeyHandler = (e) => {
                // Ctrl+Shift+R - 重载全部
                if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('⌨️ 热键触发: Ctrl+Shift+R');
                    this.reload({ force: true });
                }
                // Ctrl+Shift+C - 只重载 CSS
                else if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('⌨️ 热键触发: Ctrl+Shift+C');
                    this.reloadCSS();
                }
                // Ctrl+Shift+J - 只重载 JS
                else if (e.ctrlKey && e.shiftKey && e.key === 'J') {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('⌨️ 热键触发: Ctrl+Shift+J');
                    this.reloadJS();
                }
            };
            
            document.addEventListener('keydown', this._hotkeyHandler);
        },

        // 获取状态
        getStatus() {
            return {
                loaded: { ...this.loaded },
                paths: { ...this.paths },
                initialized: this._initialized,
                timestamp: new Date().toISOString()
            };
        },

        // 更新路径
        setPaths(cssPath, jsPath) {
            if (cssPath) {
                this.paths.css = cssPath;
                console.log('CSS 路径更新:', cssPath);
            }
            if (jsPath) {
                this.paths.js = jsPath;
                console.log('JS 路径更新:', jsPath);
            }
            return this.paths;
        }
    };

    // 绑定到全局
    window.ssui = SSUI;
    
    // 自动初始化
    window.ssui.init();

    // 打印帮助信息
    console.log('使用方式:');
    console.log('  ssui.reload()              - 重载全部');
    console.log('  ssui.reloadCSS()           - 只重载 CSS');
    console.log('  ssui.reloadJS()            - 只重载 JS');
    console.log('  ssui.getStatus()           - 查看状态');
    console.log('  ssui.setPaths(css, js)     - 更新文件路径');
    console.log('  ssui.clean("css")          - 只清理 CSS');
    console.log('  ssui.clean("js")           - 只清理 JS');
    console.log('快捷键:');
    console.log('  Ctrl+Shift+R  - 重载全部');
    console.log('  Ctrl+Shift+C  - 只重载 CSS');
    console.log('  Ctrl+Shift+J  - 只重载 JS');

    // 导出到全局（兼容性）
    window.SSUI = SSUI;

})();

// 额外安全检测
if (typeof ssui === 'undefined') {
    console.error('初始化失败！');
} else {
    console.log('已就绪');
}