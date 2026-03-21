# 项目名称: RoboMaster 直播间

## 项目目标
呈现一个美观、易用的直播间，播放比赛直播、呈现比赛赛程、呈现比赛数据

## 技术栈选择
### 播放器
ArtPlayer 播放 m3u8 直播流

### UI框架
primevue

## 后端API
所有API返回均为json，实时更新，需要http polling刷新
API返回结构体较大，请运行`curl`获取
### 直播流信息
https://rm-static.djicdn.com/live_json/live_game_info.json

### 实时赛程信息
https://rm-static.djicdn.com/live_json/current_and_next_matches.json

### 分组信息
https://rm-static.djicdn.com/live_json/groups_order.json

### 比赛数据
https://rm-static.djicdn.com/live_json/robot_data.json

### 赛程安排
https://rm-static.djicdn.com/live_json/schedule.json

## 前端呈现要求
按重要性排序
1. 核心内容为直播播放器，要求美观、健壮
2. UI框架使用primevue，要求设计两套UI用于PC端和手机端，支持深色模式切换，默认深色模式，主题使用`aura`，主题色使用`#0070f3`
3. 代码编写时，要求禁止使用独立`.css`文件，所有css代码必须写在`.vue`文件中，同时严格遵守primevue的样式规范，必须完全使用primevue的组件和样式实现UI主体，不到万不可以禁止使用大段css
4. 除了直播播放器以外，还要求根据上方给出的API，实现当前对局信息、赛程安排、分组信息、比赛数据的呈现。要求呈现美观、易用，交互友好。