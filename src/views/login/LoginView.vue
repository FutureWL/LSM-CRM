<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { APP_ENV } from '@/config/env'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const submitting = ref(false)
const formError = ref<string | null>(null)

const targetAfterLogin = computed(() => {
  // 角色登录后默认目的地
  return auth.role === 'admin' ? '/admin/dashboard' : '/m/home'
})

async function submit() {
  if (submitting.value) return
  formError.value = null
  if (!email.value || !password.value) {
    formError.value = '请输入邮箱和密码'
    return
  }
  submitting.value = true
  try {
    await auth.login(email.value.trim(), password.value)
    // 必须改密：先跳强制改密页
    if (auth.mustChangePassword) {
      router.push('/change-password')
      return
    }
    const redirect = (route.query.redirect as string) || targetAfterLogin.value
    router.push(redirect)
  } catch (err) {
    formError.value = err instanceof Error ? err.message : '登录失败'
  } finally {
    submitting.value = false
  }
}

function quickLogin(userEmail: string, userPassword: string) {
  email.value = userEmail
  password.value = userPassword
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-950 relative overflow-hidden"
  >
    <div
      class="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
    />
    <div
      class="absolute bottom-0 left-0 w-80 h-80 bg-brand-400/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"
    />

    <div class="relative w-full max-w-md">
      <div class="text-center mb-10">
        <div class="inline-flex items-center gap-3 mb-4">
          <div
            class="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xl font-bold shadow-glow"
          >
            L
          </div>
          <div class="text-left">
            <div class="text-white text-2xl font-semibold tracking-tight">LSM-CRM</div>
            <div class="text-ink-400 text-xs">销售管理系统</div>
          </div>
        </div>
        <h1 class="text-white text-3xl font-semibold mb-2">欢迎登录</h1>
        <p class="text-ink-400 text-sm">使用您的工作邮箱和密码登录</p>
      </div>

      <form
        @submit.prevent="submit"
        class="bg-ink-800/60 border border-ink-700/50 rounded-2xl p-6 space-y-4"
      >
        <div>
          <label class="block text-ink-300 text-xs mb-1.5 font-medium">邮箱</label>
          <input
            v-model="email"
            type="email"
            autocomplete="username"
            required
            placeholder="you@example.com"
            class="w-full px-4 py-2.5 rounded-lg bg-ink-900/80 border border-ink-700 text-white placeholder-ink-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
        <div>
          <label class="block text-ink-300 text-xs mb-1.5 font-medium">密码</label>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            placeholder="••••••••"
            class="w-full px-4 py-2.5 rounded-lg bg-ink-900/80 border border-ink-700 text-white placeholder-ink-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        <div
          v-if="formError"
          class="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-300 text-sm"
        >
          {{ formError }}
        </div>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full py-3 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-glow"
        >
          {{ submitting ? '登录中…' : '登录' }}
        </button>
      </form>

      <!-- 快捷登录（仅测试用） -->
      <div class="mt-4">
        <div class="text-ink-500 text-[10px] uppercase tracking-wider mb-2 px-1 text-center">
          快捷登录（仅测试用）
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            @click="quickLogin('yulisha@lsm-crm.local', 'Lsm@2026')"
            class="px-3 py-2.5 text-[12px] rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition-colors flex items-center justify-center gap-1.5"
          >
            <AppIcon name="UserCircleIcon" class="w-4 h-4" />
            余莉莎（管理员）
          </button>
          <button
            type="button"
            @click="quickLogin('weilai@lsm-crm.local', 'WeiLai@2026')"
            class="px-3 py-2.5 text-[12px] rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center justify-center gap-1.5"
          >
            <AppIcon name="UserIcon" class="w-4 h-4" />
            魏来（销售）
          </button>
        </div>
      </div>

      <div class="text-center text-ink-500 text-xs mt-6 space-y-1">
        <div>忘记密码？请联系系统管理员</div>
        <div class="text-ink-600">
          v{{ APP_ENV.appVersion }}
        </div>
      </div>
    </div>
  </div>
</template>