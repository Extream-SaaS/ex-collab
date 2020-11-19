import Vue from 'vue'
import ExtreamClient from '@sublime-productions/extream-sdk'

export default {
  install (vueInstance, option) {
    Vue.prototype.$extream = new ExtreamClient(option)
  }
}
