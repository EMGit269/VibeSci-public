# {{PROJECT_NAME}}

## 项目简介
传统机器学习科研项目模板，支持特征工程、模型训练、评估和解释。

## 目录结构
```
{{PROJECT_NAME}}/
├── data/              # 数据目录
│   ├── raw/          # 原始数据
│   ├── processed/    # 处理后的数据
│   └── features/     # 特征工程脚本
├── models/           # 模型定义
├── features/         # 特征工程
├── evaluation/       # 评估相关
├── experiments/      # 实验管理
├── utils/            # 工具函数
├── configs/          # 配置文件
└── scripts/          # 运行脚本
```

## 安装依赖
```bash
pip install -r requirements.txt
```

## 快速开始
1. 数据预处理：
```bash
python scripts/prepare_data.py --input data/raw --output data/processed
```
2. 特征工程：
```bash
python scripts/extract_features.py --config configs/features.yaml
```
3. 训练模型：
```bash
python scripts/train.py --config configs/model.yaml
```
4. 评估模型：
```bash
python scripts/evaluate.py --model experiments/exp_001/model.pkl
```

## 实验记录
- [ ] 实验1：基线模型
- [ ] 实验2：特征工程
- [ ] 实验3：超参数调优

## 参考文献
- [论文1](url)
- [论文2](url)
