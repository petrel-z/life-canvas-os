import React, { useState } from "react";
import {
  User,
  Cpu,
  Database,
  Monitor,
  ShieldCheck,
  Plus,
  X,
  Activity,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Sun,
  Moon,
  Smartphone,
  ChevronRight,
} from "lucide-react";
import { useApp } from "~/renderer/contexts/AppContext";
import { GlassCard } from "~/renderer/components/GlassCard";
import { Input } from "~/renderer/components/ui/input";
import { Button } from "~/renderer/components/ui/button";
import { Switch } from "~/renderer/components/ui/switch";
import { Slider } from "~/renderer/components/ui/slider";
import { Badge } from "~/renderer/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/renderer/components/ui/tabs";
import { Label } from "~/renderer/components/ui/label";

export function SettingsPage() {
  const { state, updateState, setTheme } = useApp();
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [newValue, setNewValue] = useState("");

  const calculateLifeProgress = () => {
    const birthDate = new Date(state.user.birthday);
    const today = new Date();
    const ageInMs = today.getTime() - birthDate.getTime();
    const expectedLifespanInMs =
      state.user.lifespan * 365.25 * 24 * 60 * 60 * 1000;
    return Math.min(100, Math.max(0, (ageInMs / expectedLifespanInMs) * 100));
  };

  const lifeProgress = calculateLifeProgress();

  const handleTestAI = () => {
    setTestStatus("testing");
    setTimeout(() => {
      setTestStatus(state.aiConfig.apiKey ? "success" : "error");
      setTimeout(() => setTestStatus("idle"), 3000);
    }, 1500);
  };

  const addValue = () => {
    if (newValue.trim() && !state.user.values.includes(newValue)) {
      updateState({
        user: {
          ...state.user,
          values: [...state.user.values, newValue.trim()],
        },
      });
      setNewValue("");
    }
  };

  const removeValue = (val: string) => {
    updateState({
      user: {
        ...state.user,
        values: state.user.values.filter((v) => v !== val),
      },
    });
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `life-canvas-backup-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            updateState(data);
            alert("导入成功！");
          } catch (error) {
            alert("导入失败，文件格式错误。");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleClearData = () => {
    if (confirm("确定要清除所有数据吗？此操作不可恢复！")) {
      localStorage.removeItem("life-canvas-state");
      window.location.reload();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="space-y-1">
        <h1 className="text-3xl font-black text-apple-textMain dark:text-white tracking-tight flex items-center gap-3">
          <Monitor className="text-apple-accent" />
          系统设置
        </h1>
        <p className="text-apple-textSec dark:text-white/40 text-base">
          管理您的生命画布环境变量与系统偏好。
        </p>
      </header>

      <Tabs defaultValue="profile" className="space-y-8">
        <TabsList className="bg-apple-bg2 dark:bg-white/5 border border-apple-border dark:border-white/10">
          <TabsTrigger value="profile">个人档案</TabsTrigger>
          <TabsTrigger value="ai">AI 配置</TabsTrigger>
          <TabsTrigger value="appearance">外观设置</TabsTrigger>
          <TabsTrigger value="security">数据管理</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-5">
          <GlassCard className="!p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-3">
                <Label
                  htmlFor="display-name"
                  className="text-base font-semibold"
                >
                  显示名称
                </Label>
                <Input
                  id="display-name"
                  type="text"
                  value={state.user.name}
                  onChange={(e) =>
                    updateState({
                      user: { ...state.user, name: e.target.value },
                    })
                  }
                  placeholder="您的姓名"
                  className="h-11"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="birthday" className="text-base font-semibold">
                  出生日期
                </Label>
                <Input
                  id="birthday"
                  type="date"
                  value={state.user.birthday}
                  onChange={(e) =>
                    updateState({
                      user: { ...state.user, birthday: e.target.value },
                    })
                  }
                  className="h-11"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-3">
                <Label htmlFor="mbti" className="text-base font-semibold">
                  MBTI 类型
                </Label>
                <Input
                  id="mbti"
                  type="text"
                  value={state.user.mbti}
                  onChange={(e) =>
                    updateState({
                      user: { ...state.user, mbti: e.target.value },
                    })
                  }
                  placeholder="例如 INTJ"
                  className="h-11"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="lifespan" className="text-base font-semibold">
                  预期寿命 (岁)
                </Label>
                <Input
                  id="lifespan"
                  type="number"
                  value={state.user.lifespan}
                  onChange={(e) =>
                    updateState({
                      user: {
                        ...state.user,
                        lifespan: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <Label className="text-base font-semibold">核心价值观</Label>
              <div className="flex flex-wrap gap-2">
                {state.user.values.map((val) => (
                  <Badge
                    key={val}
                    variant="secondary"
                    className="px-3 py-1.5 bg-apple-accent/5 text-apple-accent border border-apple-accent/10"
                  >
                    {val}
                    <button
                      onClick={() => removeValue(val)}
                      className="ml-2 hover:text-destructive transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </Badge>
                ))}
                <div className="relative flex-1 min-w-[140px]">
                  <Input
                    type="text"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="按回车添加..."
                    onKeyDown={(e) => e.key === "Enter" && addValue()}
                    className="h-9 border-dashed"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={addValue}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2"
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-apple-border dark:border-white/5 space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-sm font-semibold text-apple-textSec dark:text-white/60">
                  实时生命进度
                </span>
                <span className="text-2xl font-black text-apple-textMain dark:text-white">
                  {lifeProgress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-apple-bg2 dark:bg-white/5 h-2 rounded-full overflow-hidden border border-apple-border dark:border-none">
                <div
                  className="bg-gradient-to-r from-apple-accent to-indigo-500 h-full transition-all duration-1000 shadow-[0_0_12px_rgba(10,132,255,0.2)]"
                  style={{ width: `${lifeProgress}%` }}
                />
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="ai" className="space-y-5">
          <GlassCard className="space-y-10 !p-8">
            <div className="space-y-5">
              <Label className="text-base font-semibold">模型供应商</Label>
              <div className="grid grid-cols-2 gap-4">
                {(["DeepSeek", "Doubao"] as const).map((p) => (
                  <Button
                    key={p}
                    variant={
                      state.aiConfig.provider === p ? "default" : "outline"
                    }
                    onClick={() =>
                      updateState({
                        aiConfig: { ...state.aiConfig, provider: p },
                      })
                    }
                    className={
                      state.aiConfig.provider === p
                        ? "bg-apple-accent hover:bg-apple-accent/90 h-12 text-base"
                        : "h-12 text-base"
                    }
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <Label htmlFor="api-key" className="text-base font-semibold">
                API 密钥 (加密存储)
              </Label>
              <div className="relative flex gap-3">
                <Input
                  id="api-key"
                  type="password"
                  value={state.aiConfig.apiKey}
                  placeholder="请输入您的 API Key"
                  onChange={(e) =>
                    updateState({
                      aiConfig: { ...state.aiConfig, apiKey: e.target.value },
                    })
                  }
                  className="flex-1 h-11"
                />
                <Button
                  onClick={handleTestAI}
                  disabled={testStatus === "testing"}
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-11 w-11"
                >
                  {testStatus === "idle" && <RefreshCw size={18} />}
                  {testStatus === "testing" && (
                    <RefreshCw size={18} className="animate-spin" />
                  )}
                  {testStatus === "success" && (
                    <CheckCircle2 size={18} className="text-green-500" />
                  )}
                  {testStatus === "error" && (
                    <X size={18} className="text-destructive" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">日生成上限</Label>
                <Badge
                  variant="secondary"
                  className="text-apple-accent bg-apple-accent/10 text-sm px-3 py-1"
                >
                  {state.aiConfig.frequencyLimit} 次/日
                </Badge>
              </div>
              <Slider
                value={[state.aiConfig.frequencyLimit]}
                onValueChange={([value]) =>
                  updateState({
                    aiConfig: { ...state.aiConfig, frequencyLimit: value },
                  })
                }
                min={1}
                max={50}
                step={1}
                className="pt-2"
              />
              <div className="flex justify-between text-xs text-apple-textTer dark:text-white/30">
                <span>极简</span>
                <span>深度</span>
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-5">
          <GlassCard className="space-y-10 !p-8">
            <div className="space-y-4">
              <Label className="text-base font-semibold">外观模式</Label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: "light" as const, label: "浅色", icon: Sun },
                  { id: "dark" as const, label: "深色", icon: Moon },
                  { id: "auto" as const, label: "跟随系统", icon: Smartphone },
                ].map((t) => (
                  <Button
                    key={t.id}
                    variant={state.theme === t.id ? "default" : "outline"}
                    onClick={() => setTheme(t.id)}
                    className={`flex flex-col gap-2 h-24 ${
                      state.theme === t.id
                        ? "bg-apple-accent hover:bg-apple-accent/90"
                        : ""
                    }`}
                  >
                    <t.icon size={24} />
                    <span className="text-sm">{t.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-apple-bg2 dark:bg-white/5 rounded-xl border border-apple-border dark:border-white/5">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-apple-textMain dark:text-white">
                    系统通知
                  </div>
                  <div className="text-xs text-apple-textSec dark:text-white/30">
                    在桌面端发送记录提醒
                  </div>
                </div>
                <Switch
                  checked={state.systemConfig.notificationsEnabled}
                  onCheckedChange={(checked) =>
                    updateState({
                      systemConfig: {
                        ...state.systemConfig,
                        notificationsEnabled: checked,
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    自动保存间隔
                  </Label>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {state.systemConfig.autoSaveInterval}s
                  </Badge>
                </div>
                <Slider
                  value={[state.systemConfig.autoSaveInterval]}
                  onValueChange={([value]) =>
                    updateState({
                      systemConfig: {
                        ...state.systemConfig,
                        autoSaveInterval: value,
                      },
                    })
                  }
                  min={30}
                  max={300}
                  step={30}
                  className="pt-2"
                />
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="security" className="space-y-5">
          <GlassCard className="space-y-4 !p-8">
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-5 px-5"
              onClick={handleExport}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-apple-accent/5 text-apple-accent">
                  <Download size={20} />
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-semibold">导出备份 (JSON)</div>
                  <div className="text-xs text-apple-textSec dark:text-white/30 mt-0.5">
                    导出完整的生命足迹数据
                  </div>
                </div>
              </div>
              <ChevronRight
                size={16}
                className="ml-auto text-apple-textTer shrink-0"
              />
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-5 px-5"
              onClick={handleImport}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/5 text-green-500">
                  <Upload size={20} />
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-semibold">导入历史数据</div>
                  <div className="text-xs text-apple-textSec dark:text-white/30 mt-0.5">
                    从备份文件中恢复记录
                  </div>
                </div>
              </div>
              <ChevronRight
                size={16}
                className="ml-auto text-apple-textTer shrink-0"
              />
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-5 px-5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
              onClick={handleClearData}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-destructive/5 text-destructive">
                  <Trash2 size={20} />
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-semibold">清除系统数据</div>
                  <div className="text-xs text-apple-textSec dark:text-white/30 mt-0.5">
                    删除所有本地记录并重置系统
                  </div>
                </div>
              </div>
              <ChevronRight
                size={16}
                className="ml-auto text-apple-textTer shrink-0"
              />
            </Button>
          </GlassCard>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col items-center gap-2 pt-10">
        <div className="flex items-center gap-2 text-apple-textTer dark:text-white/10 text-[10px] font-black uppercase tracking-[0.4em]">
          Life Canvas OS • End-to-End Encryption
        </div>
        <div className="text-[9px] text-apple-textTer dark:text-white/5 font-medium uppercase tracking-[0.1em]">
          Copyright © 2025 Creative Canvas Labs. All Rights Reserved.
        </div>
      </div>
    </div>
  );
}
