#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * 每日数据更新调度脚本
 * Daily data update scheduler script
 * 
 * 功能 | Features:
 * 1. 调用quant项目的增量数据获取
 * 2. 执行CSV到JSON的转换
 * 3. 提供完整的日志和进度报告
 */

class DailyUpdateScheduler {
    constructor() {
        this.scriptDir = __dirname;
        this.tradingVisualizerRoot = path.resolve(this.scriptDir, '..');
        this.quantProjectRoot = path.resolve(this.tradingVisualizerRoot, '../../quant');
        
        // 检查路径是否存在
        this.validatePaths();
        
        console.log('🔧 初始化每日更新调度器...');
        console.log(`📁 TradingVisualizer根目录: ${this.tradingVisualizerRoot}`);
        console.log(`📁 Quant项目根目录: ${this.quantProjectRoot}`);
    }

    validatePaths() {
        if (!fs.existsSync(this.quantProjectRoot)) {
            throw new Error(`❌ Quant项目目录不存在: ${this.quantProjectRoot}`);
        }
        
        const incrementalScript = path.join(this.quantProjectRoot, 'scripts', 'incremental_backfill.py');
        if (!fs.existsSync(incrementalScript)) {
            throw new Error(`❌ 增量更新脚本不存在: ${incrementalScript}`);
        }
        
        const convertScript = path.join(this.tradingVisualizerRoot, 'scripts', 'convert-csv-to-json.js');
        if (!fs.existsSync(convertScript)) {
            throw new Error(`❌ 转换脚本不存在: ${convertScript}`);
        }
    }

    async runCommand(command, args, options = {}) {
        return new Promise((resolve, reject) => {
            console.log(`🚀 执行命令: ${command} ${args.join(' ')}`);
            
            const process = spawn(command, args, {
                cwd: options.cwd || this.scriptDir,
                stdio: 'pipe',
                ...options
            });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                // 实时显示输出
                console.log(output.trim());
            });

            process.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                // 实时显示错误输出
                console.error(output.trim());
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr, code });
                } else {
                    reject(new Error(`命令执行失败，退出码: ${code}\n${stderr}`));
                }
            });

            process.on('error', (error) => {
                reject(new Error(`命令执行错误: ${error.message}`));
            });
        });
    }

    async checkPythonEnvironment() {
        console.log('🐍 检查Python环境...');
        
        try {
            // 检查Python版本
            const result = await this.runCommand('python', ['--version']);
            console.log(`✅ Python版本: ${result.stdout.trim()}`);
            
            // 检查关键依赖
            const dependencies = ['pandas', 'asyncpg', 'python-binance', 'python-dotenv'];
            for (const dep of dependencies) {
                try {
                    await this.runCommand('python', ['-c', `import ${dep.replace('-', '_')}; print("${dep} OK")`]);
                    console.log(`✅ ${dep} 已安装`);
                } catch (error) {
                    console.warn(`⚠️ ${dep} 可能未安装或有问题`);
                }
            }
            
        } catch (error) {
            throw new Error(`❌ Python环境检查失败: ${error.message}`);
        }
    }

    async checkQuantProjectEnv() {
        console.log('🔍 检查Quant项目环境...');
        
        const envFile = path.join(this.quantProjectRoot, '.env');
        if (!fs.existsSync(envFile)) {
            throw new Error(`❌ Quant项目的.env文件不存在: ${envFile}`);
        }
        
        const configFile = path.join(this.quantProjectRoot, 'config', 'symbols.json');
        if (!fs.existsSync(configFile)) {
            throw new Error(`❌ 配置文件不存在: ${configFile}`);
        }
        
        console.log('✅ Quant项目环境检查通过');
    }

    async runIncrementalUpdate() {
        console.log('📈 步骤1: 执行增量数据获取...');
        console.log('='.repeat(50));
        
        const scriptPath = path.join(this.quantProjectRoot, 'scripts', 'incremental_backfill.py');
        
        try {
            await this.runCommand('python', [scriptPath], {
                cwd: this.quantProjectRoot
            });
            console.log('✅ 增量数据获取完成');
        } catch (error) {
            throw new Error(`❌ 增量数据获取失败: ${error.message}`);
        }
    }

    async runCSVToJSONConversion() {
        console.log('🔄 步骤2: 执行CSV到JSON转换...');
        console.log('='.repeat(50));
        
        const scriptPath = path.join(this.tradingVisualizerRoot, 'scripts', 'convert-csv-to-json.js');
        
        try {
            await this.runCommand('node', [scriptPath], {
                cwd: this.tradingVisualizerRoot
            });
            console.log('✅ CSV到JSON转换完成');
        } catch (error) {
            throw new Error(`❌ CSV到JSON转换失败: ${error.message}`);
        }
    }

    async generateReport() {
        console.log('📊 生成更新报告...');
        
        try {
            // 读取状态文件
            const stateFile = path.join(this.quantProjectRoot, 'data', 'state', 'update-state.json');
            if (fs.existsSync(stateFile)) {
                const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
                
                console.log('\n📋 更新报告:');
                console.log(`⏰ 最后更新时间: ${state.last_updated || '未记录'}`);
                
                if (state.symbols) {
                    const symbolCount = Object.keys(state.symbols).length;
                    let totalIntervals = 0;
                    
                    for (const symbol of Object.keys(state.symbols)) {
                        totalIntervals += Object.keys(state.symbols[symbol]).length;
                    }
                    
                    console.log(`💰 交易对数量: ${symbolCount}`);
                    console.log(`📊 数据序列数量: ${totalIntervals}`);
                }
            }
            
            // 检查JSON文件
            const dataDir = path.join(this.tradingVisualizerRoot, 'public', 'data');
            if (fs.existsSync(dataDir)) {
                const indexFile = path.join(dataDir, 'index.json');
                if (fs.existsSync(indexFile)) {
                    const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
                    console.log(`📁 JSON数据目录: ${Object.keys(index).length} 个交易对`);
                }
            }
            
        } catch (error) {
            console.warn(`⚠️ 生成报告时出错: ${error.message}`);
        }
    }

    async run() {
        const startTime = Date.now();
        
        try {
            console.log('🌅 开始每日数据更新流程...');
            console.log(`⏰ 开始时间: ${new Date().toLocaleString()}`);
            console.log('='.repeat(80));
            
            // 环境检查
            await this.checkPythonEnvironment();
            await this.checkQuantProjectEnv();
            
            console.log('\n🔄 开始数据更新流程...');
            
            // 步骤1: 增量数据获取
            await this.runIncrementalUpdate();
            
            console.log('\n' + '='.repeat(50));
            
            // 步骤2: CSV到JSON转换
            await this.runCSVToJSONConversion();
            
            console.log('\n' + '='.repeat(50));
            
            // 生成报告
            await this.generateReport();
            
            const duration = Math.round((Date.now() - startTime) / 1000);
            console.log('\n🎉 每日数据更新完成！');
            console.log(`⏱️ 总耗时: ${duration} 秒`);
            console.log(`⏰ 完成时间: ${new Date().toLocaleString()}`);
            
        } catch (error) {
            console.error('\n❌ 每日数据更新失败:');
            console.error(error.message);
            process.exit(1);
        }
    }
}

// 主执行逻辑
async function main() {
    try {
        const scheduler = new DailyUpdateScheduler();
        await scheduler.run();
    } catch (error) {
        console.error('❌ 初始化失败:', error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main().catch(console.error);
}

module.exports = DailyUpdateScheduler;
