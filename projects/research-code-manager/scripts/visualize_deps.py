#!/usr/bin/env python3
"""
可视化代码依赖关系图

使用方法：
    python visualize_deps.py --structure-file structure.json --output deps.png
"""

import argparse
import json
import matplotlib.pyplot as plt
import networkx as nx
from pathlib import Path
from typing import Dict, List, Set


def load_structure_report(file_path: str) -> Dict:
    """加载结构报告"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def build_dependency_graph(dependencies: Dict[str, List[str]]) -> nx.DiGraph:
    """构建依赖关系图"""
    G = nx.DiGraph()
    
    for module, deps in dependencies.items():
        G.add_node(module)
        for dep in deps:
            # 跳过标准库模块（以常见标准库名开头）
            if dep in ['os', 'sys', 'json', 'pathlib', 'typing', 'math', 'random', 'datetime']:
                continue
            G.add_node(dep)
            G.add_edge(module, dep)
    
    return G


def detect_circular_dependencies(G: nx.DiGraph) -> List[List[str]]:
    """检测循环依赖"""
    try:
        cycles = list(nx.simple_cycles(G))
        return cycles
    except:
        return []


def calculate_metrics(G: nx.DiGraph) -> Dict:
    """计算图指标"""
    metrics = {
        'total_nodes': G.number_of_nodes(),
        'total_edges': G.number_of_edges(),
        'avg_out_degree': sum(dict(G.out_degree()).values()) / max(G.number_of_nodes(), 1),
        'avg_in_degree': sum(dict(G.in_degree()).values()) / max(G.number_of_nodes(), 1),
        'strongly_connected_components': nx.number_strongly_connected_components(G),
    }
    
    # 识别关键节点（入度和出度都较高的节点）
    degrees = dict(G.degree())
    avg_degree = sum(degrees.values()) / max(len(degrees), 1)
    metrics['key_nodes'] = [
        node for node, degree in degrees.items() 
        if degree > avg_degree * 2
    ]
    
    return metrics


def visualize_graph(G: nx.DiGraph, output_path: str, key_nodes: List[str] = None):
    """可视化依赖图"""
    plt.figure(figsize=(16, 12))
    
    # 使用spring布局
    pos = nx.spring_layout(G, k=2, iterations=50, seed=42)
    
    # 绘制节点
    node_colors = []
    node_sizes = []
    
    for node in G.nodes():
        if key_nodes and node in key_nodes:
            node_colors.append('#ff6b6b')  # 关键节点：红色
            node_sizes.append(800)
        elif G.out_degree(node) == 0 and G.in_degree(node) > 0:
            node_colors.append('#4ecdc4')  # 叶子节点：青色
            node_sizes.append(600)
        elif G.in_degree(node) == 0 and G.out_degree(node) > 0:
            node_colors.append('#45b7d1')  # 根节点：蓝色
            node_sizes.append(600)
        else:
            node_colors.append('#95a5a6')  # 普通节点：灰色
            node_sizes.append(500)
    
    # 绘制边
    nx.draw_networkx_edges(
        G, pos, 
        edge_color='#bdc3c7',
        width=1,
        alpha=0.6,
        arrowsize=20,
        arrowstyle='->'
    )
    
    # 绘制节点
    nx.draw_networkx_nodes(
        G, pos,
        node_color=node_colors,
        node_size=node_sizes,
        alpha=0.8,
        edgecolors='white',
        linewidths=1.5
    )
    
    # 绘制标签
    nx.draw_networkx_labels(
        G, pos,
        font_size=10,
        font_family='Arial',
        font_weight='bold',
        bbox=dict(
            facecolor='white',
            edgecolor='gray',
            alpha=0.9,
            boxstyle='round,pad=0.3'
        )
    )
    
    plt.title('Code Dependency Graph', fontsize=16, fontweight='bold', pad=20)
    plt.axis('off')
    plt.tight_layout()
    
    # 保存图片
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    print(f"依赖图已保存到: {output_path}")
    
    # 显示图片（可选）
    # plt.show()


def generate_summary_text(G: nx.DiGraph, cycles: List[List[str]], metrics: Dict) -> str:
    """生成分析摘要文本"""
    summary = []
    summary.append("=" * 60)
    summary.append("代码依赖关系分析报告")
    summary.append("=" * 60)
    summary.append(f"\n图指标:")
    summary.append(f"  - 节点数（模块数）: {metrics['total_nodes']}")
    summary.append(f"  - 边数（依赖数）: {metrics['total_edges']}")
    summary.append(f"  - 平均出度: {metrics['avg_out_degree']:.2f}")
    summary.append(f"  - 平均入度: {metrics['avg_in_degree']:.2f}")
    summary.append(f"  - 强连通分量数: {metrics['strongly_connected_components']}")
    
    if metrics['key_nodes']:
        summary.append(f"\n关键节点（高依赖度）:")
        for node in metrics['key_nodes']:
            in_deg = G.in_degree(node)
            out_deg = G.out_degree(node)
            summary.append(f"  - {node} (入度: {in_deg}, 出度: {out_deg})")
    
    if cycles:
        summary.append(f"\n⚠️  警告: 检测到 {len(cycles)} 个循环依赖")
        for i, cycle in enumerate(cycles, 1):
            summary.append(f"  循环 {i}: {' -> '.join(cycle)}")
    else:
        summary.append(f"\n✓ 未检测到循环依赖")
    
    summary.append("=" * 60)
    
    return "\n".join(summary)


def main():
    parser = argparse.ArgumentParser(description='可视化代码依赖关系')
    parser.add_argument('--structure-file', required=True, help='结构报告JSON文件路径')
    parser.add_argument('--output', required=True, help='输出图片路径')
    parser.add_argument('--summary-output', help='可选：分析摘要输出路径')
    
    args = parser.parse_args()
    
    # 加载结构报告
    print(f"加载结构报告: {args.structure_file}")
    report = load_structure_report(args.structure_file)
    
    # 构建依赖图
    print("构建依赖关系图...")
    dependencies = report['dependencies']
    G = build_dependency_graph(dependencies)
    
    # 检测循环依赖
    print("检测循环依赖...")
    cycles = detect_circular_dependencies(G)
    
    # 计算指标
    print("计算图指标...")
    metrics = calculate_metrics(G)
    
    # 可视化
    print("生成可视化图...")
    visualize_graph(G, args.output, metrics.get('key_nodes', []))
    
    # 生成摘要
    summary_text = generate_summary_text(G, cycles, metrics)
    print(f"\n{summary_text}")
    
    if args.summary_output:
        with open(args.summary_output, 'w', encoding='utf-8') as f:
            f.write(summary_text)
        print(f"\n分析摘要已保存到: {args.summary_output}")


if __name__ == '__main__':
    main()
