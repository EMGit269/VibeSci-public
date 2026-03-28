#!/usr/bin/env python3
"""
生成科研代码项目模板

使用方法：
    python generate_template.py --project-name my-project --type deep-learning --output ./
"""

import argparse
import os
from pathlib import Path
from typing import Dict


# 项目类型定义
PROJECT_TYPES = {
    'deep-learning': {
        'description': '深度学习项目',
        'dirs': ['data', 'models', 'training', 'evaluation', 'utils', 'configs', 'checkpoints', 'logs'],
        'requirements': [
            'torch>=2.0.0',
            'torchvision>=0.15.0',
            'numpy>=1.24.0',
            'pandas>=2.0.0',
            'matplotlib>=3.7.0',
            'seaborn>=0.12.0',
            'scikit-learn>=1.3.0',
            'tqdm>=4.65.0',
            'tensorboard>=2.13.0',
            'pyyaml>=6.0.0'
        ]
    },
    'ml': {
        'description': '传统机器学习项目',
        'dirs': ['data', 'models', 'features', 'evaluation', 'utils', 'configs', 'experiments'],
        'requirements': [
            'scikit-learn>=1.3.0',
            'numpy>=1.24.0',
            'pandas>=2.0.0',
            'matplotlib>=3.7.0',
            'seaborn>=0.12.0',
            'scipy>=1.10.0',
            'xgboost>=1.7.0',
            'lightgbm>=4.0.0',
            'tqdm>=4.65.0',
            'joblib>=1.3.0'
        ]
    },
    'statistics': {
        'description': '统计分析项目',
        'dirs': ['data', 'analysis', 'visualization', 'reports', 'utils', 'configs'],
        'requirements': [
            'numpy>=1.24.0',
            'pandas>=2.0.0',
            'scipy>=1.10.0',
            'statsmodels>=0.14.0',
            'matplotlib>=3.7.0',
            'seaborn>=0.12.0',
            'plotly>=5.14.0',
            'jupyter>=1.0.0'
        ]
    },
    'numerical': {
        'description': '数值计算项目',
        'dirs': ['src', 'tests', 'examples', 'docs', 'configs'],
        'requirements': [
            'numpy>=1.24.0',
            'scipy>=1.10.0',
            'numba>=0.57.0',
            'matplotlib>=3.7.0',
            'pytest>=7.4.0',
            'pyyaml>=6.0.0'
        ]
    }
}


def create_project_structure(project_name: str, project_type: str, output_path: str):
    """创建项目目录结构"""
    type_info = PROJECT_TYPES[project_type]
    project_root = Path(output_path) / project_name
    
    # 创建主目录和子目录
    print(f"创建项目目录: {project_root}")
    project_root.mkdir(parents=True, exist_ok=True)
    
    for dir_name in type_info['dirs']:
        dir_path = project_root / dir_name
        dir_path.mkdir(exist_ok=True)
        # 创建__init__.py
        (dir_path / '__init__.py').touch()
        print(f"  - {dir_name}/")
    
    return project_root


def generate_readme(project_root: Path, project_name: str, project_type: str):
    """生成README.md"""
    type_info = PROJECT_TYPES[project_type]
    
    readme_content = f"""# {project_name}

## 项目简介
{type_info['description']}科研项目模板

## 目录结构
```
{project_name}/
"""
    for dir_name in type_info['dirs']:
        readme_content += f"├── {dir_name}/\n"
    
    readme_content += f"""├── README.md
├── requirements.txt
└── configs/
```

## 安装依赖
```bash
pip install -r requirements.txt
```

## 快速开始
1. 数据准备
2. 配置参数
3. 运行实验

## 实验记录
- [ ] 实验1
- [ ] 实验2
- [ ] 实验3

## 参考文献
"""
    
    readme_path = project_root / "README.md"
    with open(readme_path, 'w', encoding='utf-8') as f:
        f.write(readme_content)
    
    print(f"  - README.md")


def generate_requirements(project_root: Path, project_type: str):
    """生成requirements.txt"""
    type_info = PROJECT_TYPES[project_type]
    
    requirements_path = project_root / "requirements.txt"
    with open(requirements_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(type_info['requirements']))
    
    print(f"  - requirements.txt")


def generate_config_template(project_root: Path):
    """生成配置模板文件"""
    config_content = """# 配置文件模板

# 数据配置
data:
  train_path: "data/train/"
  val_path: "data/val/"
  test_path: "data/test/"
  batch_size: 32
  num_workers: 4

# 模型配置
model:
  name: "baseline"
  hidden_size: 256
  num_layers: 2
  dropout: 0.1

# 训练配置
training:
  epochs: 100
  learning_rate: 0.001
  weight_decay: 0.0001
  early_stopping_patience: 10
  save_interval: 5

# 评估配置
evaluation:
  metrics: ["accuracy", "precision", "recall", "f1"]
  save_predictions: true

# 实验配置
experiment:
  name: "exp_001"
  description: "baseline experiment"
  seed: 42
"""
    
    config_path = project_root / "configs" / "config_template.yaml"
    with open(config_path, 'w', encoding='utf-8') as f:
        f.write(config_content)
    
    print(f"  - configs/config_template.yaml")


def generate_main_script(project_root: Path, project_type: str):
    """生成主脚本模板"""
    if project_type == 'deep-learning':
        main_content = '''"""
主训练脚本
"""

import yaml
import torch
from pathlib import Path


def load_config(config_path: str) -> dict:
    """加载配置文件"""
    with open(config_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


def main():
    """主函数"""
    # 加载配置
    config = load_config("configs/config.yaml")
    
    # 设置随机种子
    seed = config.get('experiment', {}).get('seed', 42)
    torch.manual_seed(seed)
    
    # TODO: 初始化数据加载器
    # TODO: 初始化模型
    # TODO: 训练循环
    # TODO: 评估
    # TODO: 保存结果
    
    print("Training completed!")


if __name__ == '__main__':
    main()
'''
    elif project_type == 'ml':
        main_content = '''"""
主训练脚本
"""

import yaml
import joblib
from pathlib import Path


def load_config(config_path: str) -> dict:
    """加载配置文件"""
    with open(config_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


def main():
    """主函数"""
    # 加载配置
    config = load_config("configs/config.yaml")
    
    # TODO: 加载数据
    # TODO: 特征工程
    # TODO: 模型训练
    # TODO: 模型评估
    # TODO: 保存模型
    
    print("Training completed!")


if __name__ == '__main__':
    main()
'''
    else:
        main_content = '''"""
主脚本
"""

import yaml


def load_config(config_path: str) -> dict:
    """加载配置文件"""
    with open(config_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


def main():
    """主函数"""
    # 加载配置
    config = load_config("configs/config.yaml")
    
    # TODO: 实现主要逻辑
    
    print("Execution completed!")


if __name__ == '__main__':
    main()
'''
    
    main_path = project_root / "main.py"
    with open(main_path, 'w', encoding='utf-8') as f:
        f.write(main_content)
    
    print(f"  - main.py")


def generate_gitignore(project_root: Path):
    """生成.gitignore文件"""
    gitignore_content = """# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual Environment
venv/
env/
ENV/
.venv

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Jupyter Notebook
.ipynb_checkpoints

# Data
data/raw/*
data/processed/*
!data/raw/.gitkeep
!data/processed/.gitkeep

# Model checkpoints
checkpoints/
*.pth
*.pkl
*.h5
*.pt

# Logs
logs/
*.log

# Outputs
outputs/
results/
*.png
*.jpg
*.pdf
!README.png
"""
    
    gitignore_path = project_root / ".gitignore"
    with open(gitignore_path, 'w', encoding='utf-8') as f:
        f.write(gitignore_content)
    
    print(f"  - .gitignore")


def generate_gitkeep_files(project_root: Path, dirs: list):
    """为空目录生成.gitkeep文件"""
    for dir_name in dirs:
        if dir_name in ['data', 'checkpoints', 'logs', 'outputs']:
            gitkeep_path = project_root / dir_name / '.gitkeep'
            with open(gitkeep_path, 'w', encoding='utf-8') as f:
                f.write('')


def main():
    parser = argparse.ArgumentParser(description='生成科研代码项目模板')
    parser.add_argument('--project-name', required=True, help='项目名称')
    parser.add_argument('--type', required=True, choices=['deep-learning', 'ml', 'statistics', 'numerical'],
                        help='项目类型')
    parser.add_argument('--output', default='./', help='输出目录')
    
    args = parser.parse_args()
    
    # 验证项目类型
    if args.type not in PROJECT_TYPES:
        print(f"错误: 不支持的项目类型 '{args.type}'")
        print(f"支持的类型: {', '.join(PROJECT_TYPES.keys())}")
        return
    
    print(f"\n生成项目模板: {args.project_name}")
    print(f"项目类型: {PROJECT_TYPES[args.type]['description']}\n")
    
    # 创建项目结构
    project_root = create_project_structure(args.project_name, args.type, args.output)
    
    # 生成文件
    generate_readme(project_root, args.project_name, args.type)
    generate_requirements(project_root, args.type)
    generate_config_template(project_root)
    generate_main_script(project_root, args.type)
    generate_gitignore(project_root)
    generate_gitkeep_files(project_root, PROJECT_TYPES[args.type]['dirs'])
    
    print(f"\n✓ 项目模板生成完成!")
    print(f"  项目路径: {project_root}")
    print(f"\n下一步:")
    print(f"  1. cd {project_root}")
    print(f"  2. pip install -r requirements.txt")
    print(f"  3. 编辑 configs/config_template.yaml")
    print(f"  4. 运行 main.py")


if __name__ == '__main__':
    main()
