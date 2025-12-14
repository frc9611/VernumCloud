import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
// eslint-disable-next-line
import {authStore} from '@/store/auth.js' //Maybe the IDE says there is an error, but it's ok

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'login',
    component: () => import(/* webpackChunkName: "login" */ '../views/LoginView.vue')
  },
  {
    path: '/home',
    name: 'home',
    component: () => import(/* webpackChunkName: "home" */ '../views/HomeView.vue'),
    meta:{
      auth: true
    }
  },
  {
    path: '/about',
    name: 'about',
    component: () => import(/* webpackChunkName: "about" */ '../views/AboutView.vue')
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import(/* webpackChunkName: "admin" */ '../views/AdminView.vue'),
    meta:{
      auth: true,
      requireAdmin: true
    }
  },
  {
    path: '/users',
    name: 'users',
    component: () => import(/* webpackChunkName: "users" */ '../views/UsersView.vue'),
    meta:{
      auth: true,
      requireAdmin: true
    }
  },
  {
    path: '/admin/users/:id',
    name: 'editUsers',
    component: () => import(/* webpackChunkName: "users" */ '../views/EditUsersView.vue'),
    meta:{
      auth: true,
      requireAdmin: true
    }
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach(async (to, from, next) => {
  if(to.meta?.auth){
    const auth = authStore();
    if(auth.isAuth){
      if(to.meta?.requireAdmin){
        auth.isAdmin? next() : next({name: 'home'});
      }else{
        next();
      }
    }else{
      next({name: 'login'});
    }
  }else{
    next();
  }
})

export default router
