import { createRouter, createWebHashHistory } from 'vue-router'
import { challenges } from '../data/challenges'

const challengeRoutes = challenges.map((challenge) => ({
  path: `/day/${challenge.day}`,
  name: `challenge-${challenge.day}`,
  component: () => import('../views/ChallengePage.vue'),
  props: { day: challenge.day },
}))

export const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomePage.vue'),
  },
  ...challengeRoutes,
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundPage.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return savedPosition ?? { top: 0, behavior: 'smooth' }
  },
})

export default router
