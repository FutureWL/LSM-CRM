<script setup lang="ts">
// 账号管理（仅 admin）
//
// 功能：
// - 列出所有用户
// - 新建账号（弹窗）
// - 编辑账号（弹窗）
// - 停用账号（带二次确认）
// - 复制初始密码到剪贴板（新建后展示一次）

import { computed, onMounted, ref } from 'vue'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/types'

const usersStore = useUsersStore()
const auth = useAuthStore()

const showCreate = ref(false)
const showEdit = ref(false)
const showGenerated = ref(false)
const generatedPassword = ref('')
const editing = ref<User | null>(null)

// 新建表单
const form = ref({
  name: '',
  email: '',
  role: 'sales' as 'sales' | 'admin',
  password: '',
})
const formError = ref<string | null>(null)
const submitting = ref(false)

function openCreate() {
  form.value = { name: '', email: '', role: 'sales', password: '' }
  formError.value = null
  showCreate.value = true
}

function openEdit(u: User) {
  editing.value = u
  form.value = {
    name: u.name,
    email: (u as any).email ?? '',
    role: u.role,
    password: '',
  }
  formError.value = null
  showEdit.value = true
}

async function submitCreate() {
  if (submitting.value) return
  formError.value = null
  if (!form.value.name || !form.value.email || !form.value.password) {
    formError.value = '请填写完整'
    return
  }
  if (form.value.password.length < 8) {
    formError.value = '密码至少 8 位'
    return
  }
  submitting.value = true
  try {
    const u = await usersStore.create({ ...form.value })
    generatedPassword.value = form.value.password
    showCreate.value = false
    showGenerated.value = true
    // eslint-disable-next-line no-console
    console.log('[users] created', u)
  } catch (err) {
    formError.value = err instanceof Error ? err.message : '创建失败'
  } finally {
    submitting.value = false
  }
}

async function submitEdit() {
  if (!editing.value || submitting.value) return
  formError.value = null
  submitting.value = true
  try {
    await usersStore.update(editing.value.id, {
      name: form.value.name,
      email: form.value.email,
      role: form.value.role,
      // 留空表示不改密码
      ...(form.value.password ? { password: form.value.password } : {}),
    })
    showEdit.value = false
    editing.value = null
  } catch (err) {
    formError.value = err instanceof Error ? err.message : '更新失败'
  } finally {
    submitting.value = false
  }
}

async function deactivate(u: User) {
  if (u.id === auth.currentUserId) {
    alert('不能停用当前登录的账号')
    return
  }
  if (!confirm(`确定停用账号「${u.name}」？该操作可由管理员恢复（开发中）。`)) return
  try {
    await usersStore.deactivate(u.id)
  } catch (err) {
    alert(err instanceof Error ? err.message : '停用失败')
  }
}

async function copyPassword() {
  try {
    await navigator.clipboard.writeText(generatedPassword.value)
    alert('密码已复制到剪贴板')
  } catch {
    prompt('请手动复制以下密码：', generatedPassword.value)
  }
}

const sortedUsers = computed(() =>
  [...usersStore.list].sort((a, b) => {
    // admin 排前，sales 排后；同 role 按 name
    if (a.role !== b.role) return a.role === 'admin' ? -1 : 1
    return a.name.localeCompare(b.name, 'zh')
  }),
)

onMounted(async () => {
  if (!usersStore.loaded) await usersStore.load(true)
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-semibold text-ink-900">账号管理</h2>
        <p class="text-ink-500 text-sm mt-1">共 {{ usersStore.list.length }} 个活跃账号</p>
      </div>
      <button
        @click="openCreate"
        class="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium shadow-sm"
      >
        + 新建账号
      </button>
    </div>

    <div v-if="usersStore.loading && !usersStore.loaded" class="text-ink-400 text-sm py-12 text-center">
      加载中…
    </div>

    <div v-else class="bg-white rounded-xl border border-ink-200 overflow-hidden">
      <table class="w-full">
        <thead class="bg-ink-50 border-b border-ink-200">
          <tr class="text-left text-xs text-ink-500 uppercase tracking-wider">
            <th class="px-4 py-3 font-medium">姓名</th>
            <th class="px-4 py-3 font-medium">邮箱</th>
            <th class="px-4 py-3 font-medium">角色</th>
            <th class="px-4 py-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink-100">
          <tr v-for="u in sortedUsers" :key="u.id" class="hover:bg-ink-50/50">
            <td class="px-4 py-3">
              <div class="flex items-center gap-2.5">
                <img :src="u.avatar" :alt="u.name" class="w-8 h-8 rounded-full" />
                <div>
                  <div class="text-sm font-medium text-ink-900">{{ u.name }}</div>
                  <div v-if="u.id === auth.currentUserId" class="text-[10px] text-brand-600">（当前账号）</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 text-sm text-ink-700">{{ (u as any).email || '—' }}</td>
            <td class="px-4 py-3">
              <span
                class="inline-block px-2 py-0.5 rounded text-[10px] font-medium"
                :class="u.role === 'admin' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'"
              >
                {{ u.role === 'admin' ? '管理员' : '销售' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <button
                @click="openEdit(u)"
                class="text-brand-600 hover:text-brand-700 text-sm font-medium mr-3"
              >
                编辑
              </button>
              <button
                v-if="u.id !== auth.currentUserId"
                @click="deactivate(u)"
                class="text-red-500 hover:text-red-700 text-sm font-medium"
              >
                停用
              </button>
            </td>
          </tr>
          <tr v-if="sortedUsers.length === 0">
            <td colspan="4" class="px-4 py-12 text-center text-ink-400 text-sm">暂无账号</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 新建弹窗 -->
    <div
      v-if="showCreate"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="showCreate = false"
    >
      <div class="bg-white rounded-xl w-full max-w-md p-6">
        <h3 class="text-lg font-semibold text-ink-900 mb-4">新建账号</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-xs text-ink-500 mb-1">姓名</label>
            <input
              v-model="form.name"
              type="text"
              class="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label class="block text-xs text-ink-500 mb-1">邮箱（登录用）</label>
            <input
              v-model="form.email"
              type="email"
              class="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label class="block text-xs text-ink-500 mb-1">角色</label>
            <div class="flex gap-2">
              <label class="flex items-center gap-1.5 text-sm">
                <input v-model="form.role" type="radio" value="sales" /> 销售
              </label>
              <label class="flex items-center gap-1.5 text-sm">
                <input v-model="form.role" type="radio" value="admin" /> 管理员
              </label>
            </div>
          </div>
          <div>
            <label class="block text-xs text-ink-500 mb-1">初始密码（≥8 位）</label>
            <input
              v-model="form.password"
              type="text"
              placeholder="首次登录后建议修改"
              class="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div v-if="formError" class="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-xs">
            {{ formError }}
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button @click="showCreate = false" class="px-4 py-2 rounded-lg border border-ink-200 text-sm text-ink-700">取消</button>
          <button
            @click="submitCreate"
            :disabled="submitting"
            class="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium disabled:opacity-50"
          >
            {{ submitting ? '创建中…' : '创建' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div
      v-if="showEdit"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="showEdit = false"
    >
      <div class="bg-white rounded-xl w-full max-w-md p-6">
        <h3 class="text-lg font-semibold text-ink-900 mb-4">编辑账号</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-xs text-ink-500 mb-1">姓名</label>
            <input
              v-model="form.name"
              type="text"
              class="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label class="block text-xs text-ink-500 mb-1">邮箱</label>
            <input
              v-model="form.email"
              type="email"
              class="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label class="block text-xs text-ink-500 mb-1">角色</label>
            <div class="flex gap-2">
              <label class="flex items-center gap-1.5 text-sm">
                <input v-model="form.role" type="radio" value="sales" /> 销售
              </label>
              <label class="flex items-center gap-1.5 text-sm">
                <input v-model="form.role" type="radio" value="admin" /> 管理员
              </label>
            </div>
          </div>
          <div>
            <label class="block text-xs text-ink-500 mb-1">
              重置密码（留空不改）
            </label>
            <input
              v-model="form.password"
              type="text"
              placeholder="≥8 位"
              class="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div v-if="formError" class="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-xs">
            {{ formError }}
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button @click="showEdit = false" class="px-4 py-2 rounded-lg border border-ink-200 text-sm text-ink-700">取消</button>
          <button
            @click="submitEdit"
            :disabled="submitting"
            class="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium disabled:opacity-50"
          >
            {{ submitting ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 初始密码展示弹窗 -->
    <div
      v-if="showGenerated"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="showGenerated = false"
    >
      <div class="bg-white rounded-xl w-full max-w-sm p-6">
        <h3 class="text-lg font-semibold text-ink-900 mb-2">账号已创建</h3>
        <p class="text-sm text-ink-600 mb-4">请把以下初始密码安全转交给新用户，建议首次登录后立即修改。</p>
        <div class="bg-ink-900 text-emerald-300 rounded-lg px-4 py-3 font-mono text-sm mb-4 break-all">
          {{ generatedPassword }}
        </div>
        <div class="flex justify-end gap-2">
          <button @click="copyPassword" class="px-4 py-2 rounded-lg border border-ink-200 text-sm text-ink-700">复制</button>
          <button @click="showGenerated = false" class="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>