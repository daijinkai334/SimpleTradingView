<template>
  <div class="chart-wrapper">
    <!-- 数据选择控制面板 -->
    <div class="controls">
      <div class="control-group">
        <label>交易对:</label>
        <select v-model="selectedSymbol" @change="loadData">
          <option
            v-for="symbol in availableSymbols"
            :key="symbol"
            :value="symbol"
          >
            {{ symbol }}
          </option>
        </select>
      </div>

      <div class="control-group">
        <label>时间间隔:</label>
        <select v-model="selectedInterval" @change="loadData">
          <option
            v-for="interval in availableIntervals"
            :key="interval"
            :value="interval"
          >
            {{ interval }}
          </option>
        </select>
      </div>

      <div class="data-info">
        <span v-if="dataInfo">
          {{ dataInfo.recordCount }} 条记录 | {{ dataInfo.dateRange?.start }} 至
          {{ dataInfo.dateRange?.end }}
        </span>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>正在加载数据...</p>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error">
      <p>❌ 加载失败: {{ error }}</p>
      <button @click="loadData">重试</button>
    </div>

    <!-- 图表容器 -->
    <div
      class="chart-container"
      ref="chartContainer"
      v-show="!loading && !error"
    ></div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";
import { createChart } from "lightweight-charts";

// 响应式数据
const chartContainer = ref(null);
const chart = ref(null);
const candlestickSeries = ref(null);

const loading = ref(false);
const error = ref(null);
const dataIndex = ref({});
const selectedSymbol = ref("BTCUSDT");
const selectedInterval = ref("1h");
const dataInfo = ref(null);

// 计算属性 - 可用的交易对和时间间隔
const availableSymbols = ref([]);
const availableIntervals = ref([]);

// 加载数据索引
async function loadIndex() {
  try {
    const response = await fetch("/data/index.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const index = await response.json();
    dataIndex.value = index;

    // 设置可用的交易对
    availableSymbols.value = Object.keys(index);

    // 设置默认交易对（如果当前选择不存在）
    if (
      !availableSymbols.value.includes(selectedSymbol.value) &&
      availableSymbols.value.length > 0
    ) {
      selectedSymbol.value = availableSymbols.value[0];
    }

    // 更新可用的时间间隔
    updateAvailableIntervals();
  } catch (err) {
    console.error("Failed to load data index:", err);
    error.value = `无法加载数据索引: ${err.message}`;
  }
}

// 更新可用的时间间隔
function updateAvailableIntervals() {
  if (dataIndex.value[selectedSymbol.value]) {
    availableIntervals.value = Object.keys(
      dataIndex.value[selectedSymbol.value]
    );

    // 设置默认时间间隔（如果当前选择不存在）
    if (
      !availableIntervals.value.includes(selectedInterval.value) &&
      availableIntervals.value.length > 0
    ) {
      selectedInterval.value = availableIntervals.value[0];
    }
  }
}

// 加载K线数据
async function loadData() {
  if (!selectedSymbol.value || !selectedInterval.value) return;

  loading.value = true;
  error.value = null;

  try {
    // 更新可用的时间间隔（当交易对改变时）
    updateAvailableIntervals();

    // 获取数据信息
    const symbolData = dataIndex.value[selectedSymbol.value];
    if (!symbolData || !symbolData[selectedInterval.value]) {
      throw new Error(
        `没有找到 ${selectedSymbol.value} ${selectedInterval.value} 的数据`
      );
    }

    const intervalData = symbolData[selectedInterval.value];
    dataInfo.value = intervalData;

    // 加载数据文件（当前只处理单文件情况）
    const dataUrl = `/data/${selectedSymbol.value}/${selectedInterval.value}/all.json`;
    const response = await fetch(dataUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("数据格式错误或为空");
    }

    // 更新图表数据
    if (candlestickSeries.value) {
      candlestickSeries.value.setData(data);
      chart.value.timeScale().fitContent();
    }

    console.log(
      `✅ 成功加载 ${selectedSymbol.value} ${selectedInterval.value} 数据:`,
      data.length,
      "条记录"
    );
  } catch (err) {
    console.error("Failed to load data:", err);
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

// 初始化图表
function initChart() {
  if (!chartContainer.value) return;

  // 创建图表实例
  chart.value = createChart(chartContainer.value, {
    width: chartContainer.value.clientWidth,
    height: chartContainer.value.clientHeight,
    layout: {
      backgroundColor: "#ffffff",
      textColor: "#333",
    },
    grid: {
      vertLines: { color: "#f0f0f0" },
      horzLines: { color: "#f0f0f0" },
    },
    crosshair: {
      mode: 1,
    },
    timeScale: {
      borderColor: "#cccccc",
      timeVisible: true,
      secondsVisible: false,
    },
    rightPriceScale: {
      borderColor: "#cccccc",
    },
  });

  // 创建 K 线序列
  candlestickSeries.value = chart.value.addCandlestickSeries({
    upColor: "#26a69a",
    downColor: "#ef5350",
    borderDownColor: "#ef5350",
    borderUpColor: "#26a69a",
    wickDownColor: "#ef5350",
    wickUpColor: "#26a69a",
  });

  // 监听容器大小变化，使图表自适应
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      if (chart.value && width > 0 && height > 0) {
        chart.value.resize(width, height);
      }
    }
  });

  resizeObserver.observe(chartContainer.value);
}

// 监听选择变化
watch(selectedSymbol, updateAvailableIntervals);

// 组件挂载时初始化
onMounted(async () => {
  // 先加载数据索引
  await loadIndex();

  // 初始化图表
  initChart();

  // 加载初始数据
  await loadData();
});
</script>

<style scoped>
.chart-wrapper {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.controls {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  flex-shrink: 0;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-group label {
  font-weight: 500;
  color: #495057;
  white-space: nowrap;
}

.control-group select {
  padding: 4px 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: white;
  min-width: 120px;
}

.data-info {
  margin-left: auto;
  font-size: 14px;
  color: #6c757d;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 16px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 16px;
  color: #dc3545;
}

.error button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.error button:hover {
  background: #0056b3;
}

.chart-container {
  flex: 1;
  min-height: 0;
}
</style>
