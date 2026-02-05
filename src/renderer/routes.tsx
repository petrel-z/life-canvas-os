import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";

// 临时占位页面，后续会替换为实际页面
function PlaceholderPage({ name }: { name: string }) {
  const [apiResult, setApiResult] = useState<string>("未调用");
  const [loading, setLoading] = useState(false);

  // 测试 API 调用函数
  const testPythonAPI = async () => {
    setLoading(true);
    setApiResult("调用中...");

    try {
      console.log("🚀 开始调用 Python API...");

      // 调用 Hello 接口
      const helloResponse = await fetch("http://127.0.0.1:8000/api/test/hello");
      const helloData = await helloResponse.json();
      console.log("✅ Hello 接口响应:", helloData);

      // 调用系统信息接口
      const infoResponse = await fetch("http://127.0.0.1:8000/api/test/info");
      const infoData = await infoResponse.json();
      console.log("✅ 系统信息响应:", infoData);

      // 调用 Echo 接口
      const echoResponse = await fetch("http://127.0.0.1:8000/api/test/echo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Life Canvas OS",
          count: 42,
        }),
      });
      const echoData = await echoResponse.json();
      console.log("✅ Echo 接口响应:", echoData);

      // 格式化输出
      const result = `
🎉 API 调用成功！

Hello 接口:
  消息: ${helloData.message}
  时间: ${helloData.timestamp}
  状态: ${helloData.data.status}

系统信息:
  Python: ${infoData.python_version.split()[0]}
  平台: ${infoData.platform} ${infoData.architecture}
  处理器: ${infoData.processor}

Echo 接口:
  响应: ${echoData.message}
  接收计数: ${echoData.data.received_count}
      `.trim();

      setApiResult(result);
      console.log("📊 完整结果:", result);
    } catch (error) {
      const errorMsg = `❌ API 调用失败: ${error}`;
      console.error(errorMsg);
      setApiResult(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "#1a1a1a",
        color: "#ffffff",
        fontSize: "16px",
        fontWeight: "normal",
      }}
    >
      <div
        style={{
          textAlign: "center",
          backgroundColor: "#2a2a2a",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          maxWidth: "800px",
        }}
      >
        <h1
          style={{
            fontSize: "48px",
            fontWeight: "bold",
            marginBottom: "24px",
            color: "#4CAF50",
          }}
        >
          {name}
        </h1>
        <p style={{ fontSize: "20px", color: "#aaaaaa", marginBottom: "32px" }}>
          此页面正在开发中...
        </p>

        {/* 测试按钮 */}
        <button
          onClick={testPythonAPI}
          disabled={loading}
          style={{
            padding: "16px 32px",
            fontSize: "18px",
            fontWeight: "bold",
            backgroundColor: loading ? "#666" : "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            marginBottom: "24px",
            transition: "all 0.3s",
          }}
        >
          {loading ? "⏳ 调用中..." : "🔧 测试 Python API"}
        </button>

        {/* API 结果显示 */}
        <div
          style={{
            backgroundColor: "#1a1a1a",
            padding: "20px",
            borderRadius: "8px",
            textAlign: "left",
            fontFamily: "monospace",
            fontSize: "14px",
            lineHeight: "1.6",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: "#4CAF50",
            maxHeight: "400px",
            overflowY: "auto",
          }}
        >
          {apiResult}
        </div>

        {/* 提示信息 */}
        <p style={{ fontSize: "14px", color: "#888", marginTop: "20px" }}>
          💡 打开浏览器控制台查看详细日志
        </p>
      </div>
    </div>
  );
}

export function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        {/* 默认重定向到画布页面 */}
        <Route path="/" element={<Navigate to="/canvas" replace />} />

        {/* 全局画布（首页） */}
        <Route path="/canvas" element={<PlaceholderPage name="全局画布" />} />

        {/* AI 洞察 */}
        <Route path="/insights" element={<PlaceholderPage name="AI 洞察" />} />

        {/* 时间轴审计 */}
        <Route
          path="/history"
          element={<PlaceholderPage name="时间轴审计" />}
        />

        {/* 系统设置 */}
        <Route path="/settings" element={<PlaceholderPage name="系统设置" />} />

        {/* 子系统详情页 */}
        <Route
          path="/system/:type"
          element={<PlaceholderPage name="子系统详情" />}
        />

        {/* 用户日记 */}
        <Route path="/journal" element={<PlaceholderPage name="用户日记" />} />
        <Route
          path="/journal/:id"
          element={<PlaceholderPage name="日记详情" />}
        />
      </Routes>
    </HashRouter>
  )
}
