import Vue from 'vue'
import VueRouter from 'vue-router'
import Login from './components/Login'
import Meet from './components/Meet'
import Join from './components/Join'
import App from './App'
import SublimePlugin from '@sublime-productions/vue-components'
import vuetify from './plugins/vuetify';
import 'roboto-fontface/css/roboto/roboto-fontface.css'
import '@mdi/font/css/materialdesignicons.css'

Vue.config.productionTip = false
const routes = [
  {
    path: '/l/:room',
    name: 'Login',
    component: Login,
  },
  {
    path: '/m/:room',
    name: 'Meet',
    component: Meet,
  },
  {
    path: '/j/:room',
    name: 'Join',
    component: Join,
  },
];
const router = new VueRouter({
  routes,
});

Vue.use(VueRouter)

Vue.use(SublimePlugin, {
  auth: 'https://auth.extream.app',
  gateway: 'https://gateway.extream.app',
  apiKey: 'MDM2ODI0MzctYmZhMi00NGUxLTg5NzMtYzc1NDU5NTA0OGQ2Ojg5MmIwOTUzMmI5ZjdkNTNiZDY1MmFlNTZkZTdlMzFmMGFhMTQ2OTFkZjgzN2RiOQ=='
})

new Vue({
  vuetify,
  render: h => h(App),
  router
}).$mount('#app')
