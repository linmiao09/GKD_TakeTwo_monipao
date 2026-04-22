# 校园跑步模拟器 (School Running Simulator)

## 软件不会操作的请查看校园跑步模拟器.docx  
## 不要再发邮箱来问能不能多开了，开源出来只是为了大家自用。
## 欢迎各位给我点点star
## v1.0.3正在开发中，目前还在算法完善！！！

一款基于 **Electron** 开发的桌面级 GPS 模拟工具，专门为广州科技职业技术大学广州校区使用TakeTwo设计。通过与雷电模拟器联动，实现高精度的路径模拟与防检测运行。

不同于使用**影梭**或者**Fakelocation**改虚拟定位的方法，在TakeTwo中会被检测到有虚拟定位软件或被发现作弊。本软件使用的方法不会被检测到作弊。

---

## 📸 项目演示

**软件演示图片：**

![图片1.png](images/%E5%9B%BE%E7%89%871.png)
![图片2.png](images/%E5%9B%BE%E7%89%872.png)


## 📸 V1.0.2和V1.0.3区别
## V1.0.3实现了步数以及步频（以业内主流运动软件Keep演示）**

### V1.0.3(能看见有步幅与步频)
![图片3.png](images/%E5%9B%BE%E7%89%873.png)
![图片4.png](images/%E5%9B%BE%E7%89%874.png)

### V1.0.2（没有步幅与步频）
![图片5.png](images/%E5%9B%BE%E7%89%875.png)
![图片6.png](images/%E5%9B%BE%E7%89%876.png)
---

## 🛠 技术栈

项目采用了现代化的前端与桌面端开发技术，确保性能与用户体验。

*   **Runtime**: [Electron](https://www.electronjs.org/) (跨平台桌面应用框架)
*   **Frontend**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) (现代 CSS 框架)
*   **Build Tool**: [Vite](https://vitejs.dev/) + [electron-vite](https://electron-vite.org/)
*   **Communication**: IPC (Inter-Process Communication) 进程间通信
*   **GIS Libraries**: [geolib](https://github.com/manuelbieh/geolib) (计算地理位置与方位)

---

## 🏗 应用架构

项目遵循 Electron 的最佳实践，采用了主进程与渲染进程分离的标准架构：

1.  **Main Process (主进程)**:
    *   处理系统级操作，如文件系统检测（雷电模拟器路径）。
    *   通过 `child_process` 模块控制模拟器（`dnconsole.exe` / `ldconsole.exe`）。
    *   管理模拟定时器，实现高频 GPS 坐标推送。
2.  **Renderer Process (渲染进程)**:
    *   提供基于组件驱动的 UI 交互界面。
    *   负责路径点算法计算（直线插值与弧线插值）。
3.  **Preload Scripts (预加载脚本)**:
    *   作为桥梁，安全地暴露必要的 API 给渲染进程，确保应用安全（Context Isolation）。

---

## 📦 使用说明

### 1. 源码运行 (开发者环境)

**如使用源码运行请全程使用管理员身份运行，不然会出现死循环**
**建议使用最新安装包直接安装使用！！！**

首先确保您已安装 [Node.js](https://nodejs.org/)。

```bash
# 克隆仓库
git clone https://github.com/linmiao09/GKD_TakeTwo_monipao.git

# 进入项目目录
cd /GKD_TakeTwo_monipao

# 安装依赖
npm install

# 启动开发环境
npm run dev
```

### 2. 执行文件使用 (.exe)

1.  在Release中找到TakeTwo模拟跑-v1.0.2版本进行安装。
2.  **雷电模拟器配置**:
    *   打开软件后，在设置中填入雷电模拟器的安装根目录（例如 `C:\leidian\LDPlayer9`）。
    *   确保模拟器的 ADB 或控制台功能正常。
3.  **运行模拟**:
    *   **运行时请以管理员模式启动（如果使用的是v1.0.1版本，v1.0.2版本添加了申请获取权限功能）**
    *   填入或使用默认的操场预设坐标（WGS-84 坐标系）【本软件已经内置了广科大操场的坐标】。
    *   设置总距离和期望配速。
    *   点击“开始跑步”即可自动与模拟器联动。

---

## 🔬 技术核心详解

### 📍 高精度路径插值算法
项目开发了专门的地理计算模块 `geometry.ts`，用于处理复杂的操场路径：
*   **直线插值 (Interpolate Straight)**: 在两个经纬度点之间按照设定的步长（如 1 米）计算出所有中间点。
*   **弧线插值 (Interpolate Arc)**: 模拟操场弯道，根据弦长和偏转角度，计算出平滑的圆弧路径。

### 🛡️ 抗检测机制
为了应对校园应用的模拟检测，项目实现了多重平滑机制：
*   **动态配速 (Smooth Pace)**: 通过抖动算法模拟人类跑步时速度的微小波动，避免匀速运动被系统识别。
*   **GPS 随机偏移**: 在每一个路径点添加微小的随机经纬度偏移（米级），使运动轨迹更接近真实的卫星定位表现。
*   **WGS-84 坐标系**: 采用国际标准的 WGS-84 坐标系，确保模拟位置与真实地图定位的一致性。

---

## ⚠️ 免责声明

本项目仅供技术交流与学习使用，请勿用于违反校园规定或相关法律法规的场景。使用者需自行承担因使用本工具产生的一切后果。

---

> 有问题请联系：[miaomiaolinmiao@gmail.com](mailto:miaomiaolinmiao@gmail.com)
