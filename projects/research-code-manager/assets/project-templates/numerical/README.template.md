# {{PROJECT_NAME}}

## 项目简介
数值计算项目模板，支持科学计算、优化问题和微分方程求解。

## 目录结构
```
{{PROJECT_NAME}}/
├── src/               # 源代码
│   ├── core/         # 核心算法
│   ├── solvers/      # 求解器
│   └── utils/        # 工具函数
├── tests/             # 单元测试
├── examples/          # 示例代码
├── docs/              # 文档
├── configs/           # 配置文件
└── scripts/           # 运行脚本
```

## 安装依赖
```bash
pip install -r requirements.txt
```

## 快速开始
1. 运行示例：
```bash
python examples/example1.py
```
2. 运行测试：
```bash
pytest tests/
```
3. 求解问题：
```bash
python scripts/solve.py --config configs/problem1.yaml
```

## 算法模块
- 线性代数：矩阵分解、特征值问题
- 微分方程：ODE、PDE求解器
- 优化：梯度下降、牛顿法
- 积分：数值积分方法

## 参考文献
- [教材1](url)
- [教材2](url)
