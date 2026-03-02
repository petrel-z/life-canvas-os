# API Key 验证接口使用指南

## 接口说明

验证 AI 服务的 API Key 是否有效，在保存前进行验证。

## 接口地址

`POST /api/user/ai-config/verify`

## 请求参数

```typescript
interface APIKeyVerifyRequest {
  provider: string;      // AI 提供商: "deepseek" | "openai" | "doubao"
  api_key: string;       // API Key
  model?: string;        // 可选的模型名称
}
```

## 响应格式

### 成功响应 (200)

```json
{
  "code": 200,
  "message": "API Key 验证成功",
  "data": {
    "valid": true,
    "provider": "deepseek",
    "model": "deepseek-chat"
  },
  "timestamp": 1772424710405
}
```

### 错误响应

#### 无效的 API Key (401)

```json
{
  "code": 401,
  "message": "API Key 无效或已过期",
  "data": {
    "provider": "deepseek"
  },
  "timestamp": 1772424710405
}
```

#### 请求超时 (504)

```json
{
  "code": 504,
  "message": "API 请求超时，请检查网络连接",
  "timestamp": 1772424710405
}
```

#### 频率超限 (429)

```json
{
  "code": 429,
  "message": "API 请求频率超限，请稍后再试",
  "timestamp": 1772424710405
}
```

#### 不支持的提供商 (400)

```json
{
  "code": 400,
  "message": "不支持的 AI 提供商: xxx",
  "timestamp": 1772424710405
}
```

## 前端使用示例

### TypeScript 接口定义

```typescript
// src/renderer/api/user.ts

export interface APIKeyVerifyRequest {
  provider: string;
  api_key: string;
  model?: string;
}

export interface APIKeyVerifyResponse {
  valid: boolean;
  provider: string;
  model: string;
}

export async function verifyAPIKey(request: APIKeyVerifyRequest): Promise<APIResponse<APIKeyVerifyResponse>> {
  const response = await fetch('http://localhost:8000/api/user/ai-config/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  return response.json();
}
```

### React Hook 封装

```typescript
// src/renderer/hooks/useAIConfig.ts

import { useState } from 'react';
import { verifyAPIKey } from '@/api/user';
import { toast } from 'sonner';

interface UseAIConfigReturn {
  isVerifying: boolean;
  isValid: boolean | null;
  verifyAPIKey: (provider: string, apiKey: string, model?: string) => Promise<boolean>;
}

export function useAIConfigVerification(): UseAIConfigReturn {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const verifyKey = async (
    provider: string,
    apiKey: string,
    model?: string
  ): Promise<boolean> => {
    setIsVerifying(true);
    setIsValid(null);

    try {
      const response = await verifyAPIKey({
        provider,
        api_key: apiKey,
        model
      });

      if (response.code === 200 && response.data?.valid) {
        setIsValid(true);
        toast.success('API Key 验证成功', {
          description: `${provider} API Key 有效`
        });
        return true;
      } else {
        setIsValid(false);
        toast.error('API Key 验证失败', {
          description: response.message
        });
        return false;
      }
    } catch (error) {
      setIsValid(false);
      toast.error('验证失败', {
        description: error instanceof Error ? error.message : '网络请求失败'
      });
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  return {
    isVerifying,
    isValid,
    verifyAPIKey: verifyKey
  };
}
```

### 完整组件示例

```typescript
// src/renderer/pages/settings/AIConfigForm.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAIConfigVerification } from '@/hooks/useAIConfig';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export function AIConfigForm() {
  const [provider, setProvider] = useState('deepseek');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');

  const { isVerifying, isValid, verifyAPIKey } = useAIConfigVerification();

  const handleVerify = async () => {
    if (!apiKey.trim()) {
      toast.error('请输入 API Key');
      return;
    }

    await verifyAPIKey(provider, apiKey, model);
  };

  const handleSave = async () => {
    // 先验证 API Key
    const valid = await verifyAPIKey(provider, apiKey, model);

    if (valid) {
      // 验证通过，保存配置
      await saveAIConfig(provider, apiKey, model);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="provider">AI 提供商</Label>
        <Select value={provider} onValueChange={setProvider}>
          <SelectTrigger>
            <SelectValue placeholder="选择 AI 提供商" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deepseek">DeepSeek</SelectItem>
            <SelectItem value="openai">OpenAI</SelectItem>
            <SelectItem value="doubao">豆包</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="apiKey">API Key</Label>
        <div className="flex gap-2">
          <Input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="输入 API Key"
            className="flex-1"
          />
          <Button
            onClick={handleVerify}
            disabled={isVerifying || !apiKey}
            variant="outline"
            size="sm"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                验证中
              </>
            ) : (
              '验证'
            )}
          </Button>
        </div>

        {/* 验证结果提示 */}
        {isValid === true && (
          <div className="flex items-center gap-2 text-sm text-green-600 mt-1">
            <CheckCircle2 className="h-4 w-4" />
            <span>API Key 有效</span>
          </div>
        )}
        {isValid === false && (
          <div className="flex items-center gap-2 text-sm text-red-600 mt-1">
            <XCircle className="h-4 w-4" />
            <span>API Key 无效</span>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="model">模型名称（可选）</Label>
        <Input
          id="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="例如：deepseek-chat"
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={isValid === false}
        className="w-full"
      >
        保存配置
      </Button>
    </div>
  );
}
```

### 实时验证（防抖）

```typescript
// src/renderer/hooks/useDebounce.ts

import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// 在组件中使用

function AIConfigFormWithDebounce() {
  const [apiKey, setApiKey] = useState('');
  const debouncedApiKey = useDebounce(apiKey, 1000);
  const { isVerifying, isValid, verifyAPIKey } = useAIConfigVerification();

  useEffect(() => {
    if (debouncedApiKey && debouncedApiKey.length > 10) {
      verifyAPIKey('deepseek', debouncedApiKey);
    }
  }, [debouncedApiKey]);

  // ...
}
```

## 支持的 AI 提供商

| 提供商 | provider 值 | 默认模型 |
|--------|-------------|----------|
| DeepSeek | `deepseek` | `deepseek-chat` |
| OpenAI | `openai` | `gpt-3.5-turbo` |
| 豆包 | `doubao` | `doubao-seed-2-0-lite-260215` |

## 注意事项

1. **网络要求**：验证接口需要访问 AI 服务商的 API，请确保网络连接正常
2. **超时设置**：验证超时时间为 10 秒
3. **频率限制**：部分 AI 服务商有 API 调用频率限制
4. **安全性**：API Key 不会存储在日志中，仅在验证时使用
5. **错误处理**：建议在前端实现完善的错误处理和用户提示

## 测试命令

```bash
# 验证 DeepSeek API Key
curl -X POST "http://localhost:8000/api/user/ai-config/verify" \
  -H "Content-Type: application/json" \
  -d '{"provider": "deepseek", "api_key": "sk-xxxxx"}'

# 验证 OpenAI API Key
curl -X POST "http://localhost:8000/api/user/ai-config/verify" \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai", "api_key": "sk-xxxxx"}'
```
