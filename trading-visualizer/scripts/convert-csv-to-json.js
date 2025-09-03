#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 智能CSV到JSON转换脚本
 * 根据数据频率自动选择拆分策略：
 * - 秒级数据: 按月拆分
 * - 分钟级数据: 按季度拆分  
 * - 小时级及以上: 全量存储
 */

class CSVToJSONConverter {
    constructor() {
        this.csvDir = path.resolve(__dirname, '../../../quant/data/csv');
        this.outputDir = path.resolve(__dirname, '../public/data');
        this.index = {};
        
        // 拆分策略配置
        this.splitStrategies = {
            's': { type: 'month', maxRecords: 1300000 }, // 秒级数据按月拆分
            'm': { type: 'quarter', maxRecords: 130000 }, // 分钟级数据按季度拆分
            'h': { type: 'all', maxRecords: Infinity },   // 小时级全量存储
            'd': { type: 'all', maxRecords: Infinity }    // 日级全量存储
        };
    }

    // 格式化时间以适配 lightweight-charts
    formatTimeForChart(timeString) {
        try {
            const date = new Date(timeString);
            
            // 检查日期是否有效
            if (isNaN(date.getTime())) {
                console.warn(`无效的时间格式: ${timeString}`);
                return timeString;
            }
            
            // 返回 Unix 时间戳（秒）
            // lightweight-charts 4.x 支持 Unix 时间戳格式
            return Math.floor(date.getTime() / 1000);
            
        } catch (error) {
            console.warn(`时间格式转换失败: ${timeString}`, error);
            return timeString;
        }
    }

    // 解析文件名获取交易对和时间间隔信息
    parseFileName(fileName) {
        // 例如: BTCUSDT-1h-2024-05-01_to_2024-06-01.csv
        const match = fileName.match(/^([A-Z]+)-(\d+)([smhd])-(.+)\.csv$/);
        if (!match) return null;
        
        const [, symbol, interval, unit, dateRange] = match;
        return {
            symbol,
            interval: `${interval}${unit}`,
            unit,
            dateRange,
            fileName
        };
    }

    // 读取并解析CSV文件
    parseCSV(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.trim().split('\n');
        
        if (lines.length < 2) return [];
        
        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const record = {};
            
            headers.forEach((header, index) => {
                const value = values[index];
                
                // 转换数据类型
                if (header === 'time') {
                    // 处理时间格式，转换为 lightweight-charts 支持的格式
                    record.time = this.formatTimeForChart(value);
                } else if (['open', 'high', 'low', 'close', 'volume'].includes(header)) {
                    record[header] = parseFloat(value);
                }
            });
            
            data.push(record);
        }
        
        return data;
    }

    // 根据时间间隔和数据量决定拆分策略
    determineSplitStrategy(unit, dataLength) {
        const strategy = this.splitStrategies[unit] || this.splitStrategies['h'];
        
        if (dataLength <= strategy.maxRecords) {
            return { type: 'all' };
        }
        
        return strategy;
    }

    // 按月拆分数据
    splitByMonth(data) {
        const months = {};
        
        data.forEach(record => {
            const date = new Date(record.time);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!months[monthKey]) {
                months[monthKey] = [];
            }
            months[monthKey].push(record);
        });
        
        return months;
    }

    // 按季度拆分数据
    splitByQuarter(data) {
        const quarters = {};
        
        data.forEach(record => {
            const date = new Date(record.time);
            const quarter = Math.ceil((date.getMonth() + 1) / 3);
            const quarterKey = `${date.getFullYear()}-Q${quarter}`;
            
            if (!quarters[quarterKey]) {
                quarters[quarterKey] = [];
            }
            quarters[quarterKey].push(record);
        });
        
        return quarters;
    }

    // 处理单个CSV文件
    processFile(fileInfo) {
        const filePath = path.join(this.csvDir, fileInfo.fileName);
        
        if (!fs.existsSync(filePath)) {
            console.log(`❌ 文件不存在: ${filePath}`);
            return;
        }
        
        console.log(`🔄 处理文件: ${fileInfo.fileName}`);
        
        const data = this.parseCSV(filePath);
        if (data.length === 0) {
            console.log(`⚠️ 文件无有效数据: ${fileInfo.fileName}`);
            return;
        }
        
        const strategy = this.determineSplitStrategy(fileInfo.unit, data.length);
        const symbolDir = path.join(this.outputDir, fileInfo.symbol);
        const intervalDir = path.join(symbolDir, fileInfo.interval);
        
        // 创建目录
        fs.mkdirSync(intervalDir, { recursive: true });
        
        // 初始化索引
        if (!this.index[fileInfo.symbol]) {
            this.index[fileInfo.symbol] = {};
        }
        
        let files = [];
        let totalRecords = data.length;
        
        if (strategy.type === 'all') {
            // 全量存储
            const outputFile = path.join(intervalDir, 'all.json');
            fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
            files = ['all.json'];
            console.log(`✅ 生成文件: ${outputFile} (${data.length} 条记录)`);
            
        } else if (strategy.type === 'month') {
            // 按月拆分
            const monthlyData = this.splitByMonth(data);
            
            for (const [month, monthData] of Object.entries(monthlyData)) {
                const outputFile = path.join(intervalDir, `${month}.json`);
                fs.writeFileSync(outputFile, JSON.stringify(monthData, null, 2));
                files.push(`${month}.json`);
                console.log(`✅ 生成文件: ${outputFile} (${monthData.length} 条记录)`);
            }
            
        } else if (strategy.type === 'quarter') {
            // 按季度拆分
            const quarterlyData = this.splitByQuarter(data);
            
            for (const [quarter, quarterData] of Object.entries(quarterlyData)) {
                const outputFile = path.join(intervalDir, `${quarter}.json`);
                fs.writeFileSync(outputFile, JSON.stringify(quarterData, null, 2));
                files.push(`${quarter}.json`);
                console.log(`✅ 生成文件: ${outputFile} (${quarterData.length} 条记录)`);
            }
        }
        
        // 更新索引
        this.index[fileInfo.symbol][fileInfo.interval] = {
            files,
            strategy: strategy.type,
            recordCount: totalRecords,
            dateRange: {
                start: data[0]?.time,
                end: data[data.length - 1]?.time
            },
            lastUpdated: new Date().toISOString()
        };
    }

    // 扫描CSV目录并处理所有文件
    async convert() {
        console.log('🚀 开始CSV到JSON转换...');
        console.log(`📂 CSV目录: ${this.csvDir}`);
        console.log(`📁 输出目录: ${this.outputDir}`);
        
        if (!fs.existsSync(this.csvDir)) {
            console.error(`❌ CSV目录不存在: ${this.csvDir}`);
            return;
        }
        
        // 清理输出目录
        if (fs.existsSync(this.outputDir)) {
            fs.rmSync(this.outputDir, { recursive: true });
        }
        fs.mkdirSync(this.outputDir, { recursive: true });
        
        // 扫描CSV文件
        const csvFiles = fs.readdirSync(this.csvDir)
            .filter(file => file.endsWith('.csv'))
            .map(file => this.parseFileName(file))
            .filter(info => info !== null);
        
        if (csvFiles.length === 0) {
            console.log('⚠️ 未找到有效的CSV文件');
            return;
        }
        
        console.log(`📊 找到 ${csvFiles.length} 个CSV文件`);
        
        // 处理每个文件
        for (const fileInfo of csvFiles) {
            this.processFile(fileInfo);
        }
        
        // 生成索引文件
        const indexFile = path.join(this.outputDir, 'index.json');
        fs.writeFileSync(indexFile, JSON.stringify(this.index, null, 2));
        console.log(`📋 生成索引文件: ${indexFile}`);
        
        console.log('✅ 转换完成！');
        console.log(`📈 可用数据:`);
        
        for (const [symbol, intervals] of Object.entries(this.index)) {
            console.log(`  ${symbol}:`);
            for (const [interval, info] of Object.entries(intervals)) {
                console.log(`    ${interval}: ${info.recordCount} 条记录 (${info.files.length} 个文件)`);
            }
        }
    }
}

// 主执行逻辑
async function main() {
    const converter = new CSVToJSONConverter();
    await converter.convert();
}

// 如果直接运行此脚本
if (require.main === module) {
    main().catch(console.error);
}

module.exports = CSVToJSONConverter;
