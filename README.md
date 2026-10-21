# Instagram Downloader

基于原 Instagram 下载扩展修复的 Chrome Manifest V3 版本，当前版本为 `1.0.0`。

## 功能

- 下载 Instagram 图片、视频、Reels、快拍和精选动态。
- 支持单条下载、批量下载和博主作品批量下载。
- 自动选择 Instagram 返回的最高分辨率媒体。
- 支持按用户名、日期或媒体类型创建子文件夹。
- 快拍和精选支持站内无刷新打开后读取媒体数据。
- 不包含广告、安装/卸载跳转和评分弹窗。

## 安装

1. 打开 `chrome://extensions`。
2. 开启“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本仓库中的 `extension` 目录。
5. 刷新 Instagram 页面。

## 项目结构

- `extension/`：Chrome 扩展源码。
- `extension/content-scripts/`：页面解析、按钮注入和媒体数据桥接。
- `extension/popup.*`：扩展设置弹窗。
- `extension/_locales/`：扩展名称和描述的多语言文件。

## 说明

- 下载文件格式取决于 Instagram CDN 返回的格式，部分图片会以 WebP 保存。
- 本项目不是 Instagram 官方产品。
- 使用前请确认你有权下载和处理相关媒体内容。
