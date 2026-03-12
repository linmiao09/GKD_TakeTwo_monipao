import { useState, useEffect } from 'react'
import { 
  Settings, 
  Play, 
  Pause, 
  Square, 
  MapPin, 
  Zap, 
  Gauge,
  Target,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  School
} from 'lucide-react'
import { interpolateStraight, interpolateArc, Point } from './lib/geometry'

const PRESETS = {
  "广科大操场": {
    p1: { latitude: 23.40410874086063, longitude: 113.45886249818885 }, // 左下
    p2: { latitude: 23.404019353695702, longitude: 113.45954136972868 }, // 右下
    p3: { latitude: 23.404932547286908, longitude: 113.45968269722894 }, // 右上
    p4: { latitude: 23.405016918217704, longitude: 113.45899780616823 }, // 左上
    arcDegrees: 170.0
  }
}

function App(): React.JSX.Element {
  // Settings
  const [ldPath, setLdPath] = useState("")
  const [emulatorIndex, setEmulatorIndex] = useState(0)
  const [p1, setP1] = useState<Point>(PRESETS["广科大操场"].p1)
  const [p2, setP2] = useState<Point>(PRESETS["广科大操场"].p2)
  const [p3, setP3] = useState<Point>(PRESETS["广科大操场"].p3)
  const [p4, setP4] = useState<Point>(PRESETS["广科大操场"].p4)
  const [totalDist, setTotalDist] = useState(10000)
  const [stepMeters] = useState(1.0)
  const [arcDegrees, setArcDegrees] = useState(170.0)
  
  // Pace & Randomness
  const [useSmoothPace] = useState(true)
  const [basePace, setBasePace] = useState(6.0)
  const [variability] = useState(0.2)
  const [useRandomOffset] = useState(true)
  const [randomChance] = useState(0.2)
  const [randomRange] = useState(1.5)

  // Status
  const [status, setStatus] = useState("空闲")
  const [coords, setCoords] = useState({ lat: 0, lng: 0 })
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    // Load persisted settings from local storage if any
    const saved = localStorage.getItem('track_sim_settings')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.ldPath) setLdPath(data.ldPath)
        if (data.emulatorIndex !== undefined) setEmulatorIndex(data.emulatorIndex)
      } catch (e) { /* ignore */ }
    }

    // Register IPC listeners
    window.api.onSimProgress((data) => {
      setCoords({ lat: data.lat, lng: data.lng })
      setProgress({ current: data.current, total: data.total })
      setStatus(`正在模拟: ${data.current} / ${data.total}`)
    })

    window.api.onSimDone(() => {
      setIsRunning(false)
      setIsPaused(false)
      setStatus("模拟完成！")
    })

    window.api.onSimStopped(() => {
      setIsRunning(false)
      setIsPaused(false)
      setStatus("模拟已停止")
    })

    window.api.onSimError((err) => {
      setIsRunning(false)
      setIsPaused(false)
      setStatus(`错误: ${err}`)
    })
  }, [])

  // Save key settings when changed
  useEffect(() => {
    localStorage.setItem('track_sim_settings', JSON.stringify({ ldPath, emulatorIndex }))
  }, [ldPath, emulatorIndex])

  const handleStart = async () => {
    try {
      setStatus("正在计算单圈路径...")
      
      // Calculate single lap
      const s1 = interpolateStraight(p1, p4, stepMeters)
      const a1 = interpolateArc(p4, p3, stepMeters, arcDegrees)
      const s2 = interpolateStraight(p3, p2, stepMeters)
      const a2 = interpolateArc(p2, p1, stepMeters, arcDegrees)
      
      const singleLapPoints = [...s1.points, ...a1.points, ...s2.points, ...a2.points]
      const totalPointsNeeded = Math.floor(totalDist / stepMeters)
      const fullPath: any[] = []
      
      for (let i = 0; i < totalPointsNeeded; i++) {
        fullPath.push(singleLapPoints[i % singleLapPoints.length])
      }

      setIsRunning(true)
      setIsPaused(false)
      
      const minPace = basePace - variability
      const maxPace = basePace + variability
      const speedMs = 1000.0 / (basePace * 60.0)
      const baseDelayMs = (stepMeters / speedMs) * 1000

      await window.api.startSimulation({
        ldPath,
        index: emulatorIndex,
        points: fullPath,
        baseDelayMs,
        useSmooth: useSmoothPace,
        minPace,
        maxPace,
        stepMeters,
        useRandomOffset,
        randomChance,
        randomRange
      })

    } catch (e: any) {
      setStatus(`错误: ${e.message}`)
      setIsRunning(false)
    }
  }

  const handlePauseResume = () => {
    if (isPaused) {
      window.api.resumeSimulation()
      setIsPaused(false)
    } else {
      window.api.pauseSimulation()
      setIsPaused(true)
    }
  }

  const handleStop = () => {
    window.api.stopSimulation()
  }

  const handleManualMove = async (dir: 'N' | 'S' | 'E' | 'W') => {
    if (!isRunning || !isPaused) return
    
    // Simple manual move logic
    const step = 0.00005 // rough 5 meters
    let nextLat = coords.lat
    let nextLng = coords.lng
    
    if (dir === 'N') nextLat += step
    if (dir === 'S') nextLat -= step
    if (dir === 'E') nextLng += step
    if (dir === 'W') nextLng -= step
    
    await window.api.sendLocate({
      ldPath,
      index: emulatorIndex,
      lat: nextLat,
      lng: nextLng
    })
    setCoords({ lat: nextLat, lng: nextLng })
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans p-4 select-none">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">TakeTwo模拟跑<span className="text-xs font-normal text-slate-400">有问题请邮箱联系：miaomiaolinmiao@gmail.com</span></h1>
        </div>
        <div className="flex gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${isRunning ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></div>
                {isRunning ? (isPaused ? '暂停中' : '运行中') : '就绪'}
            </div>
        </div>
      </header>

      <main className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[calc(100vh-100px)] pb-20 no-scrollbar">
        
        {/* Simulator Settings */}
        <section className="glass rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-slate-600">
            <Settings className="w-4 h-4" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">模拟器配置</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">雷电模拟器安装目录</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={ldPath}
                  onChange={(e) => setLdPath(e.target.value)}
                  placeholder="例如: C:\leidian\LDPlayer9"
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1.5">索引</label>
                <input 
                  type="number" 
                  value={emulatorIndex}
                  onChange={(e) => setEmulatorIndex(parseInt(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex-[2]">
                <button 
                   onClick={() => window.api.launchEmulator({ldPath, index: emulatorIndex})}
                   className="w-full h-full mt-6 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-3.5 h-3.5" /> 启动模拟器
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Coordinates */}
        <section className="glass rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-4 h-4" />
                <h2 className="text-sm font-semibold uppercase tracking-wider">操场坐标 (WGS-84)</h2>
            </div>
            <button className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1">
               <School className="w-2.5 h-2.5" /> 广科大操场预设
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
             {[
               {id: 'P1', label: 'P1 (西南)', state: p1, setter: setP1},
               {id: 'P2', label: 'P2 (东南)', state: p2, setter: setP2},
               {id: 'P3', label: 'P3 (东北)', state: p3, setter: setP3},
               {id: 'P4', label: 'P4 (西北)', state: p4, setter: setP4}
             ].map((pt) => (
               <div key={pt.id} className="bg-white/50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 mb-2">{pt.label}</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                       <span className="text-[10px] text-slate-400 w-4">纬</span>
                       <input 
                          type="number" 
                          value={pt.state.latitude} 
                          onChange={(e) => pt.setter({...pt.state, latitude: parseFloat(e.target.value)})}
                          className="w-full text-xs font-mono py-1 border-b border-transparent focus:border-blue-300 outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-1.5">
                       <span className="text-[10px] text-slate-400 w-4">经</span>
                       <input 
                          type="number" 
                          value={pt.state.longitude} 
                          onChange={(e) => pt.setter({...pt.state, longitude: parseFloat(e.target.value)})}
                          className="w-full text-xs font-mono py-1 border-b border-transparent focus:border-blue-300 outline-none"
                        />
                    </div>
                  </div>
               </div>
             ))}
          </div>
        </section>

        {/* Parameters */}
        <section className="grid grid-cols-2 gap-4">
           <div className="glass rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-slate-600">
                <Gauge className="w-4 h-4" />
                <h2 className="text-sm font-semibold uppercase tracking-wider">模拟参数</h2>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 mb-1">总距离 (米)</span>
                  <input type="number" value={totalDist} onChange={(e) => setTotalDist(parseInt(e.target.value))} className="bg-white px-2 py-1.5 rounded-md border border-slate-200 text-xs outline-none" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 mb-1">圆弧角度 (度)</span>
                  <input type="number" value={arcDegrees} onChange={(e) => setArcDegrees(parseFloat(e.target.value))} className="bg-white px-2 py-1.5 rounded-md border border-slate-200 text-xs outline-none" />
                </div>
              </div>
           </div>

           <div className="glass rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-slate-600">
                <Zap className="w-4 h-4" />
                <h2 className="text-sm font-semibold uppercase tracking-wider">配速调节</h2>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] text-slate-500">基础配速</span>
                    <span className="text-[10px] font-bold text-blue-600">{basePace} min/km</span>
                  </div>
                  <input type="range" min="3" max="10" step="0.1" value={basePace} onChange={(e) => setBasePace(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                </div>
                <label className="flex items-center gap-2 pt-2">
                   <div className="relative inline-flex items-center">
                      <input type="checkbox" checked={useSmoothPace} readOnly className="sr-only peer" />
                      <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                   </div>
                   <span className="text-[10px] font-medium text-slate-600">启用模拟抖动</span>
                </label>
              </div>
           </div>
        </section>

        {/* Manual Control Panel (Only when paused) */}
        {isPaused && (
           <section className="glass rounded-2xl p-4 shadow-inner bg-blue-50/30 border-blue-100 border flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <span className="text-[10px] font-bold text-blue-600 mb-3 uppercase tracking-widest">微调方向控制</span>
              <div className="grid grid-cols-3 gap-2">
                  <div />
                  <button onClick={() => handleManualMove('N')} className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 active:scale-90 transition-all"><ArrowUp className="w-5 h-5" /></button>
                  <div />
                  <button onClick={() => handleManualMove('W')} className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 active:scale-90 transition-all"><ArrowLeft className="w-5 h-5" /></button>
                  <div />
                  <button onClick={() => handleManualMove('E')} className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 active:scale-90 transition-all"><ArrowRight className="w-5 h-5" /></button>
                  <div />
                  <button onClick={() => handleManualMove('S')} className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 active:scale-90 transition-all"><ArrowDown className="w-5 h-5" /></button>
                  <div />
              </div>
           </section>
        )}

      </main>

      {/* Floating Status Bar & Controls */}
      <footer className="fixed bottom-6 left-6 right-6 flex flex-col gap-4">
        
        {/* Progress Bar */}
        {isRunning && (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-slate-200/50">
                <div className="flex justify-between items-center mb-2 px-1">
                    <div className="flex items-center gap-2">
                        <Target className="w-3 h-3 text-blue-500" />
                        <span className="text-[10px] font-mono text-slate-600">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600">{Math.round((progress.current/progress.total || 0) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-300" 
                      style={{ width: `${(progress.current/progress.total || 0) * 100}%` }}
                    ></div>
                </div>
            </div>
        )}

        <div className="flex gap-3 h-14">
          {!isRunning ? (
            <button 
              onClick={handleStart}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-200 font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Play className="w-5 h-5 fill-current" /> 开始跑步
            </button>
          ) : (
            <>
               <button 
                onClick={handlePauseResume}
                className="flex-1 bg-white border-2 border-slate-200 text-slate-800 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                {isPaused ? <><Play className="w-5 h-5 fill-current" /> 继续</> : <><Pause className="w-5 h-5 fill-current" /> 暂停</>}
              </button>
              <button 
                onClick={handleStop}
                className="w-20 bg-red-50 text-red-600 border-2 border-red-100 rounded-2xl flex items-center justify-center active:scale-[0.98] transition-all"
              >
                <Square className="w-5 h-5 fill-current" />
              </button>
            </>
          )}
        </div>
      </footer>

      {/* Ephemeral Status Text */}
      <div className="fixed bottom-2 left-0 right-0 text-center">
         <span className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter">{status}</span>
      </div>

    </div>
  )
}

export default App
