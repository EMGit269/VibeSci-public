# {{PROJECT_NAME}}

## 项目简介
统计分析项目模板，支持描述性统计、推断统计和数据可视化。

## 目录结构
```
{{PROJECT_NAME}}/
├── data/              # 数据目录
│   ├── raw/          # 原始数据
│   ├── cleaned/      # 清洗后的数据
│   └── processed/    # 处理后的数据
├── analysis/         # 分析脚本
│   ├── descriptive.py
│   ├── inferential.py
│   └── visualization.py
├── reports/          # 报告输出
│   ├── figures/      # 图表
│   └── tables/       # 表格
├── notebooks/        # Jupyter笔记本
├── utils/            # 工具函数
├── configs/          # 配置文件
└── scripts/          # 运行脚本
```

## 安装依赖
```bash
pip install -r requirements.txt
```

## 快速开始
1. 数据清洗：
```bash
python scripts/clean_data.py --input data/raw --output data/cleaned
```
2. 描述性统计：
```bash
python scripts/run_analysis.py --type descriptive --config configs/descriptive.yaml
```
3. 推断统计：
```bash
python scripts/run_analysis.py --type inferential --config configs/inferential.yaml
```
4. 生成报告：
```bash
python scripts/generate_report.py --output reports/report.pdf
```

## 分析内容
- 描述性统计：均值、中位数、标准差、分布可视化
- 推断统计：假设检验、置信区间、效应量
- 可视化：直方图、箱线图、散点图、热力图

## 参考文献
- [文献1](url)
- [文献2](url)
