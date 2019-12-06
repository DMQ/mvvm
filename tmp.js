// ------------- createRenderer --------------

import { createRenderer } from 'vue'

const { render, createApp } = createRenderer({
    insert: () => { },
    
    remove: () => {},

    createElement: () => {},

    createText: () => {},

    createComment: () => {},

    setText: () => {},

    setElementText: () => {},

    parentNode: () => {},

    nextSibling: () => {},

    querySelector: () => {},
});

// ------------- createApp --------------


Vue.config();
Vue.use();
Vue.directive();
Vue.mixin();
Vue.prototype.$bus = new Vue();

new Vue({
    data() {},
    mounted() {},
}).$mount('#app');


import { createApp, reactive, onMounted } from 'vue';

const App = {
    setup () {
        const data = reactive({});
        onMounted(() => {});
        return data;
    }
};

const vueApp = createApp()

vueApp.use();
vueApp.directive();
vueApp.mixin();
vueApp.config();

vueApp.mount(App, '#app');


// ---------- defineProperty vs proxy -----------

Object.keys(obj).forEach((key) => {
    let val = obj[key];

    Object.defineProperty(obj, key, {
        set (newVal) {
            console.log(`${key} change: ${val} -> ${newVal}`);
            val = newVal;
        },

        get () {
            console.log(`get ${key}: ${val}`);
            return val;
        }
    });
});