import Vue from 'vue'
import VueRouter from 'vue-router'
import Meet from './components/Meet'
import App from './App'
import SublimePlugin from './plugins/component-lib'
import vuetify from './plugins/vuetify';
import 'roboto-fontface/css/roboto/roboto-fontface.css'
import '@mdi/font/css/materialdesignicons.css'

Vue.config.productionTip = false
const routes = [
  {
    path: '/:room',
    name: 'Meet',
    component: Meet,
  },
];
const router = new VueRouter({
  mode: 'history',
  routes,
});

Vue.use(VueRouter)

Vue.use(SublimePlugin, {
  auth: 'https://auth.extream.app',
  gateway: 'https://gateway.extream.app',
  // gateway: 'http://localhost:8880',
  apiKey: 'MDM2ODI0MzctYmZhMi00NGUxLTg5NzMtYzc1NDU5NTA0OGQ2Ojg5MmIwOTUzMmI5ZjdkNTNiZDY1MmFlNTZkZTdlMzFmMGFhMTQ2OTFkZjgzN2RiOQ=='
})

new Vue({
  vuetify,
  render: h => h(App),
  router
}).$mount('#app')
