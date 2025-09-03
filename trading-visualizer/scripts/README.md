# 增量数据更新系统使用指南
# Incremental Data Update System Guide

## 概述 | Overview

这个增量数据更新系统能够自动检测和获取缺失的历史数据以及最新的市场数据，避免每次都进行全量数据获取。

This incremental data update system automatically detects and fetches missing historical data and latest market data, avoiding full data retrieval every time.

## 系统组件 | System Components

### 1. 配置文件 | Configuration Files

- **`/quant/config/symbols.json`**: 定义要获取的交易对、时间间隔和历史起点
- **`/quant/data/state/update-state.json`**: 跟踪每个交易对的数据获取状态

### 2. 核心脚本 | Core Scripts

- **`/quant/scripts/incremental_backfill.py`**: 增量数据获取脚本
- **`/trading-visualizer/scripts/daily-update.js`**: 每日更新调度脚本
- **`/trading-visualizer/scripts/convert-csv-to-json.js`**: CSV到JSON转换脚本

## 使用方法 | Usage

### 一次性设置 | One-time Setup

1. **检查配置文件**
   ```bash
   # 编辑交易对配置
   nano /Users/daijinkai/Desktop/quant/config/symbols.json
   ```

2. **确认环境变量**
   ```bash
   # 确保 .env 文件包含必要的API密钥
   cat /Users/daijinkai/Desktop/quant/.env
   ```

### 每日更新 | Daily Updates

**方法1: 使用统一调度脚本（推荐）**
```bash
cd /Users/daijinkai/Desktop/SimpleTradingView/trading-visualizer
node scripts/daily-update.js
```

**方法2: 分步执行**
```bash
# 步骤1: 增量数据获取
cd /Users/daijinkai/Desktop/quant
python scripts/incremental_backfill.py

# 步骤2: CSV到JSON转换
cd /Users/daijinkai/Desktop/SimpleTradingView/trading-visualizer
node scripts/convert-csv-to-json.js
```

### 添加新交易对 | Adding New Trading Pairs

1. 编辑配置文件：
   ```json
   {
     "symbols": [
       "BTCUSDT",
       "ETHUSDT",
       "NEWCOIN"    // 添加新币种
     ],
     "intervals": ["1m", "5m", "15m", "1h", "4h"],
     "historical_start_date": "2024-01-01"
   }
   ```

2. 运行更新：
   ```bash
   node scripts/daily-update.js
   ```

### 扩展历史数据范围 | Extending Historical Data Range

1. 修改配置文件中的 `historical_start_date`：
   ```json
   {
     "historical_start_date": "2023-01-01"  // 从更早的日期开始
   }
   ```

2. 运行更新，系统会自动检测并补充缺失的历史数据。

## 系统特性 | System Features

### 智能增量检测 | Smart Incremental Detection

- ✅ **历史数据补填**: 自动检测并补充从指定起点到现有数据的空缺
- ✅ **最新数据更新**: 自动获取从最后更新时间到当前的新数据
- ✅ **数据去重**: 自动处理重复数据，确保数据完整性
- ✅ **CSV智能合并**: 将新数据与现有CSV文件智能合并

### 性能优化 | Performance Optimization

- ✅ **并发控制**: 限制同时请求数量，避免API限制
- ✅ **断点续传**: 基于状态文件的续传机制
- ✅ **文件追加**: 追加模式而非重写，提高效率

## 定时任务设置 | Scheduled Task Setup

### macOS/Linux (使用 crontab)

```bash
# 编辑 crontab
crontab -e

# 添加每天晚上11点执行的任务
0 23 * * * cd /Users/daijinkai/Desktop/SimpleTradingView/trading-visualizer && node scripts/daily-update.js >> /tmp/trading-update.log 2>&1
```

### 手动测试 | Manual Testing

```bash
# 测试增量更新
cd /Users/daijinkai/Desktop/SimpleTradingView/trading-visualizer
node scripts/daily-update.js

# 查看更新状态
cat /Users/daijinkai/Desktop/quant/data/state/update-state.json

# 查看生成的JSON索引
cat /Users/daijinkai/Desktop/SimpleTradingView/trading-visualizer/public/data/index.json
```

## 故障排除 | Troubleshooting

### 常见问题 | Common Issues

1. **API限制错误**
   - 检查 `concurrency` 设置，建议设为3或更低
   - 确认API密钥有效且有足够权限

2. **路径错误**
   - 确认所有路径在 `daily-update.js` 中正确配置
   - 检查文件权限

3. **数据格式错误**
   - 检查CSV文件格式
   - 验证时间格式转换

### 日志查看 | Log Viewing

```bash
# 查看实时日志
tail -f /tmp/trading-update.log

# 查看详细输出
node scripts/daily-update.js 2>&1 | tee update.log
```

## 系统架构 | System Architecture

```
┌─ quant/
│  ├─ config/symbols.json           (配置文件)
│  ├─ data/state/update-state.json  (状态跟踪)
│  ├─ data/csv/                     (原始CSV数据)
│  └─ scripts/incremental_backfill.py (数据获取)
│
└─ trading-visualizer/
   ├─ scripts/daily-update.js       (调度脚本)
   ├─ scripts/convert-csv-to-json.js (数据转换)
   └─ public/data/                  (JSON数据)
```

这个设计确保了数据获取和可视化的清晰分离，同时提供了高效的增量更新能力。
