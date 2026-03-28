#!/usr/bin/env python3
"""
分析Python代码结构，提取模块、类、函数和依赖关系

使用方法：
    python analyze_structure.py --project-path ./my-project --output structure.json
"""

import ast
import argparse
import json
import os
from pathlib import Path
from typing import Dict, List, Any, Set


class CodeStructureAnalyzer(ast.NodeVisitor):
    """代码结构分析器"""
    
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.module_name = Path(file_path).stem
        self.classes: List[Dict[str, Any]] = []
        self.functions: List[Dict[str, Any]] = []
        self.imports: List[Dict[str, str]] = []
        self.docstring: str = ""
        
    def visit_Module(self, node: ast.Module):
        """访问模块节点"""
        if node.doc_string:
            self.docstring = ast.get_docstring(node)
        self.generic_visit(node)
        
    def visit_ClassDef(self, node: ast.ClassDef):
        """访问类定义"""
        class_info = {
            'name': node.name,
            'lineno': node.lineno,
            'docstring': ast.get_docstring(node),
            'methods': [],
            'bases': [self._get_name(base) for base in node.bases]
        }
        
        # 提取方法
        for item in node.body:
            if isinstance(item, ast.FunctionDef):
                method_info = {
                    'name': item.name,
                    'lineno': item.lineno,
                    'docstring': ast.get_docstring(item),
                    'args': [arg.arg for arg in item.args.args]
                }
                class_info['methods'].append(method_info)
        
        self.classes.append(class_info)
        
    def visit_FunctionDef(self, node: ast.FunctionDef):
        """访问函数定义"""
        func_info = {
            'name': node.name,
            'lineno': node.lineno,
            'docstring': ast.get_docstring(node),
            'args': [arg.arg for arg in node.args.args],
            'is_method': False  # 标记是否为方法（在类中会被跳过）
        }
        
        # 只记录模块级函数，不记录类方法
        if not self.classes or not any(
            node.lineno > cls['lineno'] and 
            (not cls['methods'] or node.lineno < cls['methods'][0]['lineno'])
            for cls in self.classes
        ):
            self.functions.append(func_info)
            
    def visit_Import(self, node: ast.Import):
        """访问import语句"""
        for alias in node.names:
            self.imports.append({
                'module': alias.name,
                'alias': alias.asname,
                'type': 'import'
            })
            
    def visit_ImportFrom(self, node: ast.ImportFrom):
        """访问from ... import语句"""
        module = node.module or ''
        for alias in node.names:
            self.imports.append({
                'module': module,
                'name': alias.name,
                'alias': alias.asname,
                'type': 'from_import'
            })
    
    def _get_name(self, node) -> str:
        """获取节点名称"""
        if isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.Attribute):
            return f"{self._get_name(node.value)}.{node.attr}"
        return str(node)


def analyze_file(file_path: str) -> Dict[str, Any]:
    """分析单个Python文件"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            source = f.read()
        
        tree = ast.parse(source)
        analyzer = CodeStructureAnalyzer(file_path)
        analyzer.visit(tree)
        
        return {
            'file_path': file_path,
            'module_name': analyzer.module_name,
            'docstring': analyzer.docstring,
            'classes': analyzer.classes,
            'functions': analyzer.functions,
            'imports': analyzer.imports
        }
    except Exception as e:
        return {
            'file_path': file_path,
            'error': str(e)
        }


def extract_dependencies(analysis_results: List[Dict[str, Any]]) -> Dict[str, Set[str]]:
    """提取模块依赖关系"""
    dependencies = {}
    
    for result in analysis_results:
        if 'error' in result:
            continue
            
        module_name = result['module_name']
        deps = set()
        
        for imp in result['imports']:
            if imp['type'] == 'import':
                deps.add(imp['module'].split('.')[0])
            else:  # from_import
                if imp['module']:
                    deps.add(imp['module'].split('.')[0])
        
        dependencies[module_name] = deps
    
    return dependencies


def scan_project(project_path: str) -> List[str]:
    """扫描项目中的所有Python文件"""
    python_files = []
    project_root = Path(project_path)
    
    for file_path in project_root.rglob('*.py'):
        # 跳过虚拟环境、测试目录等
        if any(skip in str(file_path) for skip in ['venv/', '.venv/', 'env/', '__pycache__/', '.git/']):
            continue
        python_files.append(str(file_path))
    
    return sorted(python_files)


def main():
    parser = argparse.ArgumentParser(description='分析Python代码结构')
    parser.add_argument('--project-path', required=True, help='项目根目录路径')
    parser.add_argument('--output', required=True, help='输出JSON文件路径')
    
    args = parser.parse_args()
    
    # 扫描项目文件
    print(f"扫描项目: {args.project_path}")
    python_files = scan_project(args.project_path)
    print(f"找到 {len(python_files)} 个Python文件")
    
    # 分析每个文件
    analysis_results = []
    for file_path in python_files:
        print(f"分析文件: {file_path}")
        result = analyze_file(file_path)
        analysis_results.append(result)
    
    # 提取依赖关系
    dependencies = extract_dependencies(analysis_results)
    
    # 生成报告
    report = {
        'project_path': args.project_path,
        'total_files': len(python_files),
        'files': analysis_results,
        'dependencies': {k: list(v) for k, v in dependencies.items()},
        'summary': {
            'total_modules': len([r for r in analysis_results if 'error' not in r]),
            'total_classes': sum(len(r.get('classes', [])) for r in analysis_results if 'error' not in r),
            'total_functions': sum(len(r.get('functions', [])) for r in analysis_results if 'error' not in r),
        }
    }
    
    # 保存结果
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"\n分析完成！结果已保存到: {args.output}")
    print(f"\n统计信息:")
    print(f"  - 模块数: {report['summary']['total_modules']}")
    print(f"  - 类数: {report['summary']['total_classes']}")
    print(f"  - 函数数: {report['summary']['total_functions']}")


if __name__ == '__main__':
    main()
