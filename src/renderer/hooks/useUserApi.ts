/**
 * 用户 API 业务逻辑层
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import { userApi } from '~/renderer/api/user';

// 前端使用的用户信息类型
export interface UserProfile {
  name?: string;
  birthday?: string;
  mbti?: string;
  values?: string[];
  lifespan?: number;
}

export function useUserApi() {
  /**
   * 获取用户信息
   */
  const getUserProfile = useCallback(async (): Promise<UserProfile | null> => {
    const response = await userApi.getProfile();

    if (!response.ok) {
      const error = await response.json();
      // 404 表示用户还未设置信息，不算错误
      if (response.status === 404) {
        return null;
      }
      toast.error('获取用户信息失败', {
        description: error.detail?.message || '请稍后重试',
      });
      throw error;
    }

    const result = await response.json();
    const data = result.data;

    // 转换后端字段到前端字段
    return {
      name: data.display_name || '',
      birthday: data.birthday || '',
      mbti: data.mbti || '',
      values: data.values ? JSON.parse(data.values) : [],
      lifespan: data.life_expectancy || 0,  // None 转换为 0
    };
  }, []);

  /**
   * 更新用户信息
   */
  const updateUserProfile = useCallback(async (data: UserProfile): Promise<UserProfile> => {
    // 转换前端字段到后端字段
    const apiData = {
      display_name: data.name,
      birthday: data.birthday,
      mbti: data.mbti,
      values: data.values ? JSON.stringify(data.values) : undefined,
      life_expectancy: data.lifespan,
    };

    const response = await userApi.updateProfile(apiData);

    if (!response.ok) {
      const error = await response.json();
      toast.error('更新用户信息失败', {
        description: error.detail?.message || '请稍后重试',
      });
      throw error;
    }

    const result = await response.json();
    const resultData = result.data;

    toast.success('用户信息更新成功');

    // 转换后端响应到前端格式
    return {
      name: resultData.display_name || '',
      birthday: resultData.birthday || '',
      mbti: resultData.mbti || '',
      values: resultData.values ? JSON.parse(resultData.values) : [],
      lifespan: resultData.life_expectancy || 0,
    };
  }, []);

  return {
    getUserProfile,
    updateUserProfile,
  };
}
