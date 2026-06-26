<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { useRoute, useRouter } from 'vue-router'
import { useCustomersStore } from '@/stores/customers'
import { useVisitsStore } from '@/stores/visits'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import { formatDate, formatMoney } from '@/lib/format'
import StageTag from '@/components/StageTag.vue'
import VisitTimeline from '@/components/VisitTimeline.vue'

const route = useRoute()
const router = useRouter()
const customers = useCustomersStore()
const visits = useVisitsStore()
const users = useUsersStore()
const auth = useAuthStore()

const customer = computed(() => customers.byId(route.params.id as string))
const owner = computed(() => (customer.value ? users.byId(customer.value.ownerId) : null))
const previousOwner = computed(() =>
  customer.value?.previousOwnerId ? users.byId(customer.value.previousOwnerId) : null,
)
const transferredByUser = computed(() =>
  customer.value?.transferredBy ? users.byId(customer.value.transferredBy) : null,
)
const visitList = computed(() => (customer.value ? visits.byCustomer(customer.value.id) : []))

const salesList = computed(() =>
  users.sales().filter((u) => u.id !== customer.value?.ownerId),
)

const showTransferModal = ref(false)
const selectedNewOwnerId = ref<string>('')
const transferNote = ref<string>('')

watch(showTransferModal, (open) => {
  if (open) {
    selectedNewOwnerId.value = ''
    transferNote.value = ''
  }
})

function openTransfer() {
  showTransferModal.value = true
}

function closeTransfer() {
  showTransferModal.value = false
}

function confirmTransfer() {
  if (!customer.value || !selectedNewOwnerId.value || !auth.currentUserId) return
  const note = transferNote.value.trim() || undefined
  customers.transferOwner(
    customer.value.id,
    selectedNewOwnerId.value,
    auth.currentUserId,
    note,
  )
  closeTransfer()
}

// === 账款 / 质保 / 商机 ===
const warrantyEnd = computed(() =>
  customer.value ? customers.warrantyEndAt(customer.value) : undefined,
)
const paymentState = computed(() => {
  const c = customer.value
  if (!c || !c.amountDue || c.amountDue <= 0 || !c.dueDate) return 'idle' as const
  const days = dayjs(c.dueDate).diff(dayjs(), 'day')
  if (days < 0) return 'overdue' as const
  if (days <= 7) return 'soon' as const
  return 'normal' as const
})
const warrantyState = computed(() => {
  if (!warrantyEnd.value) return 'none' as const
  const days = dayjs(warrantyEnd.value).diff(dayjs(), 'day')
  if (days < 0) return 'expired' as const
  if (days <= 30) return 'expiring' as const
  return 'active' as const
})

function handleMarkInvoiced() {
  if (!customer.value) return
  const amt = Number(prompt('本次开票金额(元)', String(customer.value.estimatedValue)))
  if (!amt || amt <= 0) return
  const term = Number(prompt('账期天数', '30'))
  if (!term || term <= 0) return
  customers.markInvoiced(customer.value.id, amt, term)
}
function handleRecordCollection() {
  if (!customer.value || !customer.value.amountDue) return
  const amt = Number(
    prompt(`本次回款金额(剩余未收 ${formatMoney(customer.value.amountDue)})`, '0'),
  )
  if (!amt || amt <= 0) return
  customers.recordCollection(customer.value.id, amt)
}
function handleSetWarranty() {
  if (!customer.value) return
  const months = Number(prompt('质保期(月)', '12'))
  if (!months || months <= 0) return
  customers.setWarranty(customer.value.id, dayjs().toISOString(), months)
}
function handleSetPrediction() {
  if (!customer.value) return
  const product = prompt('预测的下一单产品 / 服务', '企业版升级')
  if (!product) return
  const value = Number(prompt('预测金额(元)', String(customer.value.estimatedValue)))
  if (!value || value <= 0) return
  customers.setPrediction(customer.value.id, product, value)
}
function handleClearPrediction() {
  if (!customer.value) return
  if (!confirm('确定清除商机预测?')) return
  customers.clearPrediction(customer.value.id)
}
</script>

<template>
  <div v-if="!customer" class="text-center text-ink-500 py-12">客户不存在</div>
  <div v-else class="space-y-4">
    <button
      @click="router.back()"
      class="text-sm text-ink-500 hover:text-ink-800 inline-flex items-center gap-1"
    >
      ← 返回
    </button>

    <div class="bg-white rounded-2xl p-6 border border-ink-100 shadow-card">
      <div class="flex items-start gap-4">
        <div
          class="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
          :style="{ backgroundColor: '#10b981' }"
        >
          {{ customer.company.charAt(0) }}
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-semibold text-ink-900">{{ customer.company }}</h2>
            <StageTag :stage="customer.stage" />
          </div>
          <div class="text-sm text-ink-500 mt-1">
            {{ customer.industry }} · 创建于 {{ formatDate(customer.createdAt, 'YYYY-MM-DD') }}
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-ink-400">预估金额</div>
          <div class="text-xl font-bold text-brand-600 mt-1">
            {{ formatMoney(customer.estimatedValue) }}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-6 mt-6 pt-6 border-t border-ink-100">
        <div>
          <div class="text-xs text-ink-400">联系人</div>
          <div class="text-sm text-ink-800 mt-1">{{ customer.contact }}</div>
        </div>
        <div>
          <div class="text-xs text-ink-400">电话</div>
          <div class="text-sm text-ink-800 mt-1">{{ customer.phone }}</div>
        </div>
        <div>
          <div class="text-xs text-ink-400">邮箱</div>
          <div class="text-sm text-ink-800 mt-1">{{ customer.email ?? '—' }}</div>
        </div>
        <div>
          <div class="text-xs text-ink-400">归属销售</div>
          <div class="text-sm text-ink-800 mt-1 flex items-center gap-1.5">
            <img v-if="owner" :src="owner.avatar" class="w-5 h-5 rounded-full" />
            {{ owner?.name }}
          </div>
        </div>
        <div class="col-span-2">
          <div class="text-xs text-ink-400">地址</div>
          <div class="text-sm text-ink-800 mt-1">{{ customer.address ?? '—' }}</div>
        </div>
        <div class="col-span-2">
          <div class="text-xs text-ink-400">备注</div>
          <div class="text-sm text-ink-800 mt-1">{{ customer.remark ?? '—' }}</div>
        </div>
      </div>

      <div
        v-if="customer.transferredAt"
        class="mt-6 pt-6 border-t border-ink-100 flex items-start gap-3"
      >
        <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
          ↻
        </div>
        <div class="flex-1 text-sm">
          <div class="text-ink-800">
            由
            <span class="font-medium">{{ previousOwner?.name ?? '—' }}</span>
            转移至
            <span class="font-medium">{{ owner?.name ?? '—' }}</span>
            <span class="text-ink-400 ml-2">
              {{ formatDate(customer.transferredAt, 'YYYY-MM-DD HH:mm') }}
            </span>
          </div>
          <div v-if="transferredByUser" class="text-xs text-ink-400 mt-1">
            操作人:{{ transferredByUser.name }}
          </div>
          <div v-if="customer.transferNote" class="text-xs text-ink-500 mt-1">
            备注:{{ customer.transferNote }}
          </div>
        </div>
      </div>

      <div class="mt-6 pt-6 border-t border-ink-100 flex justify-end">
        <button
          @click="openTransfer"
          class="px-4 py-2 rounded-lg bg-brand-50 text-brand-700 text-sm font-medium hover:bg-brand-100 transition-colors inline-flex items-center gap-1.5"
        >
          <span>↻</span>
          <span>转移跟单</span>
        </button>
      </div>
    </div>

    <div class="bg-white rounded-2xl p-6 border border-ink-100 shadow-card">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-base">💵</div>
          <h3 class="text-sm font-semibold text-ink-800">账款信息</h3>
          <span
            v-if="paymentState === 'overdue'"
            class="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600"
          >逾期</span>
          <span
            v-else-if="paymentState === 'soon'"
            class="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600"
          >即将到期</span>
        </div>
        <div class="flex gap-2">
          <button
            @click="handleRecordCollection"
            :disabled="!customer.amountDue || customer.amountDue <= 0"
            class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
            :class="customer.amountDue && customer.amountDue > 0
              ? 'border-brand-500 text-brand-600 hover:bg-brand-50'
              : 'border-ink-200 text-ink-300 cursor-not-allowed'"
          >记录回款</button>
          <button
            @click="handleMarkInvoiced"
            class="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
          >标记开票</button>
        </div>
      </div>
      <div class="grid grid-cols-4 gap-4 text-sm">
        <div>
          <div class="text-xs text-ink-400">账期</div>
          <div class="text-ink-800 mt-1">{{ customer.paymentTermDays ? customer.paymentTermDays + ' 天' : '—' }}</div>
        </div>
        <div>
          <div class="text-xs text-ink-400">未收金额</div>
          <div class="font-semibold text-ink-900 mt-1">
            {{ customer.amountDue ? formatMoney(customer.amountDue) : '—' }}
          </div>
        </div>
        <div>
          <div class="text-xs text-ink-400">应收日期</div>
          <div class="text-ink-800 mt-1">
            {{ customer.dueDate ? formatDate(customer.dueDate, 'YYYY-MM-DD') : '—' }}
          </div>
        </div>
        <div>
          <div class="text-xs text-ink-400">距到期</div>
          <div
            class="mt-1 font-medium"
            :class="paymentState === 'overdue' ? 'text-red-600' : paymentState === 'soon' ? 'text-amber-600' : 'text-ink-700'"
          >
            <template v-if="customer.dueDate">
              {{ dayjs(customer.dueDate).diff(dayjs(), 'day') >= 0
                ? dayjs(customer.dueDate).diff(dayjs(), 'day') + ' 天后'
                : '已逾期 ' + (-dayjs(customer.dueDate).diff(dayjs(), 'day')) + ' 天'
              }}
            </template>
            <template v-else>—</template>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-2xl p-6 border border-ink-100 shadow-card">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center text-base">🛡️</div>
          <h3 class="text-sm font-semibold text-ink-800">质保期</h3>
          <span
            v-if="warrantyState === 'active'"
            class="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-600"
          >质保中</span>
          <span
            v-else-if="warrantyState === 'expiring'"
            class="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600"
          >即将到期</span>
          <span
            v-else-if="warrantyState === 'expired'"
            class="text-xs px-2 py-0.5 rounded-full bg-ink-100 text-ink-500"
          >已过保</span>
        </div>
        <button
          @click="handleSetWarranty"
          class="px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors"
        >{{ customer.warrantyStartAt ? '更新质保期' : '设置质保期' }}</button>
      </div>
      <div v-if="customer.warrantyStartAt" class="grid grid-cols-4 gap-4 text-sm">
        <div>
          <div class="text-xs text-ink-400">开始日期</div>
          <div class="text-ink-800 mt-1">{{ formatDate(customer.warrantyStartAt, 'YYYY-MM-DD') }}</div>
        </div>
        <div>
          <div class="text-xs text-ink-400">质保期</div>
          <div class="text-ink-800 mt-1">{{ customer.warrantyMonths }} 个月</div>
        </div>
        <div>
          <div class="text-xs text-ink-400">到期日期</div>
          <div class="text-ink-800 mt-1">{{ warrantyEnd ? formatDate(warrantyEnd, 'YYYY-MM-DD') : '—' }}</div>
        </div>
        <div>
          <div class="text-xs text-ink-400">剩余</div>
          <div
            class="mt-1 font-medium"
            :class="warrantyState === 'expiring' ? 'text-amber-600' : warrantyState === 'expired' ? 'text-ink-400' : 'text-sky-600'"
          >
            <template v-if="warrantyEnd">
              {{ dayjs(warrantyEnd).diff(dayjs(), 'day') >= 0
                ? dayjs(warrantyEnd).diff(dayjs(), 'day') + ' 天'
                : '已过保 ' + (-dayjs(warrantyEnd).diff(dayjs(), 'day')) + ' 天'
              }}
            </template>
          </div>
        </div>
      </div>
      <div v-else class="text-sm text-ink-400 text-center py-4">
        该客户尚未设置质保期
      </div>
    </div>

    <div class="bg-white rounded-2xl p-6 border border-ink-100 shadow-card">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-base">📈</div>
          <h3 class="text-sm font-semibold text-ink-800">商机预测</h3>
          <span class="text-xs text-ink-400">本单结束后的下一单</span>
        </div>
        <div class="flex gap-2">
          <button
            v-if="customer.predictedNextValue"
            @click="handleClearPrediction"
            class="px-3 py-1.5 rounded-lg text-xs font-medium border border-ink-200 text-ink-500 hover:bg-ink-50 transition-colors"
          >清除</button>
          <button
            @click="handleSetPrediction"
            class="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
          >{{ customer.predictedNextValue ? '调整预测' : '记录新商机' }}</button>
        </div>
      </div>
      <div v-if="customer.predictedNextValue" class="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div class="text-xs text-ink-400">预测产品 / 服务</div>
          <div class="text-ink-800 mt-1 font-medium">{{ customer.predictedProduct ?? '—' }}</div>
        </div>
        <div>
          <div class="text-xs text-ink-400">预测金额</div>
          <div class="text-2xl font-bold text-emerald-600 mt-1">{{ formatMoney(customer.predictedNextValue) }}</div>
        </div>
        <div>
          <div class="text-xs text-ink-400">预测时间</div>
          <div class="text-ink-800 mt-1">
            {{ customer.predictedAt ? formatDate(customer.predictedAt, 'YYYY-MM-DD') : '—' }}
          </div>
        </div>
      </div>
      <div v-else class="text-sm text-ink-400 text-center py-4">
        该客户暂无下一单预测,可在拜访后或合同到期前补充
      </div>
    </div>

    <div class="bg-white rounded-2xl p-6 border border-ink-100 shadow-card">
      <h3 class="text-sm font-semibold text-ink-800 mb-4">跟进时间线</h3>
      <VisitTimeline :visits="visitList" />
    </div>

    <Teleport to="body">
      <div
        v-if="showTransferModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        @click.self="closeTransfer"
      >
        <div class="bg-white rounded-2xl w-full max-w-md shadow-lift overflow-hidden">
          <div class="px-6 py-4 border-b border-ink-100">
            <h3 class="text-base font-semibold text-ink-900">转移跟单</h3>
            <p class="text-xs text-ink-500 mt-1">
              将「{{ customer.company }}」转移给其他销售
            </p>
          </div>

          <div class="px-6 py-5 space-y-4">
            <div>
              <div class="text-xs text-ink-500 mb-1.5">当前归属</div>
              <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-50">
                <img v-if="owner" :src="owner.avatar" class="w-7 h-7 rounded-full" />
                <div>
                  <div class="text-sm text-ink-800">{{ owner?.name }}</div>
                  <div v-if="owner" class="text-xs text-ink-400">{{ owner.team }}</div>
                </div>
              </div>
            </div>

            <div>
              <label class="text-xs text-ink-500 mb-1.5 block">转移给</label>
              <div class="space-y-1.5 max-h-56 overflow-y-auto">
                <button
                  v-for="s in salesList"
                  :key="s.id"
                  type="button"
                  @click="selectedNewOwnerId = s.id"
                  :class="[
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors',
                    selectedNewOwnerId === s.id
                      ? 'bg-brand-50 ring-1 ring-brand-500'
                      : 'bg-ink-50 hover:bg-ink-100',
                  ]"
                >
                  <img :src="s.avatar" class="w-7 h-7 rounded-full" />
                  <div class="flex-1">
                    <div class="text-sm text-ink-800">{{ s.name }}</div>
                    <div class="text-xs text-ink-400">{{ s.team }} · {{ s.title }}</div>
                  </div>
                  <div
                    v-if="selectedNewOwnerId === s.id"
                    class="text-brand-600 text-sm"
                  >
                    ✓
                  </div>
                </button>
                <div v-if="salesList.length === 0" class="text-xs text-ink-400 text-center py-4">
                  暂无可分配的销售
                </div>
              </div>
            </div>

            <div>
              <label class="text-xs text-ink-500 mb-1.5 block">
                转移备注
                <span class="text-ink-300">(可选)</span>
              </label>
              <textarea
                v-model="transferNote"
                rows="3"
                placeholder="例如:该销售已离职,后续由张伟跟进"
                class="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
              />
            </div>
          </div>

          <div class="px-6 py-4 border-t border-ink-100 flex gap-2 justify-end bg-ink-50/50">
            <button
              @click="closeTransfer"
              class="px-4 py-2 rounded-lg text-sm text-ink-600 hover:bg-ink-100 transition-colors"
            >
              取消
            </button>
            <button
              @click="confirmTransfer"
              :disabled="!selectedNewOwnerId"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                selectedNewOwnerId
                  ? 'bg-brand-600 text-white hover:bg-brand-700'
                  : 'bg-ink-200 text-ink-400 cursor-not-allowed',
              ]"
            >
              确认转移
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
