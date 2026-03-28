# 详细示例 - 设计深度学习研究项目

## 目录
- 示例概述
- 完整执行流程
- 代码实现详情

## 示例概述
**用户需求**：我要做一个图像分类研究

**场景**：完整科研项目，从需求澄清到代码生成的完整流程

## 完整执行流程

### 第1步：需求澄清

**智能体**发现需求模糊，进行需求澄清：

```
Q1: 请问具体是什么类型的图像分类任务？（研究对象）
Q2: 数据量大概有多少？是使用公开数据集还是自建数据集？（研究对象）
Q3: 有没有参考的baseline模型或SOTA论文？（研究基础）
Q4: 有技术栈偏好吗？比如PyTorch、TensorFlow或其他框架？（研究基础）
```

**用户回答**：使用CIFAR-10数据集，10类分类，目标是超越baseline，偏好使用PyTorch

### 第2步：科研路线分析

**智能体从科研视角进行路线分析**：

**科研视角分析**：
- 研究问题：如何在CIFAR-10数据集上超越现有baseline，提升图像分类性能
- 创新点探索：数据增强策略、注意力机制、Transformer架构
- 实验设计：消融实验验证各模块贡献，与SOTA方法对比

**技术路线方案**：

**路线A：ResNet-18基线 + 数据增强**
- 科研价值：建立强baseline，验证数据增强效果
- 实验设计：对比不同增强策略，ablation study
- 发表潜力：较低（改进较常规）

**路线B：ResNet-18 + 注意力机制**
- 科研价值：轻量级注意力提升性能，可解释性强
- 实验设计：对比不同注意力机制，可视化注意力图
- 发表潜力：中等（有创新点，但不算突破性）

**路线C：ViT（Vision Transformer）**
- 科研价值：探索Transformer在图像分类中的应用
- 实验设计：与CNN对比，分析attention pattern
- 发表潜力：较高（新颖性强，但计算成本高）

**路线比较分析**：
- 路线A：实现简单，风险低，但学术贡献有限
- 路线B：平衡了创新性和可行性，适合作为研究起点
- 路线C：创新性强，但风险高，需要大量GPU资源

**用户选择**：我选择路线B（ResNet-18 + 注意力机制）

### 第3步：算法与代码选择

**算法科研适配性对比**：

研究目标：探索轻量级注意力机制在图像分类中的应用，提升模型性能同时保持计算效率

**ResNet-18（Baseline）**：
- 科研适配性：作为强baseline，验证注意力机制的贡献
- 对研究目标的支持：提供对比基准，通过消融实验验证改进效果
- 创新性贡献：无（成熟方法）
- 实现可行性：高（成熟框架，社区支持好）
- 潜在风险：低

**SE-Net（Squeeze-and-Excitation）**：
- 科研适配性：高（轻量级注意力，符合研究目标）
- 对研究目标的支持：直接支持"轻量级注意力"研究主题，可解释性强
- 创新性贡献：中（在特定场景下的应用探索）
- 实现可行性：高（结构简单，易于集成）
- 潜在风险：低（计算开销小）

**CBAM（Convolutional Block Attention Module）**：
- 科研适配性：中（双通道注意力，但计算开销较大）
- 对研究目标的支持：部分支持，但偏离"轻量级"核心目标
- 创新性贡献：中（空间和通道注意力结合）
- 实现可行性：中（结构复杂，调参难度高）
- 潜在风险：中（计算开销相对较大）

**选择理由分析**：

选择SE-Net注意力模块，理由：
- **与研究目标的匹配度高**：SE-Net是轻量级注意力机制的典型代表，直接支持"探索轻量级注意力"的研究目标
- **创新性体现**：可以在SE-Net基础上进行改进（如调整压缩比、优化模块结构），体现研究创新点
- **可解释性优势**：SE-Net的注意力机制易于可视化和分析，有助于撰写论文的可解释性部分
- **排除CBAM的原因**：CBAM的计算开销较大，不符合"轻量级"的核心研究目标；SE-Net更适合作为研究起点

**代码实现流程列举**：

基于ResNet-18 + SE-Net路线，需要实现以下代码模块：

1. **数据加载与预处理**（data/dataset.py）
   - CIFAR-10数据集加载
   - 数据归一化
   - 实现要点：使用torchvision.datasets，配置transforms

2. **数据增强**（data/augmentation.py）
   - 随机裁剪、水平翻转
   - 颜色抖动
   - 实现要点：使用torchvision.transforms，增强强度适中

3. **SE-Net模块**（models/senet.py）
   - SE-Block实现（Squeeze + Excitation）
   - 集成到ResNet-18
   - 实现要点：在ResNet的每个block后添加SE模块

4. **主模型定义**（models/resnet_se.py）
   - ResNet-18 + SE-Net组合
   - 输出层（10类分类）
   - 实现要点：继承ResNet基础架构，替换block

5. **损失函数与优化器**（training/loss.py）
   - 交叉熵损失
   - Adam优化器
   - 学习率调度（Cosine Decay）
   - 实现要点：使用torch.nn和torch.optim

6. **训练循环**（training/trainer.py）
   - 前向传播、反向传播
   - 梯度裁剪
   - 早停机制
   - 实现要点：每个epoch记录train/val loss

7. **验证与评估**（evaluation/metrics.py）
   - 准确率、F1-score计算
   - 混淆矩阵
   - 实现要点：使用sklearn.metrics

8. **结果可视化**（evaluation/visualize.py）
   - 训练曲线绘制
   - 注意力图可视化
   - 实现要点：使用matplotlib和seaborn

9. **模型保存与加载**（utils/checkpoint.py）
   - 保存最佳模型
   - 加载模型继续训练
   - 实现要点：使用torch.save/load

10. **推理脚本**（scripts/infer.py）
    - 单张图片预测
    - 批量预测
    - 实现要点：加载模型，预处理输入

11. **实验记录与日志**（utils/logger.py）
    - TensorBoard日志
    - 训练过程记录
    - 实现要点：使用torch.utils.tensorboard

**用户选择**：我需要生成模块1、3、4、5、6（数据加载、SE-Net模块、主模型、损失函数、训练循环）

### 第4步：建立项目文件夹

**智能体**：好的，在生成代码之前，我们需要建立项目文件夹。

Q: 是否让AI自动创建项目文件夹？
   - 选项A：AI自动创建（推荐）
   - 选项B：手动指定

**情况1：用户选择A（AI自动创建）**

智能体：好的，我根据您的科研主题（CIFAR-10图像分类 + SE-Net注意力机制）自动生成项目信息：
- 项目名称：cifar-senet-classification
- 存储路径：./projects
- 项目类型：deep-learning

确认是否使用这些配置？（回复"确认"或"修改"）

用户：确认

**智能体执行**：
```bash
python scripts/generate_template.py \
  --project-name cifar-senet-classification \
  --type deep-learning \
  --output ./projects
```

**情况2：用户选择B（手动指定）**

用户选择：B，手动指定

智能体：好的，请提供以下信息：
Q1: 项目名称是什么？
Q2: 项目存储路径？（如：./projects 或留空表示当前目录）

用户回答：项目名称 my-classifier，路径 ./projects

**智能体执行**：
```bash
python scripts/generate_template.py \
  --project-name my-classifier \
  --type deep-learning \
  --output ./projects
```

**项目创建成功**：
- 项目路径：./projects/cifar-senet-classification/
- 目录结构：
  ```
  cifar-senet-classification/
  ├── data/
  ├── models/
  ├── training/
  ├── evaluation/
  ├── utils/
  ├── configs/
  ├── checkpoints/
  ├── logs/
  ├── scripts/
  └── tests/
  ```
- **代码版本管理**：
  - 初始版本：v1.0.0
  - 文件命名：模块名_v版本号.py（如 dataset_v1.0.0.py）
  - 版本递增：v1.0.0 → v1.0.1（修复）→ v1.1.0（更新）→ v2.0.0（重大变更）
  - 保留所有历史版本，便于回溯

## 代码实现详情

### 生成代码文件列表（版本v1.0.0）：
- data/dataset_v1.0.0.py（数据加载与预处理）
- models/senet_v1.0.0.py（SE-Net模块）
- models/resnet_se_v1.0.0.py（主模型定义）
- training/loss_v1.0.0.py（损失函数与优化器）
- training/trainer_v1.0.0.py（训练循环）

### 代码示例（带用户自定义标注）

#### data/dataset_v1.0.0.py
```python
import torch
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

# TODO: 用户自定义 - 根据实际情况修改数据路径
DATA_ROOT = "./data/cifar-10"

# TODO: 用户自定义 - 根据硬件调整batch size
BATCH_SIZE = 128

# TODO: 用户自定义 - 根据数据集调整输入尺寸
INPUT_SIZE = 32

# TODO: 用户自定义 - 根据数据集调整类别数
NUM_CLASSES = 10

def get_train_transform():
    """
    获取训练数据增强transform
    """
    return transforms.Compose([
        # TODO: 用户自定义 - 根据数据集调整裁剪大小
        transforms.RandomCrop(32, padding=4),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        # TODO: 用户自定义 - 根据数据集调整归一化参数
        transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
    ])

def get_train_loader():
    """
    获取训练数据加载器
    """
    train_dataset = datasets.CIFAR10(
        root=DATA_ROOT,
        train=True,
        download=True,
        transform=get_train_transform()
    )
    
    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        # TODO: 用户自定义 - 根据硬件调整num_workers
        num_workers=4,
        pin_memory=True
    )
    
    return train_loader
```

#### training/trainer_v1.0.0.py
```python
import torch
import torch.nn as nn
from torch.utils.tensorboard import SummaryWriter

# TODO: 用户自定义 - 根据实验需求调整学习率
LEARNING_RATE = 0.001

# TODO: 用户自定义 - 根据实验需求调整训练轮数
NUM_EPOCHS = 100

# TODO: 用户自定义 - 根据硬件调整设备
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# TODO: 用户自定义 - 模型保存路径
CHECKPOINT_DIR = "./checkpoints"

# TODO: 用户自定义 - 日志保存路径
LOG_DIR = "./logs"

class Trainer:
    def __init__(self, model, train_loader, criterion, optimizer):
        self.model = model.to(DEVICE)
        self.train_loader = train_loader
        self.criterion = criterion
        self.optimizer = optimizer
        # TODO: 用户自定义 - 根据需求添加tensorboard日志
        self.writer = SummaryWriter(LOG_DIR)
        self.epoch = 0
    
    def train_epoch(self):
        """
        训练一个epoch
        """
        self.model.train()
        total_loss = 0.0
        
        for batch_idx, (data, target) in enumerate(self.train_loader):
            data, target = data.to(DEVICE), target.to(DEVICE)
            
            self.optimizer.zero_grad()
            output = self.model(data)
            loss = self.criterion(output, target)
            loss.backward()
            self.optimizer.step()
            
            total_loss += loss.item()
            
            # TODO: 用户自定义 - 根据需要调整打印频率
            if batch_idx % 100 == 0:
                print(f'Epoch: {self.epoch} [{batch_idx * len(data)}/{len(self.train_loader.dataset)}]\tLoss: {loss.item():.6f}')
        
        avg_loss = total_loss / len(self.train_loader)
        self.writer.add_scalar('Train/Loss', avg_loss, self.epoch)
        
        return avg_loss
    
    def train(self, num_epochs):
        """
        训练模型
        """
        best_loss = float('inf')
        
        for self.epoch in range(num_epochs):
            loss = self.train_epoch()
            
            # TODO: 用户自定义 - 根据需求调整保存策略
            if loss < best_loss:
                best_loss = loss
                torch.save({
                    'epoch': self.epoch,
                    'model_state_dict': self.model.state_dict(),
                    'optimizer_state_dict': self.optimizer.state_dict(),
                    'loss': loss,
                }, f'{CHECKPOINT_DIR}/best_model.pth')
```

**智能体**：代码已生成完成，文件保存在 ./projects/cifar-senet-classification/ 目录下。

---

⚠️ **重要提醒：以下配置项必须修改，否则代码无法运行**

【必须修改】
1. **数据路径**：`data/dataset_v1.0.0.py` 第8行 - `DATA_ROOT`
   - 当前值：`"./data/cifar-10"`
   - 修改为：您的实际数据集路径
   - 说明：代码会尝试从这个路径加载CIFAR-10数据集，路径不正确会导致加载失败

2. **模型保存路径**：`training/trainer_v1.0.0.py` 第12行 - `CHECKPOINT_DIR`
   - 当前值：`"./checkpoints"`
   - 修改为：您的模型保存目录路径
   - 说明：代码会尝试保存训练好的模型到这个目录，目录不存在会导致保存失败

3. **日志保存路径**：`training/trainer_v1.0.0.py` 第15行 - `LOG_DIR`
   - 当前值：`"./logs"`
   - 修改为：您的日志保存目录路径
   - 说明：TensorBoard日志会保存到这里，目录不存在会导致日志记录失败

【建议修改】
4. **Batch size**：`data/dataset_v1.0.0.py` 第11行 - `BATCH_SIZE`
   - 当前值：`128`
   - 建议：根据GPU显存大小调整
     - GPU显存 < 8GB：建议使用32或64
     - GPU显存 >= 8GB：可以使用128或更大
   - 说明：batch size过大可能导致显存溢出（OOM错误）

5. **学习率**：`training/trainer_v1.0.0.py` 第8行 - `LEARNING_RATE`
   - 当前值：`0.001`
   - 建议：根据任务复杂度调整（0.0001-0.01范围）
   - 说明：学习率过高可能导致训练不收敛，过低会导致训练速度慢

6. **训练轮数**：`training/trainer_v1.0.0.py` 第11行 - `NUM_EPOCHS`
   - 当前值：`100`
   - 建议：根据数据集大小和模型复杂度调整
   - 说明：CIFAR-10通常需要100-200轮，更复杂的数据集可能需要更多轮

【可选修改】
7. **输入尺寸**：`data/dataset_v1.0.0.py` 第14行 - `INPUT_SIZE`
   - 当前值：`32`
   - 说明：如果你的图像尺寸不是32x32，需要修改此值

8. **类别数**：`data/dataset_v1.0.0.py` 第17行 - `NUM_CLASSES`
   - 当前值：`10`
   - 说明：如果你的分类任务不是10类，需要修改此值

📝 **查找方法**：在代码中搜索 `# TODO: 用户自定义` 可以快速定位所有需要修改的地方

✅ **修改完成后，可以运行以下命令开始训练**：
```bash
python main.py
```

---

所有需要用户自定义的部分都已用 `# TODO: 用户自定义` 标注，您可以快速定位并修改配置项。后续如果需要更新代码，将生成新版本（如 v1.0.1），所有历史版本都会保留。
