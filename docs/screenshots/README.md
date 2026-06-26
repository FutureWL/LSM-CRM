# 截图归档目录

> 本目录用于集中存放项目相关的截图，便于本地查阅和分类。
> **目录本身随仓库提交，但其中的图片文件默认被 `.gitignore` 排除，不会进入版本控制。**

## 📁 建议的子目录结构

```
docs/screenshots/
├── bug/           # Bug 复现与修复对比图（建议命名：YYYYMMDD-简述.png）
├── design/        # 设计稿 / UI 演进截图（before / after / v1 / v2 …）
├── mobile/        # 移动端页面截图（按页面再分）
├── desktop/       # 桌面端页面截图
└── misc/          # 其他临时截图
```

## 📝 命名约定

- 使用 **小写英文 + 连字符**：`mobile-login-fixed.png`
- 体现 **时间或版本**：`profile-v2-full.png` / `2025-06-26-bug-repro.png`
- 体现 **状态**：`-before` / `-after` / `-current` / `-fixed`

## ⚠️ 版本控制约定

| 位置 | 是否入库 |
|---|---|
| `docs/screenshots/**/*.png` | ❌ 默认忽略（根 `.gitignore` 中 `*.png` 规则覆盖） |
| 同上，**必须入库**的文档截图 | ✅ 使用 `git add -f path/to/file.png` 强制添加 |

如确需把某张截图作为文档正式资源提交，请：

```bash
git add -f docs/screenshots/design/profile-official-hero.png
git commit -m "docs: add official profile hero screenshot"
```

## 🧹 定期清理

建议每完成一个迭代就清理一次无用截图，保持本地目录整洁。