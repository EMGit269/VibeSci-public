#!/usr/bin/env python3
"""
生成文献综述HTML网页

用途：基于文献信息JSON生成响应式HTML网页
参数：
  --literature-file: 文献信息JSON文件路径
  --output: 输出HTML文件路径
  --title: 综述标题（可选）
"""

import argparse
import json
import os
from datetime import datetime
from typing import Dict, List, Optional


def generate_html(
    literature_data: Dict,
    title: Optional[str] = None,
    include_toc: bool = True
) -> str:
    """
    生成文献综述HTML
    
    Args:
        literature_data: 文献数据字典
        title: 综述标题
        include_toc: 是否包含目录
    
    Returns:
        HTML字符串
    """
    if title is None:
        title = literature_data.get("title", "文献综述")
    
    # 提取数据
    background = literature_data.get("background", "")
    related_work = literature_data.get("related_work", [])
    method_comparison = literature_data.get("method_comparison", [])
    current_status = literature_data.get("current_status", "")
    future_directions = literature_data.get("future_directions", "")
    references = literature_data.get("references", [])
    
    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.8;
            color: #333;
            background-color: #f5f5f5;
            padding: 20px;
        }}
        
        .container {{
            max-width: 900px;
            margin: 0 auto;
            background-color: #fff;
            padding: 40px 50px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-radius: 8px;
        }}
        
        h1 {{
            font-size: 28px;
            color: #2c3e50;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 3px solid #3498db;
        }}
        
        h2 {{
            font-size: 22px;
            color: #34495e;
            margin-top: 40px;
            margin-bottom: 20px;
            padding-left: 15px;
            border-left: 4px solid #3498db;
        }}
        
        h3 {{
            font-size: 18px;
            color: #555;
            margin-top: 25px;
            margin-bottom: 15px;
        }}
        
        p {{
            margin-bottom: 15px;
            text-align: justify;
        }}
        
        .toc {{
            background-color: #f8f9fa;
            padding: 20px 25px;
            margin-bottom: 30px;
            border-radius: 5px;
            border-left: 4px solid #3498db;
        }}
        
        .toc h3 {{
            margin-top: 0;
            margin-bottom: 15px;
            color: #2c3e50;
        }}
        
        .toc ul {{
            list-style-type: none;
            padding-left: 0;
        }}
        
        .toc li {{
            padding: 5px 0;
        }}
        
        .toc a {{
            color: #3498db;
            text-decoration: none;
        }}
        
        .toc a:hover {{
            text-decoration: underline;
        }}
        
        .method-item {{
            background-color: #f8f9fa;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 5px;
            border-left: 4px solid #2ecc71;
        }}
        
        .method-item h3 {{
            color: #27ae60;
            margin-top: 0;
        }}
        
        .reference {{
            margin-bottom: 10px;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 3px;
        }}
        
        .reference a {{
            color: #3498db;
            text-decoration: none;
        }}
        
        .reference a:hover {{
            text-decoration: underline;
        }}
        
        .meta {{
            color: #7f8c8d;
            font-size: 14px;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ecf0f1;
        }}
        
        @media print {{
            body {{
                background-color: #fff;
                padding: 0;
            }}
            
            .container {{
                box-shadow: none;
                padding: 20px;
            }}
        }}
        
        @media screen and (max-width: 768px) {{
            .container {{
                padding: 20px 25px;
            }}
            
            h1 {{
                font-size: 24px;
            }}
            
            h2 {{
                font-size: 20px;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>{title}</h1>
"""
    
    # 目录
    if include_toc:
        html += """
        <div class="toc">
            <h3>目录</h3>
            <ul>
                <li><a href="#background">1. 研究背景</a></li>
                <li><a href="#related-work">2. 相关工作</a></li>
                <li><a href="#method-comparison">3. 方法对比分析</a></li>
                <li><a href="#current-status">4. 研究现状总结</a></li>
                <li><a href="#future-directions">5. 未来研究方向</a></li>
                <li><a href="#references">6. 参考文献</a></li>
            </ul>
        </div>
"""
    
    # 研究背景
    html += f"""
        <h2 id="background">1. 研究背景</h2>
        {background}
"""
    
    # 相关工作
    html += """
        <h2 id="related-work">2. 相关工作</h2>
"""
    for work in related_work:
        category = work.get("category", "")
        description = work.get("description", "")
        papers = work.get("papers", [])
        
        html += f"""
        <h3>{category}</h3>
        <p>{description}</p>
        <ul>
"""
        for paper in papers:
            title_paper = paper.get("title", "")
            authors = paper.get("authors", "")
            year = paper.get("year", "")
            html += f"            <li>{authors} ({year}). {title_paper}</li>\n"
        html += "        </ul>\n"
    
    # 方法对比分析
    html += """
        <h2 id="method-comparison">3. 方法对比分析</h2>
"""
    for method in method_comparison:
        method_name = method.get("name", "")
        description = method.get("description", "")
        pros = method.get("pros", [])
        cons = method.get("cons", [])
        use_cases = method.get("use_cases", "")
        
        html += f"""
        <div class="method-item">
            <h3>{method_name}</h3>
            <p>{description}</p>
            <p><strong>优点：</strong>{'、'.join(pros)}</p>
            <p><strong>缺点：</strong>{'、'.join(cons)}</p>
            <p><strong>适用场景：</strong>{use_cases}</p>
        </div>
"""
    
    # 研究现状总结
    html += f"""
        <h2 id="current-status">4. 研究现状总结</h2>
        {current_status}
"""
    
    # 未来研究方向
    html += f"""
        <h2 id="future-directions">5. 未来研究方向</h2>
        {future_directions}
"""
    
    # 参考文献
    html += """
        <h2 id="references">6. 参考文献</h2>
"""
    for i, ref in enumerate(references, 1):
        title_ref = ref.get("title", "")
        authors_ref = ref.get("authors", "")
        venue = ref.get("venue", "")
        year_ref = ref.get("year", "")
        url = ref.get("url", "")
        
        if url:
            html += f"""
        <div class="reference">
            <strong>[{i}]</strong> {authors_ref}. <a href="{url}" target="_blank">{title_ref}</a>. {venue}, {year_ref}.
        </div>
"""
        else:
            html += f"""
        <div class="reference">
            <strong>[{i}]</strong> {authors_ref}. {title_ref}. {venue}, {year_ref}.
        </div>
"""
    
    # 元信息
    html += f"""
        <div class="meta">
            <p>生成时间：{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
            <p>本文献综述由Research Code Manager自动生成</p>
        </div>
    </div>
</body>
</html>
"""
    
    return html


def main():
    parser = argparse.ArgumentParser(description="生成文献综述HTML网页")
    parser.add_argument("--literature-file", required=True, help="文献信息JSON文件路径")
    parser.add_argument("--output", required=True, help="输出HTML文件路径")
    parser.add_argument("--title", help="综述标题（可选）")
    
    args = parser.parse_args()
    
    # 读取文献数据
    with open(args.literature_file, 'r', encoding='utf-8') as f:
        literature_data = json.load(f)
    
    # 生成HTML
    html = generate_html(literature_data, args.title)
    
    # 确保输出目录存在
    output_dir = os.path.dirname(args.output)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # 写入文件
    with open(args.output, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"✓ 文献综述网页生成完成: {args.output}")


if __name__ == "__main__":
    main()
