<script setup lang="ts">
// 修改自己的密码
// - 需要 currentPassword 校验（防 CSRF/冒用）
// - 成功后强制重新登录（让旧 cookie 失效前的窗口期可控）

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const error = ref<string | null>(null)
const submitting = ref(false)

async function submit() {
  if (submitting.value) return
  error.value = null
  if (!currentPassword.value || !newPassword.value) {
    error.value = '请填写完整'
    return
  }
  if (newPassword.value.length < 8) {
    error.value = '新密码至少 8 位'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次输入的新密码不一致'
    return
  }
  if (newPassword.value === currentPassword.value) {
    error.value = '新密码不能与当前密码相同'
    return
  }
  submitting.value = true
  try {
    await auth.changeOwnPassword(currentPassword.value, newPassword.value)
    alert('密码修改成功，请重新登录')
    await auth.logout()
    router.push('/login')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '修改失败'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-full bg-ink-50 p-4">
    <div class="max-w-md mx-auto">
      <div class="bg-white rounded-2xl border border-ink-100 p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-ink-900 mb-1">修改密码</h2>
        <p class="text-xs text-ink-500 mb-5">为了账号安全，请定期更换密码。</p>

        <form @submit.prevent="submit" class="space-y-4">
          <div>
            <label class="block text-xs text-ink-500 mb-1.5">当前密码</label>
            <input
              v-model="currentPassword"
              type="password"
              autocomplete="current-password"
              class="w-full px-3 py-2.5 rounded-lg border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label class="block text-xs text-ink-500 mb-1.5">新密码（≥8 位）</label>
            <input
              v-model="newPassword"
              type="password"
              autocomplete="new-password"
              class="w-full px-3 py-2.5 rounded-lg border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label class="block text-xs text-ink-500 mb-1.5">确认新密码</label>
            <input
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              class="w-full px-3 py-2.5 rounded-lg border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div
            v-if="error"
            class="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-sm"
          >
            {{ error }}
          </div>
          <button
            type="submit"
            :disabled="submitting"
            class="w-full py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium disabled:opacity-50"
          >
            {{ submitting ? '提交中…' : '提交' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>