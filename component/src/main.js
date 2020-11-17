import Vue from 'vue'
import VueRouter from 'vue-router'
import Login from './components/Login'
import Meet from './components/Meet'
import App from './App'
import vuetify from './plugins/vuetify';
import 'roboto-fontface/css/roboto/roboto-fontface.css'
import '@mdi/font/css/materialdesignicons.css'

Vue.config.productionTip = false
const routes = [
  {
    path: '/l',
    name: 'Login',
    component: Login,
  },
  {
    path: '/m',
    name: 'Meet',
    component: Meet
  }
];
const router = new VueRouter({
  routes // short for `routes: routes`
});

Vue.use(VueRouter)

new Vue({
  vuetify,
  render: h => h(App),
  router
}).$mount('#app')
