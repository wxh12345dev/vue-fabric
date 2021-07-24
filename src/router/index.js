import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

// 公共路由
export const constantRoutes = [
	{
	  path: '',
	  redirect:'index'
	},
  {
    path: '/index',
	name:'index',
	component: (resolve) => require(['@/pages/fabric'], resolve)
  },
  {
    path: '/vnc',
	name:'vnc',
	component: (resolve) => require(['@/pages/vnc'], resolve)
  },
]

export default new Router({
  mode: 'history', // 去掉url中的#
  scrollBehavior: () => ({ y: 0 }),
  routes: constantRoutes
})
