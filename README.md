# TTRS · 原生 AVD 路线测试工具

TTRS（TakeTwo Route Simulator）提供 Windows 桌面程序，用于向 Android Studio 原生 AVD 发送定位轨迹，并通过高德地图编辑测试路线。

**本仓库提供软件分发、中文教程和更新记录。当前版本的程序源码不公开，也不随下载包提供。**

## 下载与教程

- **[下载最新版 Windows 程序（含离线中文教程）](https://github.com/linmiao09/GKD_TakeTwo_monipao/releases/latest)**
- **[在线阅读：从安装 Android Studio 到日常使用](docs/使用教程.md)**
- [更新记录](CHANGELOG.md)
- [分发及第三方组件说明](NOTICE.txt)

在 Releases 的 **Assets** 中下载 `TTRS-2.1.1-Windows.zip`，完整解压后打开 `软件/TTRS.exe`。保留同目录全部文件，不能只复制 EXE。

GitHub 自动生成的 **Source code (zip / tar.gz)** 只包含这个文档仓库的内容，不是可运行程序，也不包含 TTRS 源码工程。

## 当前版本：2.1.1

- 只支持 **Android Studio 原生 AVD**。
- 高德地图点击、拖动选点，保存路线、撤销、反向和闭合循环。
- 内置操场默认四点，支持四点椭圆跑道模式。
- 支持目标距离、配速、采样间距和距离校准设置。
- 修复地图加载状态，提供“应用并重新加载地图”。
- 手动停止后清空实时进度；自然完成后保留最后统计。

![TTRS 2.1.1 界面示例](docs/assets/ttrs-2.1.1.png)

## 使用环境

| 项目 | 说明 |
| --- | --- |
| 电脑 | Windows 10 / 11，Intel 或 AMD x64 处理器 |
| 模拟器 | Android Studio 原生 AVD；另需安装 Android Emulator 和 Android SDK Platform-Tools |
| 教程基线 | Pixel 3 + Android 9 / API 28 + Google APIs x86_64；其他镜像需自行验证兼容性 |
| 地图 | 用户自己的高德 Web 端（JS API）Key 和配套安全密钥 |
| 开发环境 | 使用程序不需要 Node.js、npm 或编译源码 |

当前指定兼容 APK 含 x86_64 库，按教程配置无需额外安装 ARM 转译。更换其他 APK 的兼容性不作相同保证。

## 第一次与日常操作

第一次按教程安装 Android Studio、SDK 和 AVD，配置地图及目标应用。配置完成后，每天只需：

1. 启动 AVD，等待安卓桌面出现。
2. 打开 TTRS，刷新并选择设备。
3. 选择路线、设置参数，点击“预先定位”。
4. 在目标应用内开始测试，再在 TTRS 点击“开始模拟”。
5. 测试完成后，在目标应用内自行暂停、结束及处理记录。

TTRS 的“停止”仅停止发送坐标，不会自动替目标应用结束或保存。详细配置、独立启动 AVD 的桌面快捷方式和排错方法见[完整教程](docs/使用教程.md)。

## 分发说明与反馈

本项目用于有权开展的开发、技术交流与兼容性测试，请遵守相关应用、服务和所在机构的规则。

程序采用闭源分发；第三方开源组件仍适用其原许可证。发布包保留相应许可文本。现有运行资源中含第三方兼容性测试 APK，其权利及再分发条件独立于 TTRS；仓库说明不构成对第三方 APK 的额外授权。

反馈请提交 [Issue](https://github.com/linmiao09/GKD_TakeTwo_monipao/issues) 或联系原维护邮箱 [miaomiaolinmiao@gmail.com](mailto:miaomiaolinmiao@gmail.com)。提供 TTRS、Windows、AVD 的版本及错误文字，截图请遮盖账号、地图 Key、安全密钥和其他隐私信息。

Android Studio 与高德控制台界面可能变化，教程以所列版本和官方说明为准。
