<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

// 必须改密时强制遮罩（即使路由跳错也拦）
const isForced = computed(() => auth.mustChangePassword)

const newPassword = ref('')
const confirmPassword = ref('')
const submitting = ref(false)
const formError = ref<string | null>(null)
const fieldErrors = ref<Record<string, string[]>>({})

const isLoggedIn = computed(() => auth.isLoggedIn)

const passwordStrength = computed(() => {
  const p = newPassword.value
  if (!p) return { score: 0, label: '', color: 'bg-ink-700' }
  let score = 0
  if (p.length >= 8) score++
  if (p.length >= 12) score++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++
  if (/\d/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  if (score <= 1) return { score, label: '弱', color: 'bg-red-500' }
  if (score <= 3) return { score, label: '中', color: 'bg-yellow-500' }
  return { score, label: '强', color: 'bg-brand-500' }
})

async function submit() {
  if (submitting.value) return
  formError.value = null
  fieldErrors.value = {}

  if (!newPassword.value) {
    formError.value = '请输入新密码'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    formError.value = '两次输入的密码不一致'
    return
  }

  submitting.value = true
  try {
    await auth.changePassword(newPassword.value)
    // 改密成功后跳转首页（路由守卫会自动放行）
    const target = auth.isAdmin ? '/admin/dashboard' : '/m/home'
    router.replace(target)
  } catch (err: any) {
    // 兼容 ApiError 结构：{ code, message, details }
    const msg = err?.message ?? '修改密码失败'
    formError.value = msg
    if (err?.details?.errors && Array.isArray(err.details.errors)) {
      formError.value = msg + '：' + err.details.errors.join('；')
    }
    if (err?.details?.fieldErrors) {
      fieldErrors.value = err.details.fieldErrors
    }
  } finally {
    submitting.value = false
  }
}

async function doLogout() {
  await auth.logout()
  router.replace('/login')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-950 relative overflow-hidden">
    <!-- 装饰背景 -->
    <div class="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
    <div class="absolute bottom-0 left-0 w-80 h-80 bg-yellow-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

    <div class="relative w-full max-w-md">
      <!-- 顶部提示 -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-2xl shadow-glow">
            !
          </div>
          <div class="text-left">
            <div class="text-white text-2xl font-semibold tracking-tight">首次登录</div>
            <div class="text-ink-400 text-xs">请修改初始密码</div>
          </div>
        </div>
        <p class="text-ink-300 text-sm leading-relaxed">
          为了您的账号安全，请修改初始密码后再使用系统
        </p>
      </div>

      <!-- 改密表单 -->
      <form
        @submit.prevent="submit"
        class="bg-ink-800/60 border border-yellow-500/20 rounded-2xl p-6 space-y-4"
      >
        <!-- 当前账号提示 -->
        <div class="flex items-center gap-3 px-4 py-3 rounded-lg bg-ink-900/50 border border-ink-700/50">
          <div class="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-sm font-medium">
            {{ auth.currentUser?.name?.charAt(0) ?? '?' }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-white text-sm font-medium truncate">{{ auth.currentUser?.name }}</div>
            <div class="text-ink-400 text-xs truncate">{{ auth.currentUser?.email ?? auth.currentUserId }}</div>
          </div>
        </div>

        <!-- 新密码 -->
        <div>
          <label class="block text-ink-300 text-xs mb-1.5 font-medium">
            新密码 <span class="text-red-400">*</span>
          </label>
          <input
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            required
            placeholder="至少 8 个字符"
            class="w-full px-4 py-2.5 rounded-lg bg-ink-900/80 border border-ink-700 text-white placeholder-ink-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <!-- 强度条 -->
          <div v-if="newPassword" class="mt-2 flex items-center gap-2">
            <div class="flex-1 h-1 bg-ink-700 rounded-full overflow-hidden">
              <div
                class="h-full transition-all"
                :class="passwordStrength.color"
                :style="{ width: (passwordStrength.score * 20) + '%' }"
              />
            </div>
            <span class="text-xs text-ink-400 w-6">{{ passwordStrength.label }}</span>
          </div>
        </div>

        <!-- 确认密码 -->
        <div>
          <label class="block text-ink-300 text-xs mb-1.5 font-medium">
            确认新密码 <span class="text-red-400">*</span>
          </label>
          <input
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            required
            placeholder="再次输入新密码"
            class="w-full px-4 py-2.5 rounded-lg bg-ink-900/80 border border-ink-700 text-white placeholder-ink-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <p v-if="confirmPassword && newPassword !== confirmPassword" class="mt-1 text-xs text-red-400">
            两次输入的密码不一致
          </p>
        </div>

        <!-- 错误提示 -->
        <div v-if="formError" class="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {{ formError }}
        </div>

        <!-- 字段级错误 -->
        <div v-if="Object.keys(fieldErrors).length > 0" class="px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs space-y-1">
          <div v-for="(msgs, field) in fieldErrors" :key="field">
            <span class="font-medium">{{ field }}：</span>
            <span>{{ Array.isArray(msgs) ? msgs.join('；') : msgs }}</span>
          </div>
        </div>

        <!-- 强度提示 -->
        <div class="px-4 py-3 rounded-lg bg-ink-900/50 border border-ink-700/50 text-ink-400 text-xs space-y-1">
          <div class="text-ink-300 font-medium mb-1">密码要求：</div>
          <div>· 至少 8 个字符（推荐 12+）</div>
          <div>· 包含字母和数字</div>
          <div>· 建议加大小写或符号</div>
          <div>· 不能与邮箱 / 姓名相同</div>
        </div>

        <!-- 提交按钮 -->
        <button
          type="submit"
          :disabled="submitting || !newPassword || newPassword !== confirmPassword"
          class="w-full py-3 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 text-white font-medium shadow-glow hover:from-brand-400 hover:to-brand-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ submitting ? '提交中…' : '确认修改并进入系统' }}
        </button>

        <!-- 退出登录 -->
        <button
          type="button"
          @click="doLogout"
          class="w-full py-2 text-ink-400 text-sm hover:text-ink-200 transition-colors"
        >
          退出登录
        </button>
      </form>

      <p class="text-center text-ink-500 text-xs mt-6">
        改密前无法访问系统其他功能
      </p>
    </div>
  </div>
</template>
