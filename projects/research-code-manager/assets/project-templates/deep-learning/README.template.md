# {{PROJECT_NAME}}

## 项目简介
深度学习科研项目模板，提供标准化的项目结构和最佳实践。

## 目录结构
```
{{PROJECT_NAME}}/
├── data/              # 数据目录
│   ├── raw/          # 原始数据
│   ├── processed/    # 处理后的数据
│   └── datasets/     # 数据集加载脚本
├── models/           # 模型定义
├── training/         # 训练相关
├── evaluation/       # 评估相关
├── utils/            # 工具函数
├── configs/          # 配置文件
├── checkpoints/      # 模型检查点
├── logs/             # 日志文件
├── scripts/          # 运行脚本
└── tests/            # 单元测试
```

## 安装依赖
```bash
pip install -r requirements.txt
```

## 快速开始
1. 准备数据：将数据放入 `data/` 目录
2. 配置参数：编辑 `configs/config.yaml`
3. 运行训练：
```bash
python scripts/train.py --config configs/config.yaml
```
4. 评估模型：
```bash
python scripts/evaluate.py --checkpoint checkpoints/best.pth
```

## 实验记录
- [ ] 实验1：基线模型
- [ ] 实验2：数据增强
- [ ] 实验3：模型改进

## 参考文献
- [论文1](url)
- [论文2](url)
