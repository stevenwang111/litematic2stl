# Litematica 转 STL

将 Minecraft Litematica 原理图转换为可用于 3D 打印的 STL 文件，并附带实时 3D 预览。

## 功能特性

- **转换** `.litematic` 文件为二进制 `.stl` 格式
- **预览** 在交互式 3D 查看器中预览 STL 模型（旋转 / 缩放 / 平移）
- **下载** 直接下载转换后的 STL 文件
- **主题配色** – 查看器支持深色与浅色模式
- **光照模式** – 在点光源和环境光之间切换
- **模型信息** – 面数、顶点数、包围盒尺寸及估算体积
- **拖放支持** – 直接将 `.stl` 文件拖入查看器
- **打开已有 STL 文件** – 加载并查看任意 `.stl` 文件

## 工作原理

本工程由两部分组成：

- **后端**（`server.py`）– 一个 Flask 服务器，使用 `litemapy` 读取 Litematica 原理图文件，将可识别的方块转换为三角面片网格，并输出二进制 STL 文件。
- **前端**（`static/`）– 基于 Three.js 的 3D 查看器，在浏览器中渲染 STL，支持完整的光照、阴影和轨道控制。

### 支持的方块

| 方块           | 几何形状                               |
|----------------|---------------------------------------|
| 任意颜色羊毛   | 完整立方体（1×1×1）                     |
| 橡木台阶       | 半台阶（下半 / 上半 / 双层）            |
| 橡木楼梯       | 楼梯几何，带朝向、半层和转角形状（直行 / 内角 / 外角） |

### 羊毛颜色映射

所有 16 种 Minecraft 羊毛颜色均映射为其游戏内 RGB 值，使后端能保留颜色信息（STL 文件本身仅存储几何数据；颜色用于游戏中显示）。

## 环境要求

- Python 3.8+
- Flask
- litemapy

## 安装

```bash
pip install flask litemapy
```

## 使用方法

```bash
python server.py
```

打开浏览器并访问 `http://localhost:8080`。

- 点击 **上传 Litematic** 选择 `.litematic` 文件 – 文件将被转换为 STL 并显示在查看器中。
- 点击 **打开 STL** 加载已有 `.stl` 文件进行预览。
- 点击 **下载 STL** 保存转换后的文件。
- 将 `.stl` 文件直接拖放到画布上。

### API 接口

**POST** `/convert` – 上传 `.litematic` 文件并返回二进制 `.stl` 响应。

- 请求：`multipart/form-data`，字段名为 `file`
- 响应：`application/octet-stream`（二进制 STL）

## 项目结构

```
litematica-to-stl/
├── server.py              # Flask 后端 – Litematica → STL 转换
├── static/
│   ├── index.html         # 3D 查看器 UI
│   └── js/
│       └── app.js         # Three.js 查看器应用
└── README.md
```

## 待办事项
- [ ] 修复光照与阴影问题
- [ ] 支持更多方块
- [ ] 修复体积计算问题

## Credits

- **[Three.js](https://threejs.org/)** by [mrdoob](https://github.com/mrdoob) and contributors  
  Licensed under the MIT License.  
  Copyright © 2010-2026 three.js authors.

- **[litemapy](https://github.com/SmylerMC/litemapy)** by [SmylerMC](https://github.com/SmylerMC) and contributors  
  Licensed under the GPL-3.0 License.  

- **[vue3-mcpixelart](https://github.com/TgkRuobin/vue3-mcpixelart)** by [TgkRuobin](https://github.com/TgkRuobin) 
  - Inspired the web preview page.

特别感谢开源社区的宝贵见解。

## 动机
我一直对 3D 建模和 3D 打印很感兴趣，但像 Blender 这样的专业工具学习曲线陡峭，令人望而却步。而 Minecraft 是我非常熟悉的游戏——它的方块式建造直观、简单又充满乐趣。于是我想到：为什么不把 Minecraft 当作我的"建模软件"，然后将这些建造转换为标准的 STL 格式用于 3D 打印呢？这个工具正是源于这个想法——它让我绕过复杂的建模软件，用我已经熟悉的方式将创意变为现实。（其实我没有3D打印机，如果生成的模型打印有问题，请自行调节，或者提交issue）

## AI 使用声明

本项目广泛使用了 AI 工具。

- **主要工具**：DeepSeek
- **使用范围**：绝大多数前端代码（HTML、CSS、JavaScript）最初由 AI 生成，因为我不是 JavaScript 专家。部分后端 Python 代码也由 AI 生成。
- **人工验证**：所有 AI 生成的代码均已经过人工审查、测试并在目标环境中验证其正确性。

我坚信AI使用应该透明公开，也鼓励其他人这样做。如果你使用 AI 辅助你的贡献，请按照我们的贡献指南进行披露。

## 许可协议

GPL-3.0 license
