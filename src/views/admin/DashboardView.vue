<script setup lang="ts">
import { computed } from 'vue'
import { useCustomersStore } from '@/stores/customers'
import { useVisitsStore } from '@/stores/visits'
import { useUsersStore } from '@/stores/users'
import { FUNNEL_STAGES, STAGE_MAP } from '@/lib/stage'
import { formatMoney, isThisMonth } from '@/lib/format'
import dayjs from 'dayjs'
import Chart from '@/components/Chart.vue'

const customers = useCustomersStore()
const visits = useVisitsStore()
const users = useUsersStore()

const kpis = computed(() => [
  {
    label: '客户总数',
    value: customers.total,
    sub: `本月新增 ${customers.newThisMonth}`,
    color: '#0ea5e9',
    icon: '👥',
  },
  {
    label: '本月拜访',
    value: visits.thisMonth,
    sub: `今日 ${visits.today} 次`,
    color: '#10b981',
    icon: '📞',
  },
  {
    label: '已成交',
    value: customers.wonCount,
    sub: `占比 ${customers.wonRate}%`,
    color: '#f59e0b',
    icon: '🏆',
  },
  {
    label: '累计成交金额',
    value: formatMoney(
      customers.list
        .filter((c) => c.stage === 'won')
        .reduce((s, c) => s + c.estimatedValue, 0),
    ),
    sub: '已签约合同估算',
    color: '#8b5cf6',
    icon: '💰',
  },
])

const bizKpis = computed(() => [
  {
    label: '待回款',
    value: formatMoney(customers.totalAmountDue),
    sub: `${customers.dueSoonList.length} 笔 7 天内到期`,
    color: '#f59e0b',
    icon: '💵',
  },
  {
    label: '逾期金额',
    value: formatMoney(customers.overdueAmount),
    sub: `${customers.overdueList.length} 笔逾期`,
    color: '#ef4444',
    icon: '⚠️',
  },
  {
    label: '质保中客户',
    value: customers.inWarrantyList.length,
    sub: `${customers.expiringWarrantyList.length} 笔 30 天内到期`,
    color: '#0ea5e9',
    icon: '🛡️',
  },
  {
    label: '预测商机',
    value: formatMoney(customers.forecastValue),
    sub: `${customers.forecastList.length} 个客户有续单意向`,
    color: '#10b981',
    icon: '📈',
  },
])

const rankOption = computed(() => {
  const sales = users.sales()
  const data = sales
    .map((s) => ({
      name: s.name,
      value: visits.list.filter(
        (v) => v.salesId === s.id && isThisMonth(v.visitedAt),
      ).length,
    }))
    .sort((a, b) => b.value - a.value)

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 60, right: 30, top: 20, bottom: 30 },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#94a3b8', fontSize: 11 },
    },
    yAxis: {
      type: 'category',
      data: data.map((d) => d.name).reverse(),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#475569', fontSize: 12, fontWeight: 500 },
    },
    series: [
      {
        type: 'bar',
        data: data.map((d) => d.value).reverse(),
        barWidth: 18,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#34d399' },
              { offset: 1, color: '#10b981' },
            ],
          },
          borderRadius: [0, 4, 4, 0],
        },
        label: {
          show: true,
          position: 'right',
          color: '#475569',
          fontSize: 11,
        },
      },
    ],
  }
})

const funnelOption = computed(() => {
  const data = FUNNEL_STAGES.map((s) => ({
    name: STAGE_MAP[s].label,
    value: customers.byStage(s).length,
    itemStyle: { color: STAGE_MAP[s].color },
  })).filter((d) => d.value > 0)

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 位客户',
    },
    series: [
      {
        type: 'funnel',
        left: '10%',
        right: '10%',
        top: 20,
        bottom: 20,
        width: '80%',
        min: 0,
        max: Math.max(...data.map((d) => d.value), 1),
        minSize: '20%',
        maxSize: '100%',
        sort: 'descending',
        gap: 4,
        label: {
          show: true,
          position: 'inside',
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          formatter: '{b}\n{c} 位',
        },
        data,
      },
    ],
  }
})

const trendOption = computed(() => {
  const days: { date: string; count: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = dayjs().subtract(i, 'day')
    days.push({
      date: d.format('MM-DD'),
      count: visits.list.filter((v) => dayjs(v.visitedAt).isSame(d, 'day')).length,
    })
  }
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: days.map((d) => d.date),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10, interval: 4 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#94a3b8', fontSize: 11 },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        data: days.map((d) => d.count),
        showSymbol: false,
        lineStyle: { color: '#10b981', width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0)' },
            ],
          },
        },
      },
    ],
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-4 gap-4">
      <div
        v-for="k in kpis"
        :key="k.label"
        class="bg-white rounded-2xl p-5 border border-ink-100 shadow-card hover:shadow-lift transition-shadow"
      >
        <div class="flex items-center justify-between mb-3">
          <div
            class="w-9 h-9 rounded-lg flex items-center justify-center text-base"
            :style="{ backgroundColor: k.color + '15', color: k.color }"
          >
            {{ k.icon }}
          </div>
          <div class="text-xs text-ink-400">{{ k.sub }}</div>
        </div>
        <div class="text-2xl font-bold text-ink-900">{{ k.value }}</div>
        <div class="text-xs text-ink-500 mt-1">{{ k.label }}</div>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-4">
      <div
        v-for="k in bizKpis"
        :key="k.label"
        class="bg-white rounded-2xl p-5 border border-ink-100 shadow-card hover:shadow-lift transition-shadow"
      >
        <div class="flex items-center justify-between mb-3">
          <div
            class="w-9 h-9 rounded-lg flex items-center justify-center text-base"
            :style="{ backgroundColor: k.color + '15', color: k.color }"
          >
            {{ k.icon }}
          </div>
          <div class="text-xs text-ink-400">{{ k.sub }}</div>
        </div>
        <div class="text-2xl font-bold text-ink-900">{{ k.value }}</div>
        <div class="text-xs text-ink-500 mt-1">{{ k.label }}</div>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2 bg-white rounded-2xl p-5 border border-ink-100 shadow-card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-ink-800">销售业绩排行</h3>
          <div class="text-xs text-ink-400">本月拜访次数 TOP 5</div>
        </div>
        <Chart :option="rankOption" height="280px" />
      </div>

      <div class="bg-white rounded-2xl p-5 border border-ink-100 shadow-card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-ink-800">客户阶段漏斗</h3>
          <div class="text-xs text-ink-400">全量</div>
        </div>
        <Chart :option="funnelOption" height="280px" />
      </div>
    </div>

    <div class="bg-white rounded-2xl p-5 border border-ink-100 shadow-card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-ink-800">近 30 天拜访趋势</h3>
        <div class="text-xs text-ink-400">每日拜访量</div>
      </div>
      <Chart :option="trendOption" height="200px" />
    </div>
  </div>
</template>
