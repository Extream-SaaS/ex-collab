import Vue from 'vue'
import VueRouter from 'vue-router'
import Meet from './components/Meet'
import Logout from './components/Logout'
import App from './App'
import SublimePlugin from './plugins/component-lib'
import vuetify from './plugins/vuetify';
import VueBlurHash from 'vue-blurhash'
import 'vue-blurhash/dist/vue-blurhash.css'
import 'roboto-fontface/css/roboto/roboto-fontface.css'
import '@mdi/font/css/materialdesignicons.css'
import { PersistanceType } from '@sublime-productions/extream-sdk'

Vue.config.productionTip = false
const routes = [
  {
    path: '/logout',
    name: 'Logout',
    component: Logout,
  },
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

Vue.use(VueBlurHash)

Vue.use(SublimePlugin, {
  auth: 'https://auth.extream.app',
  gateway: 'https://gateway.extream.app',
  // gateway: 'http://localhost:8880',
  collab: 'https://collab.extream.app',
  apiKey: 'MDM2ODI0MzctYmZhMi00NGUxLTg5NzMtYzc1NDU5NTA0OGQ2Ojg5MmIwOTUzMmI5ZjdkNTNiZDY1MmFlNTZkZTdlMzFmMGFhMTQ2OTFkZjgzN2RiOQ==',
  persistance: PersistanceType.Cookie
})

Vue.prototype.$extreamData = {
  eventId: '08c3d14e-2cfe-4262-a536-f64c25310d52',
  itemId: 'fF9KUD0z1Ic5zGeEZd8O',
}

new Vue({
  vuetify,
  render: h => h(App),
  router
}).$mount('#app')
