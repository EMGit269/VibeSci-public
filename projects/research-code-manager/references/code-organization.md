# 代码组织最佳实践

## 目录
1. [项目目录结构](#项目目录结构)
2. [模块划分原则](#模块划分原则)
3. [配置管理](#配置管理)
4. [实验跟踪](#实验跟踪)
5. [代码复用策略](#代码复用策略)

## 概览
本文档提供科研代码组织的最佳实践，帮助研究人员构建清晰、可维护、可扩展的代码架构。

## 项目目录结构

### 深度学习项目结构
```
project-name/
├── data/                          # 数据目录
│   ├── raw/                       # 原始数据（不提交）
│   ├── processed/                 # 处理后的数据（不提交）
│   └── datasets/                  # 数据集加载脚本
│       ├── __init__.py
│       ├── base.py                # 基础数据集类
│       └── custom_dataset.py      # 自定义数据集
├── models/                        # 模型定义
│   ├── __init__.py
│   ├── base.py                    # 基础模型类
│   ├── backbone.py                # 骨干网络
│   └── custom_model.py            # 自定义模型
├── training/                      # 训练相关
│   ├── __init__.py
│   ├── trainer.py                 # 训练器
│   ├── loss.py                    # 损失函数
│   └── optimizer.py               # 优化器配置
├── evaluation/                    # 评估相关
│   ├── __init__.py
│   ├── metrics.py                 # 评估指标
│   └── visualize.py               # 可视化工具
├── utils/                         # 工具函数
│   ├── __init__.py
│   ├── data_utils.py              # 数据工具
│   ├── model_utils.py             # 模型工具
│   └── common_utils.py            # 通用工具
├── configs/                       # 配置文件
│   ├── base.yaml                  # 基础配置
│   ├── exp_001.yaml               # 实验1配置
│   └── exp_002.yaml               # 实验2配置
├── checkpoints/                   # 模型检查点（不提交）
├── logs/                          # 日志文件（不提交）
│   ├── tensorboard/
│   └── experiments/
├── scripts/                       # 运行脚本
│   ├── train.py                   # 训练脚本
│   ├── evaluate.py                # 评估脚本
│   └── infer.py                   # 推理脚本
├── tests/                         # 单元测试
│   ├── __init__.py
│   ├── test_dataset.py
│   └── test_model.py
├── main.py                        # 主入口
├── requirements.txt               # 依赖包
├── setup.py                       # 安装脚本
├── .gitignore                     # Git忽略文件
└── README.md                      # 项目说明
```

### 传统机器学习项目结构
```
project-name/
├── data/                          # 数据目录
│   ├── raw/
│   ├── processed/
│   └── features/                  # 特征工程脚本
├── models/                        # 模型定义
│   ├── __init__.py
│   ├── base_model.py
│   └── sklearn_models.py
├── features/                      # 特征工程
│   ├── __init__.py
│   ├── extract.py                 # 特征提取
│   ├── select.py                  # 特征选择
│   └── transform.py               # 特征转换
├── evaluation/                    # 评估相关
│   ├── __init__.py
│   ├── metrics.py
│   └── analysis.py
├── experiments/                   # 实验管理
│   ├── __init__.py
│   ├── exp_001/
│   └── exp_002/
├── utils/
│   ├── __init__.py
│   ├── data_utils.py
│   └── model_utils.py
├── configs/
│   ├── base.yaml
│   └── experiments/
├── scripts/
│   ├── train.py
│   ├── evaluate.py
│   └── pipeline.py                # 完整流程
├── tests/
├── main.py
├── requirements.txt
└── README.md
```

### 统计分析项目结构
```
project-name/
├── data/                          # 数据目录
│   ├── raw/
│   ├── cleaned/
│   └── processed/
├── analysis/                      # 分析脚本
│   ├── __init__.py
│   ├── descriptive.py             # 描述性统计
│   ├── inferential.py             # 推断统计
│   └── visualization.py           # 可视化
├── reports/                       # 报告输出
│   ├── figures/
│   └── tables/
├── notebooks/                     # Jupyter笔记本
│   ├── explore.ipynb
│   └── analysis.ipynb
├── utils/
│   ├── __init__.py
│   ├── data_utils.py
│   └── stat_utils.py
├── configs/
│   └── analysis_config.yaml
├── scripts/
│   ├── run_analysis.py
│   └── generate_report.py
├── tests/
├── main.py
├── requirements.txt
└── README.md
```

## 模块划分原则

### 单一职责原则（SRP）
- 每个模块只负责一个功能
- 避免模块职责过多
- 示例：`data_loader.py` 只负责数据加载，不包含数据预处理

### 开闭原则（OCP）
- 模块对扩展开放，对修改关闭
- 通过继承和接口实现扩展
- 示例：定义`BaseModel`基类，新模型继承而非修改基类

### 依赖倒置原则（DIP）
- 高层模块不依赖低层模块，都依赖抽象
- 示例：`Trainer`依赖`BaseModel`抽象，而非具体模型

### 接口隔离原则（ISP）
- 接口应该小而专一
- 避免胖接口
- 示例：数据集接口只包含必要方法，不要包含无关方法

### 模块命名规范
- 使用清晰、描述性的名称
- 避免缩写（除非是通用缩写）
- 示例：`image_dataset.py` 而非 `img_ds.py`

### 模块依赖规则
- 避免循环依赖
- 依赖方向：高层 → 低层
- 示例：`trainer.py` → `model.py` → `utils.py`

## 配置管理

### 配置文件格式推荐
- YAML：层次清晰，易读（推荐）
- JSON：机器友好，但可读性稍差
- TOML：Python生态友好
- INI：简单场景适用

### 配置文件示例（YAML）
```yaml
# configs/exp_001.yaml
experiment:
  name: "exp_001"
  description: "baseline experiment"
  seed: 42

data:
  train_path: "data/processed/train.csv"
  val_path: "data/processed/val.csv"
  test_path: "data/processed/test.csv"
  batch_size: 32
  num_workers: 4
  augmentation:
    enabled: true
    methods: ["random_crop", "horizontal_flip"]

model:
  name: "resnet18"
  pretrained: true
  num_classes: 10
  hidden_size: 256

training:
  epochs: 100
  learning_rate: 0.001
  weight_decay: 0.0001
  optimizer: "adam"
  scheduler: "cosine"
  early_stopping:
    enabled: true
    patience: 10

evaluation:
  metrics: ["accuracy", "precision", "recall", "f1"]
  save_predictions: true
  visualize: true

logging:
  tensorboard: true
  log_interval: 10
  save_interval: 5

system:
  device: "cuda"
  num_gpus: 1
  mixed_precision: false
```

### 配置加载代码
```python
# utils/config.py
import yaml
from pathlib import Path
from typing import Dict

def load_config(config_path: str) -> Dict:
    """加载配置文件"""
    with open(config_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)

def merge_configs(base_config: Dict, exp_config: Dict) -> Dict:
    """合并配置文件"""
    merged = base_config.copy()
    merged.update(exp_config)
    return merged

def save_config(config: Dict, save_path: str):
    """保存配置文件"""
    with open(save_path, 'w', encoding='utf-8') as f:
        yaml.dump(config, f, default_flow_style=False)
```

### 配置管理最佳实践
- 使用版本控制管理配置文件
- 配置文件与代码分离
- 配置文件命名清晰：`exp_001.yaml`、`exp_002.yaml`
- 保存实验配置与结果关联
- 使用配置验证（如Pydantic）

## 实验跟踪

### 实验记录内容
- 实验ID和名称
- 实验时间和代码版本（Git commit）
- 配置参数
- 数据集信息
- 模型架构
- 训练过程（loss曲线、学习率）
- 评估指标
- 可视化结果
- 实验结论和观察

### 推荐工具

#### MLflow
```python
import mlflow

def train(config):
    with mlflow.start_run():
        # 记录参数
        mlflow.log_params(config)
        
        # 训练模型
        for epoch in range(config['epochs']):
            loss = train_one_epoch()
            mlflow.log_metric("train_loss", loss, step=epoch)
        
        # 记录指标
        mlflow.log_metrics(evaluation_results)
        
        # 保存模型
        mlflow.pytorch.log_model(model, "model")
```

#### Weights & Biases
```python
import wandb

def train(config):
    wandb.init(project="my-project", config=config)
    
    for epoch in range(config['epochs']):
        loss = train_one_epoch()
        wandb.log({"train_loss": loss, "epoch": epoch})
    
    wandb.finish()
```

#### TensorBoard
```python
from torch.utils.tensorboard import SummaryWriter

def train(config):
    writer = SummaryWriter(f"logs/{config['experiment']['name']}")
    
    for epoch in range(config['epochs']):
        loss = train_one_epoch()
        writer.add_scalar("Loss/train", loss, epoch)
    
    writer.close()
```

### 实验管理策略
- 每个实验独立配置文件
- 实验结果自动保存到指定目录
- 使用实验ID管理
- 定期清理旧实验
- 建立实验对比表格

## 代码复用策略

### 代码复用层级
1. **函数级复用**：通用工具函数
2. **类级复用**：基础类和抽象类
3. **模块级复用**：独立功能模块
4. **项目级复用**：项目模板和脚手架

### 设计模式应用

#### 工厂模式（创建对象）
```python
class ModelFactory:
    """模型工厂"""
    
    @staticmethod
    def create(model_name: str, config: dict):
        if model_name == "resnet18":
            return ResNet18(config)
        elif model_name == "vgg16":
            return VGG16(config)
        else:
            raise ValueError(f"Unknown model: {model_name}")
```

#### 策略模式（算法选择）
```python
class OptimizerStrategy:
    """优化器策略"""
    
    @staticmethod
    def get(optimizer_name: str, model, config: dict):
        if optimizer_name == "adam":
            return torch.optim.Adam(model.parameters(), lr=config['lr'])
        elif optimizer_name == "sgd":
            return torch.optim.SGD(model.parameters(), lr=config['lr'])
```

#### 观察者模式（训练回调）
```python
class Trainer:
    """训练器"""
    
    def __init__(self):
        self.callbacks = []
    
    def add_callback(self, callback):
        self.callbacks.append(callback)
    
    def on_epoch_end(self, epoch, metrics):
        for callback in self.callbacks:
            callback(epoch, metrics)
```

### 代码复用最佳实践
- 抽象通用功能到基类
- 使用组合优于继承
- 保持接口稳定
- 编写清晰的文档和示例
- 使用类型注解
- 编写单元测试

### 避免反模式
- 避免复制粘贴代码
- 避免过度抽象
- 避免全局变量
- 避免硬编码配置
- 避免过长函数（>50行）
- 避免深层嵌套（>3层）

## 版本控制策略

### Git分支策略
```
main（主分支，稳定版本）
├── develop（开发分支）
│   ├── feature-exp-001（功能分支）
│   ├── feature-exp-002（功能分支）
│   └── bugfix（修复分支）
└── release-v1.0（发布分支）
```

### 提交信息规范
```
<type>(<scope>): <subject>

<body>

<footer>
```

类型：
- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档
- `style`: 格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

示例：
```
feat(model): add ResNet18 backbone

- Implement ResNet18 architecture
- Add pretrained weights support
- Update configuration

Closes #123
```

### .gitignore推荐内容
```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so

# Virtual Environment
venv/
env/
.venv/

# IDE
.vscode/
.idea/
*.swp

# Data
data/raw/*
data/processed/*
!data/raw/.gitkeep
!data/processed/.gitkeep

# Model
checkpoints/
*.pth
*.pkl

# Logs
logs/
*.log

# Jupyter
.ipynb_checkpoints

# Outputs
outputs/
results/
*.png
!README.png
```

## 文档规范

### README.md必须包含
- 项目简介
- 安装说明
- 快速开始
- 项目结构
- 实验结果
- 引用方式

### 代码文档规范
```python
def train_model(model, train_loader, config):
    """
    训练模型
    
    Args:
        model: 模型实例
        train_loader: 训练数据加载器
        config: 配置字典
        
    Returns:
        dict: 训练指标
        
    Raises:
        ValueError: 当配置无效时
        
    Examples:
        >>> model = create_model(config)
        >>> metrics = train_model(model, loader, config)
    """
    pass
```

### 类型注解规范
```python
from typing import Dict, List, Tuple, Optional
import torch

def compute_metrics(
    predictions: torch.Tensor,
    targets: torch.Tensor,
    metrics: List[str]
) -> Dict[str, float]:
    """计算评估指标"""
    pass
```

## 测试策略

### 测试金字塔
```
        /\
       /E2E\      5%（端到端测试）
      /------\
     / 集成测试 \    15%
    /----------\
   /  单元测试    \  80%
  /--------------\
```

### 单元测试示例
```python
import unittest
import numpy as np

class TestMetrics(unittest.TestCase):
    """测试评估指标"""
    
    def setUp(self):
        self.y_true = np.array([0, 1, 0, 1])
        self.y_pred = np.array([0, 1, 0, 0])
    
    def test_accuracy(self):
        """测试准确率计算"""
        acc = accuracy(self.y_true, self.y_pred)
        self.assertEqual(acc, 0.75)
    
    def test_precision(self):
        """测试精确率计算"""
        prec = precision(self.y_true, self.y_pred)
        self.assertAlmostEqual(prec, 1.0)
```

### 测试最佳实践
- 为关键功能编写测试
- 保持测试独立
- 使用有意义的测试名称
- 测试边界条件
- 定期运行测试
